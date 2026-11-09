import { useState } from "react";
import { extendBon } from "../api/client";
import { fmtDay, isWeekend, addDaysYmd } from "../utils/date";

// v2: bon verlengen. De gebruiker kiest een latere retourdatum; de server
// controleert of alle openstaande items in de extra dagen vrij zijn (ook
// t.o.v. reserveringen van anderen) en zegt anders wie er in de weg zit.
export function ExtendBonPanel({ bon, onExtended }) {
  const current = (bon?.return_date || "").slice(0, 10);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { message, conflicts? }
  const [done, setDone] = useState(null);
  if (!bon || bon.status === "completed" || !current) return null;

  const weekend = isWeekend(date);
  const tooEarly = date && date <= current;

  const submit = async () => {
    if (!date || weekend || tooEarly || busy) return;
    setBusy(true); setError(null);
    try {
      const updated = await extendBon(bon.id, date);
      setDone(updated.return_date);
      setOpen(false); setDate("");
      onExtended && onExtended(updated);
    } catch (err) {
      setError({ message: err.message || "Verlengen mislukt", conflicts: Array.isArray(err.details) ? err.details : null });
    } finally {
      setBusy(false);
    }
  };

  return <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">Verlengen</p>
        <p className="text-xs text-slate-500">Nu terug op {fmtDay(current)}</p>
      </div>
      {!open && <button onClick={() => { setOpen(true); setDone(null); setError(null); }} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700">Verlengen</button>}
    </div>
    {done && <p className="text-sm rounded-lg bg-emerald-50 text-emerald-800 px-3 py-2">Verlengd tot {fmtDay(done)}.</p>}
    {open && <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-600">Nieuwe retourdatum</label>
      <input type="date" min={addDaysYmd(current, 1)} value={date} onChange={(e) => { setDate(e.target.value); setError(null); }}
        className={`w-full px-3 py-2.5 rounded-lg border bg-slate-50 text-base focus:outline-none focus:ring-2 ${weekend || tooEarly ? "border-red-300 focus:ring-red-500" : "border-slate-200 focus:ring-slate-500"}`}/>
      {weekend && <p className="text-xs text-red-600">Retourdatum kan alleen op een werkdag vallen.</p>}
      {tooEarly && <p className="text-xs text-red-600">Kies een datum na {fmtDay(current)}.</p>}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
        <p className="font-semibold">{error.message}</p>
        {error.conflicts && <ul className="mt-1 space-y-0.5 text-xs">
          {error.conflicts.map((c, i) => <li key={i}>• {c.material_name || c.set_name}: {c.beschikbaar} van {c.gevraagd} vrij{c.bezet_door?.length ? ` — bezet door ${c.bezet_door.join(", ")}` : ""}</li>)}
        </ul>}
      </div>}
      <div className="flex gap-2">
        <button onClick={() => { setOpen(false); setError(null); setDate(""); }} className="flex-1 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">Annuleren</button>
        <button onClick={submit} disabled={!date || weekend || tooEarly || busy} className="flex-1 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-40">{busy ? "Bezig…" : "Bevestig verlenging"}</button>
      </div>
    </div>}
  </div>;
}
