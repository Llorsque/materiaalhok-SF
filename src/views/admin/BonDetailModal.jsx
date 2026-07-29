import { useState } from "react";
import { Modal } from "../../components/Modal";
import { BonBadge } from "../../components/BonBadge";
import { fmtDate, isWeekend } from "../../utils/date";
import { itemDisplayName } from "../../utils/bons";
import { fmt } from "../../utils/format";

export function BonDetailModal({ bonDetail, setBonDetail, onForceComplete, onUpdateBon, onItemReturn, onDeleteBon }) {
  const [dateError, setDateError] = useState(null);
  const changeDate = (field, value) => {
    if (isWeekend(value)) {
      const msg = field === "start_date"
        ? "Ophaaldatum kan alleen op een werkdag vallen. Kies maandag t/m vrijdag."
        : "Retourdatum kan alleen op een werkdag vallen. Kies maandag t/m vrijdag.";
      setDateError({ field, msg });
      return;
    }
    setDateError(null);
    onUpdateBon(bonDetail.id, { [field]: value });
  };
  const isExternal = bonDetail && (bonDetail.is_external === 1 || bonDetail.is_external === true);
  return <Modal open={!!bonDetail} onClose={()=>{setBonDetail(null);setDateError(null);}} title={bonDetail?`Bon ${bonDetail.bon_number}`:""} wide>
    {bonDetail&&<div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          {isExternal
            ? <p className="text-sm text-gray-500">{"\ud83c\udfe2"} {bonDetail.external_org || "Externe huurder"}</p>
            : <p className="text-sm text-gray-500">{"\ud83d\udc64"} {bonDetail.user_name || "-"}</p>}
          <p className="text-sm text-gray-500">{fmtDate(bonDetail.start_date)} {"\u2192"} {fmtDate(bonDetail.return_date)}</p>
          {!isExternal && bonDetail.created_by_admin_id && <p className="text-xs text-amber-700 mt-1">
            <span className="text-amber-500 font-bold">*</span> Aangemaakt door {bonDetail.created_by_admin_name || "een admin"} namens {bonDetail.user_name || "gebruiker"}
          </p>}
          {isExternal && bonDetail.created_by_admin_name && <p className="text-xs text-purple-700 mt-1">
            Aangemaakt door {bonDetail.created_by_admin_name}
          </p>}
        </div>
        <div className="flex items-center gap-2">
          {isExternal && <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-semibold">Extern</span>}
          <BonBadge bon={bonDetail}/>
        </div>
      </div>

      {isExternal && <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Huurdergegevens</p>
        {bonDetail.external_contact && <p className="text-sm text-gray-800">{"\ud83d\udc64"} {bonDetail.external_contact}</p>}
        {bonDetail.external_email   && <p className="text-sm text-gray-800">{"\u2709\ufe0f"} {bonDetail.external_email}</p>}
        {bonDetail.external_phone   && <p className="text-sm text-gray-800">{"\ud83d\udcde"} {bonDetail.external_phone}</p>}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="bg-white rounded-lg px-3 py-2">
            <p className="text-[11px] text-gray-500">Huurprijs</p>
            <p className="text-sm font-semibold text-gray-900">{fmt(bonDetail.rental_price)}</p>
          </div>
          <div className="bg-white rounded-lg px-3 py-2">
            <p className="text-[11px] text-gray-500">Borg</p>
            <p className="text-sm font-semibold text-gray-900">{fmt(bonDetail.deposit)}</p>
          </div>
        </div>
        {bonDetail.payment_status && <div className="pt-1">
          {bonDetail.payment_status === "paid"
            ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">{"\u2705"} Betaald</span>
            : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">{"\u23f3"} Openstaand</span>}
        </div>}
      </div>}

      {/* Actieve items — meegenomen, deels retour, of nog open */}
      {(() => {
        const items = bonDetail.items || [];
        const kept    = items.filter((bi) => bi.removed_at_pickup !== 1);
        const removed = items.filter((bi) => bi.removed_at_pickup === 1);
        return <>
          <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
            {kept.map((bi) => {
              const isReturned = !!bi.returned;
              const isAdded    = bi.added_at_pickup === 1;
              const cond       = bi.return_condition;
              const wasLost    = isReturned && cond === "lost";
              const wasBroken  = isReturned && cond === "broken";
              return <div key={bi.id} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    <span>{itemDisplayName(bi)}</span>
                    {isAdded && <span className="text-[10px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">toegevoegd bij ophalen</span>}
                    {wasLost   && <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">kwijt</span>}
                    {wasBroken && <span className="text-[10px] font-semibold uppercase tracking-wide bg-red-100 text-red-800 px-1.5 py-0.5 rounded">kapot</span>}
                  </p>
                  <p className="text-xs text-gray-500">{bi.quantity} stuk{bi.quantity !== 1 ? "s" : ""}{isReturned ? (wasLost ? " \u2014 kwijt gemeld" : wasBroken ? " \u2014 kapot gemeld" : " \u2014 retour") : ""}{bi.picked_up && !isReturned ? " \u2014 opgehaald" : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isReturned
                    ? (wasLost || wasBroken
                        ? <span className={`text-xs ${wasLost ? "text-amber-700" : "text-red-700"}`}>{"\u26a0"} {wasLost ? "kwijt" : "kapot"}</span>
                        : <span className="text-xs text-emerald-600">{"\u2705"} retour</span>)
                    : <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">open</span>}
                  {bonDetail.status === "active" && !isReturned && <button onClick={() => onItemReturn(bonDetail.id, bi.id)} className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs hover:bg-emerald-200">Retour</button>}
                </div>
              </div>;
            })}
          </div>

          {removed.length > 0 && <div className="mt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Niet meegenomen bij ophalen ({removed.length})</p>
            <div className="bg-red-50/50 border border-red-100 rounded-xl divide-y divide-red-100">
              {removed.map((bi) => <div key={bi.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-gray-500 line-through">{itemDisplayName(bi)}</p>
                  <p className="text-xs text-gray-400">{bi.quantity} stuk{bi.quantity !== 1 ? "s" : ""} — stond op reservering</p>
                </div>
                <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">niet meegenomen</span>
              </div>)}
            </div>
          </div>}
        </>;
      })()}

      {bonDetail.status!=="completed" && <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Datums aanpassen</h4>
        <p className="text-xs text-gray-500">Status wordt opnieuw berekend op basis van de nieuwe datums (door de backend).</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Startdatum</label>
            <input type="date" className={`w-full px-3 py-2 rounded-xl border bg-gray-50 text-sm focus:outline-none focus:ring-2 ${dateError?.field === "start_date" ? "border-red-300 focus:ring-red-500" : "border-gray-200 focus:ring-blue-500"}`}
              value={(bonDetail.start_date||"").slice(0,10)}
              onChange={e=>changeDate("start_date", e.target.value)}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Retourdatum</label>
            <input type="date" className={`w-full px-3 py-2 rounded-xl border bg-gray-50 text-sm focus:outline-none focus:ring-2 ${dateError?.field === "return_date" ? "border-red-300 focus:ring-red-500" : "border-gray-200 focus:ring-blue-500"}`}
              value={(bonDetail.return_date||"").slice(0,10)}
              onChange={e=>changeDate("return_date", e.target.value)}/>
          </div>
        </div>
        {dateError && <p className="text-sm text-red-600">{dateError.msg}</p>}
      </div>}

      <div className="flex gap-2 pt-2">
        {bonDetail.status==="active" && <button onClick={()=>onForceComplete(bonDetail.id)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700">Forceer compleet</button>}
        <button onClick={()=>onDeleteBon(bonDetail)} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 border border-red-200">Verwijder bon</button>
      </div>
    </div>}
  </Modal>;
}
