const express = require('express');
const db = require('../db');
const { nowDutchISO, handleUniqueError, logAction } = require('../utils');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendMail } = require('../mail/mailer');
const { bonConfirmation } = require('../mail/templates');

const pad2 = (n) => String(n).padStart(2, '0');
function shortDate(s) {
  if (!s) return '?';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatBonItems(items) {
  return items.map((it) => {
    const name = it.material_name || it.set_name || '?';
    return `${it.quantity}x ${name}`;
  }).join(', ');
}

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers

function parseDate(s) {
  if (typeof s !== 'string') return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Zaterdag (6) en zondag (0). We nemen de weekdag in UTC omdat de frontend
// datums stuurt als YYYY-MM-DD (=UTC-middernacht) — dat is dezelfde
// kalenderdag als in NL. Zie BESLUITEN.md "Operationele besluiten": bonnen
// mogen alleen op werkdagen starten of retour zijn.
function isWeekendDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return false;
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function computeStatus(startStr, returnStr) {
  const now = new Date();
  const start = new Date(startStr);
  const ret = new Date(returnStr);
  if (start > now) return 'reserved';
  if (ret < now) return 'completed';
  return 'active';
}

function currentDutchYear() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
  }).format(new Date());
}

function generateBonNumber() {
  const prefix = `BON-${currentDutchYear()}-`;
  const row = db.prepare(
    `SELECT bon_number FROM bons WHERE bon_number LIKE ? ORDER BY bon_number DESC LIMIT 1`,
  ).get(`${prefix}%`);
  let next = 1;
  if (row) {
    const m = row.bon_number.match(/-(\d+)$/);
    if (m) next = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

// Voor elk item (mat/set), bereken reserved-quantity in overlappende bonnen
// met status 'active' of 'reserved'. excludeBonId laat eigen bon buiten beeld
// bij toekomstige re-checks (nu ongebruikt — PUT raakt items niet aan).
function checkStock(items, period, excludeBonId = null) {
  // Aggregeer aanvragen per (kind, id), zodat dezelfde material/set die
  // meerdere keren in items voorkomt correct opgeteld wordt.
  const aggregated = new Map();
  for (const it of items) {
    const kind = it.material_id != null ? 'material' : 'set';
    const id = it.material_id ?? it.set_id;
    const key = `${kind}:${id}`;
    if (!aggregated.has(key)) aggregated.set(key, { kind, id, quantity: 0 });
    aggregated.get(key).quantity += it.quantity;
  }

  const conflicts = [];
  for (const req of aggregated.values()) {
    const table = req.kind === 'material' ? 'materials' : 'sets';
    const idCol = req.kind === 'material' ? 'material_id' : 'set_id';
    const nameCol = req.kind === 'material' ? 'material_name' : 'set_name';

    const item = db.prepare(`SELECT id, name, stock FROM ${table} WHERE id = ?`).get(req.id);
    if (!item) {
      conflicts.push({
        [idCol]: req.id,
        [nameCol]: null,
        gevraagd: req.quantity,
        beschikbaar: 0,
        reden: `${req.kind === 'material' ? 'materiaal' : 'set'} bestaat niet`,
      });
      continue;
    }

    let sql = `
      SELECT COALESCE(SUM(bi.quantity), 0) AS reserved
      FROM bon_items bi
      JOIN bons b ON b.id = bi.bon_id
      WHERE bi.${idCol} = ?
        AND bi.returned = 0
        AND b.status IN ('active', 'reserved')
        AND b.start_date <= ?
        AND b.return_date >= ?
    `;
    const params = [req.id, period.return_date, period.start_date];
    if (excludeBonId != null) {
      sql += ' AND b.id != ?';
      params.push(excludeBonId);
    }
    const { reserved } = db.prepare(sql).get(...params);
    const available = item.stock - reserved;

    if (req.quantity > available) {
      conflicts.push({
        [idCol]: req.id,
        [nameCol]: item.name,
        gevraagd: req.quantity,
        beschikbaar: available,
      });
    }
  }
  return conflicts;
}

function loadBonWithItems(id) {
  const bon = db.prepare(`
    SELECT b.*, u.name AS user_name, a.name AS created_by_admin_name
    FROM bons b
    LEFT JOIN users u ON u.id = b.user_id
    LEFT JOIN users a ON a.id = b.created_by_admin_id
    WHERE b.id = ?
  `).get(id);
  if (!bon) return null;
  bon.items = db.prepare(`
    SELECT bi.*, m.name AS material_name, s.name AS set_name
    FROM bon_items bi
    LEFT JOIN materials m ON m.id = bi.material_id
    LEFT JOIN sets s ON s.id = bi.set_id
    WHERE bi.bon_id = ?
    ORDER BY bi.id
  `).all(id);
  return bon;
}

// ---------------------------------------------------------------------------
// Routes
//
// Alle bon-endpoints vereisen minstens een geldige sessie. Gewone gebruikers
// zien/wijzigen alleen hun eigen bonnen; admins zien alles. De filter- en
// eigenaarschapschecks staan in de handlers zelf, niet in de middleware,
// omdat ze context uit de bon (user_id) nodig hebben.
router.use(requireAuth);

function isAdmin(req) { return req.user && req.user.role === 'admin'; }

router.get('/', (req, res) => {
  const admin = isAdmin(req);
  const bons = admin
    ? db.prepare(`
        SELECT b.*, u.name AS user_name, a.name AS created_by_admin_name
        FROM bons b
        LEFT JOIN users u ON u.id = b.user_id
        LEFT JOIN users a ON a.id = b.created_by_admin_id
        ORDER BY b.id
      `).all()
    : db.prepare(`
        SELECT b.*, u.name AS user_name, a.name AS created_by_admin_name
        FROM bons b
        LEFT JOIN users u ON u.id = b.user_id
        LEFT JOIN users a ON a.id = b.created_by_admin_id
        WHERE b.user_id = ?
        ORDER BY b.id
      `).all(req.user.id);

  if (bons.length === 0) return res.json([]);

  const placeholders = bons.map(() => '?').join(',');
  const items = db.prepare(`
    SELECT bi.*, m.name AS material_name, s.name AS set_name
    FROM bon_items bi
    LEFT JOIN materials m ON m.id = bi.material_id
    LEFT JOIN sets s ON s.id = bi.set_id
    WHERE bi.bon_id IN (${placeholders})
    ORDER BY bi.id
  `).all(...bons.map((b) => b.id));

  const byBon = new Map();
  for (const item of items) {
    if (!byBon.has(item.bon_id)) byBon.set(item.bon_id, []);
    byBon.get(item.bon_id).push(item);
  }
  for (const bon of bons) bon.items = byBon.get(bon.id) || [];

  res.json(bons);
});

// Bewuste keuze om 404 (niet 403) terug te geven wanneer een niet-admin een
// bon van iemand anders opvraagt. Dat lekt geen bestaan-info: onbekende bon
// en andermans bon voelen identiek voor de client.
function assertOwnBonOrAdmin(req, res, bon) {
  if (!bon) { res.status(404).json({ error: 'bon niet gevonden' }); return false; }
  if (!isAdmin(req) && bon.user_id !== req.user.id) {
    res.status(404).json({ error: 'bon niet gevonden' });
    return false;
  }
  return true;
}

router.get('/:id', (req, res) => {
  const bon = loadBonWithItems(req.params.id);
  if (!assertOwnBonOrAdmin(req, res, bon)) return;
  res.json(bon);
});

router.post('/', (req, res) => {
  const body = req.body || {};
  const actorIsAdmin = isAdmin(req);

  // Gewone gebruikers mogen alleen voor zichzelf bonnen aanmaken; we
  // overschrijven bewust de user_id in de body zodat een kwaadwillende
  // frontend geen bon op iemand anders' naam kan boeken. Admins mogen
  // namens iedere gebruiker met rol 'user' een bon inschieten — maar
  // uitdrukkelijk niet voor zichzelf of voor een andere admin, want
  // admin en gebruiker hebben gescheiden portalen.
  if (!actorIsAdmin) {
    body.user_id = req.user.id;
  }

  if (!Number.isInteger(body.user_id)) {
    return res.status(400).json({ error: "veld 'user_id' is verplicht (integer)" });
  }
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(body.user_id);
  if (!user) return res.status(400).json({ error: 'user_id verwijst naar een onbekende gebruiker' });

  if (actorIsAdmin && user.role !== 'user') {
    return res.status(400).json({
      error: "Een admin kan alleen een bon aanmaken namens een gebruiker met de rol 'gebruiker' — niet voor zichzelf of voor een andere admin.",
    });
  }

  if (!parseDate(body.start_date)) {
    return res.status(400).json({ error: "veld 'start_date' moet een geldige datum/tijd zijn" });
  }
  if (!parseDate(body.return_date)) {
    return res.status(400).json({ error: "veld 'return_date' moet een geldige datum/tijd zijn" });
  }
  if (parseDate(body.return_date) <= parseDate(body.start_date)) {
    return res.status(400).json({ error: "'return_date' moet na 'start_date' liggen" });
  }
  if (isWeekendDate(parseDate(body.start_date))) {
    return res.status(400).json({ error: 'Ophaaldatum kan alleen op een werkdag vallen. Kies maandag t/m vrijdag.' });
  }
  if (isWeekendDate(parseDate(body.return_date))) {
    return res.status(400).json({ error: 'Retourdatum kan alleen op een werkdag vallen. Kies maandag t/m vrijdag.' });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: "veld 'items' moet een niet-lege array zijn" });
  }
  for (const [idx, item] of body.items.entries()) {
    const hasMat = item.material_id != null;
    const hasSet = item.set_id != null;
    if (hasMat === hasSet) {
      return res.status(400).json({
        error: `items[${idx}]: precies één van 'material_id' of 'set_id' is verplicht`,
      });
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return res.status(400).json({
        error: `items[${idx}]: 'quantity' moet een positief geheel getal zijn`,
      });
    }
  }

  if (body.notes !== undefined && body.notes !== null && typeof body.notes !== 'string') {
    return res.status(400).json({ error: "veld 'notes' moet een string of null zijn" });
  }

  const conflicts = checkStock(body.items, {
    start_date: body.start_date,
    return_date: body.return_date,
  });
  if (conflicts.length > 0) {
    return res.status(409).json({ error: 'onvoldoende voorraad', details: conflicts });
  }

  const now = nowDutchISO();
  const status = computeStatus(body.start_date, body.return_date);
  const completedAt = status === 'completed' ? now : null;
  // Alleen zetten als de admin namens iemand anders inschiet. Als de admin
  // ooit toch voor zichzelf zou proberen te boeken is dat hierboven al
  // afgevangen — deze regel is puur voor de administratie-trail.
  const createdByAdminId = actorIsAdmin ? req.user.id : null;

  let createdId;
  try {
    const tx = db.transaction(() => {
      const bonNumber = generateBonNumber();
      const info = db.prepare(`
        INSERT INTO bons
          (bon_number, user_id, start_date, return_date, status, notes, created_at, completed_at, created_by_admin_id)
        VALUES
          (@bon_number, @user_id, @start_date, @return_date, @status, @notes, @created_at, @completed_at, @created_by_admin_id)
      `).run({
        bon_number: bonNumber,
        user_id: body.user_id,
        start_date: body.start_date,
        return_date: body.return_date,
        status,
        notes: body.notes ?? null,
        created_at: now,
        completed_at: completedAt,
        created_by_admin_id: createdByAdminId,
      });

      const insertItem = db.prepare(
        `INSERT INTO bon_items (bon_id, material_id, set_id, quantity) VALUES (?, ?, ?, ?)`,
      );
      for (const it of body.items) {
        insertItem.run(info.lastInsertRowid, it.material_id ?? null, it.set_id ?? null, it.quantity);
      }
      return info.lastInsertRowid;
    });
    createdId = tx();
  } catch (err) {
    if (handleUniqueError(err, res)) return;
    throw err;
  }

  const created = loadBonWithItems(createdId);
  const itemsStr = formatBonItems(created.items);
  const detail = created.created_by_admin_id
    ? `${created.bon_number} aangemaakt door ${req.user.name} namens ${created.user_name || 'onbekende gebruiker'}: ${itemsStr}`
    : `${created.bon_number} aangemaakt voor ${created.user_name || 'onbekende gebruiker'}: ${itemsStr}`;
  logAction('bon_create', detail, req.user.id);

  // Bevestigingsmail — fire and forget. Reserveringen vallen onder
  // notify_reservation, directe uitleningen onder notify_pickup (het is dan
  // in één handeling aangemaakt én opgehaald). sendMail is intern fout-
  // tolerant en logt zelf.
  const isReservation = created.status === 'reserved';
  const prefKey = isReservation ? 'notify_reservation' : 'notify_pickup';
  const kindLabel = isReservation ? 'Reserveringsbevestiging' : 'Ophaalbevestiging';
  const borrower = db.prepare(
    `SELECT email, notify_reservation, notify_pickup FROM users WHERE id = ?`
  ).get(created.user_id);
  const email = borrower && typeof borrower.email === 'string' ? borrower.email.trim() : '';
  if (!email) {
    logAction('mail_skipped', `${kindLabel} voor ${created.bon_number} overgeslagen: gebruiker heeft geen e-mailadres`);
  // Aanhakingspunt: externe huurders (ronde B) omzeilen deze check straks;
  // voor hen gaan reservering-, ophaal- en herinneringsmail altijd.
  } else if (borrower[prefKey] !== 1) {
    logAction('mail_skipped', `${kindLabel} voor ${created.bon_number} overgeslagen: gebruiker heeft deze mail uitgezet`);
  } else {
    const tpl = bonConfirmation(created);
    sendMail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      context: created.bon_number,
    }).catch((err) => {
      console.error(`[bons] onverwachte mailfout voor ${created.bon_number}: ${err.message}`);
    });
  }

  res.status(201).json(created);
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM bons WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'bon niet gevonden' });

  // Beschermde velden: niet aanpasbaar via PUT.
  // (items wordt apart afgehandeld in een latere sub-stap.)
  const {
    id: _id, bon_number: _bn, created_at: _ca, status: _st, completed_at: _cp, items: _it,
    ...body
  } = req.body || {};

  let user_id = existing.user_id;
  if (body.user_id !== undefined) {
    if (!Number.isInteger(body.user_id)) {
      return res.status(400).json({ error: "veld 'user_id' moet een integer zijn" });
    }
    const u = db.prepare('SELECT id FROM users WHERE id = ?').get(body.user_id);
    if (!u) return res.status(400).json({ error: 'user_id verwijst naar een onbekende gebruiker' });
    user_id = body.user_id;
  }

  let start_date = existing.start_date;
  if (body.start_date !== undefined) {
    if (!parseDate(body.start_date)) return res.status(400).json({ error: "veld 'start_date' moet een geldige datum/tijd zijn" });
    start_date = body.start_date;
  }
  let return_date = existing.return_date;
  if (body.return_date !== undefined) {
    if (!parseDate(body.return_date)) return res.status(400).json({ error: "veld 'return_date' moet een geldige datum/tijd zijn" });
    return_date = body.return_date;
  }
  if (parseDate(return_date) <= parseDate(start_date)) {
    return res.status(400).json({ error: "'return_date' moet na 'start_date' liggen" });
  }
  if (isWeekendDate(parseDate(start_date))) {
    return res.status(400).json({ error: 'Ophaaldatum kan alleen op een werkdag vallen. Kies maandag t/m vrijdag.' });
  }
  if (isWeekendDate(parseDate(return_date))) {
    return res.status(400).json({ error: 'Retourdatum kan alleen op een werkdag vallen. Kies maandag t/m vrijdag.' });
  }

  let notes = existing.notes;
  if (body.notes !== undefined) {
    if (body.notes !== null && typeof body.notes !== 'string') {
      return res.status(400).json({ error: "veld 'notes' moet een string of null zijn" });
    }
    notes = body.notes;
  }

  const status = computeStatus(start_date, return_date);
  const now = nowDutchISO();
  let completed_at = existing.completed_at;
  if (status === 'completed' && !completed_at) completed_at = now;
  if (status !== 'completed') completed_at = null;

  db.prepare(`
    UPDATE bons SET
      user_id = @user_id, start_date = @start_date, return_date = @return_date,
      notes = @notes, status = @status, completed_at = @completed_at
    WHERE id = @id
  `).run({ user_id, start_date, return_date, notes, status, completed_at, id: existing.id });

  const updated = loadBonWithItems(existing.id);
  const changes = [];
  if (user_id !== existing.user_id) {
    const oldName = db.prepare('SELECT name FROM users WHERE id = ?').get(existing.user_id)?.name || '?';
    changes.push(`gebruiker '${oldName}' → '${updated.user_name || '?'}'`);
  }
  if (start_date !== existing.start_date) changes.push(`startdatum ${shortDate(existing.start_date)} → ${shortDate(start_date)}`);
  if (return_date !== existing.return_date) changes.push(`retourdatum ${shortDate(existing.return_date)} → ${shortDate(return_date)}`);
  if ((notes || '') !== (existing.notes || '')) changes.push('opmerking aangepast');
  if (changes.length > 0) {
    logAction('bon_update', `${updated.bon_number} bijgewerkt: ${changes.join(', ')}`, req.user.id);
  }
  res.json(updated);
});

