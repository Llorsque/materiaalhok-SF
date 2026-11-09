import { useRef } from "react";
import { readFile } from "../utils/format";

export function ImageUpload({ value, onChange, label, className }) {
  const ref = useRef();
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <div className="flex items-center gap-3">
        {value ? <img src={value} className="w-16 h-16 rounded-xl object-cover border border-slate-200" alt=""/> : <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-300">Geen</div>}
        <div className="flex flex-col gap-1">
          <button onClick={() => ref.current?.click()} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200">{value ? "Wijzig" : "Upload"}</button>
          {value && <button onClick={() => onChange("")} className="px-3 py-1.5 rounded-lg text-red-500 text-xs font-medium hover:bg-red-50">Verwijder</button>}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f, onChange); e.target.value = ""; }}/>
    </div>
  );
}
