const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { nowDutchISO, handleUniqueError } = require('../utils');

const router = express.Router();

const BCRYPT_COST = 10;
// Simpele e-mail-check: iets@iets.iets, zonder whitespace. Bewust niet te
// streng — definitieve validatie hoort bij een echte verify-stap (mail).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stripPasswordHash(user) {
  if (!user) return user;
  const { password_hash, ...rest } = user;
  return rest;
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

  if (input.email !== undefined) {
    if (typeof input.email !== 'string' || !EMAIL_REGEX.test(input.email.trim())) {
      return { error: "veld 'email' moet een geldig e-mailadres zijn" };
    }
    out.email = input.email.trim();
  } else if (isCreate) {
    return { error: "veld 'email' is verplicht" };
  } else {
    out.email = existing.email;
  }

  if (input.password !== undefined) {
    if (typeof input.password !== 'string' || input.password.length < 6) {
      return { error: "veld 'password' moet minstens 6 tekens lang zijn" };
    }
    out.password_hash = bcrypt.hashSync(input.password, BCRYPT_COST);
  } else if (isCreate) {
    return { error: "veld 'password' is verplicht" };
  } else {
    out.password_hash = existing.password_hash;
  }

  if (input.role !== undefined) {
    if (input.role !== 'admin' && input.role !== 'user') {
      return { error: "veld 'role' moet 'admin' of 'user' zijn" };
    }
    out.role = input.role;
  } else if (isCreate) {
    out.role = 'user';
  } else {
    out.role = existing.role;
  }

  if (input.login_barcode !== undefined) {
    if (input.login_barcode !== null && typeof input.login_barcode !== 'string') {
      return { error: "veld 'login_barcode' moet een string of null zijn" };
    }
    out.login_barcode = input.login_barcode;
  } else if (isCreate) {
    out.login_barcode = null;
  } else {
    out.login_barcode = existing.login_barcode;
  }

  return { value: out };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY id').all();
  res.json(rows.map(stripPasswordHash));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'gebruiker niet gevonden' });
  res.json(stripPasswordHash(row));
});

router.post('/', (req, res) => {
  const { error, value } = validateInput(req.body || {}, null);
  if (error) return res.status(400).json({ error });

  const now = nowDutchISO();
  let info;
  try {
    info = db.prepare(`
      INSERT INTO users
        (name, email, password_hash, role, login_barcode, created_at)
      VALUES
        (@name, @email, @password_hash, @role, @login_barcode, @created_at)
    `).run({ ...value, created_at: now });
  } catch (err) {
    if (handleUniqueError(err, res)) return;
    throw err;
  }

  const created = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(stripPasswordHash(created));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'gebruiker niet gevonden' });

  // Beschermde velden: id, created_at en password_hash mogen niet rechtstreeks
  // via PUT gezet worden. password_hash wordt uitsluitend afgeleid van het
  // 'password'-veld in deze handler.
  const {
    id: _ignoreId,
    created_at: _ignoreCreatedAt,
    password_hash: _ignorePasswordHash,
    ...body
  } = req.body || {};

  const { error, value } = validateInput(body, existing);
  if (error) return res.status(400).json({ error });

  try {
    db.prepare(`
      UPDATE users SET
        name = @name, email = @email, password_hash = @password_hash,
        role = @role, login_barcode = @login_barcode
      WHERE id = @id
    `).run({ ...value, id: existing.id });
  } catch (err) {
    if (handleUniqueError(err, res)) return;
    throw err;
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
  res.json(stripPasswordHash(updated));
});

router.delete('/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'gebruiker niet gevonden' });
    res.json({ deleted: true });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(409).json({ error: 'gebruiker heeft nog gekoppelde bonnen en kan niet verwijderd worden' });
    }
    throw err;
  }
});

module.exports = router;
