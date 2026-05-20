import { useState, useEffect, useRef } from "react";
import { BonBadge } from "../../components/BonBadge";
import { ConnectionBanner } from "../../components/ConnectionBanner";
import { KindBadge } from "../../components/KindBadge";
import { itemDisplayName } from "../../utils/bons";
import { pickupBon, returnBon } from "../../api/client";

const bonItemKind = (bi) => (bi.set_id != null ? "set" : "material");

export function ReturnFlow({ eq, sets, materialsLoading, materialsError, refreshMaterials, bons, refreshBons, setBonsError, user, onCancel, onDone }) {
  const [activeBon, setActiveBon] = useState(null);
  // Set met bon_item ids die de gebruiker als retour heeft gemarkeerd
  const [selectedItems, setSelectedItems] = useState(() => new Set());
  const [scanInput, setScanInput] = useState("");
  const [scanMsg, setScanMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const scanRef = useRef(null);
  const scanTimer = useRef(null);
  const scanValue = useRef("");

  const myBons = bons.filter((b) => b.user_id === user.id && b.status !== "completed");

  // Reset selectie zodra een andere bon wordt gekozen
  useEffect(() => { setSelectedItems(new Set()); setSubmitError(null); }, [activeBon?.id]);

  useEffect(() => {
    const handler = (e) => {
      const activeRef = scanRef.current;
      if (!activeRef) return;
      if (e.key === "F3" || (e.ctrlKey && e.key === "f") || (e.ctrlKey && e.key === "g") || e.key === "/") {
        e.preventDefault();
      }
      if (activeRef.offsetParent !== null && document.activeElement !== activeRef && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "SELECT" && document.activeElement?.tagName !== "TEXTAREA") {
        activeRef.focus();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  // Vind het bon_item dat hoort bij een gescande barcode/id/naam.
  // Zoekt zowel in materialen (eq) als in sets, en matcht op material_id of set_id.
  const findBonItemByScan = (code) => {
    if (!activeBon || !code) return null;
    const upper = code.toUpperCase();
    const matchMat = (eq || []).find((i) => i.barcode === code || i.barcode === upper);
    if (matchMat) {
      const bi = activeBon.items.find((it) => it.material_id === matchMat.id && !it.returned);
      if (bi) return bi;
    }
    const matchSet = (sets || []).find((s) => s.barcode === code || s.barcode === upper);
    if (matchSet) {
      const bi = activeBon.items.find((it) => it.set_id === matchSet.id && !it.returned);
      if (bi) return bi;
    }
    const numId = parseInt(code, 10);
    if (!Number.isNaN(numId)) {
      const bi = activeBon.items.find((it) => (it.material_id === numId || it.set_id === numId) && !it.returned);
      if (bi) return bi;
    }
    return activeBon.items.find((it) => {
      const name = itemDisplayName(it).toLowerCase();
      return name.includes(code.toLowerCase()) && !it.returned;
    });
  };

  const handleReturnScan = () => {
    const code = scanValue.current.trim();
    if (!code) return;
    const bi = findBonItemByScan(code);
    if (bi) {
      setSelectedItems((prev) => {
        const next = new Set(prev);
        next.add(bi.id);
        return next;
      });
      setScanMsg({ ok: true, text: `\u2705 ${itemDisplayName(bi)} gemarkeerd voor retour` });
    } else {
      setScanMsg({ ok: false, text: "\u274c Niet gevonden op deze bon" });
    }
    setScanInput("");
    scanValue.current = "";
    setTimeout(() => setScanMsg(null), 2500);
  };

  const toggleItem = (id) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllOpen = () => {
    setSelectedItems(new Set((activeBon.items || []).filter((it) => !it.returned).map((it) => it.id)));
  };

  const finishPickup = async () => {
    if (!activeBon || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await pickupBon(activeBon.id);
      await refreshBons();
      onDone({ action: "loan", text: `${activeBon.bon_number} is opgehaald!` });
    } catch (err) {
      setSubmitError(err.message || "Ophalen mislukt");
      setBonsError(err.message || "Ophalen mislukt");
    } finally {
      setSubmitting(false);
    }
  };

  const finishReturn = async () => {
    if (!activeBon || submitting || selectedItems.size === 0) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const openItems = (activeBon.items || []).filter((it) => !it.returned);
      const isFullReturn = selectedItems.size >= openItems.length;
      const itemsArg = isFullReturn
        ? undefined
        : Array.from(selectedItems).map((id) => ({ id, returned: true }));
      const updated = await returnBon(activeBon.id, itemsArg);
      await refreshBons();
      if (updated.status === "completed") {
        onDone({ action: "return", text: `${activeBon.bon_number} compleet!` });
      } else {
        onDone({ action: "partial", text: `${activeBon.bon_number} deels retour` });
      }
    } catch (err) {
      setSubmitError(err.message || "Retour mislukt");
      setBonsError(err.message || "Retour mislukt");
    } finally {
      setSubmitting(false);
    }
  };

  // BON-KEUZE
  if (!activeBon) return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
    <div className="bg-white border-b border-gray-100 shadow-sm"><div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
      <button onClick={onCancel} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Terug</button>
      <h2 className="text-lg font-bold text-gray-900">Kies een bon</h2><div className="w-16"/>
    </div></div>
    <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
      <ConnectionBanner loading={materialsLoading} error={materialsError} onRetry={refreshMaterials} resource="Materialen"/>
      {myBons.length===0 ? <div className="text-center py-12"><p className="text-4xl mb-3">{"\ud83d\udce6"}</p><p className="text-gray-500">Geen actieve bonnen</p></div>
      : myBons.map(b => <div key={b.id} onClick={()=>setActiveBon(b)} className={`bg-white rounded-2xl px-5 py-4 shadow-sm border cursor-pointer hover:shadow-md ${b.status==="reserved"?"border-purple-200 hover:border-purple-300":"border-gray-100 hover:border-gray-200"}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2"><span className="font-mono text-sm font-bold text-blue-600">{b.bon_number}</span><BonBadge bon={b}/></div>
            <p className="text-xs text-gray-500 mt-1">{(b.items||[]).map((i) => itemDisplayName(i)).join(", ")}</p>
          </div>
          <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{backgroundColor:b.status==="reserved"?"#f3e8ff":"#ecfdf5",color:b.status==="reserved"?"#7c3aed":"#059669"}}>{b.status==="reserved"?"Ophalen":"Retour"}</span>
        </div>
      </div>)}
    </div>
  </div>;

  const isPickup = activeBon.status === "reserved";
  const openItems = (activeBon.items || []).filter((it) => !it.returned);

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
    <div className="bg-white border-b border-gray-100 shadow-sm"><div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
      <button onClick={()=>setActiveBon(null)} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Terug</button>
      <h2 className="text-lg font-bold text-gray-900">{isPickup?"Ophalen":"Retour"} {activeBon.bon_number}</h2><div className="w-16"/>
    </div></div>
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <ConnectionBanner loading={materialsLoading} error={materialsError} onRetry={refreshMaterials} resource="Materialen"/>

      {isPickup ? (
        // PICKUP — alles in één klik
        <>
          <div className="bg-purple-50 rounded-2xl px-5 py-4 text-sm text-purple-800">
            <p className="font-semibold">{"\ud83d\udcc5"} Gereserveerd materiaal ophalen</p>
            <p className="mt-1">Met "Ophalen bevestigen" wordt alle materiaal van deze bon in één keer als opgehaald geboekt.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-bold text-gray-900 text-sm">Items op deze bon</h3></div>
            {(activeBon.items||[]).map((bi) => <div key={bi.id} className="px-5 py-3 flex items-center justify-between gap-2 border-b border-gray-50 last:border-0">
              <p className="text-sm font-medium flex items-center gap-2 flex-wrap"><span>{bi.quantity}x {itemDisplayName(bi)}</span><KindBadge kind={bonItemKind(bi)} compact/></p>
            </div>)}
          </div>
          {submitError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{submitError}</div>}
          <button onClick={finishPickup} disabled={submitting} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-purple-500 hover:bg-purple-600 disabled:opacity-40">
            {submitting ? "Bezig..." : "Ophalen bevestigen"}
          </button>
        </>
      ) : (
        // RETURN — vink af welke items terug komen
        <>
          <div className="rounded-2xl p-5 shadow-sm border bg-white border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Scan materiaal om als retour te markeren</label>
            <div className="flex gap-2">
              <input ref={scanRef} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Scan materiaal..." value={scanInput} onChange={e=>{const v=e.target.value;setScanInput(v);scanValue.current=v;if(scanTimer.current)clearTimeout(scanTimer.current);if(v.trim().length>=3)scanTimer.current=setTimeout(()=>handleReturnScan(),150)}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(scanTimer.current)clearTimeout(scanTimer.current);handleReturnScan()}}} autoFocus autoComplete="off"/>
              <button onClick={handleReturnScan} className="px-5 py-3 rounded-xl text-white font-semibold text-sm bg-emerald-500 hover:bg-emerald-600">{"\ud83d\udce5"}</button>
            </div>
            {scanMsg && <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium ${scanMsg.ok?"bg-emerald-50 text-emerald-800":"bg-red-50 text-red-800"}`}>{scanMsg.text}</div>}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">Items {selectedItems.size > 0 && <span className="text-xs text-emerald-700 font-medium">({selectedItems.size} gemarkeerd)</span>}</h3>
              {openItems.length > 0 && <button onClick={selectAllOpen} className="text-xs text-emerald-700 font-semibold hover:underline">Alles retour</button>}
            </div>
            {(activeBon.items||[]).map((bi) => {
              const isReturned = !!bi.returned;
              const isSelected = selectedItems.has(bi.id);
              return <button key={bi.id} type="button" disabled={isReturned} onClick={() => toggleItem(bi.id)} className={`w-full px-5 py-3 flex items-center justify-between border-b border-gray-50 last:border-0 text-left ${isReturned ? "bg-emerald-50/50" : isSelected ? "bg-emerald-50" : "hover:bg-gray-50"}`}>
                <div>
                  <p className="text-sm font-medium flex items-center gap-2 flex-wrap"><span>{bi.quantity}x {itemDisplayName(bi)}</span><KindBadge kind={bonItemKind(bi)} compact/></p>
                  <p className="text-xs text-gray-500">{isReturned ? "Al retour" : isSelected ? "Wordt geretourneerd" : "Open"}</p>
                </div>
                {isReturned ? <span className="text-emerald-600">{"\u2705"}</span> :
                 isSelected ? <span className="text-emerald-600">{"\u2611"}</span> :
                 <span className="text-gray-300">{"\u2610"}</span>}
              </button>;
            })}
          </div>

          {submitError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{submitError}</div>}

          <button onClick={finishReturn} disabled={submitting || selectedItems.size === 0} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40">
            {submitting ? "Bezig..." :
              selectedItems.size === openItems.length && openItems.length > 0 ? "\u2705 Alles retour bevestigen" :
              `\ud83d\udce5 Geselecteerde retour bevestigen (${selectedItems.size})`}
          </button>
          {openItems.length > 0 && selectedItems.size < openItems.length && selectedItems.size > 0 && <p className="text-xs text-amber-600 text-center">Niet-gemarkeerde items blijven open op de bon.</p>}
        </>
      )}
    </div>
  </div>;
}
