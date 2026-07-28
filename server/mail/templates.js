// Mail-templates voor materiaalhok-SF.
//
// Elke template exporteert een functie die { subject, html, text } teruggeeft.
// De HTML is bewust simpel: inline CSS, één centrale kaart, mobielvriendelijk
// zonder media queries. Testen we een mailclient niet naar tevredenheid, dan
// blijft de plain-text-variant altijd leesbaar.

const BRAND_NAME = 'Materiaalhok Opsterland';
const BRAND_COLOR = '#7c3aed';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Bouwt een consistente HTML-wrapper rond een specifieke mail-body. De body
// mag zelf `<p>`, `<ul>`, etc. bevatten; alle stijl staat inline zodat Gmail
// en Outlook 'm niet strippen.
function wrap({ preheader = '', bodyHtml }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(BRAND_NAME)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:1px;line-height:1px;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);overflow:hidden;">
          <tr>
            <td style="background:${BRAND_COLOR};padding:20px 24px;color:#ffffff;">
              <div style="font-size:18px;font-weight:700;">${esc(BRAND_NAME)}</div>
              <div style="font-size:12px;opacity:0.85;">Materialenuitleen voor vrijwilligers</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;line-height:1.55;font-size:15px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f9fafb;color:#6b7280;font-size:12px;text-align:center;border-top:1px solid #e5e7eb;">
              Deze mail is automatisch verstuurd door het materiaalhok-systeem. Reageer niet op dit adres.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// --------------------------------------------------------------------------
// Bon-bevestiging

function formatDateNL(iso) {
  if (!iso) return '?';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('nl-NL', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    timeZone: process.env.APP_TIMEZONE || 'Europe/Amsterdam',
  });
}

function itemLabel(it) {
  const name = it.material_name || it.set_name || 'item';
  const suffix = it.set_id != null ? ' (set)' : '';
  return `${it.quantity}x ${name}${suffix}`;
}

// bon: object zoals loadBonWithItems teruggeeft (heeft bon_number, user_name,
// start_date, return_date, status en items[]).
function bonConfirmation(bon) {
  const isReservation = bon.status === 'reserved';
  const kindLabel = isReservation ? 'reservering' : 'uitlening';
  const subject = isReservation
    ? `Reservering ${bon.bon_number} bevestigd`
    : `Bon ${bon.bon_number} aangemaakt`;

  const items = Array.isArray(bon.items) ? bon.items : [];
  const itemsListHtml = items.map((it) => `<li style="margin:2px 0;">${esc(itemLabel(it))}</li>`).join('');
  const itemsListText = items.map((it) => `- ${itemLabel(it)}`).join('\n');

  const introHtml = isReservation
    ? `<p>Hoi ${esc(bon.user_name || '')},</p>
       <p>Je reservering is aangemaakt. Hieronder de details.</p>`
    : `<p>Hoi ${esc(bon.user_name || '')},</p>
       <p>Je hebt materiaal opgehaald uit het materiaalhok. Hieronder de details van je bon.</p>`;

  const bodyHtml = `
    ${introHtml}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0;background:#f9fafb;border-radius:10px;">
      <tr><td style="padding:12px 16px;">
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Bonnummer</div>
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;font-size:16px;color:${BRAND_COLOR};">${esc(bon.bon_number)}</div>
      </td></tr>
      <tr><td style="padding:8px 16px 12px;border-top:1px solid #e5e7eb;">
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">${isReservation ? 'Ophaaldatum' : 'Aangemaakt op'}</div>
        <div>${esc(formatDateNL(bon.start_date))}</div>
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-top:8px;">Retour uiterlijk</div>
        <div>${esc(formatDateNL(bon.return_date))}</div>
      </td></tr>
    </table>
    <p style="font-weight:600;margin-bottom:6px;">Op deze bon:</p>
    <ul style="margin:0 0 16px 20px;padding:0;">${itemsListHtml}</ul>
    <p>Kom je iets tegen dat niet klopt? Loop even langs het materiaalhok — dan zetten we het samen recht.</p>
    <p style="margin-top:20px;">Groet,<br>${esc(BRAND_NAME)}</p>
  `;

  const text = [
    `Hoi ${bon.user_name || ''},`,
    '',
    isReservation
      ? 'Je reservering is aangemaakt. Hieronder de details.'
      : 'Je hebt materiaal opgehaald uit het materiaalhok. Hieronder de details van je bon.',
    '',
    `Bonnummer: ${bon.bon_number}`,
    `${isReservation ? 'Ophaaldatum' : 'Aangemaakt op'}: ${formatDateNL(bon.start_date)}`,
    `Retour uiterlijk: ${formatDateNL(bon.return_date)}`,
    '',
    'Op deze bon:',
    itemsListText,
    '',
    'Kom je iets tegen dat niet klopt? Loop even langs het materiaalhok — dan zetten we het samen recht.',
    '',
    'Groet,',
    BRAND_NAME,
  ].join('\n');

  return {
    subject,
    html: wrap({ preheader: `${kindLabel} ${bon.bon_number} — ${items.length} item${items.length === 1 ? '' : 's'}`, bodyHtml }),
    text,
  };
}

