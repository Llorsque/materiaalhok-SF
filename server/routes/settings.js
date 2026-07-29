const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { getSetting, setSetting, logAction } = require('../utils');

// Instelbare tekstinstellingen (bv. huurvoorwaarden voor externe verhuur).
// Alleen admin — de waardes verschijnen in verstuurde mails.
//
// Nieuwe keys hier registreren: SETTING_KEYS bepaalt wat via GET terugkomt
// en wat via PUT gezet mag worden. Zo lekt een typo in het body-object niet
// naar de settings-tabel als losstaande rij.
const SETTING_KEYS = ['rental_terms'];

const router = express.Router();
router.use(requireAdmin);

router.get('/', (req, res) => {
  const out = {};
  for (const key of SETTING_KEYS) {
    out[key] = getSetting(key, '') || '';
  }
  res.json(out);
});

router.put('/', (req, res) => {
  const body = req.body || {};
  const updates = [];
  for (const key of SETTING_KEYS) {
    if (!(key in body)) continue;
    const val = body[key];
    if (val !== null && typeof val !== 'string') {
      return res.status(400).json({ error: `veld '${key}' moet een string of null zijn` });
    }
    setSetting(key, val ?? '');
    updates.push(key);
  }
  if (updates.length > 0) {
    logAction('settings_update', `Instellingen bijgewerkt: ${updates.join(', ')}`, req.user.id);
  }
  const out = {};
  for (const key of SETTING_KEYS) out[key] = getSetting(key, '') || '';
  res.json(out);
});

module.exports = router;
