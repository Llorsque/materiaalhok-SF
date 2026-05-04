import { useRef } from "react";
import { readFile } from "../utils/format";

export function ImageUpload({ value, onChange, label, className }) {
  const ref = useRef();
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <div className="flex items-center gap-3">
        {value ? <img src={value} className="w-16 h-16 rounded-xl object-cover border border-gray-200" alt=""/> : <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs border border-dashed border-gray-300">Geen</div>}
        <div className="flex flex-col gap-1">
          <button onClick={() => ref.current?.click()} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200">{value ? "Wijzig" : "Upload"}</button>
          {value && <button onClick={() => onChange("")} className="px-3 py-1.5 rounded-lg text-red-500 text-xs font-medium hover:bg-red-50">Verwijder</button>}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f, onChange); e.target.value = ""; }}/>
    </div>
  );
}
