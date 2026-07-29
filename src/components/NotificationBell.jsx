import { useEffect, useRef, useState } from "react";

// Domme presentatie-component: krijgt een lijst notificaties en toont
// een belletje met teller. Klik → dropdown. AdminView componeert de
// notificaties (bonnen te laat, schade, incomplete retouren, backup-status).
//
// notifications: [{
//   id,          — string, unieke sleutel
//   type,        — 'backup' | 'overdue' | 'damage' | 'incomplete' (voor groepering en icoon)
//   severity,    — 'red' | 'amber'
//   title,       — kortom van de melding
//   subtitle,    — optioneel: extra context (bv. bonnummer, datum)
//   onClick,     — callback, sluit dropdown en navigeert
// }]

const GROUP_META = {
  backup:     { label: "Geen recente backup", icon: "\ud83d\uddc4\ufe0f" },
  overdue:    { label: "Bonnen te laat",       icon: "\u23f0" },
  damage:     { label: "Kwijt / schade gemeld", icon: "\u26a0\ufe0f" },
  incomplete: { label: "Incomplete retouren",   icon: "\ud83d\udce6" },
};
const GROUP_ORDER = ["backup", "overdue", "damage", "incomplete"];

export function NotificationBell({ notifications }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const total = notifications?.length || 0;
  const hasRed = notifications?.some((n) => n.severity === "red");

  const grouped = {};
  for (const n of (notifications || [])) {
    if (!grouped[n.type]) grouped[n.type] = [];
    grouped[n.type].push(n);
  }

  const handleClickItem = (n) => {
    setOpen(false);
    if (n.onClick) n.onClick();
  };

  return <div ref={ref} className="relative">
    <button
      type="button"
      onClick={() => setOpen((s) => !s)}
      className={`relative w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${open ? "bg-gray-100 border-gray-300" : "bg-white border-gray-200 hover:bg-gray-50"}`}
      title={total === 0 ? "Geen meldingen" : `${total} meldingen`}
      aria-label="Meldingen"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
      </svg>
      {total > 0 && <span className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-[11px] font-bold text-white flex items-center justify-center ${hasRed ? "bg-red-600" : "bg-amber-500"}`}>{total > 99 ? "99+" : total}</span>}
    </button>

    {open && <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">Meldingen</p>
        <span className="text-xs text-gray-500">{total} {total === 1 ? "melding" : "meldingen"}</span>
      </div>
      {total === 0 ? <div className="px-4 py-8 text-center">
        <div className="text-3xl mb-2">{"\ud83d\ude4c"}</div>
        <p className="text-sm text-gray-500">Geen meldingen — alles onder controle.</p>
      </div> : <div className="max-h-[65vh] overflow-y-auto divide-y divide-gray-50">
        {GROUP_ORDER.filter((g) => grouped[g]?.length > 0).map((g) => {
          const meta = GROUP_META[g];
          const items = grouped[g];
          return <div key={g}>
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
              <span>{meta.icon}</span><span>{meta.label}</span><span className="ml-auto text-gray-400">{items.length}</span>
            </div>
            {items.map((n) => <button
              key={n.id}
              type="button"
              onClick={() => handleClickItem(n)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-l-4"
              style={{ borderLeftColor: n.severity === "red" ? "#dc2626" : "#f59e0b" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                {n.subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{n.subtitle}</p>}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 mt-1 flex-shrink-0"><path d="M9 5l7 7-7 7"/></svg>
            </button>)}
          </div>;
        })}
      </div>}
    </div>}
  </div>;
}
