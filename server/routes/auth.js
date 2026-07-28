const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Eén foutmelding voor zowel "geen user" als "verkeerd wachtwoord". Zo kan een
// aanvaller via response-vergelijking niet uitvogelen welke e-mailadressen
// in de database staan.
const INVALID_CREDENTIALS = 'e-mailadres of wachtwoord onjuist';

// 12 uur geldig. Past bij een werkdag + wat rek; als je 's ochtends inlogt
// hoef je niet elke keer opnieuw je badge te scannen.
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function stripPasswordHash(user) {
  if (!user) return user;
  const { password_hash, ...rest } = user;
  return rest;
}

// Verwijdert alle verlopen sessies. Wordt bij elke login aangeroepen, zodat
// we geen aparte cronjob of achtergrondtaak nodig hebben. Kost een enkele
// index-scan (idx_sessions_expires_at) en is dus goedkoop.
function pruneExpiredSessions() {
  try {
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString());
  } catch (err) {
    console.error('pruneExpiredSessions faalde:', err.message);
  }
}

function issueToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  db.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(
    token,
    userId,
    now.toISOString(),
    new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  );
  return token;
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

  pruneExpiredSessions();
  const token = issueToken(user.id);

  res.json({ ...stripPasswordHash(user), token });
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

  pruneExpiredSessions();
  const token = issueToken(user.id);

  res.json({ ...stripPasswordHash(user), token });
});

// Logout is bewust idempotent: als het token onbekend of al verlopen is, geven
// we alsnog 200 terug. De client wil in beide gevallen zijn lokale token
// weggooien; een 4xx zou dat pad onnodig complex maken.
router.post('/logout', (req, res) => {
  const raw = req.headers.authorization || '';
  const m = raw.match(/^Bearer\s+(.+)$/i);
  if (m) {
    try {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(m[1].trim());
    } catch (err) {
      console.error('logout: kon sessie niet verwijderen:', err.message);
    }
  }
  res.json({ ok: true });
});

// Testroute voor het token-mechanisme. Zodra stap 2 klaar is en overal
// requireAuth op staat, blijft dit endpoint bruikbaar als "wie ben ik?".
// Ook mail-voorkeuren komen mee zodat het profielscherm 'm direct kan tonen.
router.get('/me', requireAuth, (req, res) => {
  const row = db.prepare(
    `SELECT id, name, email, role, login_barcode,
            notify_reservation, notify_pickup, notify_reminder
     FROM users WHERE id = ?`
  ).get(req.user.id);
  if (!row) return res.status(404).json({ error: 'gebruiker niet gevonden' });
  res.json(row);
});

// Zelf-endpoint voor mail-voorkeuren. Elke ingelogde gebruiker mag zijn
// eigen voorkeuren zetten; admins kunnen die van anderen zetten via de
// gebruikersbeheer-routes op /api/users/:id.
const NOTIFY_KEYS = ['notify_reservation', 'notify_pickup', 'notify_reminder'];
router.put('/me/notifications', requireAuth, (req, res) => {
  const body = req.body || {};
  const patch = {};
  for (const key of NOTIFY_KEYS) {
    if (body[key] === undefined) continue;
    const v = body[key];
    if (v !== 0 && v !== 1 && v !== true && v !== false) {
      return res.status(400).json({ error: `veld '${key}' moet 0, 1, true of false zijn` });
    }
    patch[key] = v === true || v === 1 ? 1 : 0;
  }
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'geen voorkeuren opgegeven' });
  }
  const sets = Object.keys(patch).map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE users SET ${sets} WHERE id = @id`).run({ ...patch, id: req.user.id });
  const updated = db.prepare(
    `SELECT id, name, email, role, login_barcode,
            notify_reservation, notify_pickup, notify_reminder
     FROM users WHERE id = ?`
  ).get(req.user.id);
  res.json(updated);
});

module.exports = router;
