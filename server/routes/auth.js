const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();

// Eén foutmelding voor zowel "geen user" als "verkeerd wachtwoord". Zo kan een
// aanvaller via response-vergelijking niet uitvogelen welke e-mailadressen
// in de database staan.
const INVALID_CREDENTIALS = 'e-mailadres of wachtwoord onjuist';

function stripPasswordHash(user) {
  if (!user) return user;
  const { password_hash, ...rest } = user;
  return rest;
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: "velden 'email' en 'password' zijn verplicht" });
  }

  const user = db.prepare(
    'SELECT * FROM users WHERE LOWER(email) = LOWER(?)'
  ).get(email.trim());

  if (!user) return res.status(401).json({ error: INVALID_CREDENTIALS });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: INVALID_CREDENTIALS });

  res.json(stripPasswordHash(user));
});

router.post('/login/scan', (req, res) => {
  const { login_barcode } = req.body || {};
  if (typeof login_barcode !== 'string' || login_barcode.trim() === '') {
    return res.status(400).json({ error: "veld 'login_barcode' is verplicht" });
  }

  const user = db.prepare(
    'SELECT * FROM users WHERE login_barcode = ?'
  ).get(login_barcode.trim());

  if (!user) return res.status(401).json({ error: 'badge niet herkend' });

  res.json(stripPasswordHash(user));
});

module.exports = router;
