import { Stat } from "../../components/Stat";
import { BonCard } from "../../components/BonCard";
import { fmt } from "../../utils/format";
import { fmtDate, fmtDT } from "../../utils/date";

export function DashboardTab({ bons, totalStock, totalUnavail, totalValue, activeBons, overdueBons, reservedBons, recentLogs, onBonClick }) {
  return <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Stat label="Voorraad" value={totalStock} color="text-gray-700" icon={"\ud83d\udce6"}/>
      <Stat label="Beschikbaar" value={totalStock-totalUnavail} color="text-emerald-600" icon={"\u2705"}/>
      <Stat label="Actieve bonnen" value={bons.filter(b=>b.status==="active").length} color="text-amber-600" icon={"\ud83d\udce4"}/>
      <Stat label="Reserveringen" value={reservedBons.length} color="text-purple-600" icon={"\ud83d\udcc5"}/>
      <Stat label="Waarde" value={fmt(totalValue)} color="text-gray-600" icon={"\ud83d\udcb0"}/>
    </div>
    {overdueBons.length>0&&<div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4"><div className="flex items-start gap-3"><span className="text-lg">{"\u26a0\ufe0f"}</span><div><p className="font-semibold text-red-800 text-sm">Verlopen bonnen ({overdueBons.length})</p>{overdueBons.map(b=><p key={b.id} className="text-xs text-red-700 mt-1 cursor-pointer hover:underline" onClick={()=>onBonClick(b)}><span className="font-mono font-bold">{b.number}</span> {"\u2014"} {b.user} {"\u2014"} {fmtDate(b.endDate)}</p>)}</div></div></div>}
    {activeBons.length>0&&<div><h3 className="text-sm font-bold text-gray-700 mb-3">Actieve bonnen</h3><div className="space-y-2">{activeBons.slice(0,10).map(b=><BonCard key={b.id} bon={b} onClick={()=>onBonClick(b)} showUser/>)}</div></div>}
    <div><h3 className="text-sm font-bold text-gray-700 mb-3">Recente activiteit</h3>{recentLogs.length===0?<p className="text-sm text-gray-400">Geen activiteit</p>:<div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">{recentLogs.slice(0,8).map(l=><div key={l.id} className="px-4 py-3 text-sm"><span className="text-xs text-gray-400">{fmtDT(l.date)}</span><p className="text-gray-700 mt-0.5">{l.detail}</p></div>)}</div>}</div>
  </div>;
}
