import { useMemo, useState } from "react";

// Combineer materialen en sets in één lijst, exporteer geselecteerde items als
// CSV voor import in Dymo Label Software. Geen labels in de UI — visuele stijl
// regelt de admin in Dymo zelf.

const pad = (n) => String(n).padStart(2, "0");

function filenameFor(d = new Date()) {
  return `barcodes-export-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.csv`;
}

// Standaard CSV-escape: quote omhullen als de waarde een komma, quote, of
// regeleinde bevat; interne quotes verdubbelen.
function csvEscape(v) {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(rows) {
  const header = ["Barcode", "Naam", "Categorie", "Locatie", "Type"].join(",");
  const body = rows.map((r) =>
    [r.barcode, r.name, r.category, r.location, r.type].map(csvEscape).join(","),
  ).join("\r\n");
  return body ? `${header}\r\n${body}\r\n` : `${header}\r\n`;
}

function triggerDownload(filename, content) {
  // BOM zodat Excel/Dymo Label Software UTF-8 correct herkent (accenten in
  // namen blijven anders als rare tekens staan).
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function BarcodesTab({ eq, sets }) {
  // Eén uniforme lijst met materialen en sets. `kind` gebruiken we voor het
  // type-filter en de visuele indicator; `type` is de waarde die in het CSV
  // belandt — voor materialen 'uniek'/'bulk', voor sets vast 'vast'.
  const items = useMemo(() => {
    const mats = (eq || []).map((m) => ({
      id: `m-${m.id}`,
      kind: "material",
      barcode: m.barcode || "",
      name: m.name || "",
      category: m.category || "",
      location: m.location || "",
      type: m.type || "bulk",
    }));
    const ss = (sets || []).map((s) => ({
      id: `s-${s.id}`,
      kind: "set",
      barcode: s.barcode || "",
      name: s.name || "",
      category: s.category || "",
      location: s.location || "",
      type: "vast",
    }));
    return [...mats, ...ss].sort((a, b) => a.barcode.localeCompare(b.barcode));
  }, [eq, sets]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort(),
    [items],
  );

  const [typeFilter, setTypeFilter] = useState("beide"); // beide | material | set
  const [catFilter, setCatFilter] = useState("alle");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(() => new Set());

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return items.filter((i) => {
      if (typeFilter === "material" && i.kind !== "material") return false;
      if (typeFilter === "set" && i.kind !== "set") return false;
      if (catFilter !== "alle" && i.category !== catFilter) return false;
      if (qLower && !i.name.toLowerCase().includes(qLower)) return false;
      return true;
    });
  }, [items, typeFilter, catFilter, q]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk-acties werken op de gefilterde lijst, niet op alle items.
  const selectFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((i) => next.add(i.id));
      return next;
    });
  };
  const deselectFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((i) => next.delete(i.id));
      return next;
    });
  };

  const handleExport = () => {
    const rows = items.filter((i) => selected.has(i.id));
    if (rows.length === 0) return;
    triggerDownload(filenameFor(), buildCsv(rows));
  };

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Barcodes — export voor Dymo</h3>
        <p className="text-sm text-gray-600">
          Geen items om te exporteren. Importeer eerst een materialenlijst via de Import-tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Barcodes — export voor Dymo</h3>
        <p className="text-sm text-gray-600 mt-1">
          Selecteer items en exporteer als CSV voor import in Dymo Label Software.
          Aantal labels per item regel je in Dymo.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="grid sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm"
            >
              <option value="beide">Beide</option>
              <option value="material">Materialen</option>
              <option value="set">Sets</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categorie</label>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm"
            >
              <option value="alle">Alle categorieën</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Zoek op naam</label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="bv. voetbal"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={selectFiltered}
            className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200"
          >
            Selecteer alles
          </button>
          <button
            onClick={deselectFiltered}
            className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200"
          >
            Deselecteer alles
          </button>
          <span className="text-xs text-gray-500 ml-auto">{filtered.length} zichtbaar</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 px-4 py-6 text-center">
            Geen items voldoen aan de filters.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((i) => {
              const sel = selected.has(i.id);
              return (
                <label
                  key={i.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => toggle(i.id)}
                    className="w-4 h-4 accent-blue-600 flex-shrink-0"
                  />
                  <span className="font-mono text-xs text-gray-700 w-24 flex-shrink-0">
                    {i.barcode || "—"}
                  </span>
                  <span className="text-sm text-gray-900 flex-1 truncate">{i.name}</span>
                  <span className="text-xs text-gray-500 hidden sm:inline w-32 truncate">
                    {i.category}
                  </span>
                  <span className="text-xs text-gray-500 hidden md:inline w-28 truncate">
                    {i.location}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      i.kind === "set"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {i.kind === "set" ? "set" : "materiaal"}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="sticky bottom-2 z-10 flex items-center justify-between gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
        <span className="text-sm text-gray-700">
          <strong>{selected.size}</strong> geselecteerd
        </span>
        <button
          onClick={handleExport}
          disabled={selected.size === 0}
          className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Exporteer selectie voor Dymo (CSV)
        </button>
      </div>
    </div>
  );
}