router.delete('/:id', requireAdmin, (req, res) => {
  const existing = loadBonWithItems(req.params.id);
  if (!existing) return res.status(404).json({ error: 'bon niet gevonden' });
  const info = db.prepare('DELETE FROM bons WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'bon niet gevonden' });
  logAction(
    'bon_delete',
    `${existing.bon_number} verwijderd (${existing.user_name || 'onbekende gebruiker'})`,
    req.user.id,
  );
  res.json({ deleted: true });
});

router.post('/:id/pickup', (req, res) => {
  const bon = db.prepare('SELECT * FROM bons WHERE id = ?').get(req.params.id);
  if (!assertOwnBonOrAdmin(req, res, bon)) return;
  if (bon.status !== 'reserved') {
    return res.status(409).json({
      error: `pickup alleen toegestaan op een gereserveerde bon (huidige status: ${bon.status})`,
    });
  }

  const tx = db.transaction(() => {
    db.prepare('UPDATE bons SET status = ? WHERE id = ?').run('active', bon.id);
    db.prepare('UPDATE bon_items SET picked_up = 1 WHERE bon_id = ?').run(bon.id);
  });
  tx();

  const updated = loadBonWithItems(bon.id);

  // Ophaalbevestiging. Zelfde patroon als bij bon-create: fire and forget,
  // sendMail vangt fouten zelf af.
  const borrower = db.prepare(
    `SELECT email, notify_pickup FROM users WHERE id = ?`
  ).get(updated.user_id);
  const email = borrower && typeof borrower.email === 'string' ? borrower.email.trim() : '';
  if (!email) {
    logAction('mail_skipped', `Ophaalbevestiging voor ${updated.bon_number} overgeslagen: gebruiker heeft geen e-mailadres`);
  // Aanhakingspunt externe huurders (ronde B): pref-check overslaan.
  } else if (borrower.notify_pickup !== 1) {
    logAction('mail_skipped', `Ophaalbevestiging voor ${updated.bon_number} overgeslagen: gebruiker heeft deze mail uitgezet`);
  } else {
    const tpl = bonConfirmation(updated);
    sendMail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      context: `${updated.bon_number} opgehaald`,
    }).catch((err) => {
      console.error(`[bons] onverwachte mailfout bij pickup ${updated.bon_number}: ${err.message}`);
    });
  }

  res.json(updated);
});

