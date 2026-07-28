// Retourherinnering-scheduler.
//
// Draait iedere INTERVAL_MS zolang de server aan staat, plus één keer bij
// startup. Zoekt alle nog-niet-herinnerde openstaande bonnen waarvan de
// herinnerdag vandaag of eerder is (én de retour nog niet verstreken), en
// stuurt de herinnering. Buiten het verzendvenster (08:00–18:00 werkdag in
// APP_TIMEZONE) doet de scheduler niets — dan wachten we tot de volgende
// cyclus in het venster valt.

const db = require('../db');
const { logAction, nowDutchISO } = require('../utils');
const { sendMail, isBinnenVerzendvenster } = require('./mailer');
const { returnReminder } = require('./templates');

const INTERVAL_MS = 30 * 60 * 1000; // elke 30 minuten
let timer = null;
let running = false;

// YYYY-MM-DD in de app-tijdzone. Zo kunnen we string-compare doen tegen
// gemigreerde return_date's die soms YYYY-MM-DD en soms volledige ISO
// zijn — SQLite's date() haalt uit beide de kalenderdag.
function todayDateStr() {
  const tz = process.env.APP_TIMEZONE || 'Europe/Amsterdam';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Laatste werkdag vóór een gegeven datum. Retour op maandag → herinnering op
// vrijdag (3 kalenderdagen), retour op dinsdag t/m vrijdag → dag ervoor.
// Werkt puur op de kalenderdag (UTC-gebaseerd) — geen tijdzone-drift.
function lastWorkdayBefore(dateStr) {
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  do {
    d.setUTCDate(d.getUTCDate() - 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// Voor toekomstige uitbreiding met externe huurders (ronde B). Nu is elke
// ontvanger een 'user' met notify_reminder — dus checken we die vlag. Zodra
// er ook een externe huurder-tabel bestaat, hoort dit ding true terug te
// geven voor die groep ongeacht voorkeuren.
function shouldSendReminderTo(receiver) {
  if (!receiver) return false;
  // Aanhakingspunt: als receiver.kind === 'external' → return true.
  return receiver.notify_reminder === 1;
}

function loadItemsForBon(bonId) {
  return db.prepare(`
    SELECT bi.quantity, bi.material_id, bi.set_id,
           m.name AS material_name, s.name AS set_name
    FROM bon_items bi
    LEFT JOIN materials m ON m.id = bi.material_id
    LEFT JOIN sets s      ON s.id = bi.set_id
    WHERE bi.bon_id = ?
    ORDER BY bi.id
  `).all(bonId);
}

async function runReminderCycle() {
  if (running) {
    console.log('[reminders] vorige cyclus loopt nog, sla over');
    return;
  }
  running = true;
  try {
    if (!isBinnenVerzendvenster()) {
      console.log('[reminders] buiten venster (08:00–18:00 werkdag), wacht tot volgende cyclus');
      return;
    }

    const today = todayDateStr();

    // Kandidaten: openstaande bon (active of reserved), retour nog niet
    // verstreken, herinnering nog niet verstuurd. We filteren de precieze
    // herinnerdag daarna in JS omdat SQLite lastig kan doen over
    // werkdagen.
    const candidates = db.prepare(`
      SELECT b.id, b.bon_number, b.return_date, b.status,
             u.id AS user_id, u.name AS user_name, u.email,
             u.notify_reminder
      FROM bons b
      JOIN users u ON u.id = b.user_id
      WHERE b.reminder_sent_at IS NULL
        AND b.status IN ('active', 'reserved')
        AND date(b.return_date) >= date(?)
    `).all(today);

    if (candidates.length === 0) {
      console.log('[reminders] geen kandidaten vandaag');
      return;
    }

    let sent = 0, skipped = 0;
    for (const row of candidates) {
      const reminderDate = lastWorkdayBefore(row.return_date);
      if (!reminderDate || reminderDate > today) {
        // De herinnerdag ligt nog in de toekomst — volgende week weer proberen.
        continue;
      }
      const catchup = reminderDate < today;

      if (!shouldSendReminderTo(row)) {
        skipped++;
        continue;
      }
      if (!row.email || !row.email.includes('@')) {
        skipped++;
        logAction('mail_skipped', `Retourherinnering voor ${row.bon_number} overgeslagen: gebruiker heeft geen e-mailadres`);
        continue;
      }

      const bon = {
        bon_number: row.bon_number,
        user_name: row.user_name,
        return_date: row.return_date,
        items: loadItemsForBon(row.id),
      };
      const tpl = returnReminder(bon, { catchup });

      const result = await sendMail({
        to: row.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        context: `retourherinnering ${row.bon_number}${catchup ? ' (catch-up)' : ''}`,
      });

      if (result.sent) {
        // Werkelijke verzendmoment vastleggen, niet de berekende
        // reminderDate — anders krijgt een catch-up mail een timestamp in
        // het verleden en een op-tijd mail eentje in de toekomst. De
        // dubbel-preventie werkt op `IS NULL`, dus de exacte waarde maakt
        // voor die check niet uit; wel voor auditing.
        db.prepare('UPDATE bons SET reminder_sent_at = ? WHERE id = ?')
          .run(nowDutchISO(), row.id);
        sent++;
      }
    }

    if (sent > 0 || skipped > 0) {
      console.log(`[reminders] cyclus klaar: ${sent} verstuurd, ${skipped} overgeslagen, ${candidates.length} kandidaten totaal`);
    }
  } catch (err) {
    console.error('[reminders] cyclus faalde:', err.message);
  } finally {
    running = false;
  }
}

function startReminderScheduler() {
  // Eén cyclus bij startup, dan periodiek. Bewust een korte vertraging zodat
  // de logs-tabel en de mailer-config gegarandeerd geladen zijn.
  setTimeout(() => {
    runReminderCycle().catch((err) => console.error('[reminders] startup-cyclus faalde:', err));
  }, 5000);
  timer = setInterval(() => {
    runReminderCycle().catch((err) => console.error('[reminders] cyclus faalde:', err));
  }, INTERVAL_MS);
  console.log(`[reminders] scheduler actief, cyclus elke ${INTERVAL_MS / 60000} minuten`);
}

function stopReminderScheduler() {
  if (timer) { clearInterval(timer); timer = null; }
}

module.exports = {
  startReminderScheduler,
  stopReminderScheduler,
  runReminderCycle,
  lastWorkdayBefore,
  todayDateStr,
};
