import { Modal } from "../../components/Modal";
import { BonBadge } from "../../components/BonBadge";
import { fmtDate } from "../../utils/date";
import { itemDisplayName } from "../../utils/bons";

export function BonDetailModal({ bonDetail, setBonDetail, onForceComplete, onUpdateBon, onItemReturn, onDeleteBon }) {
  return <Modal open={!!bonDetail} onClose={()=>setBonDetail(null)} title={bonDetail?`Bon ${bonDetail.bon_number}`:""} wide>
    {bonDetail&&<div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{"\ud83d\udc64"} {bonDetail.user_name || "-"}</p>
          <p className="text-sm text-gray-500">{fmtDate(bonDetail.start_date)} {"\u2192"} {fmtDate(bonDetail.return_date)}</p>
        </div>
        <BonBadge bon={bonDetail}/>
      </div>

      <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
        {(bonDetail.items||[]).map((bi)=>{
          const isReturned = !!bi.returned;
          return <div key={bi.id} className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{itemDisplayName(bi)}</p>
              <p className="text-xs text-gray-500">{bi.quantity} stuk{bi.quantity!==1?"s":""}{isReturned?" \u2014 retour":""}{bi.picked_up?" \u2014 opgehaald":""}</p>
            </div>
            <div className="flex items-center gap-2">
              {isReturned
                ? <span className="text-xs text-emerald-600">{"\u2705"} retour</span>
                : <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">open</span>}
              {bonDetail.status==="active" && !isReturned && <button onClick={()=>onItemReturn(bonDetail.id, bi.id)} className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs hover:bg-emerald-200">Retour</button>}
            </div>
          </div>;
        })}
      </div>

      {bonDetail.status!=="completed" && <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Datums aanpassen</h4>
        <p className="text-xs text-gray-500">Status wordt opnieuw berekend op basis van de nieuwe datums (door de backend).</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Startdatum</label>
            <input type="date" className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={(bonDetail.start_date||"").slice(0,10)}
              onChange={e=>onUpdateBon(bonDetail.id, { start_date: e.target.value })}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Retourdatum</label>
            <input type="date" className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={(bonDetail.return_date||"").slice(0,10)}
              onChange={e=>onUpdateBon(bonDetail.id, { return_date: e.target.value })}/>
          </div>
        </div>
      </div>}

      <div className="flex gap-2 pt-2">
        {bonDetail.status==="active" && <button onClick={()=>onForceComplete(bonDetail.id)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700">Forceer compleet</button>}
        <button onClick={()=>onDeleteBon(bonDetail)} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 border border-red-200">Verwijder bon</button>
      </div>
    </div>}
  </Modal>;
}
