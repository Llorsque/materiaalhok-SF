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

module.exports = { nowDutchISO, handleUniqueError };
