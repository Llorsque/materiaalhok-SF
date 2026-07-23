export const fmtDate = (d) => d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" }) : "";
export const fmtDT = (d) => d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
export const today = () => new Date().toISOString().split("T")[0];
export const isoNow = () => new Date().toISOString();

// Zaterdag/zondag-check. Werkt op YYYY-MM-DD strings uit HTML date-inputs
// en op volledige ISO-timestamps. Gebruikt UTC zodat de detectie niet
// verschuift bij zomertijd-overgangen.
export function isWeekend(dateStr) {
  if (typeof dateStr !== "string") return false;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}
