// Verzendlaag voor uitgaande e-mail.
//
// Één publieke functie sendMail({ to, subject, html, text, context }) die
// MAIL_MODE respecteert:
//   off      → alleen console-log, niets versturen (veilige standaard)
//   redirect → wél versturen maar altijd naar MAIL_REDIRECT_TO, met banner
//   live     → versturen naar de echte ontvanger
//
// De helper isBinnenVerzendvenster() beslist of "geplande" mails (zoals de
// retourherinneringen die straks komen) nu de deur uit mogen. Bevestigings-
// mails omzeilen dit venster: die zijn een reactie op iets dat de gebruiker
// nét gedaan heeft en horen dus direct te gaan (zie BESLUITEN.md,
// "Operationele besluiten — laptop en e-mail").

const nodemailer = require('nodemailer');
const { logAction } = require('../utils');

const WINDOW_START_HOUR = 8;
const WINDOW_END_HOUR = 18;

let cachedTransporter = null;

function getMode() {
  const raw = (process.env.MAIL_MODE || 'off').trim().toLowerCase();
  if (raw === 'redirect' || raw === 'live' || raw === 'off') return raw;
  console.warn(`[mail] onbekende MAIL_MODE '${raw}', val terug op 'off'`);
  return 'off';
}

function getFromHeader() {
  const name = process.env.MAIL_FROM_NAME || 'Materiaalhok Opsterland';
  const addr = process.env.SMTP_USER || 'noreply@example.invalid';
  return `"${name.replace(/"/g, '')}" <${addr}>`;
}

// Lazy: transporter pas opzetten wanneer 'ie echt nodig is. Zo hoeft de
// off-modus geen SMTP-credentials te hebben en breekt de server niet zonder
// .env-bestand.
function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false, // STARTTLS op 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return cachedTransporter;
}

// Zaterdag en zondag horen sowieso niet in het venster (BESLUITEN.md: laptop
// staat dan uit). Op werkdagen: 08:00 t/m 17:59:59 in APP_TIMEZONE.
function isBinnenVerzendvenster(now = new Date()) {
  const tz = process.env.APP_TIMEZONE || 'Europe/Amsterdam';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour: '2-digit', minute: '2-digit', weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(now).reduce((acc, p) => {
    acc[p.type] = p.value; return acc;
  }, {});
  const weekday = parts.weekday; // Mon, Tue, ..., Sat, Sun
  if (weekday === 'Sat' || weekday === 'Sun') return false;
  const hour = parseInt(parts.hour, 10);
  return hour >= WINDOW_START_HOUR && hour < WINDOW_END_HOUR;
}

// Voegt een zichtbare banner boven de originele HTML/text toe wanneer we
// omleiden naar een testadres. Zo weet je in de inbox meteen dat het niet
// echt voor jou was bedoeld.
function withRedirectBanner({ html, text, originalTo }) {
  const banner = `TEST — deze mail was bedoeld voor ${originalTo}`;
  const htmlBanner = `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-family:sans-serif;font-size:13px;color:#92400e;">
    <strong>${banner}</strong>
  </div>`;
  const nextHtml = typeof html === 'string'
    ? html.replace(/(<body[^>]*>)/i, (m) => `${m}${htmlBanner}`) || (htmlBanner + html)
    : undefined;
  const nextText = typeof text === 'string'
    ? `[${banner}]\n\n${text}`
    : undefined;
  return { html: nextHtml || html, text: nextText || text };
}

// context is een vrije string die in de logregel meekomt, bv. het bonnummer.
async function sendMail({ to, subject, html, text, context }) {
  const mode = getMode();
  const originalTo = to;

  if (!to || typeof to !== 'string' || !to.includes('@')) {
    console.log(`[mail:${mode}] geen geldig ontvanger-adres, sla over (subject: ${subject})`);
    return { sent: false, skipped: true, reason: 'no-recipient' };
  }

  // ── off ────────────────────────────────────────────────────────────────
  if (mode === 'off') {
    const preview = (text || '').split('\n').slice(0, 3).join(' | ');
    console.log(`[mail:off] zou versturen naar ${to}: "${subject}" — ${preview}`);
    return { sent: false, skipped: true, reason: 'mail-mode-off' };
  }

  // ── redirect ───────────────────────────────────────────────────────────
  let effectiveTo = to;
  let effectiveHtml = html;
  let effectiveText = text;
  if (mode === 'redirect') {
    const redirect = (process.env.MAIL_REDIRECT_TO || '').trim();
    if (!redirect) {
      console.error(`[mail:redirect] MAIL_REDIRECT_TO ontbreekt — mail voor ${to} niet verstuurd`);
      logAction('mail_failed', `Mail naar ${originalTo} niet verstuurd: MAIL_REDIRECT_TO ontbreekt${context ? ` (${context})` : ''}`);
      return { sent: false, skipped: true, reason: 'redirect-target-missing' };
    }
    effectiveTo = redirect;
    ({ html: effectiveHtml, text: effectiveText } = withRedirectBanner({ html, text, originalTo }));
    console.log(`[mail:redirect] omleiding: ${originalTo} → ${redirect} — "${subject}"`);
  } else {
    console.log(`[mail:live] versturen naar ${to} — "${subject}"`);
  }

  try {
    await getTransporter().sendMail({
      from: getFromHeader(),
      to: effectiveTo,
      subject,
      html: effectiveHtml,
      text: effectiveText,
    });
    logAction('mail_sent', `Mail verstuurd naar ${originalTo}${context ? ` — ${context}` : ''} (subject: ${subject})`);
    return { sent: true, mode, to: effectiveTo, originalTo };
  } catch (err) {
    console.error(`[mail:${mode}] verzending faalde: ${err.message}`);
    logAction('mail_failed', `Mail naar ${originalTo} mislukt: ${err.message}${context ? ` (${context})` : ''}`);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendMail, isBinnenVerzendvenster };
