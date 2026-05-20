export function KindBadge({ kind, compact }) {
  const isSet = kind === "set";
  const base = compact
    ? "inline-flex items-center px-1.5 py-0 rounded text-[10px] font-semibold uppercase tracking-wide"
    : "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide";
  const color = isSet ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700";
  return <span className={`${base} ${color}`}>{isSet ? "set" : "materiaal"}</span>;
}