// --------------------------------------------------------------------------
// Retourherinnering
//
// catchup = true betekent dat we deze mail te laat sturen (bv. omdat de
// laptop op de eigenlijke herinnerdag uitstond). De tekst zegt dan
// "binnenkort" i.p.v. de weekdag te noemen, zodat 'ie niet raar aanvoelt.

function returnReminder(bon, { catchup = false } = {}) {
  const subject = `Herinnering: retour ${bon.bon_number}`;

  const items = Array.isArray(bon.items) ? bon.items : [];
  const itemsListHtml = items.map((it) => `<li style="margin:2px 0;">${esc(itemLabel(it))}</li>`).join('');
  const itemsListText = items.map((it) => `- ${itemLabel(it)}`).join('\n');

  const retourStr = formatDateNL(bon.return_date);
  const introHtml = catchup
    ? `<p>Hoi ${esc(bon.user_name || '')},</p>
       <p>Kleine herinnering: het materiaal op bon <strong>${esc(bon.bon_number)}</strong> moet binnenkort weer terug in het materiaalhok. Uiterlijk op <strong>${esc(retourStr)}</strong>.</p>`
    : `<p>Hoi ${esc(bon.user_name || '')},</p>
       <p>Kleine herinnering: het materiaal op bon <strong>${esc(bon.bon_number)}</strong> moet <strong>${esc(retourStr)}</strong> weer terug in het materiaalhok.</p>`;

  const introText = catchup
    ? `Kleine herinnering: het materiaal op bon ${bon.bon_number} moet binnenkort weer terug in het materiaalhok. Uiterlijk op ${retourStr}.`
    : `Kleine herinnering: het materiaal op bon ${bon.bon_number} moet ${retourStr} weer terug in het materiaalhok.`;

  const bodyHtml = `
    ${introHtml}
    <p style="font-weight:600;margin:16px 0 6px;">Wat je nog moet inleveren:</p>
    <ul style="margin:0 0 16px 20px;padding:0;">${itemsListHtml}</ul>
    <p>Alvast bedankt voor het op tijd terugbrengen — dat scheelt de volgende gebruiker een hoop gedoe.</p>
    <p>Kom je iets tegen dat niet klopt of lukt terugbrengen niet? Loop even langs het materiaalhok.</p>
    <p style="margin-top:20px;">Groet,<br>${esc(BRAND_NAME)}</p>
  `;

  const text = [
    `Hoi ${bon.user_name || ''},`,
    '',
    introText,
    '',
    'Wat je nog moet inleveren:',
    itemsListText,
    '',
    'Alvast bedankt voor het op tijd terugbrengen — dat scheelt de volgende gebruiker een hoop gedoe.',
    'Kom je iets tegen dat niet klopt of lukt terugbrengen niet? Loop even langs het materiaalhok.',
    '',
    'Groet,',
    BRAND_NAME,
  ].join('\n');

  return {
    subject,
    html: wrap({ preheader: `Retour ${bon.bon_number} — uiterlijk ${retourStr}`, bodyHtml }),
    text,
  };
}

// --------------------------------------------------------------------------
// Testmail

function mailTest() {
  const now = new Date().toLocaleString('nl-NL', { timeZone: process.env.APP_TIMEZONE || 'Europe/Amsterdam' });
  return {
    subject: 'Testmail vanuit materiaalhok-SF',
    html: wrap({
      preheader: 'Testmail — SMTP-configuratie werkt.',
      bodyHtml: `
        <p>Deze testmail bevestigt dat de mailconfiguratie van het materiaalhok werkt.</p>
        <ul>
          <li>Verstuurd op: ${esc(now)}</li>
          <li>MAIL_MODE: ${esc(process.env.MAIL_MODE || 'off')}</li>
        </ul>
        <p>Als je dit ziet, kunnen bevestigings- en herinneringsmails de deur uit.</p>
      `,
    }),
    text: [
      'Deze testmail bevestigt dat de mailconfiguratie van het materiaalhok werkt.',
      '',
      `Verstuurd op: ${now}`,
      `MAIL_MODE: ${process.env.MAIL_MODE || 'off'}`,
      '',
      'Als je dit ziet, kunnen bevestigings- en herinneringsmails de deur uit.',
    ].join('\n'),
  };
}

module.exports = { bonConfirmation, returnReminder, mailTest, BRAND_NAME };