router.post('/:id/return', (req, res) => {
  const bon = db.prepare('SELECT * FROM bons WHERE id = ?').get(req.params.id);
  if (!assertOwnBonOrAdmin(req, res, bon)) return;
  if (bon.status !== 'active') {
    return res.status(409).json({
      error: `return alleen toegestaan op een actieve bon (huidige status: ${bon.status})`,
    });
  }

  const allItemIds = new Set(
    db.prepare('SELECT id FROM bon_items WHERE bon_id = ?').all(bon.id).map((r) => r.id),
  );

  const body = req.body || {};
  let idsToMark;
  if (!Array.isArray(body.items) || body.items.length === 0) {
    idsToMark = [...allItemIds];
  } else {
    idsToMark = [];
    for (const [idx, item] of body.items.entries()) {
      if (!item || !Number.isInteger(item.id)) {
        return res.status(400).json({ error: `items[${idx}]: 'id' moet een integer zijn` });
      }
      if (!allItemIds.has(item.id)) {
        return res.status(400).json({
          error: `items[${idx}]: id ${item.id} hoort niet bij bon ${bon.id}`,
        });
      }
      // returned: false expliciet → item overslaan; alle andere waarden (true, undefined) → markeren
      if (item.returned === false) continue;
      idsToMark.push(item.id);
    }
  }

  // Snapshot van de betrokken items (met namen) vóór de mutatie, zodat de
  // logregel kan vermelden wat er precies retour is gebracht.
  let returnedNames = [];
  if (idsToMark.length > 0) {
    const placeholders = idsToMark.map(() => '?').join(',');
    returnedNames = db.prepare(`
      SELECT bi.quantity, m.name AS material_name, s.name AS set_name
      FROM bon_items bi
      LEFT JOIN materials m ON m.id = bi.material_id
      LEFT JOIN sets s ON s.id = bi.set_id
      WHERE bi.id IN (${placeholders})
    `).all(...idsToMark);
  }

  const now = nowDutchISO();
  let bonCompleted = false;
  const tx = db.transaction(() => {
    if (idsToMark.length > 0) {
      const placeholders = idsToMark.map(() => '?').join(',');
      db.prepare(`UPDATE bon_items SET returned = 1 WHERE id IN (${placeholders})`).run(...idsToMark);
    }
    const { c: openCount } = db.prepare(
      'SELECT COUNT(*) AS c FROM bon_items WHERE bon_id = ? AND returned = 0',
    ).get(bon.id);
    if (openCount === 0) {
      db.prepare('UPDATE bons SET status = ?, completed_at = ? WHERE id = ?')
        .run('completed', now, bon.id);
      bonCompleted = true;
    }
  });
  tx();

  const result = loadBonWithItems(bon.id);
  if (idsToMark.length > 0) {
    const itemsStr = formatBonItems(returnedNames);
    const suffix = bonCompleted ? ' (bon voltooid)' : '';
    logAction(
      'bon_return',
      `Retour ${result.bon_number} voor ${result.user_name || 'onbekende gebruiker'}: ${itemsStr} geretourneerd${suffix}`,
      req.user.id,
    );
  }

  res.json(result);
});

module.exports = router;
