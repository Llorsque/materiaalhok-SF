import { BonCard } from "../../components/BonCard";

export function BonsTab({ bons, reservedBons, overdueBons, bonFilter, setBonFilter, onBonClick }) {
  const filtBons = bonFilter==="active"?bons.filter(b=>b.status==="active"):bonFilter==="reserved"?reservedBons:bonFilter==="overdue"?overdueBons:bonFilter==="completed"?bons.filter(b=>b.status==="completed"):bons;
  return <div className="space-y-4">
    <div className="flex gap-2 overflow-x-auto">{[["active","Actief"],["reserved","Gereserveerd"],["overdue","Te laat"],["completed","Afgerond"],["all","Alle"]].map(([k,l])=><button key={k} onClick={()=>setBonFilter(k)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${bonFilter===k?"bg-blue-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{l}</button>)}</div>
    {filtBons.length===0?<div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100"><p className="text-gray-500 text-sm">Geen bonnen</p></div>:<div className="space-y-2">{filtBons.map(b=><BonCard key={b.id} bon={b} onClick={()=>onBonClick(b)} showUser/>)}</div>}
  </div>;
}
