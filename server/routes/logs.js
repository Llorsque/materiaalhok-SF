// GET /api/logs — paginated activity log met filters.
//
// Query-parameters (allemaal optioneel):
//   limit    — max aantal rijen (1..500, default 50)
//   offset   — pagineringspositie (>=0, default 0)
//   action   — exacte match op action-kolom (bv. 'bon_create')
//   q        — substring-match (case-insensitive) op detail
//   from     — inclusieve ondergrens op timestamp (ISO of YYYY-MM-DD)
//   to       — inclusieve bovengrens op timestamp (ISO of YYYY-MM-DD)
//
// Antwoord: { logs, total, limit, offset }
// Rijen worden aliased: timestamp → date, plus user_name via JOIN.

const express = require('express');
const db = require('../db');

const router = express.Router();

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

function clampInt(raw, min, max, fallback) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

router.get('/', (req, res) => {
  const limit = clampInt(req.query.limit, 1, MAX_LIMIT, DEFAULT_LIMIT);
  const offset = clampInt(req.query.offset, 0, Number.MAX_SAFE_INTEGER, 0);

  const where = [];
  const params = [];

  if (typeof req.query.action === 'string' && req.query.action.trim() !== '') {
    where.push('l.action = ?');
    params.push(req.query.action.trim());
  }
  if (typeof req.query.q === 'string' && req.query.q.trim() !== '') {
    where.push('l.detail LIKE ? COLLATE NOCASE');
    params.push(`%${req.query.q.trim()}%`);
  }
  if (typeof req.query.from === 'string' && req.query.from.trim() !== '') {
    where.push('l.timestamp >= ?');
    params.push(req.query.from.trim());
  }
  if (typeof req.query.to === 'string' && req.query.to.trim() !== '') {
    // Voor een pure datum (YYYY-MM-DD) willen we tot en met die dag; door
    // T23:59:59 aan te plakken zit een timestamp op die dag er nog bij.
    const to = req.query.to.trim();
    const bound = /^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T23:59:59.999+02:00` : to;
    where.push('l.timestamp <= ?');
    params.push(bound);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM logs l ${whereSql}`).get(...params);

  const logs = db.prepare(`
    SELECT l.id, l.timestamp AS date, l.action, l.detail, l.user_id, u.name AS user_name
    FROM logs l
    LEFT JOIN users u ON u.id = l.user_id
    ${whereSql}
    ORDER BY l.timestamp DESC, l.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ logs, total, limit, offset });
});

module.exports = router;
