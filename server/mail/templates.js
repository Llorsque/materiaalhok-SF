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

function fmtEuro(n) {
  const val = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return `\u20ac ${val.toFixed(2).replace('.', ',')}`;
}

// Splitst huurvoorwaarden op lege regels in paragrafen zodat de HTML-mail
// wat structuur krijgt. De text-variant houdt de regelovergangen intact.
function paragraphsHtml(raw) {
  return String(raw || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 10px 0;">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// bon: object zoals loadBonWithItems teruggeeft (heeft bon_number, user_name,
// start_date, return_date, status en items[]). Voor externe bonnen bevat
// het extra external_org / external_contact / rental_price / deposit /
// is_external. Optionele `rentalTerms` (string uit settings) wordt alleen
// in de reserveringsmail getoond.
function bonConfirmation(bon, { rentalTerms = '' } = {}) {
  const isReservation = bon.status === 'reserved';
  const isExternal = !!(bon.is_external === 1 || bon.is_external === true);
  const kindLabel = isReservation ? 'reservering' : 'uitlening';
  const subject = isReservation
    ? `Reservering ${bon.bon_number} bevestigd`
    : `Bon ${bon.bon_number} aangemaakt`;

  const items = Array.isArray(bon.items) ? bon.items : [];
  const itemsListHtml = items.map((it) => `<li style="margin:2px 0;">${esc(itemLabel(it))}</li>`).join('');
  const itemsListText = items.map((it) => `- ${itemLabel(it)}`).join('\n');

  // Aanhef: intern gebruikt de accountnaam, extern de contactpersoon (of
  // anders de organisatie). Als geen van beide bekend is, valt 'ie terug
  // op een generieke aanhef zonder komma.
  let greetingName = '';
  if (isExternal) {
    greetingName = (bon.external_contact && bon.external_contact.trim())
      || (bon.external_org && bon.external_org.trim())
      || '';
  } else {
    greetingName = bon.user_name || '';
  }
  const greetLine = greetingName ? `Hoi ${greetingName},` : 'Hoi,';

  const introBody = isReservation
    ? (isExternal
        ? 'Bedankt voor je reservering. Hieronder de details van je verhuur bij het materiaalhok.'
        : 'Je reservering is aangemaakt. Hieronder de details.')
    : (isExternal
        ? 'Het gereserveerde materiaal is opgehaald. Hieronder de definitieve details van je verhuur.'
        : 'Je hebt materiaal opgehaald uit het materiaalhok. Hieronder de details van je bon.');

  const introHtml = `<p>${esc(greetLine)}</p><p>${esc(introBody)}</p>`;

  // Bedragen-blok: alleen bij een externe reservering, en alleen als er
  // daadwerkelijk iets in rekening wordt gebracht. Ophalen herhaalt de
  // bedragen niet — die stonden al in de reserveringsmail.
  const rentalPrice = Number.isFinite(bon.rental_price) ? bon.rental_price : Number(bon.rental_price) || 0;
  const deposit     = Number.isFinite(bon.deposit)      ? bon.deposit      : Number(bon.deposit)      || 0;
  const showAmounts = isExternal && isReservation && (rentalPrice > 0 || deposit > 0);
  const amountsHtml = showAmounts ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;background:#faf5ff;border-radius:10px;border:1px solid #e9d5ff;">
      <tr><td style="padding:12px 16px;">
        <div style="font-size:12px;color:#6b21a8;text-transform:uppercase;letter-spacing:0.5px;">Bedragen</div>
        <div style="margin-top:4px;font-size:14px;">Huurprijs: <strong>${esc(fmtEuro(rentalPrice))}</strong></div>
        <div style="margin-top:2px;font-size:14px;">Borg: <strong>${esc(fmtEuro(deposit))}</strong></div>
        ${rentalPrice > 0 ? `<div style="margin-top:8px;font-size:12px;color:#6b21a8;">Betaalinstructies volgen apart.</div>` : ''}
      </td></tr>
    </table>
  ` : '';
  const amountsText = showAmounts ? [
    'Bedragen:',
    `- Huurprijs: ${fmtEuro(rentalPrice)}`,
    `- Borg: ${fmtEuro(deposit)}`,
    rentalPrice > 0 ? 'Betaalinstructies volgen apart.' : null,
  ].filter((l) => l !== null).join('\n') : null;

  // Huurvoorwaarden alleen tonen bij een externe reservering en alleen
  // als er tekst is ingevuld in de admin-instellingen.
  const termsRaw = typeof rentalTerms === 'string' ? rentalTerms.trim() : '';
  const showTerms = isExternal && isReservation && termsRaw.length > 0;
  const termsHtml = showTerms ? `
    <div style="margin:16px 0;padding:14px 16px;background:#f9fafb;border-left:3px solid ${BRAND_COLOR};border-radius:6px;">
      <div style="font-weight:600;margin-bottom:8px;">Huurvoorwaarden</div>
      ${paragraphsHtml(termsRaw)}
    </div>
  ` : '';
  const termsText = showTerms ? `Huurvoorwaarden:\n${termsRaw}` : null;

  const closingHtml = isExternal
    ? '<p>Vragen? Neem contact op met het materiaalhok.</p>'
    : '<p>Kom je iets tegen dat niet klopt? Loop even langs het materiaalhok — dan zetten we het samen recht.</p>';
  const closingText = isExternal
    ? 'Vragen? Neem contact op met het materiaalhok.'
    : 'Kom je iets tegen dat niet klopt? Loop even langs het materiaalhok — dan zetten we het samen recht.';

  const bodyHtml = `
    ${introHtml}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0;background:#f9fafb;border-radius:10px;">
      <tr><td style="padding:12px 16px;">
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Bonnummer</div>
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;font-size:16px;color:${BRAND_COLOR};">${esc(bon.bon_number)}</div>
      </td></tr>
      ${isExternal ? `
      <tr><td style="padding:8px 16px 4px;border-top:1px solid #e5e7eb;">
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Huurder</div>
        <div>${esc(bon.external_org || '')}</div>
      </td></tr>` : ''}
      <tr><td style="padding:8px 16px 12px;border-top:1px solid #e5e7eb;">
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">${isReservation ? 'Ophaaldatum' : 'Aangemaakt op'}</div>
        <div>${esc(formatDateNL(bon.start_date))}</div>
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-top:8px;">Retour uiterlijk</div>
        <div>${esc(formatDateNL(bon.return_date))}</div>
      </td></tr>
    </table>
    <p style="font-weight:600;margin-bottom:6px;">Op deze bon:</p>
    <ul style="margin:0 0 16px 20px;padding:0;">${itemsListHtml}</ul>
    ${amountsHtml}
    ${termsHtml}
    ${closingHtml}
    <p style="margin-top:20px;">Groet,<br>${esc(BRAND_NAME)}</p>
  `;

  const text = [
    greetLine,
    '',
    introBody,
    '',
    `Bonnummer: ${bon.bon_number}`,
    isExternal ? `Huurder: ${bon.external_org || ''}` : null,
    `${isReservation ? 'Ophaaldatum' : 'Aangemaakt op'}: ${formatDateNL(bon.start_date)}`,
    `Retour uiterlijk: ${formatDateNL(bon.return_date)}`,
    '',
    'Op deze bon:',
    itemsListText,
    amountsText ? '' : null,
    amountsText,
    termsText ? '' : null,
    termsText,
    '',
    closingText,
    '',
    'Groet,',
    BRAND_NAME,
  ].filter((l) => l !== null).join('\n');

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
  const isExternal = !!(bon.is_external === 1 || bon.is_external === true);

  const items = Array.isArray(bon.items) ? bon.items : [];
  const itemsListHtml = items.map((it) => `<li style="margin:2px 0;">${esc(itemLabel(it))}</li>`).join('');
  const itemsListText = items.map((it) => `- ${itemLabel(it)}`).join('\n');

  let greetingName = '';
  if (isExternal) {
    greetingName = (bon.external_contact && bon.external_contact.trim())
      || (bon.external_org && bon.external_org.trim())
      || '';
  } else {
    greetingName = bon.user_name || '';
  }
  const greetLine = greetingName ? `Hoi ${greetingName},` : 'Hoi,';

  const retourStr = formatDateNL(bon.return_date);
  const introBodyHtml = catchup
    ? `Kleine herinnering: het materiaal op bon <strong>${esc(bon.bon_number)}</strong> moet binnenkort weer terug in het materiaalhok. Uiterlijk op <strong>${esc(retourStr)}</strong>.`
    : `Kleine herinnering: het materiaal op bon <strong>${esc(bon.bon_number)}</strong> moet <strong>${esc(retourStr)}</strong> weer terug in het materiaalhok.`;
  const introHtml = `<p>${esc(greetLine)}</p><p>${introBodyHtml}</p>`;

  const introText = catchup
    ? `Kleine herinnering: het materiaal op bon ${bon.bon_number} moet binnenkort weer terug in het materiaalhok. Uiterlijk op ${retourStr}.`
    : `Kleine herinnering: het materiaal op bon ${bon.bon_number} moet ${retourStr} weer terug in het materiaalhok.`;

  const bodyHtml = `
    ${introHtml}
    <p style="font-weight:600;margin:16px 0 6px;">Wat er nog terug moet:</p>
    <ul style="margin:0 0 16px 20px;padding:0;">${itemsListHtml}</ul>
    <p>Alvast bedankt voor het op tijd terugbrengen — dat scheelt de volgende gebruiker een hoop gedoe.</p>
    <p>Kom je iets tegen dat niet klopt of lukt terugbrengen niet? Neem contact op met het materiaalhok.</p>
    <p style="margin-top:20px;">Groet,<br>${esc(BRAND_NAME)}</p>
  `;

  const text = [
    greetLine,
    '',
    introText,
    '',
    'Wat er nog terug moet:',
    itemsListText,
    '',
    'Alvast bedankt voor het op tijd terugbrengen — dat scheelt de volgende gebruiker een hoop gedoe.',
    'Kom je iets tegen dat niet klopt of lukt terugbrengen niet? Neem contact op met het materiaalhok.',
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
