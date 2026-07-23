const express = require('express');
const db = require('../db');
const { nowDutchISO, handleUniqueError, logAction } = require('../utils');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Menselijke labels voor de velden die in een update-log kunnen voorkomen.
const FIELD_LABELS = {
  name: 'naam',
  category: 'categorie',
  stock: 'voorraad',
  unit: 'eenheid',
  type: 'type',
  location: 'locatie',
  notes: 'notities',
  purchase_link: 'inkooplink',
  barcode: 'barcode',
};

function describeDiff(existing, next) {
  const parts = [];
  for (const [field, label] of Object.entries(FIELD_LABELS)) {
    const before = existing[field];
    const after = next[field];
    if ((before ?? '') === (after ?? '')) continue;
    if (field === 'stock') {
      parts.push(`voorraad ${before} → ${after}`);
    } else if (before && after) {
      parts.push(`${label} '${before}' → '${after}'`);
    } else if (!before && after) {
      parts.push(`${label} ingesteld op '${after}'`);
    } else {
      parts.push(`${label} leeggemaakt`);
    }
  }
  return parts;
}

const router = express.Router();

const OPTIONAL_STRING_FIELDS = [
  'category', 'unit', 'location', 'notes', 'purchase_link', 'barcode',
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

router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM materials ORDER BY id').all();
  res.json(rows);
});

router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'materiaal niet gevonden' });
  res.json(row);
});

router.post('/', requireAdmin, (req, res) => {
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
  logAction('material_create', `Materiaal '${created.name}' toegevoegd (voorraad ${created.stock})`, req.user.id);
  res.status(201).json(created);
});

router.put('/:id', requireAdmin, (req, res) => {
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
  const diffs = describeDiff(existing, updated);
  if (diffs.length > 0) {
    logAction('material_update', `Materiaal '${updated.name}' bijgewerkt: ${diffs.join(', ')}`, req.user.id);
  }
  res.json(updated);
});

router.delete('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
  try {
    const info = db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'materiaal niet gevonden' });
    if (existing) logAction('material_delete', `Materiaal '${existing.name}' verwijderd`, req.user.id);
    res.json({ deleted: true });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(409).json({ error: 'materiaal is in gebruik op een bon en kan niet verwijderd worden' });
    }
    throw err;
  }
});

module.exports = router;
