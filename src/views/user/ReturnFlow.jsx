import { useState, useEffect, useMemo, useRef } from "react";
import { BonBadge } from "../../components/BonBadge";
import { ConnectionBanner } from "../../components/ConnectionBanner";
import { KindBadge } from "../../components/KindBadge";
import { itemDisplayName } from "../../utils/bons";
import { returnBon } from "../../api/client";

const bonItemKind = (bi) => (bi.set_id != null ? "set" : "material");
const isActiveItem = (bi) => bi && bi.removed_at_pickup !== 1;

// Voor elke open bon-regel houden we een {returned, lost, broken}-teller bij.
// Optelsom mag niet meer zijn dan de openstaande quantity van de regel.
function emptyCounts() { return { returned: 0, lost: 0, broken: 0 }; }

// `presetBon` (v1.14.1): admin kan de flow openen op een specifieke externe
// bon vanuit BonDetailModal. In preset-modus wordt de bon-lijst overgeslagen
// en gaat back-pijl naar onCancel (terug naar de admin-context) i.p.v. de
// lijst. `user` is optioneel wanneer presetBon aanwezig is.
export function ReturnFlow({ eq, sets, materialsLoading, materialsError, refreshMaterials, bons, refreshBons, setBonsError, user, onCancel, onDone, presetBon = null }) {
  const [activeBon, setActiveBon] = useState(presetBon);
  // Map<bon_item_id, {returned, lost, broken}>
  const [counts, setCounts] = useState(() => new Map());
  const [scanInput, setScanInput] = useState("");
  const [scanMsg, setScanMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const scanRef = useRef(null);
  const scanTimer = useRef(null);
  const scanValue = useRef("");

  // Alleen actieve bonnen zijn terugbrengbaar — reserveringen worden eerst
  // opgehaald via de PickupFlow. In preset-modus tonen we de lijst niet.
  const myBons = presetBon
    ? []
    : bons.filter((b) => b.user_id === user?.id && b.status === "active");

  useEffect(() => { setCounts(new Map()); setSubmitError(null); }, [activeBon?.id]);

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
  }, [activeBon?.id]);

  const openItems = useMemo(
    () => (activeBon?.items || []).filter((it) => isActiveItem(it) && !it.returned),
    [activeBon],
  );

  const cur = (id) => counts.get(id) || emptyCounts();
  const total = (id) => { const c = cur(id); return c.returned + c.lost + c.broken; };
  const remaining = (bi) => bi.quantity - total(bi.id);

  const setCount = (id, key, next) => {
    setCounts((prev) => {
      const nc = new Map(prev);
      const c = { ...(nc.get(id) || emptyCounts()) };
      c[key] = Math.max(0, next);
      nc.set(id, c);
      return nc;
    });
  };
  const inc = (bi, key) => {
    const c = cur(bi.id);
    if (total(bi.id) >= bi.quantity) return;
    setCount(bi.id, key, c[key] + 1);
  };
  const dec = (bi, key) => {
    const c = cur(bi.id);
    if (c[key] <= 0) return;
    setCount(bi.id, key, c[key] - 1);
  };

  // Scan: probeer een open bon-regel te vinden en de "retour"-teller op te
  // hogen. Kwijt/kapot blijven expliciet — die klik je handmatig.
  const findBonItemByScan = (code) => {
    if (!activeBon || !code) return null;
    const upper = code.toUpperCase();
    const canTake = (it) => remaining(it) > 0;
    const matchMat = (eq || []).find((i) => i.barcode === code || i.barcode === upper);
    if (matchMat) {
      const bi = openItems.find((it) => it.material_id === matchMat.id && canTake(it));
      if (bi) return bi;
    }
    const matchSet = (sets || []).find((s) => s.barcode === code || s.barcode === upper);
    if (matchSet) {
      const bi = openItems.find((it) => it.set_id === matchSet.id && canTake(it));
      if (bi) return bi;
    }
    const numId = parseInt(code, 10);
    if (!Number.isNaN(numId)) {
      const bi = openItems.find((it) => (it.material_id === numId || it.set_id === numId) && canTake(it));
      if (bi) return bi;
    }
    return openItems.find((it) => canTake(it) && itemDisplayName(it).toLowerCase().includes(code.toLowerCase()));
  };

  const handleReturnScan = () => {
    const code = scanValue.current.trim();
    if (!code) return;
    const bi = findBonItemByScan(code);
    if (bi) {
      inc(bi, "returned");
      const c = cur(bi.id);
      setScanMsg({ ok: true, text: `\u2705 ${itemDisplayName(bi)} ${(c.returned + 1)}/${bi.quantity} retour` });
    } else {
      setScanMsg({ ok: false, text: "\u274c Niet gevonden of alles al afgehandeld" });
    }
    setScanInput(""); scanValue.current = "";
    setTimeout(() => setScanMsg(null), 2500);
  };

  const untouchedCount = openItems.filter((bi) => total(bi.id) === 0).length;
  const totalReturned = openItems.reduce((s, bi) => s + cur(bi.id).returned, 0);
  const totalLost     = openItems.reduce((s, bi) => s + cur(bi.id).lost, 0);
  const totalBroken   = openItems.reduce((s, bi) => s + cur(bi.id).broken, 0);
  const totalHandled  = totalReturned + totalLost + totalBroken;

  const finishReturn = async () => {
    if (!activeBon || submitting) return;
    if (totalHandled === 0) {
      setSubmitError("Markeer eerst wat er terug komt.");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      // Bouw payload: één entry per (bon_item, condition) met quantity > 0.
      const items = [];
      for (const bi of openItems) {
        const c = cur(bi.id);
        if (c.returned > 0) items.push({ id: bi.id, condition: "returned", quantity: c.returned });
        if (c.lost     > 0) items.push({ id: bi.id, condition: "lost",     quantity: c.lost });
        if (c.broken   > 0) items.push({ id: bi.id, condition: "broken",   quantity: c.broken });
      }
      const updated = await returnBon(activeBon.id, items);
      await refreshBons();
      if (refreshMaterials) refreshMaterials();
      const damageParts = [];
      if (totalLost > 0)   damageParts.push(`${totalLost} kwijt gemeld`);
      if (totalBroken > 0) damageParts.push(`${totalBroken} kapot gemeld`);
      const suffix = damageParts.length > 0 ? ` (${damageParts.join(", ")})` : "";
      if (updated.status === "completed") {
        onDone({ action: "return", text: `${activeBon.bon_number} compleet!${suffix}` });
      } else {
        onDone({ action: "partial", text: `${activeBon.bon_number} deels retour${suffix}` });
      }
    } catch (err) {
      setSubmitError(err.message || "Retour mislukt");
      setBonsError(err);
    } finally {
      setSubmitting(false);
    }
  };

  // BON-KEUZE
  if (!activeBon) return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
    <div className="bg-white border-b border-gray-100 shadow-sm"><div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
      <button onClick={onCancel} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Terug</button>
      <h2 className="text-lg font-bold text-gray-900">Kies een bon om te retourneren</h2><div className="w-16"/>
    </div></div>
    <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
      <ConnectionBanner loading={materialsLoading} error={materialsError} onRetry={refreshMaterials} resource="Materialen"/>
      {myBons.length===0 ? <div className="text-center py-12"><p className="text-4xl mb-3">{"\ud83d\udce6"}</p><p className="text-gray-500">Geen actieve bonnen om te retourneren</p></div>
      : myBons.map(b => <div key={b.id} onClick={()=>setActiveBon(b)} className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 hover:border-gray-200 cursor-pointer hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2"><span className="font-mono text-sm font-bold text-blue-600">{b.bon_number}</span><BonBadge bon={b}/></div>
            <p className="text-xs text-gray-500 mt-1">{(b.items||[]).filter(isActiveItem).map((i) => itemDisplayName(i)).join(", ")}</p>
          </div>
          <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700">Retour</span>
        </div>
      </div>)}
    </div>
  </div>;

  const onBack = () => { if (presetBon) onCancel(); else setActiveBon(null); };
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 pb-40">
    <div className="bg-white border-b border-gray-100 shadow-sm"><div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Terug</button>
      <h2 className="text-lg font-bold text-gray-900">Retour {activeBon.bon_number}</h2><div className="w-16"/>
    </div></div>
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <ConnectionBanner loading={materialsLoading} error={materialsError} onRetry={refreshMaterials} resource="Materialen"/>

      <div className="bg-emerald-50 rounded-2xl px-5 py-3 text-sm text-emerald-800">
        <p className="font-semibold">{"\ud83d\udce5"} Scan wat je terugbrengt</p>
        <p className="mt-1">Elke scan telt één stuk retour. Iets kwijt of kapot? Klik dat handmatig aan bij het item — de voorraad wordt dan direct bijgewerkt.</p>
      </div>

      <div className="rounded-2xl p-5 shadow-sm border bg-white border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-2">Scan materiaal</label>
        <div className="flex gap-2">
          <input ref={scanRef} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Scan barcode..." value={scanInput} onChange={e=>{const v=e.target.value;setScanInput(v);scanValue.current=v;if(scanTimer.current)clearTimeout(scanTimer.current);if(v.trim().length>=3)scanTimer.current=setTimeout(()=>handleReturnScan(),150)}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(scanTimer.current)clearTimeout(scanTimer.current);handleReturnScan()}}} autoFocus autoComplete="off"/>
          <button onClick={handleReturnScan} className="px-5 py-3 rounded-xl text-white font-semibold text-sm bg-emerald-500 hover:bg-emerald-600">{"\ud83d\udce5"}</button>
        </div>
        {scanMsg && <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium ${scanMsg.ok?"bg-emerald-50 text-emerald-800":"bg-red-50 text-red-800"}`}>{scanMsg.text}</div>}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-bold text-gray-900 text-sm">Items ({openItems.length})</h3></div>
        {openItems.length === 0 ? <p className="px-5 py-6 text-sm text-gray-400">Alles is al retour</p>
        : openItems.map((bi) => {
          const c = cur(bi.id);
          const rem = remaining(bi);
          const done = rem === 0;
          const someDamage = c.lost > 0 || c.broken > 0;
          const rowBg = done
            ? (someDamage ? "bg-amber-50/60" : "bg-emerald-50/60")
            : (total(bi.id) > 0 ? "bg-blue-50/60" : "bg-white");
          return <div key={bi.id} className={`px-5 py-3 border-b border-gray-50 last:border-0 ${rowBg}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                  <span>{bi.quantity}x {itemDisplayName(bi)}</span>
                  <KindBadge kind={bonItemKind(bi)} compact/>
                </p>
                <p className={`text-xs mt-0.5 ${done ? "text-gray-600" : "text-gray-500"}`}>
                  {done ? "afgehandeld" : `${rem} nog te doen`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <ConditionCounter
                label="Retour" color="emerald"
                value={c.returned} disabled={submitting}
                canInc={rem > 0}
                onInc={() => inc(bi, "returned")}
                onDec={() => dec(bi, "returned")}
              />
              <ConditionCounter
                label="Kwijt" color="amber"
                value={c.lost} disabled={submitting}
                canInc={rem > 0}
                onInc={() => inc(bi, "lost")}
                onDec={() => dec(bi, "lost")}
              />
              <ConditionCounter
                label="Kapot" color="red"
                value={c.broken} disabled={submitting}
                canInc={rem > 0}
                onInc={() => inc(bi, "broken")}
                onDec={() => dec(bi, "broken")}
              />
            </div>
          </div>;
        })}
      </div>

      {(totalLost > 0 || totalBroken > 0) && <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-900">
        <p className="font-semibold mb-1">{"\u26a0\ufe0f"} Voorraadwijziging bij bevestigen</p>
        <ul className="space-y-0.5">
          {totalLost > 0   && <li>• {totalLost} stuk{totalLost   === 1 ? "" : "s"} gemeld als <strong>kwijt</strong> — worden van de voorraad afgeboekt.</li>}
          {totalBroken > 0 && <li>• {totalBroken} stuk{totalBroken === 1 ? "" : "s"} gemeld als <strong>kapot</strong> — worden van de voorraad afgeboekt (tot een admin ze afhandelt).</li>}
        </ul>
      </div>}

      {submitError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{submitError}</div>}
    </div>

    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl p-4 z-40">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm">
            {totalReturned} retour{(totalLost + totalBroken) > 0 ? ` · ${totalLost + totalBroken} schade` : ""}
          </p>
          <p className="text-xs text-gray-500">
            {untouchedCount > 0 ? `${untouchedCount} item${untouchedCount === 1 ? "" : "s"} nog onaangeraakt` : "alles gemarkeerd"}
          </p>
        </div>
        <button onClick={finishReturn} disabled={submitting || totalHandled === 0} className="px-6 py-3 rounded-xl text-white font-bold text-sm bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40">
          {submitting ? "Bezig..." : "Retour bevestigen"}
        </button>
      </div>
    </div>
  </div>;
}

// Kleine sub-component: één +/- teller met label. Kleur volgt de conditie.
function ConditionCounter({ label, color, value, canInc, disabled, onInc, onDec }) {
  const colorMap = {
    emerald: { text: "text-emerald-700", plus: "bg-emerald-500 hover:bg-emerald-600" },
    amber:   { text: "text-amber-700",   plus: "bg-amber-500 hover:bg-amber-600" },
    red:     { text: "text-red-700",     plus: "bg-red-500 hover:bg-red-600" },
  }[color];
  return <div className="border border-gray-200 rounded-xl p-2 flex flex-col items-center gap-1">
    <span className={`text-[11px] font-semibold uppercase tracking-wide ${colorMap.text}`}>{label}</span>
    <div className="flex items-center gap-1">
      <button type="button" onClick={onDec} disabled={disabled || value === 0} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 disabled:opacity-30" aria-label={`${label} minder`}>-</button>
      <span className={`w-6 text-center font-bold ${colorMap.text}`}>{value}</span>
      <button type="button" onClick={onInc} disabled={disabled || !canInc} className={`w-7 h-7 rounded-lg text-white font-bold text-sm ${colorMap.plus} disabled:opacity-30`} aria-label={`${label} meer`}>+</button>
    </div>
  </div>;
}
