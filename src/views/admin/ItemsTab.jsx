import { useEffect, useRef } from "react";
import { CATS } from "../../data/defaults";
import { getIcon } from "../../utils/format";
import { availQty, loanedQty } from "../../utils/bons";

export function ItemsTab({ eq, bons, q, setQ, cat, setCat, onItemClick, adminScan, setAdminScan, adminScanMsg, setAdminScanMsg }) {
  const adminScanRef = useRef(null);

  const handleAdminScan = () => {
    const code = adminScan.trim();
    if (!code) return;
    const numId = parseInt(code, 10);
    let item = eq.find(i => i.barcode === code || i.barcode === code.toUpperCase());
    if (!item) { const numId = parseInt(code, 10); item = eq.find(i => i.id === numId); }
    if (!item) item = eq.find(i => i.name.toLowerCase().includes(code.toLowerCase()));
    if (item) {
      onItemClick(item);
      setAdminScanMsg(null);
    } else {
      setAdminScanMsg({ ok: false, text: "\u274c Artikel niet gevonden" });
      setTimeout(() => setAdminScanMsg(null), 2500);
    }
    setAdminScan("");
  };

  // Keep focus on admin scan field when items tab is active
  useEffect(() => {
    if (!adminScanRef.current) return;
    const handler = (e) => {
      if (e.key === "F3" || (e.ctrlKey && e.key === "f") || e.key === "/") e.preventDefault();
      if (adminScanRef.current && adminScanRef.current.offsetParent !== null &&
          document.activeElement !== adminScanRef.current &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "SELECT" &&
          document.activeElement?.tagName !== "TEXTAREA") {
        adminScanRef.current.focus();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  const filt = eq.filter(i=>i.name.toLowerCase().includes(q.toLowerCase())&&(cat==="Alle"||i.category===cat));

  return <div className="space-y-4">
    {/* Scan bar */}
    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400">{"\ud83d\udcf3"}</span>
          <input ref={adminScanRef} className="w-full pl-11 pr-4 py-3 rounded-xl border border-blue-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Scan barcode om artikel te openen..." value={adminScan} onChange={e=>setAdminScan(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAdminScan()} autoFocus/>
        </div>
        <button onClick={handleAdminScan} className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">Zoek</button>
      </div>
      {adminScanMsg && <div className={`mt-2 rounded-xl px-4 py-2.5 text-sm font-medium ${adminScanMsg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{adminScanMsg.text}</div>}
    </div>

    {/* Filter bar */}
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><div className="flex flex-col md:flex-row gap-3">
      <div className="flex-1 relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Filter op naam..." value={q} onChange={e=>setQ(e.target.value)}/></div>
      <div className="flex gap-1.5 overflow-x-auto">{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${cat===c?"bg-blue-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{c}</button>)}</div>
    </div></div>
    <div className="space-y-2">{filt.map(i=>{const av=availQty(i,bons);const lo=loanedQty(bons,i.id);const res=bons.filter(b=>b.status==="reserved").reduce((s,b)=>{let t=0;b.items.forEach(bi=>{if(bi.itemId===i.id)t+=bi.qty});return s+t},0);
      return <div key={i.id} onClick={()=>onItemClick(i)} className="bg-white rounded-2xl px-5 py-3.5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-gray-200">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {i.photo?<img src={i.photo} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" alt=""/>:<div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-base flex-shrink-0">{getIcon(i.category)}</div>}
            <div className="min-w-0"><p className="font-semibold text-gray-900 text-sm truncate">{i.name}</p><p className="text-xs text-gray-500 mt-0.5">{i.stock} {i.unit} {"\u00b7"} {i.category}</p></div>
          </div>
          <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{av}</span>
            {lo>0&&<span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{lo} uit</span>}
            {res>0&&<span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{res} res</span>}
          </div>
        </div>
      </div>})}</div>
  </div>;
}
