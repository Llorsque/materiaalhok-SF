import { Modal } from "../../components/Modal";
import { BarcodeSVG } from "../../components/BarcodeSVG";
import { BonCard } from "../../components/BonCard";
import { getIcon } from "../../utils/format";
import { availSetQty, loanedSetQty, reservedSetQty } from "../../utils/bons";

export function SetDetailModal({ detail, setDetail, bons, onEdit, onDelete, onPrint, onRegenBarcode, onOpenBon }) {
  return <Modal open={!!detail} onClose={() => setDetail(null)} title="Set" wide>
    {detail && (() => {
      const av = availSetQty(detail, bons);
      const lo = loanedSetQty(bons, detail.id);
      const res = reservedSetQty(bons, detail.id);
      const setBons = bons.filter(b => b.status !== "completed" && (b.items || []).some(bi => bi.set_id === detail.id));
      return <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">{getIcon(detail.category)}</div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{detail.name}</h3>
            <p className="text-sm text-gray-500">{detail.category || "\u2014"} {"\u00b7"} {detail.stock} set{detail.stock !== 1 ? "s" : ""}</p>
          </div>
          <BarcodeSVG code={detail.barcode || ""} name={detail.name} small />
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Barcode</span><span className="font-mono font-medium text-gray-900">{detail.barcode || "geen"}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Beschikbaar</span><span className="font-medium text-emerald-600">{av}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Uitgeleend</span><span className="font-medium text-amber-600">{lo}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Gereserveerd</span><span className="font-medium text-purple-600">{res}</span></div>
          {detail.location && <div className="flex justify-between"><span className="text-gray-500">Locatie</span><span className="font-medium">{detail.location}</span></div>}
          {detail.purchase_link && <div className="flex justify-between gap-2"><span className="text-gray-500">Inkooplink</span><a href={detail.purchase_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[220px]">{detail.purchase_link}</a></div>}
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Samenstelling</p>
          <div className="bg-purple-50 rounded-xl px-4 py-3 text-sm text-purple-900 whitespace-pre-line">
            {detail.composition?.trim() ? detail.composition : <span className="text-gray-400 italic">Nog geen samenstelling vastgelegd</span>}
          </div>
        </div>

        {detail.notes && <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Notities</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 whitespace-pre-line">{detail.notes}</p>
        </div>}

        {setBons.length > 0 && <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Bonnen met deze set</p>
          {setBons.map(b => <BonCard key={b.id} bon={b} onClick={() => { setDetail(null); onOpenBon(b); }} showUser showAdminMark />)}
        </div>}

        <div className="flex gap-2 pt-2">
          <button onClick={() => { onEdit(detail); setDetail(null); }} className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700">Bewerken</button>
          <button onClick={() => onRegenBarcode(detail.id)} className="px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-sm border border-amber-200" title="Nieuwe barcode">{"\ud83d\udd04"}</button>
          <button onClick={() => onPrint([detail])} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm">{"\ud83d\udda8"}</button>
          <button onClick={() => onDelete(detail.id)} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">Verwijder</button>
        </div>
      </div>;
    })()}
  </Modal>;
}
