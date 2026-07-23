import { useEffect, useRef } from "react";
import { CATS } from "../../data/defaults";
import { getIcon } from "../../utils/format";
import { availSetQty, loanedSetQty, reservedSetQty } from "../../utils/bons";

export function SetsTab({ sets, bons, q, setQ, cat, setCat, onSetClick, scanValue, setScanValue, scanMsg, setScanMsg }) {
  const scanRef = useRef(null);

  const handleScan = () => {
    const code = scanValue.trim();
    if (!code) return;
    let hit = sets.find(s => s.barcode === code || s.barcode === code.toUpperCase());
    if (!hit) {
      const numId = parseInt(code, 10);
      if (!Number.isNaN(numId)) hit = sets.find(s => s.id === numId);
    }
    if (!hit) hit = sets.find(s => s.name.toLowerCase().includes(code.toLowerCase()));
    if (hit) {
      onSetClick(hit);
      setScanMsg(null);
    } else {
      setScanMsg({ ok: false, text: "\u274c Set niet gevonden" });
      setTimeout(() => setScanMsg(null), 2500);
    }
    setScanValue("");
  };

  useEffect(() => {
    if (!scanRef.current) return;
    const handler = (e) => {
      if (e.key === "F3" || (e.ctrlKey && e.key === "f") || e.key === "/") e.preventDefault();
      if (scanRef.current && scanRef.current.offsetParent !== null &&
          document.activeElement !== scanRef.current &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "SELECT" &&
          document.activeElement?.tagName !== "TEXTAREA") {
        scanRef.current.focus();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  const filt = sets.filter(s => s.name.toLowerCase().includes(q.toLowerCase()) && (cat === "Alle" || s.category === cat));

  return <div className="space-y-4">
    <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">{"\ud83d\udcf3"}</span>
          <input ref={scanRef} className="w-full pl-11 pr-4 py-3 rounded-xl border border-purple-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Scan barcode om set te openen..." value={scanValue} onChange={e => setScanValue(e.target.value)} onKeyDown={e => e.key === "Enter" && handleScan()} autoFocus />
        </div>
        <button onClick={handleScan} className="px-5 py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700">Zoek</button>
      </div>
      {scanMsg && <div className={`mt-2 rounded-xl px-4 py-2.5 text-sm font-medium ${scanMsg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{scanMsg.text}</div>}
    </div>

    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><div className="flex flex-col md:flex-row gap-3">
      <div className="flex-1 relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Filter op naam..." value={q} onChange={e => setQ(e.target.value)}/></div>
      <div className="flex gap-1.5 overflow-x-auto">{CATS.map(c => <button key={c} onClick={() => setCat(c)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${cat === c ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{c}</button>)}</div>
    </div></div>

    {filt.length === 0 ? <div className="bg-white rounded-2xl p-10 text-center border border-gray-100"><p className="text-gray-400 text-sm">Geen sets gevonden</p></div>
      : <div className="space-y-2">{filt.map(s => {
      const av = availSetQty(s, bons);
      const lo = loanedSetQty(bons, s.id);
      const res = reservedSetQty(bons, s.id);
      return <div key={s.id} onClick={() => onSetClick(s)} className="bg-white rounded-2xl px-5 py-3.5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-gray-200">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-base flex-shrink-0">{getIcon(s.category)}</div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{s.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.stock} set{s.stock !== 1 ? "s" : ""} {"\u00b7"} {s.category || "\u2014"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{av}</span>
            {lo > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{lo} uit</span>}
            {res > 0 && <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{res} res</span>}
          </div>
        </div>
      </div>;
    })}</div>}
  </div>;
}
