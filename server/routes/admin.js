// Admin-endpoints voor gevaarlijke acties. Voor nu alleen de reset-flow:
// wist bonnen + bon_items, laat inventaris/gebruikers/logs staan, maakt eerst
// automatisch een backup en reset de AUTOINCREMENT-tellers zodat bonnummers
// weer bij 1 beginnen.

const express = require('express');
const db = require('../db');
const { copyDatabaseTo } = require('../backup');
const { logAction } = require('../utils');
const { requireAdmin } = require('../middleware/auth');
const { sendMail } = require('../mail/mailer');
const { mailTest } = require('../mail/templates');

const router = express.Router();

// De reset-flow raakt in één klik alle bonnen weg — uitsluitend voor admins.
router.use(requireAdmin);

const pad = (n) => String(n).padStart(2, '0');

function resetBackupFilename(now = new Date()) {
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `database-voor-reset-${stamp}.db`;
}

function tableCount(table) {
  return db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
}

router.get('/reset-preview', (req, res) => {
  res.json({
    wipe: {
      bons: tableCount('bons'),
      bon_items: tableCount('bon_items'),
    },
    keep: {
      materials: tableCount('materials'),
      sets: tableCount('sets'),
      users: tableCount('users'),
      logs: tableCount('logs'),
    },
  });
});

router.post('/reset', (req, res) => {
  // Dubbelcheck: naast de UI-bevestiging vragen we ook op de API expliciet om
  // het RESET-woord. Voorkomt dat een verdwaalde POST per ongeluk alles wist.
  const confirm = req.body && req.body.confirm;
  if (confirm !== 'RESET') {
    return res.status(400).json({ error: 'bevestiging ontbreekt: verwacht { confirm: "RESET" }' });
  }

  let backup;
  try {
    backup = copyDatabaseTo(resetBackupFilename());
  } catch (err) {
    return res.status(500).json({ error: `backup mislukt, reset niet uitgevoerd: ${err.message}` });
  }

  const bonsBefore = tableCount('bons');
  const bonItemsBefore = tableCount('bon_items');

  // bon_items eerst, dan bons. sqlite_sequence-rijen wissen zodat AUTOINCREMENT
  // opnieuw bij 1 begint. Alles in één transactie: bij een fout blijft de DB
  // consistent en hebben we alsnog de backup als vangnet.
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM bon_items').run();
    db.prepare('DELETE FROM bons').run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('bons', 'bon_items')").run();
  });

  try {
    tx();
  } catch (err) {
    return res.status(500).json({
      error: `reset mislukt: ${err.message}`,
      backup: { filename: backup.filename },
    });
  }

  logAction(
    'reset',
    `Reset uitgevoerd: ${bonsBefore} bonnen en ${bonItemsBefore} bonregels gewist. Backup: ${backup.filename}`,
    req.user.id,
  );

  res.json({
    wiped: { bons: bonsBefore, bon_items: bonItemsBefore },
    backup: { filename: backup.filename },
  });
});

// Testendpoint voor de mailconfiguratie. Stuurt een testmail zonder een bon
// aan te maken; respecteert MAIL_MODE (in 'off' wordt niets verstuurd maar
// laat het endpoint dat wél weten in de response).
router.post('/mail-test', async (req, res) => {
  const to = req.body && typeof req.body.to === 'string' ? req.body.to.trim() : '';
  if (!to || !to.includes('@')) {
    return res.status(400).json({ error: "veld 'to' moet een geldig e-mailadres zijn" });
  }
  const tpl = mailTest();
  const result = await sendMail({
    to,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    context: `mail-test door ${req.user.name}`,
  });
  res.json({
    to,
    mode: (process.env.MAIL_MODE || 'off').toLowerCase(),
    ...result,
  });
});

module.exports = router;
