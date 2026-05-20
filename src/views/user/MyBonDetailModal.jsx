import { Modal } from "../../components/Modal";
import { BonBadge } from "../../components/BonBadge";
import { KindBadge } from "../../components/KindBadge";
import { fmtDate } from "../../utils/date";
import { itemDisplayName } from "../../utils/bons";

function itemStatus(bi) {
  if (bi.returned) return { label: "retour", color: "bg-emerald-100 text-emerald-700" };
  if (bi.picked_up) return { label: "opgehaald", color: "bg-blue-100 text-blue-700" };
  return { label: "open", color: "bg-gray-100 text-gray-600" };
}

export function MyBonDetailModal({ bon, sets, userName, onClose }) {
  if (!bon) return null;
  const items = bon.items || [];
  return <Modal open={!!bon} onClose={onClose} title={bon.bon_number} wide>
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="font-mono text-sm font-bold text-blue-600">{bon.bon_number}</span>
        <BonBadge bon={bon}/>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs uppercase text-gray-400 font-semibold mb-1">Startdatum</p>
          <p className="text-gray-800">{fmtDate(bon.start_date)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs uppercase text-gray-400 font-semibold mb-1">Retourdatum</p>
          <p className="text-gray-800">{fmtDate(bon.return_date)}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
        <p className="text-xs uppercase text-gray-400 font-semibold mb-1">Gebruiker</p>
        <p className="text-gray-800">{userName || bon.user_name || "\u2014"}</p>
      </div>

      {bon.notes && bon.notes.trim() && <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm">
        <p className="text-xs uppercase text-amber-700 font-semibold mb-1">Notities</p>
        <p className="text-amber-900 whitespace-pre-line">{bon.notes}</p>
      </div>}

      <div>
        <p className="text-xs uppercase text-gray-400 font-semibold mb-2">Items ({items.length})</p>
        <div className="space-y-2">
          {items.length === 0 && <p className="text-sm text-gray-400">Geen items</p>}
          {items.map((bi) => {
            const isSet = bi.set_id != null;
            const status = itemStatus(bi);
            const setRecord = isSet ? (sets || []).find((s) => s.id === bi.set_id) : null;
            const composition = (setRecord?.composition || "").trim();
            return <div key={bi.id} className={`rounded-xl px-4 py-3 border ${isSet ? "border-purple-100 bg-purple-50" : "border-gray-100 bg-gray-50"}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm">{bi.quantity}x {itemDisplayName(bi)}</span>
                  <KindBadge kind={isSet ? "set" : "material"} compact/>
                </div>
                <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${status.color}`}>{status.label}</span>
              </div>
              {isSet && <p className="text-xs text-purple-900/80 mt-2 bg-white/60 rounded-lg px-3 py-2 whitespace-pre-line">{composition || "(geen samenstelling vastgelegd)"}</p>}
            </div>;
          })}
        </div>
      </div>

      <button onClick={onClose} className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">Sluiten</button>
    </div>
  </Modal>;
}
