import { useEffect, useRef, useState } from "react";

// Snelknop op het dashboard om een bon aan te maken.
//
// AANHAAKPUNT — Ronde B externe verhuur (nog niet gebouwd):
// deze knop staat op één optie: "namens interne gebruiker" via AdminBonFlow.
// Zodra externe huurders een eigen entiteit worden, komt hier een tweede
// optie bij ("namens externe huurder"). De structuur — één component dat
// een `options` array accepteert — is daar al op ingericht: bij lengte 1
// rendert 'ie als kale knop, bij lengte > 1 als dropdown-menu. Zo hoeft de
// call site in DashboardTab straks alleen een tweede optie toe te voegen.
//
// options: [{ key, label, description?, onSelect }]
export function NewBonButton({ options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!options || options.length === 0) return null;

  // Eén optie → kale knop. Geen menu-overhead voor iets dat toch maar één
  // richting heeft. Wordt automatisch een dropdown zodra er een tweede
  // optie bijkomt.
  if (options.length === 1) {
    const [only] = options;
    return <button
      type="button"
      onClick={() => only.onSelect()}
      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow-md hover:shadow-lg transition-shadow"
    >
      <span className="text-lg leading-none">{"\u002b"}</span>
      <span>{only.label}</span>
    </button>;
  }

  return <div ref={ref} className="relative inline-block">
    <button
      type="button"
      onClick={() => setOpen((s) => !s)}
      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow-md hover:shadow-lg transition-shadow"
    >
      <span className="text-lg leading-none">{"\u002b"}</span>
      <span>Nieuwe bon aanmaken</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-1"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    {open && <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
      {options.map((opt) => <button
        key={opt.key}
        type="button"
        onClick={() => { setOpen(false); opt.onSelect(); }}
        className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-50 last:border-0"
      >
        <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
        {opt.description && <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>}
      </button>)}
    </div>}
  </div>;
}
