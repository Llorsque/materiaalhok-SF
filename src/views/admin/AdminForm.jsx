import { useState } from "react";
import { CATS } from "../../data/defaults";

const CATEGORY_OPTIONS = CATS.filter((c) => c !== "Alle");
const DEFAULT_CATEGORY = "Nog te bepalen";

function initialState(item) {
  return {
    name: item?.name ?? "",
    category: item?.category ?? DEFAULT_CATEGORY,
    type: item?.type === "uniek" ? "uniek" : "bulk",
    stock: item?.stock != null ? String(item.stock) : "1",
    unit: item?.unit ?? "stuk",
    barcode: item?.barcode ?? "",
    location: item?.location ?? "Opslag",
    notes: item?.notes ?? "",
    purchase_link: item?.purchase_link ?? "",
  };
}

export function AdminForm({ item, onSave, onCancel }) {
  const [f, setF] = useState(() => initialState(item));
  const [error, setError] = useState("");
  const u = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lc = "block text-sm font-medium text-gray-700 mb-1.5";

  const submit = () => {
    setError("");
    const name = f.name.trim();
    if (!name) { setError("Naam is verplicht"); return; }
    const stockStr = String(f.stock).trim();
    if (stockStr === "" || !/^-?\d+$/.test(stockStr)) {
      setError("Voorraad moet een geheel getal zijn (0 of hoger)"); return;
    }
    const stock = parseInt(stockStr, 10);
    if (!Number.isInteger(stock) || stock < 0) {
      setError("Voorraad moet 0 of hoger zijn"); return;
    }
    const cat = CATEGORY_OPTIONS.includes(f.category) ? f.category : DEFAULT_CATEGORY;
    const purchaseLink = f.purchase_link.trim();
    onSave({
      name,
      category: cat,
      type: f.type === "uniek" ? "uniek" : "bulk",
      stock,
      unit: f.unit.trim() || "stuk",
      barcode: f.barcode.trim(),
      location: f.location.trim(),
      notes: f.notes,
      purchase_link: purchaseLink || null,
    });
  };

  return <div className="space-y-4">
    {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700">{error}</div>}

    <div>
      <label className={lc}>Naam *</label>
      <input className={ic} value={f.name} onChange={(e) => u("name", e.target.value)} />
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={lc}>Categorie</label>
        <select className={ic} value={f.category} onChange={(e) => u("category", e.target.value)}>
          {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className={lc}>Type</label>
        <select className={ic} value={f.type} onChange={(e) => u("type", e.target.value)}>
          <option value="bulk">bulk</option>
          <option value="uniek">uniek</option>
        </select>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={lc}>Voorraad</label>
        <input
          type="number"
          inputMode="numeric"
          className={ic}
          value={f.stock}
          onChange={(e) => u("stock", e.target.value)}
        />
      </div>
      <div>
        <label className={lc}>Eenheid</label>
        <input className={ic} value={f.unit} onChange={(e) => u("unit", e.target.value)} />
      </div>
    </div>

    <div>
      <label className={lc}>Barcode</label>
      <input
        className={ic}
        value={f.barcode}
        onChange={(e) => u("barcode", e.target.value)}
        placeholder="Laat leeg voor automatisch gegenereerde barcode"
      />
    </div>

    <div>
      <label className={lc}>Locatie</label>
      <input className={ic} value={f.location} onChange={(e) => u("location", e.target.value)} />
    </div>

    <div>
      <label className={lc}>Notities</label>
      <textarea className={ic + " resize-none"} rows={2} value={f.notes} onChange={(e) => u("notes", e.target.value)} />
    </div>

    <div>
      <label className={lc}>Inkooplink</label>
      <input
        type="url"
        className={ic}
        value={f.purchase_link}
        onChange={(e) => u("purchase_link", e.target.value)}
        placeholder="https://..."
      />
    </div>

    <div className="flex gap-3 pt-2">
      <button onClick={submit} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">{item ? "Opslaan" : "Toevoegen"}</button>
      <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50">Annuleren</button>
    </div>
  </div>;
}
