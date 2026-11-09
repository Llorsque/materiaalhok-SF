const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { getSetting, setSetting, logAction } = require('../utils');

// Instelbare tekstinstellingen (bv. huurvoorwaarden voor externe verhuur).
// Alleen admin — de waardes verschijnen in verstuurde mails.
//
// Nieuwe keys hier registreren: SETTING_KEYS bepaalt wat via GET terugkomt
// en wat via PUT gezet mag worden. Zo lekt een typo in het body-object niet
// naar de settings-tabel als losstaande rij.
const SETTING_KEYS = ['rental_terms', 'handover_return_before', 'handover_pickup_from'];

// v2: overdrachtstijden. Leeg = standaard (12:00 / 13:00, zie availability.js).
const TIME_KEYS = new Set(['handover_return_before', 'handover_pickup_from']);
const { TIME_RE } = require('../availability');

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
  // v2: ophaaltijd moet na de inlevertijd liggen — controleren vóór opslaan.
  const rb = body.handover_return_before || getSetting('handover_return_before', '12:00') || '12:00';
  const pf = body.handover_pickup_from || getSetting('handover_pickup_from', '13:00') || '13:00';
  if (('handover_return_before' in body || 'handover_pickup_from' in body) && pf <= rb) {
    return res.status(400).json({ error: 'De ophaaltijd moet ná de inlevertijd liggen.' });
  }
  for (const key of SETTING_KEYS) {
    if (!(key in body)) continue;
    const val = body[key];
    if (val !== null && typeof val !== 'string') {
      return res.status(400).json({ error: `veld '${key}' moet een string of null zijn` });
    }
    if (TIME_KEYS.has(key) && val && !TIME_RE.test(val)) {
      return res.status(400).json({ error: `veld '${key}' moet een tijd zijn als 12:00` });
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
