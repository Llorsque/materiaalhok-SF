import { useEffect, useState } from "react";
import { fmtDT } from "../../utils/date";
import { getLogs } from "../../api/client";

// Human-labels voor de actie-dropdown. Volgorde bepaalt de UI-volgorde.
const ACTION_OPTIONS = [
  ["", "Alle acties"],
  ["bon_create", "Bon aangemaakt"],
  ["bon_update", "Bon bijgewerkt"],
  ["bon_pickup", "Bon opgehaald"],
  ["bon_return", "Retour verwerkt"],
  ["bon_delete", "Bon verwijderd"],
  ["damage_reported", "Schade / verlies gemeld"],
  ["damage_resolved", "Schade / verlies afgehandeld"],
  ["material_create", "Materiaal toegevoegd"],
  ["material_update", "Materiaal bijgewerkt"],
  ["material_delete", "Materiaal verwijderd"],
  ["set_create", "Set toegevoegd"],
  ["set_update", "Set bijgewerkt"],
  ["set_delete", "Set verwijderd"],
  ["user_create", "Gebruiker toegevoegd"],
  ["user_update", "Gebruiker bijgewerkt"],
  ["user_password_reset", "Wachtwoord gereset"],
  ["user_delete", "Gebruiker verwijderd"],
  ["import", "Excel-import"],
  ["reset", "Reset uitgevoerd"],
];
const ACTION_LABELS = Object.fromEntries(ACTION_OPTIONS);

const PAGE_SIZE = 50;

export function LogTab() {
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ logs: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset naar pagina 1 zodra een filter verandert — anders kijk je op een
  // pagina die met het nieuwe filter mogelijk niet meer bestaat.
  useEffect(() => { setPage(0); }, [q, action]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getLogs({ limit: PAGE_SIZE, offset: page * PAGE_SIZE, action, q })
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err.message || "Kon logboek niet laden"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q, action, page]);

  const total = data.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = Math.min(total, (page + 1) * PAGE_SIZE);

  const hasAnyFilter = q !== "" || action !== "";
  const isTrulyEmpty = !loading && total === 0 && !hasAnyFilter;

  return <div className="space-y-4">
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          placeholder="Zoek in omschrijving..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <select
        value={action}
        onChange={(e) => setAction(e.target.value)}
        className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
      >
        {ACTION_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>

    {error && <p className="text-sm text-red-600">{error}</p>}

    {isTrulyEmpty && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-12 text-center">
      <div className="text-4xl mb-3">📖</div>
      <p className="text-gray-700 font-medium">Nog geen logregels</p>
      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
        Zodra er met de tool gewerkt wordt — bonnen aangemaakt, materialen bijgewerkt,
        gebruikers toegevoegd — verschijnen die acties hier.
      </p>
    </div>}

    {!isTrulyEmpty && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="hidden md:grid grid-cols-[180px_170px_160px_1fr] gap-4 px-4 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50">
        <div>Tijdstip</div>
        <div>Actie</div>
        <div>Wie</div>
        <div>Omschrijving</div>
      </div>
      {loading && data.logs.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Laden…</p>}
      {!loading && data.logs.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Geen resultaten voor deze filters</p>}
      <div className="divide-y divide-gray-50">
        {data.logs.map((l) => <div key={l.id} className="grid grid-cols-1 md:grid-cols-[180px_170px_160px_1fr] gap-1 md:gap-4 px-4 py-3 text-sm">
          <div className="text-xs text-gray-400 md:text-sm md:text-gray-500">{fmtDT(l.date)}</div>
          <div className="text-xs md:text-sm text-gray-600">{ACTION_LABELS[l.action] || l.action}</div>
          <div className="text-xs md:text-sm text-gray-600">{l.user_name || "—"}</div>
          <div className="text-gray-700">{l.detail}</div>
        </div>)}
      </div>
    </div>}

    {!isTrulyEmpty && total > 0 && <div className="flex items-center justify-between text-sm text-gray-600">
      <div>{showingFrom}–{showingTo} van {total}</div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0 || loading}
          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Vorige
        </button>
        <span className="text-xs text-gray-500">Pagina {page + 1} van {totalPages}</span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1 || loading}
          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Volgende
        </button>
      </div>
    </div>}
  </div>;
}
