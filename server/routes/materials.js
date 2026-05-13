const express = require('express');
const db = require('../db');

const router = express.Router();

const OPTIONAL_STRING_FIELDS = [
  'category', 'unit', 'location', 'notes', 'purchase_link', 'barcode',
];

// ISO-8601 timestamp in Nederlandse lokale tijd, met expliciete offset (+01:00 / +02:00).
// Werkt onafhankelijk van de timezone van de host (we forceren Europe/Amsterdam).
function nowDutchISO() {
  const tz = 'Europe/Amsterdam';
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  );
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const local = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${ms}`;
  const offsetMin = Math.round(
    (new Date(`${local}Z`).getTime() - now.getTime()) / 60000,
  );
  const sign = offsetMin >= 0 ? '+' : '-';
  const a = Math.abs(offsetMin);
  const hh = String(Math.floor(a / 60)).padStart(2, '0');
  const mm = String(a % 60).padStart(2, '0');
  return `${local}${sign}${hh}:${mm}`;
}

function validateInput(input, existing) {
  const isCreate = !existing;
  const out = {};

  if (input.name !== undefined) {
    if (typeof input.name !== 'string' || input.name.trim() === '') {
      return { error: "veld 'name' moet een niet-lege string zijn" };
    }
    out.name = input.name.trim();
  } else if (isCreate) {
    return { error: "veld 'name' is verplicht" };
  } else {
    out.name = existing.name;
  }

  if (input.stock !== undefined) {
    if (!Number.isInteger(input.stock) || input.stock < 0) {
      return { error: "veld 'stock' moet een niet-negatief geheel getal zijn" };
    }
    out.stock = input.stock;
  } else if (isCreate) {
    out.stock = 0;
  } else {
    out.stock = existing.stock;
  }

  if (input.type !== undefined) {
    if (input.type !== 'uniek' && input.type !== 'bulk') {
      return { error: "veld 'type' moet 'uniek' of 'bulk' zijn" };
    }
    out.type = input.type;
  } else if (isCreate) {
    out.type = 'bulk';
  } else {
    out.type = existing.type;
  }

  for (const field of OPTIONAL_STRING_FIELDS) {
    if (input[field] !== undefined) {
      if (input[field] !== null && typeof input[field] !== 'string') {
        return { error: `veld '${field}' moet een string of null zijn` };
      }
      out[field] = input[field];
    } else if (isCreate) {
      out[field] = null;
    } else {
      out[field] = existing[field];
    }
  }

  return { value: out };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM materials ORDER BY id').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'materiaal niet gevonden' });
  res.json(row);
});

function handleUniqueError(err, res) {
  if (err.code !== 'SQLITE_CONSTRAINT_UNIQUE') return false;
  const match = String(err.message).match(/UNIQUE constraint failed:\s*\w+\.(\w+)/);
  const field = match ? match[1] : 'veld';
  res.status(409).json({ error: `${field} bestaat al; moet uniek zijn` });
  return true;
}

router.post('/', (req, res) => {
  const { error, value } = validateInput(req.body || {}, null);
  if (error) return res.status(400).json({ error });

  const now = nowDutchISO();
  let info;
  try {
    info = db.prepare(`
      INSERT INTO materials
        (name, category, stock, unit, type, location, notes, purchase_link, barcode, created_at, updated_at)
      VALUES
        (@name, @category, @stock, @unit, @type, @location, @notes, @purchase_link, @barcode, @created_at, @updated_at)
    `).run({ ...value, created_at: now, updated_at: now });
  } catch (err) {
    if (handleUniqueError(err, res)) return;
    throw err;
  }

  const created = db.prepare('SELECT * FROM materials WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'materiaal niet gevonden' });

  // Beschermde velden: id en created_at zijn niet aanpasbaar via PUT.
  const { id: _ignoreId, created_at: _ignoreCreatedAt, ...body } = req.body || {};

  const { error, value } = validateInput(body, existing);
  if (error) return res.status(400).json({ error });

  const now = nowDutchISO();
  try {
    db.prepare(`
      UPDATE materials SET
        name = @name, category = @category, stock = @stock, unit = @unit,
        type = @type, location = @location, notes = @notes,
        purchase_link = @purchase_link, barcode = @barcode, updated_at = @updated_at
      WHERE id = @id
    `).run({ ...value, updated_at: now, id: existing.id });
  } catch (err) {
    if (handleUniqueError(err, res)) return;
    throw err;
  }

  const updated = db.prepare('SELECT * FROM materials WHERE id = ?').get(existing.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'materiaal niet gevonden' });
    res.json({ deleted: true });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(409).json({ error: 'materiaal is in gebruik op een bon en kan niet verwijderd worden' });
    }
    throw err;
  }
});

module.exports = router;
