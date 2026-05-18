const express = require('express');
const db = require('../db');
const { nowDutchISO, handleUniqueError } = require('../utils');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers

function parseDate(s) {
  if (typeof s !== 'string') return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
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
    SELECT b.*, u.name AS user_name
    FROM bons b
    LEFT JOIN users u ON u.id = b.user_id
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

router.get('/', (req, res) => {
  const bons = db.prepare(`
    SELECT b.*, u.name AS user_name
    FROM bons b
    LEFT JOIN users u ON u.id = b.user_id
    ORDER BY b.id
  `).all();

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

router.get('/:id', (req, res) => {
  const bon = loadBonWithItems(req.params.id);
  if (!bon) return res.status(404).json({ error: 'bon niet gevonden' });
  res.json(bon);
});

router.post('/', (req, res) => {
  const body = req.body || {};

  if (!Number.isInteger(body.user_id)) {
    return res.status(400).json({ error: "veld 'user_id' is verplicht (integer)" });
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(body.user_id);
  if (!user) return res.status(400).json({ error: 'user_id verwijst naar een onbekende gebruiker' });

  if (!parseDate(body.start_date)) {
    return res.status(400).json({ error: "veld 'start_date' moet een geldige datum/tijd zijn" });
  }
  if (!parseDate(body.return_date)) {
    return res.status(400).json({ error: "veld 'return_date' moet een geldige datum/tijd zijn" });
  }
  if (parseDate(body.return_date) <= parseDate(body.start_date)) {
    return res.status(400).json({ error: "'return_date' moet na 'start_date' liggen" });
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

  let createdId;
  try {
    const tx = db.transaction(() => {
      const bonNumber = generateBonNumber();
      const info = db.prepare(`
        INSERT INTO bons
          (bon_number, user_id, start_date, return_date, status, notes, created_at, completed_at)
        VALUES
          (@bon_number, @user_id, @start_date, @return_date, @status, @notes, @created_at, @completed_at)
      `).run({
        bon_number: bonNumber,
        user_id: body.user_id,
        start_date: body.start_date,
        return_date: body.return_date,
        status,
        notes: body.notes ?? null,
        created_at: now,
        completed_at: completedAt,
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

  res.status(201).json(loadBonWithItems(createdId));
});

router.put('/:id', (req, res) => {
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

  res.json(loadBonWithItems(existing.id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM bons WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'bon niet gevonden' });
  res.json({ deleted: true });
});

module.exports = router;
