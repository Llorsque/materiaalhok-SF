import { Modal } from "../../components/Modal";
import { BarcodeSVG } from "../../components/BarcodeSVG";
import { BonCard } from "../../components/BonCard";
import { fmt, getIcon } from "../../utils/format";
import { availQty, loanedQty } from "../../utils/bons";
import { nextBarcode } from "../../utils/barcode";

export function ItemDetailModal({ detail, setDetail, bons, eq, setEq, addLog, getItemStats, onPrint, onEdit, onDelete, onOpenBon }) {
  return <Modal open={!!detail} onClose={()=>setDetail(null)} title="Materiaal" wide>
    {detail&&(()=>{const av=availQty(detail,bons);const stats=getItemStats(detail.id);const itemBons=bons.filter(b=>b.status!=="completed"&&b.items.some(bi=>bi.itemId===detail.id));
      return <div className="space-y-4">
        <div className="flex items-center gap-3">
          {detail.photo?<img src={detail.photo} className="w-16 h-16 rounded-xl object-cover" alt=""/>:<div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">{getIcon(detail.category)}</div>}
          <div className="flex-1"><h3 className="font-bold text-gray-900">{detail.name}</h3><p className="text-sm text-gray-500">{detail.category} {"\u00b7"} {detail.stock} {detail.unit}</p></div>
          <BarcodeSVG code={detail.barcode||""} name={detail.name} small/>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Barcode</span><span className="font-mono font-medium text-gray-900">{detail.barcode||"geen"}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Beschikbaar</span><span className="font-medium text-emerald-600">{av}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Uitgeleend</span><span className="font-medium text-amber-600">{loanedQty(bons,detail.id)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Onderhoud</span><span className="font-medium">{detail.maintenance||0}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Prijs</span><span className="font-medium">{fmt(detail.pricePerUnit)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Uitgeleend (jaar)</span><span className="font-medium">{stats.count}x</span></div>
          {Object.keys(stats.borrowers).length>0&&<div><span className="text-gray-500">Door:</span><div className="mt-1 flex flex-wrap gap-1">{Object.entries(stats.borrowers).sort((a,b)=>b[1]-a[1]).map(([n,c])=><span key={n} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{n} ({c}x)</span>)}</div></div>}
        </div>
        {itemBons.length>0&&<div><p className="text-xs font-semibold text-gray-500 uppercase mb-2">Bonnen met dit item</p>{itemBons.map(b=><BonCard key={b.id} bon={b} onClick={()=>{setDetail(null);onOpenBon(b)}} showUser/>)}</div>}
        <div className="flex gap-2 pt-2">
          <button onClick={()=>{onEdit(detail);setDetail(null)}} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">Bewerken</button>
          <button onClick={()=>{const nb=nextBarcode();setEq(p=>p.map(e=>e.id===detail.id?{...e,barcode:nb}:e));setDetail(prev=>({...prev,barcode:nb}));addLog("edit",`Barcode ${detail.name} vernieuwd: ${nb}`)}} className="px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-sm border border-amber-200" title="Nieuwe barcode">{"\ud83d\udd04"}</button>
          <button onClick={()=>onPrint([detail])} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm">{"\ud83d\udda8"}</button>
          <button onClick={()=>onDelete(detail.id)} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">Verwijder</button>
        </div>
      </div>})()}
  </Modal>;
}
