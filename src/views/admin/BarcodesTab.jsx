import { BarcodeSVG } from "../../components/BarcodeSVG";

export function BarcodesTab({ eq, printItems, setPrintItems, onPrint }) {
  return <div className="space-y-4">
    <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Barcodes</h3><div className="flex gap-2">
      <button onClick={()=>setPrintItems(eq)} className="px-3 py-2 rounded-xl bg-gray-100 text-xs font-medium hover:bg-gray-200">Alles</button>
      <button onClick={()=>setPrintItems([])} className="px-3 py-2 rounded-xl bg-gray-100 text-xs font-medium hover:bg-gray-200">Niets</button>
      {printItems.length>0&&<button onClick={()=>onPrint(printItems)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">Print ({printItems.length})</button>}
    </div></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{eq.map(i=>{const sel=printItems.some(p=>p.id===i.id);return <div key={i.id} onClick={()=>setPrintItems(p=>sel?p.filter(x=>x.id!==i.id):[...p,i])} className={`bg-white rounded-xl p-3 border-2 cursor-pointer ${sel?"border-blue-500 shadow-md":"border-gray-100 hover:border-gray-200"}`}><div className="flex justify-center mb-2"><BarcodeSVG code={i.barcode||""} name={i.name} small/></div><p className="text-xs font-medium text-gray-900 text-center truncate">{i.name}</p></div>})}</div>
  </div>;
}
