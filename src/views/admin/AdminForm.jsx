import { useState } from "react";
import { CATS } from "../../data/defaults";
import { ImageUpload } from "../../components/ImageUpload";

export function AdminForm({ item, onSave, onCancel }) {
  const [f, setF] = useState(item || { name: "", stock: 1, unit: "stuk", category: "Sport sets", location: "Opslag", notes: "", pricePerUnit: 0, maintenance: 0, photo: "" });
  const u = (k,v) => setF(p=>({...p,[k]:v}));
  const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lc = "block text-sm font-medium text-gray-700 mb-1.5";
  return <div className="space-y-4">
    <div className="flex gap-4">
      <ImageUpload value={f.photo} onChange={v=>u("photo",v)} label="Foto"/>
      <div className="flex-1"><label className={lc}>Naam *</label><input className={ic} value={f.name} onChange={e=>u("name",e.target.value)}/></div>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div><label className={lc}>Voorraad</label><input type="number" min="1" className={ic} value={f.stock} onChange={e=>u("stock",parseInt(e.target.value)||1)}/></div>
      <div><label className={lc}>Eenheid</label><input className={ic} value={f.unit} onChange={e=>u("unit",e.target.value)}/></div>
      <div><label className={lc}>Categorie</label><select className={ic} value={f.category} onChange={e=>u("category",e.target.value)}>{CATS.filter(c=>c!=="Alle").map(c=><option key={c}>{c}</option>)}</select></div>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div><label className={lc}>Prijs/stuk</label><input type="number" step="0.01" min="0" className={ic} value={f.pricePerUnit} onChange={e=>u("pricePerUnit",parseFloat(e.target.value)||0)}/></div>
      <div><label className={lc}>Locatie</label><input className={ic} value={f.location} onChange={e=>u("location",e.target.value)}/></div>
      <div><label className={lc}>Onderhoud</label><input type="number" min="0" max={f.stock} className={ic} value={f.maintenance||0} onChange={e=>u("maintenance",parseInt(e.target.value)||0)}/></div>
    </div>
    <div><label className={lc}>Notities</label><textarea className={ic+" resize-none"} rows={2} value={f.notes} onChange={e=>u("notes",e.target.value)}/></div>
    <div className="flex gap-3 pt-2">
      <button onClick={()=>f.name.trim()&&onSave(f)} disabled={!f.name.trim()} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-40">{item?"Opslaan":"Toevoegen"}</button>
      <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50">Annuleren</button>
    </div>
  </div>;
}
