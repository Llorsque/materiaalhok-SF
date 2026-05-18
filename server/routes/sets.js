const express = require('express');
const db = require('../db');
const { nowDutchISO, handleUniqueError } = require('../utils');

const router = express.Router();

const OPTIONAL_STRING_FIELDS = [
  'category', 'composition', 'location', 'notes', 'purchase_link', 'barcode',
];

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
  const rows = db.prepare('SELECT * FROM sets ORDER BY id').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM sets WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'set niet gevonden' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { error, value } = validateInput(req.body || {}, null);
  if (error) return res.status(400).json({ error });

  const now = nowDutchISO();
  let info;
  try {
    info = db.prepare(`
      INSERT INTO sets
        (name, category, stock, composition, location, notes, purchase_link, barcode, created_at, updated_at)
      VALUES
        (@name, @category, @stock, @composition, @location, @notes, @purchase_link, @barcode, @created_at, @updated_at)
    `).run({ ...value, created_at: now, updated_at: now });
  } catch (err) {
    if (handleUniqueError(err, res)) return;
    throw err;
  }

  const created = db.prepare('SELECT * FROM sets WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM sets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'set niet gevonden' });

  const { id: _ignoreId, created_at: _ignoreCreatedAt, ...body } = req.body || {};

  const { error, value } = validateInput(body, existing);
  if (error) return res.status(400).json({ error });

  const now = nowDutchISO();
  try {
    db.prepare(`
      UPDATE sets SET
        name = @name, category = @category, stock = @stock, composition = @composition,
        location = @location, notes = @notes, purchase_link = @purchase_link,
        barcode = @barcode, updated_at = @updated_at
      WHERE id = @id
    `).run({ ...value, updated_at: now, id: existing.id });
  } catch (err) {
    if (handleUniqueError(err, res)) return;
    throw err;
  }

  const updated = db.prepare('SELECT * FROM sets WHERE id = ?').get(existing.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM sets WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'set niet gevonden' });
    res.json({ deleted: true });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(409).json({ error: 'set is in gebruik op een bon en kan niet verwijderd worden' });
    }
    throw err;
  }
});

module.exports = router;
