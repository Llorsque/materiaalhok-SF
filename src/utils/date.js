export const fmtDate = (d) => d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" }) : "";
// fmtDT toont datum + tijd voor volledige ISO-timestamps (created_at,
// reported_at, ...), maar voor een kale YYYY-MM-DD (zoals bon.return_date)
// alléén de datum. Anders zou `new Date("2026-09-01")` als 00:00 UTC worden
// geparsed en dan als "01 sep 02:00" in NL-zomertijd verschijnen — de bekende
// UTC-midnight-val. Detectie op de "T"-scheider in de ISO-string is genoeg:
// bare datums hebben die niet, timestamps wel.
export const fmtDT = (d) => {
  if (!d) return "";
  const isBareDate = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (isBareDate) {
    const [y, mo, da] = d.split("-").map(Number);
    return new Date(y, mo - 1, da).toLocaleDateString("nl-NL", { day: "2-digit", month: "short" });
  }
  return new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};
// Lokale kalenderdag (niet UTC): tussen 00:00 en 02:00 NL-tijd gaf de oude
// toISOString-variant nog de dag ervoor.
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const addDaysYmd = (ymd, n) => {
  const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
// "ma 16 nov" voor een YYYY-MM-DD, zonder UTC-verschuiving.
export const fmtDay = (ymd) => {
  if (!ymd) return "";
  const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
};
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
