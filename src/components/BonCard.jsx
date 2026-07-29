import { bonIsOverdue, bonRemaining } from "../utils/bons";
import { fmtDate } from "../utils/date";
import { BonBadge } from "./BonBadge";

export function BonCard({ bon, onClick, showUser, showAdminMark }) {
  const rem = bonRemaining(bon);
  const overdue = bonIsOverdue(bon);
  const isExternal = bon.is_external === 1 || bon.is_external === true;
  // Externe bonnen zijn per definitie door een admin ingeschoten, maar het
  // is verwarrend om daar de gebruikersadmin-mark bij te zetten — we tonen
  // "Extern" ipv "aangemaakt namens X".
  const byAdmin = showAdminMark && bon.created_by_admin_id && !isExternal;
  const adminTitle = byAdmin
    ? `Aangemaakt door ${bon.created_by_admin_name || "een admin"} namens ${bon.user_name || "?"}`
    : undefined;
  const displayName = isExternal ? (bon.external_org || "Externe huurder") : bon.user_name;
  return <div onClick={onClick} className={`bg-white rounded-2xl px-5 py-4 shadow-sm border cursor-pointer hover:shadow-md ${overdue && bon.status !== "completed" ? "border-red-200" : "border-gray-100 hover:border-gray-200"}`}>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-bold text-blue-600">{bon.bon_number}{byAdmin && <span className="text-amber-500 ml-0.5" title={adminTitle}>*</span>}</span>
          <BonBadge bon={bon}/>
          {isExternal && <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-semibold">Extern</span>}
        </div>
        <p className="text-xs text-gray-500 mt-1">{showUser && <><span className="font-medium">{displayName}</span> {"\u00b7"} </>}{fmtDate(bon.start_date)} {"\u2192"} {fmtDate(bon.return_date)}{bon.status !== "completed" && <> {"\u00b7"} {rem.length} open</>}</p>
        {byAdmin && <p className="text-[11px] text-amber-700 mt-0.5">Aangemaakt door {bon.created_by_admin_name || "admin"} namens {bon.user_name}</p>}
      </div>
      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
    </div>
  </div>;
}
