// Gedeelde helpers voor route-bestanden.

// ISO-8601 timestamp in Nederlandse lokale tijd, met expliciete offset
// (+01:00 / +02:00). Forceert Europe/Amsterdam, dus werkt onafhankelijk
// van de timezone waarin de Node-proces draait.
function nowDutchISO() {
  const tz = 'Europe/Amsterdam';
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  );
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const local = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${ms}`;
  const offsetMin = Math.round(
    (new Date(`${local}Z`).getTime() - now.getTime()) / 60000,
  );
  const sign = offsetMin >= 0 ? '+' : '-';
  const a = Math.abs(offsetMin);
  const hh = String(Math.floor(a / 60)).padStart(2, '0');
  const mm = String(a % 60).padStart(2, '0');
  return `${local}${sign}${hh}:${mm}`;
}

// Vangt SQLite UNIQUE-constraint-fouten op en stuurt een 409 met de
// veldnaam terug. Retourneert true als de fout afgehandeld is.
function handleUniqueError(err, res) {
  if (err.code !== 'SQLITE_CONSTRAINT_UNIQUE') return false;
  const match = String(err.message).match(/UNIQUE constraint failed:\s*\w+\.(\w+)/);
  const field = match ? match[1] : 'veld';
  res.status(409).json({ error: `${field} bestaat al; moet uniek zijn` });
  return true;
}

// Genereert een Code 128-vriendelijke barcode in het formaat M-XXXX (materiaal)
// of S-XXXX (set). Pakt het hoogste bestaande nummer in dat format, telt op,
// en checkt voor de zekerheid nog of de uitkomst al bestaat (defense in depth
// voor het geval er een gat in de reeks zit dat al hergebruikt is). XXXX is
// minstens 4 cijfers maar groeit automatisch mee als de reeks > 9999 wordt.
//
// `db` wordt expliciet doorgegeven zodat we niet circulair de db-module hoeven
// te importeren vanuit utils.
function generateBarcode(db, type) {
  if (type !== 'M' && type !== 'S') {
    throw new Error("generateBarcode: type moet 'M' of 'S' zijn");
  }
  const table = type === 'M' ? 'materials' : 'sets';
  const prefix = `${type}-`;

  const rows = db.prepare(
    `SELECT barcode FROM ${table} WHERE barcode LIKE ?`,
  ).all(`${prefix}%`);

  let max = 0;
  for (const r of rows) {
    const m = String(r.barcode).match(/^[MS]-(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }

  const checkStmt = db.prepare(`SELECT 1 FROM ${table} WHERE barcode = ?`);
  let next = max + 1;
  // Loop tot we een ongebruikte code vinden. Bij normale werking valt 'ie
  // direct op de eerste iteratie buiten.
  while (true) {
    const code = `${prefix}${String(next).padStart(4, '0')}`;
    if (!checkStmt.get(code)) return code;
    next += 1;
  }
}

module.exports = { nowDutchISO, handleUniqueError, generateBarcode };
