// Schade/verlies-overzicht (Ronde B blok 2).
//
// Bron van waarheid voor het admin-overzicht plus voor tellingen per
// materiaal ("hoe vaak is dit al kwijt/kapot geweest?"). Alle endpoints
// vereisen admin — schade wordt door gebruikers alleen indirect gemeld via
// de retour-flow (POST /api/bons/:id/return).

const express = require('express');
const db = require('../db');
const { nowDutchISO, logAction } = require('../utils');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

// Query-helper — één statement dat alle relevante join-velden ophaalt.
const SELECT_SQL = `
  SELECT d.*,
         m.name AS material_name,
         m.type AS material_type,
         m.available_status AS material_available_status,
         s.name AS set_name,
         u.name AS reported_by_name,
         b.bon_number AS bon_number,
         b.user_id AS borrower_id,
         bu.name AS borrower_name,
         a.name AS resolved_by_name
    FROM damage_reports d
    LEFT JOIN materials m  ON m.id = d.material_id
    LEFT JOIN sets s       ON s.id = d.set_id
    LEFT JOIN users u      ON u.id = d.reported_by
    LEFT JOIN users a      ON a.id = d.resolved_by
    LEFT JOIN bons b       ON b.id = d.bon_id
    LEFT JOIN users bu     ON bu.id = b.user_id
`;

router.get('/', (req, res) => {
  const where = [];
  const params = [];

  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  if (status === 'open') {
    where.push("d.status = 'open'");
  } else if (status === 'resolved') {
    where.push("d.status IN ('repaired', 'replaced', 'written_off')");
  } else if (status && ['repaired', 'replaced', 'written_off'].includes(status)) {
    where.push('d.status = ?');
    params.push(status);
  }

  const reason = typeof req.query.reason === 'string' ? req.query.reason.trim() : '';
  if (reason === 'lost' || reason === 'broken') {
    where.push('d.reason = ?');
    params.push(reason);
  }

  const materialId = parseInt(req.query.material_id, 10);
  if (Number.isFinite(materialId)) {
    where.push('d.material_id = ?');
    params.push(materialId);
  }
  const setId = parseInt(req.query.set_id, 10);
  if (Number.isFinite(setId)) {
    where.push('d.set_id = ?');
    params.push(setId);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  // Open bovenaan (nieuwste eerst), afgehandelde eronder (recent afgehandeld
  // eerst). Zo pakt de UI dezelfde volgorde als beschreven in BESLUITEN.md.
  const rows = db.prepare(`
    ${SELECT_SQL}
    ${whereSql}
    ORDER BY (d.status = 'open') DESC,
             COALESCE(d.resolved_at, d.reported_at) DESC,
             d.id DESC
  `).all(...params);

  res.json(rows);
});

router.patch('/:id/resolve', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'id moet een integer zijn' });

  const report = db.prepare(`
    SELECT d.*, m.type AS material_type
      FROM damage_reports d
      LEFT JOIN materials m ON m.id = d.material_id
     WHERE d.id = ?
  `).get(id);
  if (!report) return res.status(404).json({ error: 'schade-melding niet gevonden' });
  if (report.status !== 'open') {
    return res.status(409).json({
      error: `melding is al afgehandeld (huidige status: ${report.status})`,
    });
  }

  const body = req.body || {};
  const resolution = typeof body.resolution === 'string' ? body.resolution : '';
  if (!['repaired', 'replaced', 'written_off'].includes(resolution)) {
    return res.status(400).json({
      error: "veld 'resolution' moet 'repaired', 'replaced' of 'written_off' zijn",
    });
  }
  const notes = body.notes !== undefined && body.notes !== null ? String(body.notes) : null;

  const now = nowDutchISO();
  try {
    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE damage_reports
           SET status      = ?,
               notes       = COALESCE(?, notes),
               resolved_at = ?,
               resolved_by = ?
         WHERE id = ?
      `).run(resolution, notes, now, req.user.id, id);

      if (resolution === 'repaired' || resolution === 'replaced') {
        if (report.material_id != null) {
          if (report.material_type === 'uniek') {
            db.prepare(`UPDATE materials SET available_status = 'available' WHERE id = ?`)
              .run(report.material_id);
          } else {
            db.prepare(`UPDATE materials SET stock = stock + ? WHERE id = ?`)
              .run(report.quantity, report.material_id);
          }
        } else if (report.set_id != null) {
          db.prepare(`UPDATE sets SET stock = stock + ? WHERE id = ?`)
            .run(report.quantity, report.set_id);
        }
      }
      // written_off: geen voorraad-effect. Bulk bleef eraf; uniek blijft
      // 'out_of_service' — de rij staat er nog om historie en zichtbaarheid.
    });
    tx();
  } catch (err) {
    return res.status(500).json({ error: `Afhandelen mislukt: ${err.message}` });
  }

  const updated = db.prepare(`${SELECT_SQL} WHERE d.id = ?`).get(id);
  const label = resolution === 'repaired' ? 'gerepareerd'
              : resolution === 'replaced' ? 'vervangen'
              : 'afgeschreven';
  const target = updated.material_name || updated.set_name || 'item';
  logAction(
    'damage_resolved',
    `${updated.reason === 'lost' ? 'Kwijt' : 'Kapot'} '${target}' (${updated.quantity}x) afgehandeld als '${label}' door ${req.user.name}`,
    req.user.id,
  );

  res.json(updated);
});

module.exports = router;
