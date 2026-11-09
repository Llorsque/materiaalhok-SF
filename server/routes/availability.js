// v2: beschikbaarheid per dag voor de leen-, reserveer-, ophaal- en
// verlengschermen. Alle ingelogde gebruikers mogen dit opvragen; inclusief
// namen van wie het materiaal heeft (besluit 9 nov 2026: namen zichtbaar
// voor iedereen, zodat collega's onderling kunnen afstemmen).
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { computeAvailability, handoverTimes, ymd } = require('../availability');

const router = express.Router();
router.use(requireAuth);

router.get('/config', (req, res) => {
  res.json({ handover: handoverTimes() });
});

router.get('/', (req, res) => {
  const start = ymd(req.query.start);
  const end = ymd(req.query.end);
  if (req.query.start && !start) return res.status(400).json({ error: "'start' moet YYYY-MM-DD zijn" });
  if (req.query.end && !end) return res.status(400).json({ error: "'end' moet YYYY-MM-DD zijn" });
  const ex = req.query.exclude_bon_id != null ? Number(req.query.exclude_bon_id) : null;
  res.json(computeAvailability({ start, end, excludeBonId: Number.isInteger(ex) ? ex : null }));
});

module.exports = router;
