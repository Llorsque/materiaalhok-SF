import { useState } from "react";
import { fmtDay } from "../utils/date";

// v2: toont bij een materiaal/set wie het in de gekozen periode heeft en,
// als de beschikbaarheid per dag verschilt, hoeveel er per dag vrij is
// ("de eerste 2 dagen 5, vanaf dag 3 10"). Ingeklapt standaard, zodat de
// lijst rustig blijft.
export function AvailabilityInfo({ info, unit }) {
  const [open, setOpen] = useState(false);
  if (!info) return null;
  const holders = info.holders || [];
  const frees = (info.days || []).map((d) => d.free);
  const varies = frees.length > 1 && Math.min(...frees) !== Math.max(...frees);
  if (holders.length === 0 && !varies) return null;

  // Opeenvolgende dagen met hetzelfde aantal samenvoegen tot één regel.
  const ranges = [];
  for (const d of info.days || []) {
    const last = ranges[ranges.length - 1];
    if (last && last.free === d.free) last.to = d.date;
    else ranges.push({ from: d.date, to: d.date, free: d.free });
  }

  return <div className="mt-2">
    <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2">
      {open ? "Verberg details" : holders.length > 0 ? `Bezet door ${holders.length === 1 ? holders[0].holder : `${holders.length} bonnen`}${varies ? " · vrij per dag" : ""}` : "Vrij per dag"}
    </button>
    {open && <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700 space-y-2">
      {varies && <div>
        <p className="font-semibold text-slate-900 mb-1">Vrij per dag</p>
        <ul className="space-y-0.5">
          {ranges.map((r) => <li key={r.from} className="flex justify-between gap-3">
            <span>{r.from === r.to ? fmtDay(r.from) : `${fmtDay(r.from)} – ${fmtDay(r.to)}`}</span>
            <span className={`font-semibold ${r.free === 0 ? "text-red-600" : "text-emerald-700"}`}>{r.free}{unit ? ` ${unit}` : ""}</span>
          </li>)}
        </ul>
      </div>}
      {holders.length > 0 && <div>
        <p className="font-semibold text-slate-900 mb-1">Wie heeft het</p>
        <ul className="space-y-0.5">
          {holders.map((h, i) => <li key={`${h.bon_number}-${i}`} className="flex justify-between gap-3">
            <span>{h.holder} · {h.quantity}x</span>
            <span className={h.overdue ? "text-red-600 font-medium" : ""}>
              {h.status === "reserved" ? `gereserveerd ${fmtDay(h.start_date)} – ` : "terug "}{fmtDay(h.return_date)}{h.overdue ? " (te laat)" : ""}
            </span>
          </li>)}
        </ul>
      </div>}
    </div>}
  </div>;
}
