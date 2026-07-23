import { useState } from "react";
import { CATS } from "../../data/defaults";

const CATEGORY_OPTIONS = CATS.filter((c) => c !== "Alle");
const DEFAULT_CATEGORY = "Nog te bepalen";

function initialState(item) {
  return {
    name: item?.name ?? "",
    category: item?.category ?? DEFAULT_CATEGORY,
    stock: item?.stock != null ? String(item.stock) : "1",
    composition: item?.composition ?? "",
    barcode: item?.barcode ?? "",
    location: item?.location ?? "Opslag",
    notes: item?.notes ?? "",
    purchase_link: item?.purchase_link ?? "",
  };
}

export function SetForm({ item, onSave, onCancel }) {
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
      stock,
      composition: f.composition.trim() || null,
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
      <input className={ic} value={f.name} onChange={(e) => u("name", e.target.value)} placeholder="Bijv. Voetbalset 4v4" />
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={lc}>Categorie</label>
        <select className={ic} value={f.category} onChange={(e) => u("category", e.target.value)}>
          {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className={lc}>Aantal sets</label>
        <input
          type="number"
          inputMode="numeric"
          className={ic}
          value={f.stock}
          onChange={(e) => u("stock", e.target.value)}
        />
      </div>
    </div>

    <div>
      <label className={lc}>Samenstelling</label>
      <textarea
        className={ic + " resize-none"}
        rows={4}
        value={f.composition}
        onChange={(e) => u("composition", e.target.value)}
        placeholder={"Bijv.\n2x Voetbal\n8x Pion\n4x Hesje"}
      />
      <p className="text-xs text-gray-400 mt-1">Vrije tekst — beschrijf de inhoud van één set.</p>
    </div>

    <div>
      <label className={lc}>Barcode</label>
      <input
        className={ic}
        value={f.barcode}
        onChange={(e) => u("barcode", e.target.value)}
        placeholder="Laat leeg voor automatisch gegenereerde S-XXXX"
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
      <button onClick={submit} className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700">{item ? "Opslaan" : "Toevoegen"}</button>
      <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50">Annuleren</button>
    </div>
  </div>;
}
