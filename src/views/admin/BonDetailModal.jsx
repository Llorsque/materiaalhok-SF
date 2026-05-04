import { Modal } from "../../components/Modal";
import { BonBadge } from "../../components/BonBadge";
import { fmtDate } from "../../utils/date";

export function BonDetailModal({ bonDetail, setBonDetail, setBons, addLog, onForceComplete }) {
  return <Modal open={!!bonDetail} onClose={()=>setBonDetail(null)} title={bonDetail?`Bon ${bonDetail.number}`:""} wide>
    {bonDetail&&<div className="space-y-4">
      <div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">{"\ud83d\udc64"} {bonDetail.user}</p><p className="text-sm text-gray-500">{fmtDate(bonDetail.startDate)} {"\u2192"} {fmtDate(bonDetail.endDate)}</p></div><BonBadge bon={bonDetail}/></div>
      <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">{bonDetail.items.map((bi,idx)=>{const rem=bi.qty-(bi.returned||0);return <div key={idx} className="px-4 py-3 flex items-center justify-between"><div><p className="text-sm font-medium">{bi.itemName}</p><p className="text-xs text-gray-500">{bi.qty} {bi.unit} {bi.returned>0&&`\u2014 ${bi.returned} retour`}</p></div><div className="flex items-center gap-2">{rem>0?<span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">{rem} open</span>:<span className="text-xs text-emerald-600">{"\u2705"}</span>}{bonDetail.status!=="completed"&&rem>0&&<button onClick={()=>{const nb={...bonDetail,items:bonDetail.items.map((i,j)=>j===idx?{...i,returned:i.qty}:i)};setBons(p=>p.map(b=>b.id===bonDetail.id?nb:b));setBonDetail(nb);addLog("return",`${bonDetail.number}: ${bi.itemName} retour (admin)`)}} className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs hover:bg-emerald-200">Retour</button>}</div></div>})}</div>
      {/* Edit dates */}
      {bonDetail.status!=="completed"&&<div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Bon aanpassen</h4>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Startdatum</label><input type="date" className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={bonDetail.startDate} onChange={e=>{const nb={...bonDetail,startDate:e.target.value};setBons(p=>p.map(b=>b.id===bonDetail.id?nb:b));setBonDetail(nb)}}/></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Einddatum</label><input type="date" className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={bonDetail.endDate} onChange={e=>{const nb={...bonDetail,endDate:e.target.value};setBons(p=>p.map(b=>b.id===bonDetail.id?nb:b));setBonDetail(nb)}}/></div>
        </div>
        <div><label className="block text-xs font-medium text-gray-500 mb-1">Status</label><select className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={bonDetail.status} onChange={e=>{const nb={...bonDetail,status:e.target.value};setBons(p=>p.map(b=>b.id===bonDetail.id?nb:b));setBonDetail(nb);addLog("edit",`${bonDetail.number} status gewijzigd naar ${e.target.value}`)}}><option value="reserved">Gereserveerd</option><option value="active">Actief</option><option value="completed">Compleet</option></select></div>
      </div>}
      <div className="flex gap-2 pt-2">
        {bonDetail.status!=="completed"&&<button onClick={()=>onForceComplete(bonDetail.id)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700">Forceer compleet</button>}
        <button onClick={()=>{if(!confirm(`Bon ${bonDetail.number} verwijderen?`))return;setBons(p=>p.filter(b=>b.id!==bonDetail.id));addLog("edit",`${bonDetail.number} verwijderd door beheerder`);setBonDetail(null)}} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 border border-red-200">Verwijder bon</button>
      </div>
    </div>}
  </Modal>;
}
