import { useState } from "react";
import { CATS } from "../../data/defaults";
import { getIcon } from "../../utils/format";
import { availQty, loanedQty, reservedQty } from "../../utils/bons";
import { useGlobalBarcodeScan } from "../../utils/barcodeScan";
import { ViewToggle, TileGrid, Tile } from "../../components/TileGrid";

export function ItemsTab({ eq, bons, q, setQ, cat, setCat, onItemClick }) {
  // Tijdelijke toast alleen voor scan-uitkomst (geen match). Handmatig typen
  // filtert live in het zoekveld en gebruikt deze toast nooit.
  const [scanMsg, setScanMsg] = useState(null);
  const [view, setView] = useState("list");

  const openByScan = (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const upper = trimmed.toUpperCase();
    let item = eq.find((i) => i.barcode === trimmed || i.barcode === upper);
    if (!item) {
      const numId = parseInt(trimmed, 10);
      if (!Number.isNaN(numId)) item = eq.find((i) => i.id === numId);
    }
    if (item) {
      onItemClick(item);
      // Als de scan-tekens ondertussen in het filterveld zijn beland (focus
      // stond daar toevallig), maken we het weer schoon zodat de lijst niet
      // achterblijft op "M-0042".
      setQ("");
      setScanMsg(null);
    } else {
      setScanMsg({ ok: false, text: `\u274c Geen item met barcode "${trimmed}"` });
      setTimeout(() => setScanMsg(null), 2500);
    }
  };

  useGlobalBarcodeScan(openByScan);

  const needle = q.trim().toLowerCase();
  const filt = eq.filter((i) => {
    if (cat !== "Alle" && i.category !== cat) return false;
    if (!needle) return true;
    const inName    = i.name && i.name.toLowerCase().includes(needle);
    const inBarcode = i.barcode && String(i.barcode).toLowerCase().includes(needle);
    return inName || inBarcode;
  });

  const badgesFor = (av, lo, res) => {
    const arr = [{ text: String(av), tone: "emerald" }];
    if (lo > 0)  arr.push({ text: `${lo} uit`, tone: "amber" });
    if (res > 0) arr.push({ text: `${res} res`, tone: "purple" });
    return arr;
  };

  return <div className="space-y-4">
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          type="search"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Zoek op naam of barcode..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="flex gap-1.5 overflow-x-auto">
        {CATS.map((c) => <button key={c} onClick={() => setCat(c)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${cat === c ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{c}</button>)}
      </div>
      <p className="text-xs text-gray-400">{"\ud83d\udcf3"} Scan een barcode om direct een item te openen — een handscanner werkt overal op deze pagina.</p>
    </div>

    {scanMsg && <div className={`rounded-2xl px-4 py-2.5 text-sm font-medium ${scanMsg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{scanMsg.text}</div>}

    <div className="flex items-center justify-between gap-3">
      <h3 className="text-lg font-bold text-gray-900">Materiaal ({filt.length})</h3>
      <ViewToggle view={view} onChange={setView} accent="blue" />
    </div>

    {view === "list" ? <div className="space-y-2">
      {filt.map((i) => {
        const av = availQty(i, bons);
        const lo = loanedQty(bons, i.id);
        const res = reservedQty(bons, i.id);
        return <div key={i.id} onClick={() => onItemClick(i)} className="bg-white rounded-2xl px-5 py-3.5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {i.photo ? <img src={i.photo} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" alt=""/> : <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-base flex-shrink-0">{getIcon(i.category)}</div>}
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{i.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{i.stock} {i.unit} {"\u00b7"} {i.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{av}</span>
              {lo > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{lo} uit</span>}
              {res > 0 && <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{res} res</span>}
            </div>
          </div>
        </div>;
      })}
    </div> : <TileGrid>
      {filt.map((i) => {
        const av = availQty(i, bons);
        const lo = loanedQty(bons, i.id);
        const res = reservedQty(bons, i.id);
        const media = i.photo
          ? <img src={i.photo} className="w-10 h-10 rounded-xl object-cover" alt=""/>
          : <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-base">{getIcon(i.category)}</div>;
        return <Tile
          key={i.id}
          onClick={() => onItemClick(i)}
          media={media}
          title={i.name}
          subtitle={`${i.stock} ${i.unit} \u00b7 ${i.category}`}
          badges={badgesFor(av, lo, res)}
        />;
      })}
    </TileGrid>}
  </div>;
}
