import { bonIsOverdue, bonRemaining } from "../utils/bons";
import { fmtDate } from "../utils/date";
import { BonBadge } from "./BonBadge";

export function BonCard({ bon, onClick, showUser }) {
  const rem = bonRemaining(bon); const overdue = bonIsOverdue(bon);
  return <div onClick={onClick} className={`bg-white rounded-2xl px-5 py-4 shadow-sm border cursor-pointer hover:shadow-md ${overdue&&bon.status!=="completed"?"border-red-200":"border-gray-100 hover:border-gray-200"}`}>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2"><span className="font-mono text-sm font-bold text-blue-600">{bon.number}</span><BonBadge bon={bon}/></div>
        <p className="text-xs text-gray-500 mt-1">{showUser&&<><span className="font-medium">{bon.user}</span> {"\u00b7"} </>}{fmtDate(bon.startDate)} {"\u2192"} {fmtDate(bon.endDate)}{bon.status!=="completed"&&<> {"\u00b7"} {rem.length} open</>}</p>
      </div>
      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
    </div>
  </div>;
}
