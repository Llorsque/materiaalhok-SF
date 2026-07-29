const express = require('express');
const db = require('../db');
const { nowDutchISO, handleUniqueError, logAction, getSetting } = require('../utils');
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

// Intentie → status. De frontend weet of het een reservering of een directe
// uitlening is (twee gescheiden knoppen); die intentie is leidend, niet de
// datum. Reserveringen blijven 'reserved' tot ze via POST /:id/pickup zijn
// opgehaald, ook als de startdatum al is aangebroken. 'completed' wordt
// uitsluitend via de retour-flow gezet.
function statusFromIntent(intent) {
  if (intent === 'reservation') return 'reserved';
  if (intent === 'loan')        return 'active';
  return null;
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

    const item = db.prepare(`SELECT id, name, stock, available_status FROM ${table} WHERE id = ?`).get(req.id);
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
    // Ronde B: unieke items die kwijt of kapot zijn, staan buiten dienst.
    // Beschikbaarheid is dan 0 ongeacht stock — een reservering kan er niet
    // op landen tot een admin de schade afhandelt.
    if (item.available_status === 'out_of_service') {
      conflicts.push({
        [idCol]: req.id,
        [nameCol]: item.name,
        gevraagd: req.quantity,
        beschikbaar: 0,
        reden: 'buiten dienst (kwijt/kapot)',
      });
      continue;
    }

    let sql = `
      SELECT COALESCE(SUM(bi.quantity), 0) AS reserved
      FROM bon_items bi
      JOIN bons b ON b.id = bi.bon_id
      WHERE bi.${idCol} = ?
        AND bi.returned = 0
        AND bi.removed_at_pickup = 0
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

// is_external is een afgeleide vlag (1/0) op basis van user_id. De frontend
// gebruikt 'm om labels en betaal-info te tonen zonder zelf hoeven te
// checken op user_id IS NULL. Externe kolommen (external_*, rental_price,
// deposit, payment_status) komen via b.* mee.
function loadBonWithItems(id) {
  const bon = db.prepare(`
    SELECT b.*, u.name AS user_name, a.name AS created_by_admin_name,
           CASE WHEN b.user_id IS NULL THEN 1 ELSE 0 END AS is_external
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
  // Nieuwste bovenaan (id monotoon, functioneel gelijk aan created_at DESC).
  // Plekken die een specifieke volgorde nodig hebben (dashboard-blokken,
  // UserHome) sorteren zelf; die zijn ongevoelig voor de default.
  const bons = admin
    ? db.prepare(`
        SELECT b.*, u.name AS user_name, a.name AS created_by_admin_name,
               CASE WHEN b.user_id IS NULL THEN 1 ELSE 0 END AS is_external
        FROM bons b
        LEFT JOIN users u ON u.id = b.user_id
        LEFT JOIN users a ON a.id = b.created_by_admin_id
        ORDER BY b.id DESC
      `).all()
    : db.prepare(`
        SELECT b.*, u.name AS user_name, a.name AS created_by_admin_name,
               CASE WHEN b.user_id IS NULL THEN 1 ELSE 0 END AS is_external
        FROM bons b
        LEFT JOIN users u ON u.id = b.user_id
        LEFT JOIN users a ON a.id = b.created_by_admin_id
        WHERE b.user_id = ?
        ORDER BY b.id DESC
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
  const externalRaw = body.external;
  const isExternal = externalRaw != null && typeof externalRaw === 'object';

  // v1.12.0 externe verhuur — takken splitsen. Bij een externe bon:
  // - alleen een admin mag 'm aanmaken;
  // - user_id blijft NULL en wordt uit de body genegeerd;
  // - status is altijd 'reserved' (weiger 'loan' met duidelijke melding);
  // - org + email zijn verplicht, contact/phone optioneel;
  // - rental_price en deposit zijn getallen ≥ 0 (default 0);
  // - payment_status is 'open' bij prijs > 0, anders NULL.
  let external = null;
  if (isExternal) {
    if (!actorIsAdmin) {
      return res.status(403).json({ error: 'Alleen admins mogen een externe reservering aanmaken.' });
    }
    if (body.intent !== 'reservation') {
      return res.status(400).json({
        error: 'Externe verhuur gaat altijd via een reservering. Kies "reserveren" in plaats van direct uitlenen.',
      });
    }
    const org = typeof externalRaw.org === 'string' ? externalRaw.org.trim() : '';
    if (!org) {
      return res.status(400).json({ error: "Organisatienaam is verplicht bij een externe reservering." });
    }
    const email = typeof externalRaw.email === 'string' ? externalRaw.email.trim() : '';
    if (!email) {
      return res.status(400).json({ error: "E-mailadres is verplicht bij een externe reservering." });
    }
    const contact = typeof externalRaw.contact === 'string' ? externalRaw.contact.trim() : '';
    const phone   = typeof externalRaw.phone   === 'string' ? externalRaw.phone.trim()   : '';
    const rentalPrice = externalRaw.rental_price == null ? 0 : Number(externalRaw.rental_price);
    const deposit     = externalRaw.deposit     == null ? 0 : Number(externalRaw.deposit);
    if (!Number.isFinite(rentalPrice) || rentalPrice < 0) {
      return res.status(400).json({ error: "Huurprijs moet 0 of hoger zijn." });
    }
    if (!Number.isFinite(deposit) || deposit < 0) {
      return res.status(400).json({ error: "Borg moet 0 of hoger zijn." });
    }
    external = {
      org,
      contact: contact || null,
      phone:   phone   || null,
      email,
      rental_price: rentalPrice,
      deposit,
      payment_status: rentalPrice > 0 ? 'open' : null,
    };
    // Bij een externe bon negeren we user_id volledig (was mogelijk per
    // ongeluk meegestuurd door een oude client) en slaan de user-checks
    // hieronder over.
    body.user_id = null;
  } else {
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

  // Intent — leidend voor status. 'reservation' → 'reserved' (blijft ook
  // 'reserved' na start_date, ophalen gaat via POST /:id/pickup). 'loan' →
  // meteen 'active'. Verplicht sinds v1.8.0; oude clients die dit veld nog
  // niet meesturen krijgen een duidelijke 400.
  const status = statusFromIntent(body.intent);
  if (!status) {
    return res.status(400).json({
      error: "veld 'intent' moet 'reservation' of 'loan' zijn",
    });
  }

  const conflicts = checkStock(body.items, {
    start_date: body.start_date,
    return_date: body.return_date,
  });
  if (conflicts.length > 0) {
    return res.status(409).json({ error: 'onvoldoende voorraad', details: conflicts });
  }

  const now = nowDutchISO();
  // completed_at wordt uitsluitend gezet door de retour-flow; nooit bij create.
  const completedAt = null;
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
          (bon_number, user_id, start_date, return_date, status, notes, created_at, completed_at, created_by_admin_id,
           external_org, external_contact, external_phone, external_email, rental_price, deposit, payment_status)
        VALUES
          (@bon_number, @user_id, @start_date, @return_date, @status, @notes, @created_at, @completed_at, @created_by_admin_id,
           @external_org, @external_contact, @external_phone, @external_email, @rental_price, @deposit, @payment_status)
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
        external_org:     external ? external.org     : null,
        external_contact: external ? external.contact : null,
        external_phone:   external ? external.phone   : null,
        external_email:   external ? external.email   : null,
        // De DB-kolommen hebben NOT NULL DEFAULT 0; bij een interne bon
        // schrijven we expliciet 0 zodat de intent duidelijk is en er
        // geen SQL-defaults nodig zijn buiten de kolomdefinitie om.
        rental_price:   external ? external.rental_price   : 0,
        deposit:        external ? external.deposit        : 0,
        payment_status: external ? external.payment_status : null,
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
  let detail;
  if (created.is_external) {
    detail = `Externe reservering ${created.bon_number} aangemaakt voor ${created.external_org} door ${req.user.name}: ${itemsStr}`;
  } else if (created.created_by_admin_id) {
    detail = `${created.bon_number} aangemaakt door ${req.user.name} namens ${created.user_name || 'onbekende gebruiker'}: ${itemsStr}`;
  } else {
    detail = `${created.bon_number} aangemaakt voor ${created.user_name || 'onbekende gebruiker'}: ${itemsStr}`;
  }
  logAction('bon_create', detail, req.user.id);

  // Bevestigingsmail — fire and forget. Reserveringen vallen onder
  // notify_reservation, directe uitleningen onder notify_pickup (het is dan
  // in één handeling aangemaakt én opgehaald). sendMail is intern fout-
  // tolerant en logt zelf.
  //
  // Externe huurders: mailen we ALTIJD (geen account, geen prefs). Adres
  // komt uit external_email. Bij een externe reservering laden we ook de
  // huurvoorwaarden uit de settings-tabel — die staan alleen in deze
  // reserveringsmail, niet in de ophaal- en herinneringsmail.
  {
    const isReservation = created.status === 'reserved';
    const kindLabel = isReservation ? 'Reserveringsbevestiging' : 'Ophaalbevestiging';
    if (created.is_external) {
      const email = typeof created.external_email === 'string' ? created.external_email.trim() : '';
      if (!email) {
        logAction('mail_skipped', `${kindLabel} voor ${created.bon_number} overgeslagen: externe huurder heeft geen e-mailadres`);
      } else {
        const rentalTerms = isReservation ? (getSetting('rental_terms', '') || '') : '';
        const tpl = bonConfirmation(created, { rentalTerms });
        sendMail({
          to: email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          context: `${created.bon_number} (extern)`,
        }).catch((err) => {
          console.error(`[bons] onverwachte mailfout voor ${created.bon_number}: ${err.message}`);
        });
      }
    } else {
      const prefKey = isReservation ? 'notify_reservation' : 'notify_pickup';
      const borrower = db.prepare(
        `SELECT email, notify_reservation, notify_pickup FROM users WHERE id = ?`
      ).get(created.user_id);
      const email = borrower && typeof borrower.email === 'string' ? borrower.email.trim() : '';
      if (!email) {
        logAction('mail_skipped', `${kindLabel} voor ${created.bon_number} overgeslagen: gebruiker heeft geen e-mailadres`);
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
    }
  }

  res.status(201).json(created);
});

// PUT /:id blijft admin-only. Ronde B (BESLUITEN.md): de retourdatum ligt
// na de reservering vast voor de gebruiker; wie later terug wil, maakt een
// nieuwe reservering. Een admin mag 'm in uitzonderingsgevallen nog
// verschuiven — daarom staat de datumcheck nog gewoon open in deze handler.
// Omdat requireAdmin ervoor staat, krijgt een gewone gebruiker die dit
// endpoint aanroept al een 403 met "Alleen admins mogen deze actie
// uitvoeren." — precies de garantie die Ronde B vraagt.
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

  // Status en completed_at worden NIET meer afgeleid uit de datums. Datums
  // zijn puur planning; de statusovergangen gebeuren via de pickup- en
  // retour-endpoints. Een admin die een gereserveerde bon een andere
  // startdatum geeft, houdt daarmee gewoon een reservering.
  const status       = existing.status;
  const completed_at = existing.completed_at;

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

// v1.14.0: markeer een externe bon met openstaande betaling als betaald.
// Alleen admins; alleen geldig voor externe bonnen met payment_status='open'.
// Als tegelijk al het materiaal retour is, ronden we de bon meteen af
// ('completed' + completed_at). Anders blijft 'ie lopen tot het materiaal
// alsnog terugkomt (de retour-flow ziet dan 'paid' en sluit 'm alsnog).
router.patch('/:id/payment', requireAdmin, (req, res) => {
  const bon = db.prepare('SELECT * FROM bons WHERE id = ?').get(req.params.id);
  if (!bon) return res.status(404).json({ error: 'bon niet gevonden' });

  const body = req.body || {};
  if (body.payment_status !== 'paid') {
    return res.status(400).json({
      error: "veld 'payment_status' moet 'paid' zijn — andere transities zijn niet toegestaan",
    });
  }
  if (bon.user_id != null) {
    return res.status(400).json({ error: 'Betaalstatus is alleen van toepassing op externe bonnen.' });
  }
  if (bon.payment_status !== 'open') {
    return res.status(409).json({
      error: `Deze bon heeft geen openstaande betaling (huidige betaalstatus: ${bon.payment_status ?? 'geen'}).`,
    });
  }
  if (bon.status === 'completed') {
    // Defense in depth: een 'completed' bon zou geen 'open' payment mogen
    // hebben, maar mocht het toch voorkomen dan weigeren we hier netjes.
    return res.status(409).json({ error: 'Deze bon is al afgerond.' });
  }

  const now = nowDutchISO();
  let bonCompleted = false;
  const tx = db.transaction(() => {
    db.prepare('UPDATE bons SET payment_status = ? WHERE id = ?').run('paid', bon.id);
    // Materiaal al volledig binnen én de bon staat in 'active' (dus opgehaald)?
    // Dan is de betaling de laatste ontbrekende puzzelstukje.
    const { c: openCount } = db.prepare(
      'SELECT COUNT(*) AS c FROM bon_items WHERE bon_id = ? AND returned = 0 AND removed_at_pickup = 0',
    ).get(bon.id);
    if (openCount === 0 && bon.status === 'active') {
      db.prepare('UPDATE bons SET status = ?, completed_at = ? WHERE id = ?')
        .run('completed', now, bon.id);
      bonCompleted = true;
    }
  });
  tx();

  const updated = loadBonWithItems(bon.id);
  const orgLabel = updated.external_org || 'externe huurder';
  logAction(
    'payment_received',
    `Betaling ontvangen voor ${updated.bon_number} (${orgLabel})`,
    req.user.id,
  );
  if (bonCompleted) {
    logAction(
      'bon_completed',
      `${updated.bon_number} afgerond (${orgLabel}) — materiaal was retour, betaling nu binnen`,
      req.user.id,
    );
  }
  res.json(updated);
});

// Ophalen — Ronde B (v1.8.0): reservering wordt definitieve bon.
// Body:
//   remove: [bon_item_id]                          — hele item soft-deleten
//   keep:   [{ id: bon_item_id, quantity: N }]     — meegenomen aantal per item
//   add:    [{ kind, id, quantity }]               — nieuw materiaal toevoegen
//
// keep is nieuw in de scan-flow: bij een bulk-item waar de gebruiker minder
// scant dan gereserveerd, splitst de backend het item op. De originele rij
// krijgt het gescande aantal (picked_up=1) en er komt een schaduw-rij bij
// met het restant (removed_at_pickup=1, picked_up=0). Zo blijft de audit-
// trail volledig en werken retour, beschikbaarheid en mail-templates
// onveranderd (soft-delete-rijen tellen nergens mee).
//
// Ontbreekt keep voor een item, dan blijft dat item onveranderd staan als
// "volledig meegenomen" — backwards compatible met de "kaal opnemen"-call.
router.post('/:id/pickup', (req, res) => {
  const bon = db.prepare('SELECT * FROM bons WHERE id = ?').get(req.params.id);
  if (!assertOwnBonOrAdmin(req, res, bon)) return;
  if (bon.status !== 'reserved') {
    return res.status(409).json({
      error: `pickup alleen toegestaan op een gereserveerde bon (huidige status: ${bon.status})`,
    });
  }

  const body = req.body || {};
  const removeIds = Array.isArray(body.remove) ? body.remove : [];
  const keepRaw   = Array.isArray(body.keep)   ? body.keep   : [];
  const addRaw    = Array.isArray(body.add)    ? body.add    : [];

  const currentItems = db.prepare(
    'SELECT id, material_id, set_id, quantity, removed_at_pickup FROM bon_items WHERE bon_id = ?'
  ).all(bon.id);
  const currentById = new Map(currentItems.map((r) => [r.id, r]));

  // -- Valideer remove --------------------------------------------------
  const removeSet = new Set();
  for (const [idx, id] of removeIds.entries()) {
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: `remove[${idx}]: id moet een integer zijn` });
    }
    const row = currentById.get(id);
    if (!row) {
      return res.status(400).json({ error: `remove[${idx}]: id ${id} hoort niet bij bon ${bon.id}` });
    }
    if (row.removed_at_pickup === 1) {
      return res.status(400).json({ error: `remove[${idx}]: id ${id} is al eerder verwijderd bij ophalen` });
    }
    removeSet.add(id);
  }

  // -- Valideer keep -----------------------------------------------------
  // Iedere entry: id op bon, niet in remove, quantity 1..originele quantity.
  const keepMap = new Map(); // id → gewenste quantity
  for (const [idx, entry] of keepRaw.entries()) {
    if (!entry || !Number.isInteger(entry.id)) {
      return res.status(400).json({ error: `keep[${idx}]: 'id' moet een integer zijn` });
    }
    const row = currentById.get(entry.id);
    if (!row) {
      return res.status(400).json({ error: `keep[${idx}]: id ${entry.id} hoort niet bij bon ${bon.id}` });
    }
    if (row.removed_at_pickup === 1) {
      return res.status(400).json({ error: `keep[${idx}]: id ${entry.id} is al soft-deleted` });
    }
    if (removeSet.has(entry.id)) {
      return res.status(400).json({ error: `keep[${idx}]: id ${entry.id} staat ook in remove — kies één` });
    }
    if (!Number.isInteger(entry.quantity) || entry.quantity <= 0) {
      return res.status(400).json({
        error: `keep[${idx}]: 'quantity' moet een positief geheel getal zijn — gebruik remove voor 0 meenemen`,
      });
    }
    if (entry.quantity > row.quantity) {
      return res.status(400).json({
        error: `keep[${idx}]: gevraagde ${entry.quantity} is meer dan gereserveerd (${row.quantity})`,
      });
    }
    if (keepMap.has(entry.id)) {
      return res.status(400).json({ error: `keep[${idx}]: id ${entry.id} komt dubbel voor` });
    }
    keepMap.set(entry.id, entry.quantity);
  }

  // -- Valideer + normaliseer add ---------------------------------------
  const normalizedAdd = [];
  for (const [idx, item] of addRaw.entries()) {
    if (!item || (item.kind !== 'material' && item.kind !== 'set')) {
      return res.status(400).json({ error: `add[${idx}]: 'kind' moet 'material' of 'set' zijn` });
    }
    if (!Number.isInteger(item.id)) {
      return res.status(400).json({ error: `add[${idx}]: 'id' moet een integer zijn` });
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return res.status(400).json({ error: `add[${idx}]: 'quantity' moet een positief geheel getal zijn` });
    }
    normalizedAdd.push({
      material_id: item.kind === 'material' ? item.id : null,
      set_id:      item.kind === 'set'      ? item.id : null,
      quantity:    item.quantity,
    });
  }

  // -- Mutatie + beschikbaarheidscheck in één transactie ---------------
  // We doen eerst remove/split zodat de eigen reservering al is verlaagd
  // naar de kept-hoeveelheden. Daarna checkStock zonder excludeBonId:
  // resterende reservering (kept) telt nu correct mee bij het bepalen van
  // hoeveel er nog toegevoegd mag worden. Voorheen (v1.8.0) gebruikten we
  // excludeBonId, wat bij "alles behouden + zelfde materiaal toevoegen"
  // een oversubscribe kon toestaan.
  let stockConflicts = null;
  try {
    const tx = db.transaction(() => {
      // 1) Soft-delete de items die de gebruiker expliciet "niet meenemen"
      //    heeft gemarkeerd.
      if (removeIds.length > 0) {
        const placeholders = removeIds.map(() => '?').join(',');
        db.prepare(
          `UPDATE bon_items SET removed_at_pickup = 1, picked_up = 0 WHERE id IN (${placeholders})`
        ).run(...removeIds);
      }

      // 2) Splits partiële bulk-items en pas de kept-quantities aan.
      //    - Originele rij: quantity=kept, picked_up=1
      //    - Schaduw-rij:   quantity=vrijgekomen, removed_at_pickup=1, picked_up=0
      const updateQty = db.prepare(
        `UPDATE bon_items SET quantity = ?, picked_up = 1 WHERE id = ?`
      );
      const insertFreed = db.prepare(
        `INSERT INTO bon_items (bon_id, material_id, set_id, quantity, picked_up, removed_at_pickup)
         VALUES (?, ?, ?, ?, 0, 1)`,
      );
      for (const row of currentItems) {
        if (row.removed_at_pickup === 1) continue;
        if (removeSet.has(row.id)) continue;
        const requested = keepMap.get(row.id);
        if (requested === undefined || requested === row.quantity) continue;
        updateQty.run(requested, row.id);
        insertFreed.run(bon.id, row.material_id, row.set_id, row.quantity - requested);
      }

      // 3) Alle nog-niet-verwijderde items zijn nu opgehaald.
      db.prepare(
        `UPDATE bon_items SET picked_up = 1 WHERE bon_id = ? AND removed_at_pickup = 0`
      ).run(bon.id);

      // 4) NU pas de beschikbaarheidscheck voor toegevoegde items. Deze bon
      //    telt nu met de gereduceerde kept-hoeveelheden mee — een correcte
      //    weergave van "wat is er nog voor anderen én voor onze extra add".
      if (normalizedAdd.length > 0) {
        stockConflicts = checkStock(
          normalizedAdd,
          { start_date: bon.start_date, return_date: bon.return_date },
        );
        if (stockConflicts.length > 0) {
          // Gooi een sentinel-fout zodat de transactie automatisch rolt.
          const err = new Error('__STOCK_CONFLICT__');
          err.code = '__STOCK_CONFLICT__';
          throw err;
        }

        // 5) Toegevoegde items: added_at_pickup=1, direct opgehaald.
        const stmt = db.prepare(
          `INSERT INTO bon_items (bon_id, material_id, set_id, quantity, picked_up, added_at_pickup)
           VALUES (?, ?, ?, ?, 1, 1)`,
        );
        for (const a of normalizedAdd) {
          stmt.run(bon.id, a.material_id, a.set_id, a.quantity);
        }
      }
      db.prepare('UPDATE bons SET status = ? WHERE id = ?').run('active', bon.id);
    });
    tx();
  } catch (err) {
    if (err.code === '__STOCK_CONFLICT__') {
      return res.status(409).json({
        error: 'onvoldoende voorraad voor toegevoegd materiaal',
        details: stockConflicts,
      });
    }
    return res.status(500).json({ error: `Ophalen mislukt: ${err.message}` });
  }

  const updated = loadBonWithItems(bon.id);
  const items = updated.items || [];
  const kept    = items.filter((i) => i.removed_at_pickup === 0);
  const removed = items.filter((i) => i.removed_at_pickup === 1);
  const added   = items.filter((i) => i.added_at_pickup    === 1 && i.removed_at_pickup === 0);

  // Log — vermeld expliciet wat er is toegevoegd of weggelaten t.o.v. de
  // oorspronkelijke reservering, zodat de audit-regel op zich al leesbaar is.
  const displayFor = updated.is_external
    ? updated.external_org
    : (updated.user_name || 'onbekende gebruiker');
  const parts = [
    `${updated.bon_number} opgehaald voor ${displayFor}: ${formatBonItems(kept)}`,
  ];
  if (removed.length > 0) parts.push(`niet meegenomen: ${formatBonItems(removed)}`);
  if (added.length   > 0) parts.push(`toegevoegd bij ophalen: ${formatBonItems(added)}`);
  logAction('bon_pickup', parts.join(' — '), req.user.id);

  // -- Ophaalbevestiging -------------------------------------------------
  // Extern: adres uit external_email, geen pref-check. Intern: users-tabel
  // + notify_pickup. De mail toont alleen de definitieve, meegenomen items —
  // soft-deleted regels zijn puur voor de audit-trail in admin-detail.
  {
    const bonForMail = { ...updated, items: kept };
    if (updated.is_external) {
      const email = typeof updated.external_email === 'string' ? updated.external_email.trim() : '';
      if (!email) {
        logAction('mail_skipped', `Ophaalbevestiging voor ${updated.bon_number} overgeslagen: externe huurder heeft geen e-mailadres`);
      } else {
        const tpl = bonConfirmation(bonForMail);
        sendMail({
          to: email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          context: `${updated.bon_number} opgehaald (extern)`,
        }).catch((err) => {
          console.error(`[bons] onverwachte mailfout bij pickup ${updated.bon_number}: ${err.message}`);
        });
      }
    } else {
      const borrower = db.prepare(
        `SELECT email, notify_pickup FROM users WHERE id = ?`
      ).get(updated.user_id);
      const email = borrower && typeof borrower.email === 'string' ? borrower.email.trim() : '';
      if (!email) {
        logAction('mail_skipped', `Ophaalbevestiging voor ${updated.bon_number} overgeslagen: gebruiker heeft geen e-mailadres`);
      } else if (borrower.notify_pickup !== 1) {
        logAction('mail_skipped', `Ophaalbevestiging voor ${updated.bon_number} overgeslagen: gebruiker heeft deze mail uitgezet`);
      } else {
        const tpl = bonConfirmation(bonForMail);
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
    }
  }

  res.json(updated);
});

// Ronde B blok 2 — retour met kwijt/kapot melden.
// Body:
//   items: [{ id, condition: 'returned'|'lost'|'broken', quantity }]
//     Weglaten of leeg → alle openstaande items volledig als 'returned'
//     afhandelen (achterwaarts compatibel met de kaal-retour-call).
// Voor bulk-items met quantity > 1 mogen meerdere entries voor hetzelfde
// bon_item.id staan (bv. 2 retour + 1 kwijt). De backend splitst het
// bon_item dan in aparte rijen met eigen `return_condition` en `quantity`,
// analoog aan de pickup-split. Bij lost/broken wordt tegelijk een
// damage_reports-rij aangemaakt en de voorraad direct gemuteerd: bulk
// zakt in aantal, uniek gaat naar `available_status = 'out_of_service'`.
router.post('/:id/return', (req, res) => {
  const bon = db.prepare('SELECT * FROM bons WHERE id = ?').get(req.params.id);
  if (!assertOwnBonOrAdmin(req, res, bon)) return;
  if (bon.status !== 'active') {
    return res.status(409).json({
      error: `return alleen toegestaan op een actieve bon (huidige status: ${bon.status})`,
    });
  }

  // Alle openstaande items (returned=0) die daadwerkelijk uit het hok zijn
  // gegaan (removed_at_pickup=0). Deze mogen gemuteerd worden.
  const openItems = db.prepare(`
    SELECT bi.id, bi.bon_id, bi.material_id, bi.set_id, bi.quantity,
           bi.picked_up, bi.added_at_pickup, bi.removed_at_pickup,
           m.name AS material_name, m.type AS material_type,
           s.name AS set_name
    FROM bon_items bi
    LEFT JOIN materials m ON m.id = bi.material_id
    LEFT JOIN sets s ON s.id = bi.set_id
    WHERE bi.bon_id = ? AND bi.returned = 0 AND bi.removed_at_pickup = 0
  `).all(bon.id);
  const openById = new Map(openItems.map((it) => [it.id, it]));

  // Aggregeer client-entries per (bon_item_id, condition). Meerdere entries
  // voor dezelfde combinatie tellen bij elkaar op.
  const body = req.body || {};
  let entriesByItem; // Map<bon_item_id, { returned, lost, broken }>

  if (!Array.isArray(body.items) || body.items.length === 0) {
    // Achterwaarts compatibel: kaal retour = alles volledig 'returned'.
    entriesByItem = new Map();
    for (const it of openItems) {
      entriesByItem.set(it.id, { returned: it.quantity, lost: 0, broken: 0 });
    }
  } else {
    entriesByItem = new Map();
    for (const [idx, entry] of body.items.entries()) {
      if (!entry || !Number.isInteger(entry.id)) {
        return res.status(400).json({ error: `items[${idx}]: 'id' moet een integer zijn` });
      }
      if (!openById.has(entry.id)) {
        return res.status(400).json({
          error: `items[${idx}]: id ${entry.id} hoort niet bij bon ${bon.id} of is al afgehandeld`,
        });
      }
      // Achterwaartse compatibiliteit: als er alleen { id, returned: true } binnenkomt
      // (oude client), reken dat als volledig retour.
      if (entry.condition === undefined && (entry.returned === true || entry.returned === undefined)) {
        const cur = entriesByItem.get(entry.id) || { returned: 0, lost: 0, broken: 0 };
        cur.returned += openById.get(entry.id).quantity - (cur.returned + cur.lost + cur.broken);
        entriesByItem.set(entry.id, cur);
        continue;
      }
      if (entry.condition === undefined && entry.returned === false) continue;

      if (entry.condition !== 'returned' && entry.condition !== 'lost' && entry.condition !== 'broken') {
        return res.status(400).json({
          error: `items[${idx}]: 'condition' moet 'returned', 'lost' of 'broken' zijn`,
        });
      }
      if (!Number.isInteger(entry.quantity) || entry.quantity <= 0) {
        return res.status(400).json({
          error: `items[${idx}]: 'quantity' moet een positief geheel getal zijn`,
        });
      }
      const cur = entriesByItem.get(entry.id) || { returned: 0, lost: 0, broken: 0 };
      cur[entry.condition] += entry.quantity;
      entriesByItem.set(entry.id, cur);
    }
    // Valideer dat sums per item niet groter zijn dan de openstaande quantity.
    for (const [id, cnt] of entriesByItem.entries()) {
      const openQty = openById.get(id).quantity;
      const total = cnt.returned + cnt.lost + cnt.broken;
      if (total > openQty) {
        return res.status(400).json({
          error: `items voor bon_item ${id}: totaal (${total}) groter dan openstaand (${openQty})`,
        });
      }
    }
  }

  // Als niets echt afgehandeld wordt: gewoon 200 met huidige state (net als
  // de oude flow "items: [] betekent niets doen" implicit deed).
  const hasWork = Array.from(entriesByItem.values())
    .some((c) => c.returned + c.lost + c.broken > 0);
  if (!hasWork) {
    return res.json(loadBonWithItems(bon.id));
  }

  const now = nowDutchISO();
  let bonCompleted = false;
  // Snapshots voor logs — buiten de transactie tellen omdat we ook damage-
  // regels willen benoemen na commit.
  const returnLogParts = []; // "2x Voetbal"
  const damageLogLines = []; // "Kwijt gemeld: 1x Voetbal op BON-..."

  try {
    const tx = db.transaction(() => {
      const stmtUpdate = db.prepare(
        `UPDATE bon_items SET quantity = ?, returned = 1, return_condition = ? WHERE id = ?`,
      );
      const stmtInsertPart = db.prepare(`
        INSERT INTO bon_items
          (bon_id, material_id, set_id, quantity, returned, return_condition,
           picked_up, added_at_pickup, removed_at_pickup)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?, 0)
      `);
      const stmtUpdateRemaining = db.prepare(
        `UPDATE bon_items SET quantity = ? WHERE id = ?`,
      );
      const stmtDamage = db.prepare(`
        INSERT INTO damage_reports
          (bon_id, bon_item_id, material_id, set_id, reason, quantity, status, reported_at, reported_by)
        VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)
      `);
      const stmtMatStock = db.prepare(
        `UPDATE materials SET stock = MAX(0, stock - ?) WHERE id = ?`,
      );
      const stmtMatUnavail = db.prepare(
        `UPDATE materials SET available_status = 'out_of_service' WHERE id = ?`,
      );
      const stmtSetStock = db.prepare(
        `UPDATE sets SET stock = MAX(0, stock - ?) WHERE id = ?`,
      );

      for (const [id, cnt] of entriesByItem.entries()) {
        const original = openById.get(id);
        const total = cnt.returned + cnt.lost + cnt.broken;
        if (total === 0) continue;

        const remaining = original.quantity - total;
        // Volgorde: returned eerst, dan lost, dan broken. Voor de audit is
        // dit voorspelbaar en 'returned' blijft (indien aanwezig) op de
        // originele rij staan.
        const entries = [];
        if (cnt.returned > 0) entries.push({ condition: 'returned', quantity: cnt.returned });
        if (cnt.lost > 0)     entries.push({ condition: 'lost',     quantity: cnt.lost });
        if (cnt.broken > 0)   entries.push({ condition: 'broken',   quantity: cnt.broken });

        const partIds = []; // bon_item.id per condition-part
        if (remaining > 0) {
          // Origineel blijft de open remainder houden; alle handled parts
          // komen als nieuwe rijen bij.
          stmtUpdateRemaining.run(remaining, original.id);
          for (const e of entries) {
            const info = stmtInsertPart.run(
              original.bon_id, original.material_id, original.set_id,
              e.quantity, e.condition, original.picked_up, original.added_at_pickup,
            );
            partIds.push({ id: info.lastInsertRowid, entry: e });
          }
        } else {
          // Volledig afgehandeld: eerste entry updatet het origineel, rest is INSERT.
          const first = entries[0];
          stmtUpdate.run(first.quantity, first.condition, original.id);
          partIds.push({ id: original.id, entry: first });
          for (let i = 1; i < entries.length; i++) {
            const e = entries[i];
            const info = stmtInsertPart.run(
              original.bon_id, original.material_id, original.set_id,
              e.quantity, e.condition, original.picked_up, original.added_at_pickup,
            );
            partIds.push({ id: info.lastInsertRowid, entry: e });
          }
        }

        // Voorraad-effect + damage_reports per lost/broken part.
        const displayName = original.material_name || original.set_name || 'item';
        for (const { id: partId, entry } of partIds) {
          if (entry.condition === 'returned') {
            returnLogParts.push(`${entry.quantity}x ${displayName}`);
            continue;
          }
          // Damage: insert report, mutate stock/status.
          stmtDamage.run(
            bon.id, partId, original.material_id, original.set_id,
            entry.condition, entry.quantity, now, req.user.id,
          );
          if (original.material_id != null) {
            if (original.material_type === 'uniek') {
              stmtMatUnavail.run(original.material_id);
            } else {
              stmtMatStock.run(entry.quantity, original.material_id);
            }
          } else if (original.set_id != null) {
            stmtSetStock.run(entry.quantity, original.set_id);
          }
          const reasonLabel = entry.condition === 'lost' ? 'Kwijt gemeld' : 'Kapot gemeld';
          damageLogLines.push(`${reasonLabel}: ${entry.quantity}x ${displayName} op ${bon.bon_number}`);
        }
      }

      // Bon volledig retour? v1.14.0: bij een externe bon met openstaande
      // betaling (payment_status='open') blijft de bon 'active' — 'completed'
      // wordt pas gezet als óók de betaling binnen is. De betaal-flow
      // (PATCH /:id/payment) rondt 'm dan alsnog af. Interne bonnen en
      // externe bonnen zonder betaling (rental_price=0 → payment_status=NULL)
      // volgen de bestaande logica.
      const { c: openCount } = db.prepare(
        'SELECT COUNT(*) AS c FROM bon_items WHERE bon_id = ? AND returned = 0 AND removed_at_pickup = 0',
      ).get(bon.id);
      const paymentPending = bon.payment_status === 'open';
      if (openCount === 0 && !paymentPending) {
        db.prepare('UPDATE bons SET status = ?, completed_at = ? WHERE id = ?')
          .run('completed', now, bon.id);
        bonCompleted = true;
      }
    });
    tx();
  } catch (err) {
    return res.status(500).json({ error: `Retour mislukt: ${err.message}` });
  }

  const result = loadBonWithItems(bon.id);
  if (returnLogParts.length > 0) {
    // Als alles retour is maar de bon door een openstaande externe betaling
    // nog niet is afgerond, zeggen we dat expliciet — anders lijkt het in de
    // log alsof retour "niets" deed.
    const allBack = (result.items || []).every(
      (bi) => bi.returned === 1 || bi.removed_at_pickup === 1,
    );
    let suffix = '';
    if (bonCompleted) {
      suffix = ' (bon voltooid)';
    } else if (allBack && result.payment_status === 'open') {
      suffix = ' (materiaal binnen, wacht op betaling)';
    }
    const displayFor = result.is_external
      ? result.external_org
      : (result.user_name || 'onbekende gebruiker');
    logAction(
      'bon_return',
      `Retour ${result.bon_number} voor ${displayFor}: ${returnLogParts.join(', ')} geretourneerd${suffix}`,
      req.user.id,
    );
  }
  for (const line of damageLogLines) {
    logAction('damage_reported', line, req.user.id);
  }

  res.json(result);
});

module.exports = router;
