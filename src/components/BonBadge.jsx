import { Icon } from "./Icon";
import { bonIsOverdue } from "../utils/bons";

export function BonBadge({ bon }) {
  if (bon.status === "completed") return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Compleet</span>;
  if (bon.status === "reserved") return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">{<Icon name="calendar"/>} Gereserveerd</span>;
  if (bonIsOverdue(bon)) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">{<Icon name="alert"/>} Te laat</span>;
  const items = bon.items || [];
  const total = items.length;
  const ret = items.filter((it) => it.returned).length;
  if (ret > 0 && ret < total) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Deels retour ({ret}/{total})</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">Actief</span>;
}
