import { useState, useEffect, useMemo, useRef } from "react";
import { BonBadge } from "../../components/BonBadge";
import { ConnectionBanner } from "../../components/ConnectionBanner";
import { KindBadge } from "../../components/KindBadge";
import { itemDisplayName, availQty, availSetQty } from "../../utils/bons";
import { getIcon } from "../../utils/format";
import { fmtDate } from "../../utils/date";
import { CATS } from "../../data/defaults";
import { pickupBon } from "../../api/client";

const bonItemKind = (bi) => (bi.set_id != null ? "set" : "material");
const isActiveItem = (bi) => bi && bi.removed_at_pickup !== 1;
const cartKey = (kind, id) => `${kind}:${id}`;

// `presetBon` (v1.14.1): als deze prop staat, slaan we de bon-keuze over en
// starten direct in de scan/confirm-view voor die specifieke bon. Zo kan de
// admin dezelfde flow openen vanuit BonDetailModal voor een externe bon.
// De back-pijl in de confirm-view roept dan onCancel aan (geen lijst-terug).
// `user` is optioneel wanneer presetBon aanwezig is; de bon-lijst wordt in
// preset-modus toch niet getoond.
export function PickupFlow({ eq, sets, materialsLoading, materialsError, refreshMaterials, bons, refreshBons, setBonsError, user, onCancel, onDone, presetBon = null }) {
  const [activeBon, setActiveBon] = useState(presetBon);
  // scannedCounts: bon_item_id → aantal keer als "meegenomen" geteld.
  const [scannedCounts, setScannedCounts] = useState(() => new Map());
  // bon_item_ids die de gebruiker als "niet meenemen" heeft gemarkeerd.
  const [removedIds, setRemovedIds] = useState(() => new Set());
  // Cart met extra toe te voegen materialen die niet op de reservering stonden.
  const [addedCart, setAddedCart] = useState([]);

  // Scan-input voor de hoofdscanner (afvinken van reserveringsitems).
  const [scanInput, setScanInput] = useState("");
  const [scanMsg, setScanMsg] = useState(null);
  const scanRef = useRef(null);
  const scanTimer = useRef(null);
  const scanValue = useRef("");

  // Aparte adder-sectie voor extra materiaal.
  const [showAdder, setShowAdder] = useState(false);
  const [adderQ, setAdderQ] = useState("");
  const [adderCat, setAdderCat] = useState("Alle");
  const [adderKindFilter, setAdderKindFilter] = useState("both");
  const [adderScanInput, setAdderScanInput] = useState("");
  const [adderScanMsg, setAdderScanMsg] = useState(null);
  const adderScanRef = useRef(null);
  const adderScanTimer = useRef(null);
  const adderScanValue = useRef("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null); // { message, conflicts?, blocked? }

  // In preset-modus tonen we de bon-lijst niet, dus user mag afwezig zijn.
  const myReservations = presetBon
    ? []
    : bons.filter((b) => b.user_id === user?.id && b.status === "reserved");

  // Reset alle bewerkingsstate zodra er een andere reservering gekozen wordt.
  useEffect(() => {
    setScannedCounts(new Map());
    setRemovedIds(new Set());
    setAddedCart([]);
    setScanInput(""); scanValue.current = "";
    setScanMsg(null);
    setShowAdder(false);
    setAdderQ("");
    setAdderCat("Alle");
    setAdderKindFilter("both");
    setAdderScanInput(""); adderScanValue.current = "";
    setSubmitError(null);
  }, [activeBon?.id]);

  // Focus-manager voor de hoofdscanner (zoals in ReturnFlow) — houdt de
  // cursor in het scanveld zodat een barcode-scanner er meteen op landt.
  useEffect(() => {
    const handler = (e) => {
      const ref = scanRef.current;
      if (!ref) return;
      if (e.key === "F3" || (e.ctrlKey && e.key === "f") || (e.ctrlKey && e.key === "g") || e.key === "/") {
        e.preventDefault();
      }
      const activeTag = document.activeElement?.tagName;
      if (ref.offsetParent !== null && document.activeElement !== ref
          && activeTag !== "INPUT" && activeTag !== "SELECT" && activeTag !== "TEXTAREA") {
        ref.focus();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [activeBon?.id]);

  // Adder-scanner grijpt de focus alleen zolang de adder open is.
  useEffect(() => {
    if (!showAdder) return;
    const handler = () => {
      const ref = adderScanRef.current;
      const activeTag = document.activeElement?.tagName;
      if (ref && ref.offsetParent !== null && document.activeElement !== ref
          && activeTag !== "INPUT" && activeTag !== "SELECT" && activeTag !== "TEXTAREA") {
        ref.focus();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [showAdder]);

  const originalItems = useMemo(
    () => (activeBon?.items || []).filter(isActiveItem),
    [activeBon],
  );

  const allItems = useMemo(() => {
    const mats = (eq || []).map((m) => ({ ...m, kind: "material" }));
    const ss   = (sets || []).map((s) => ({ ...s, kind: "set" }));
    return [...mats, ...ss];
  }, [eq, sets]);

  // -- Scan-afhandeling: reserveringsitem afvinken ------------------------
  const findBonItemByScan = (code) => {
    if (!activeBon || !code) return { hit: null, reason: "empty" };
    const upper = code.toUpperCase();

    const matchByMaterial = (matId) => originalItems.find(
      (it) => it.material_id === matId && !removedIds.has(it.id)
              && (scannedCounts.get(it.id) || 0) < it.quantity,
    );
    const matchBySet = (setId) => originalItems.find(
      (it) => it.set_id === setId && !removedIds.has(it.id)
              && (scannedCounts.get(it.id) || 0) < it.quantity,
    );

    // 1) barcode-match op materiaal
    const matchMat = (eq || []).find((i) => i.barcode === code || i.barcode === upper);
    if (matchMat) {
      const bi = matchByMaterial(matchMat.id);
      if (bi) return { hit: bi, reason: "ok" };
      // Bekende barcode, maar dat item is al vol of niet-meenemen.
      const known = originalItems.find((it) => it.material_id === matchMat.id);
      if (known) return { hit: null, reason: "already", name: matchMat.name };
      return { hit: null, reason: "not-on-bon", name: matchMat.name };
    }
    // 2) barcode-match op set
    const matchSet = (sets || []).find((s) => s.barcode === code || s.barcode === upper);
    if (matchSet) {
      const bi = matchBySet(matchSet.id);
      if (bi) return { hit: bi, reason: "ok" };
      const known = originalItems.find((it) => it.set_id === matchSet.id);
      if (known) return { hit: null, reason: "already", name: matchSet.name };
      return { hit: null, reason: "not-on-bon", name: matchSet.name };
    }
    // 3) numerieke id
    const numId = parseInt(code, 10);
    if (!Number.isNaN(numId)) {
      const bi = matchByMaterial(numId) || matchBySet(numId);
      if (bi) return { hit: bi, reason: "ok" };
    }
    // 4) partial name match op de items van deze bon
    const bi = originalItems.find(
      (it) => !removedIds.has(it.id)
              && (scannedCounts.get(it.id) || 0) < it.quantity
              && itemDisplayName(it).toLowerCase().includes(code.toLowerCase()),
    );
    if (bi) return { hit: bi, reason: "ok" };
    return { hit: null, reason: "not-found" };
  };

  const handleScan = () => {
    const code = scanValue.current.trim();
    if (!code) return;
    const { hit, reason, name } = findBonItemByScan(code);
    if (hit) {
      setScannedCounts((prev) => {
        const next = new Map(prev);
        next.set(hit.id, (next.get(hit.id) || 0) + 1);
        return next;
      });
      const total = (scannedCounts.get(hit.id) || 0) + 1;
      setScanMsg({ ok: true, text: `\u2705 ${itemDisplayName(hit)} ${total}/${hit.quantity}` });
    } else if (reason === "already") {
      setScanMsg({ ok: false, text: `\u26a0\ufe0f ${name} — al helemaal afgevinkt of niet meenemen` });
    } else if (reason === "not-on-bon") {
      setScanMsg({ ok: false, text: `\u26a0\ufe0f ${name} — niet op deze reservering. Voeg 'm eventueel toe via 'Extra materiaal'.` });
    } else {
      setScanMsg({ ok: false, text: "\u274c Niet gevonden" });
    }
    setScanInput(""); scanValue.current = "";
    setTimeout(() => setScanMsg(null), 3000);
  };

  const incScanned = (bi) => {
    setScannedCounts((prev) => {
      const cur = prev.get(bi.id) || 0;
      if (cur >= bi.quantity) return prev;
      const next = new Map(prev);
      next.set(bi.id, cur + 1);
      return next;
    });
  };
  const decScanned = (bi) => {
    setScannedCounts((prev) => {
      const cur = prev.get(bi.id) || 0;
      if (cur <= 0) return prev;
      const next = new Map(prev);
      const nv = cur - 1;
      if (nv === 0) next.delete(bi.id);
      else next.set(bi.id, nv);
      return next;
    });
  };

  const toggleRemoveOriginal = (id) => {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Als 'niet meenemen' aangevinkt wordt, de scan-teller nullen — anders
        // is de intentie verwarrend ("beide" zou zichzelf tegenspreken).
        setScannedCounts((cs) => {
          if (!cs.has(id)) return cs;
          const nc = new Map(cs);
          nc.delete(id);
          return nc;
        });
      }
      return next;
    });
  };

  // -- Beschikbaarheid voor 'extra materiaal toevoegen' -------------------
  // v1.20.0: gebruikt centrale helpers uit src/utils/bons.js met de bon-
  // periode en excludeBonId — spiegelt exact wat backend checkStock doet bij
  // POST /api/bons/:id/pickup. De eigen items op deze bon en cart-items
  // trekken we er lokaal nog vanaf, want die zitten (nog) niet in de globale
  // bons-state maar horen wel bezetting van deze bon te vertegenwoordigen.
  const getAvailForAdd = (item) => {
    if (!activeBon) return 0;
    const idField = item.kind === "set" ? "set_id" : "material_id";
    const availFn = item.kind === "set" ? availSetQty : availQty;
    let av = availFn(item, bons, activeBon.start_date, activeBon.return_date, {
      excludeBonId: activeBon.id,
    });
    // Wat we van deze eigen bon nog "meenemen": items die we niet als
    // removed hebben aangevinkt. Conservatief telt het volle originele
    // quantity mee — de backend voorkomt via checkStock overshoot bij submit.
    for (const bi of originalItems) {
      if (removedIds.has(bi.id)) continue;
      if (bi[idField] !== item.id) continue;
      av -= bi.quantity;
    }
    for (const c of addedCart) {
      if (c.kind === item.kind && c.itemId === item.id) av -= c.qty;
    }
    return Math.max(0, av);
  };

  const addToCart = (item) => {
    const av = getAvailForAdd(item);
    if (av <= 0) return;
    const key = cartKey(item.kind, item.id);
    const existing = addedCart.find((c) => c.key === key);
    if (existing) {
      setAddedCart((p) => p.map((c) => (c.key === key ? { ...c, qty: c.qty + 1 } : c)));
    } else {
      setAddedCart((p) => [...p, {
        key, kind: item.kind, itemId: item.id, itemName: item.name, barcode: item.barcode, qty: 1,
      }]);
    }
  };
  const decCart = (key) => {
    setAddedCart((prev) => {
      const ex = prev.find((c) => c.key === key);
      if (!ex) return prev;
      if (ex.qty <= 1) return prev.filter((c) => c.key !== key);
      return prev.map((c) => (c.key === key ? { ...c, qty: c.qty - 1 } : c));
    });
  };
  const removeFromCart = (key) => setAddedCart((prev) => prev.filter((c) => c.key !== key));

  const handleAdderScan = () => {
    const code = adderScanValue.current.trim();
    if (!code) return;
    const upper = code.toUpperCase();
    let hit = allItems.find((i) => i.barcode === code || i.barcode === upper);
    if (!hit) {
      const numId = parseInt(code, 10);
      if (!Number.isNaN(numId)) {
        hit = allItems.find((i) => i.kind === "material" && i.id === numId)
           || allItems.find((i) => i.kind === "set"      && i.id === numId);
      }
    }
    if (!hit) hit = allItems.find((i) => i.name.toLowerCase().includes(code.toLowerCase()));
    if (hit) {
      const av = getAvailForAdd(hit);
      if (av > 0) {
        addToCart(hit);
        setAdderScanMsg({ ok: true, text: `\u2705 ${hit.name} toegevoegd` });
      } else {
        setAdderScanMsg({ ok: false, text: `\u26a0\ufe0f ${hit.name} — niet beschikbaar` });
      }
    } else {
      setAdderScanMsg({ ok: false, text: "\u274c Niet gevonden" });
    }
    setAdderScanInput(""); adderScanValue.current = "";
    setTimeout(() => setAdderScanMsg(null), 2500);
  };

  const filteredForAdder = allItems.filter((i) => {
    if (adderKindFilter === "material" && i.kind !== "material") return false;
    if (adderKindFilter === "set"      && i.kind !== "set")      return false;
    if (adderCat !== "Alle" && i.category !== adderCat) return false;
    if (adderQ && !i.name.toLowerCase().includes(adderQ.toLowerCase())) return false;
    return getAvailForAdd(i) > 0;
  });

  // -- Afronden -----------------------------------------------------------
  // "Onaangeraakt" = niet-removed en 0 gescand → afronden geblokkeerd.
  const untouchedItems = originalItems.filter(
    (bi) => !removedIds.has(bi.id) && (scannedCounts.get(bi.id) || 0) === 0,
  );

  const totalScanned = originalItems.reduce(
    (s, bi) => s + (removedIds.has(bi.id) ? 0 : (scannedCounts.get(bi.id) || 0)),
    0,
  );
  const totalAdded = addedCart.reduce((s, c) => s + c.qty, 0);

  const submit = async () => {
    if (!activeBon || submitting) return;
    if (untouchedItems.length > 0) {
      setSubmitError({
        message: "Er staan nog items open. Scan ze of markeer ze als 'niet meenemen'.",
        blocked: untouchedItems.map((bi) => `${bi.quantity}x ${itemDisplayName(bi)}`),
      });
      return;
    }
    if (totalScanned === 0 && totalAdded === 0) {
      setSubmitError({ message: "Er gaat niks mee — pas eventueel je keuze aan of annuleer." });
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const remove = Array.from(removedIds);
      const keep = originalItems
        .filter((bi) => !removedIds.has(bi.id) && (scannedCounts.get(bi.id) || 0) > 0)
        .map((bi) => ({ id: bi.id, quantity: scannedCounts.get(bi.id) || 0 }));
      const add = addedCart.map((c) => ({ kind: c.kind, id: c.itemId, quantity: c.qty }));
      const result = await pickupBon(activeBon.id, { remove, keep, add });
      await refreshBons();
      onDone({
        action: "loan",
        text: `${result.bon_number} is opgehaald${totalAdded > 0 ? " (met extra materiaal)" : ""}!`,
      });
    } catch (err) {
      if (err.status === 409 && Array.isArray(err.details)) {
        setSubmitError({ message: "Onvoldoende voorraad voor toegevoegd materiaal", conflicts: err.details });
      } else {
        setSubmitError({ message: err.message || "Ophalen mislukt" });
        setBonsError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── BON-KEUZE ──────────────────────────────────────────────────────────
  if (!activeBon) return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
    <div className="bg-white border-b border-gray-100 shadow-sm"><div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
      <button onClick={onCancel} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Terug</button>
      <h2 className="text-lg font-bold text-gray-900">Kies een reservering</h2><div className="w-16"/>
    </div></div>
    <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
      <ConnectionBanner loading={materialsLoading} error={materialsError} onRetry={refreshMaterials} resource="Materialen"/>
      {myReservations.length === 0 ? <div className="text-center py-12"><p className="text-4xl mb-3">{"\ud83d\udcc5"}</p><p className="text-gray-500">Geen openstaande reserveringen</p></div>
      : myReservations.map((b) => <div key={b.id} onClick={() => setActiveBon(b)} className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-purple-200 hover:border-purple-300 cursor-pointer hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2"><span className="font-mono text-sm font-bold text-blue-600">{b.bon_number}</span><BonBadge bon={b}/></div>
            <p className="text-xs text-gray-500 mt-1">{fmtDate(b.start_date)} {"\u2192"} {fmtDate(b.return_date)}</p>
            <p className="text-xs text-gray-500 mt-1">{(b.items || []).filter(isActiveItem).map(itemDisplayName).join(", ")}</p>
          </div>
          <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700">Ophalen</span>
        </div>
      </div>)}
    </div>
  </div>;

  // ── OPHALEN — scannen en bevestigen ────────────────────────────────────
  // Preset-modus (admin): terug sluit de flow af; user-modus: terug naar
  // de eigen reserveringslijst.
  const onBack = () => { if (presetBon) onCancel(); else setActiveBon(null); };
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
    <div className="bg-white border-b border-gray-100 shadow-sm"><div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Terug</button>
      <h2 className="text-lg font-bold text-gray-900">Ophalen {activeBon.bon_number}</h2><div className="w-16"/>
    </div></div>

    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-40">
      <ConnectionBanner loading={materialsLoading} error={materialsError} onRetry={refreshMaterials} resource="Materialen"/>

      <div className="bg-purple-50 rounded-2xl px-5 py-4 text-sm text-purple-800">
        <p className="font-semibold">{"\ud83d\udcc5"} Scan wat je meeneemt</p>
        <p className="mt-1">Elke scan telt één stuk mee. Neem je iets bewust niet mee? Gebruik "Niet meenemen". Retour uiterlijk {fmtDate(activeBon.return_date)}.</p>
      </div>

      {/* Hoofdscanner — afvinken van reserveringsitems */}
      <div className="rounded-2xl p-5 shadow-sm border bg-white border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-2">Scan materiaal om af te vinken</label>
        <div className="flex gap-2">
          <input
            ref={scanRef}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Scan barcode..."
            value={scanInput}
            onChange={(e) => {
              const v = e.target.value;
              setScanInput(v); scanValue.current = v;
              if (scanTimer.current) clearTimeout(scanTimer.current);
              if (v.trim().length >= 3) scanTimer.current = setTimeout(() => handleScan(), 150);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (scanTimer.current) clearTimeout(scanTimer.current);
                handleScan();
              }
            }}
            autoFocus autoComplete="off"
          />
          <button onClick={handleScan} className="px-5 py-3 rounded-xl text-white font-semibold text-sm bg-purple-500 hover:bg-purple-600">{"\ud83d\udce6"}</button>
        </div>
        {scanMsg && <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium ${scanMsg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{scanMsg.text}</div>}
      </div>

      {/* Items op de reservering */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">Op de reservering ({originalItems.length})</h3>
        </div>
        {originalItems.length === 0 ? <p className="px-5 py-6 text-sm text-gray-400">Geen items op de reservering</p>
        : originalItems.map((bi) => {
          const removed = removedIds.has(bi.id);
          const scanned = scannedCounts.get(bi.id) || 0;
          const complete = !removed && scanned === bi.quantity;
          const partial  = !removed && scanned > 0 && scanned < bi.quantity;
          const untouched = !removed && scanned === 0;
          const rowClass = removed ? "bg-red-50/60"
                          : complete ? "bg-emerald-50/60"
                          : partial ? "bg-amber-50/60"
                          : untouched ? "bg-white" : "bg-white";
          return <div key={bi.id} className={`px-5 py-3 border-b border-gray-50 last:border-0 ${rowClass}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm font-medium flex items-center gap-2 flex-wrap ${removed ? "line-through text-gray-400" : "text-gray-900"}`}>
                  <span>{itemDisplayName(bi)}</span>
                  <KindBadge kind={bonItemKind(bi)} compact/>
                </p>
                <p className={`text-xs mt-0.5 ${removed ? "text-red-600" : complete ? "text-emerald-700" : partial ? "text-amber-700" : "text-gray-500"}`}>
                  {removed ? "Wordt niet meegenomen"
                   : `${scanned} / ${bi.quantity} gescand${complete ? " \u2014 klaar" : partial ? " \u2014 restant komt vrij bij afronden" : ""}`}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => decScanned(bi)}
                  disabled={removed || scanned === 0}
                  className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 disabled:opacity-30"
                  aria-label="Eén minder"
                >-</button>
                <span className="w-8 text-center font-bold text-sm text-gray-800">{scanned}</span>
                <button
                  type="button"
                  onClick={() => incScanned(bi)}
                  disabled={removed || scanned >= bi.quantity}
                  className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-bold text-sm hover:bg-purple-200 disabled:opacity-30"
                  aria-label="Eén meer"
                >+</button>
              </div>
            </div>
            <div className="flex justify-end mt-1.5">
              <button
                type="button"
                onClick={() => toggleRemoveOriginal(bi.id)}
                className={`text-xs font-medium px-3 py-1 rounded-lg ${removed ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
              >
                {removed ? "Toch meenemen" : "Niet meenemen"}
              </button>
            </div>
          </div>;
        })}
      </div>

      {/* Extra toevoegen */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <button
          type="button"
          onClick={() => setShowAdder((s) => !s)}
          className="w-full px-5 py-4 flex items-center justify-between text-left"
        >
          <div>
            <p className="font-bold text-gray-900 text-sm">Extra materiaal toevoegen</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {addedCart.length === 0
                ? "Alleen mogelijk als het materiaal nu beschikbaar is."
                : `${totalAdded} extra item${totalAdded === 1 ? "" : "s"} in de cart`}
            </p>
          </div>
          <span className={`text-2xl text-blue-500 transition-transform ${showAdder ? "rotate-45" : ""}`}>{"\u002b"}</span>
        </button>

        {showAdder && <div className="px-5 pb-5 space-y-3">
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
            <label className="block text-xs font-medium text-blue-800 mb-2">{"\ud83d\udcf3"} Scan of typ</label>
            <div className="flex gap-2">
              <input
                ref={adderScanRef}
                className="flex-1 px-3 py-2 rounded-xl border border-blue-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Scan barcode..."
                value={adderScanInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setAdderScanInput(v); adderScanValue.current = v;
                  if (adderScanTimer.current) clearTimeout(adderScanTimer.current);
                  if (v.trim().length >= 3) adderScanTimer.current = setTimeout(() => handleAdderScan(), 150);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (adderScanTimer.current) clearTimeout(adderScanTimer.current);
                    handleAdderScan();
                  }
                }}
                autoComplete="off"
              />
              <button onClick={handleAdderScan} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">+</button>
            </div>
            {adderScanMsg && <div className={`mt-2 rounded-xl px-3 py-2 text-xs font-medium ${adderScanMsg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{adderScanMsg.text}</div>}
          </div>

          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Zoek op naam..." value={adderQ} onChange={(e) => setAdderQ(e.target.value)}/>
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {[["both","Beide"],["material","Materiaal"],["set","Sets"]].map(([k,l]) => (
              <button key={k} onClick={() => setAdderKindFilter(k)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${adderKindFilter===k?(k==="set"?"bg-purple-600 text-white":k==="material"?"bg-blue-600 text-white":"bg-gray-700 text-white"):"text-gray-600 hover:text-gray-900"}`}>{l}</button>
            ))}
          </div>

          <div className="flex gap-1.5 overflow-x-auto">{CATS.map((c) => <button key={c} onClick={() => setAdderCat(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${adderCat === c ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{c}</button>)}</div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredForAdder.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Geen beschikbaar materiaal met deze filters</p>
            : filteredForAdder.slice(0, 30).map((i) => {
              const av = getAvailForAdd(i);
              const inC = addedCart.find((c) => c.key === cartKey(i.kind, i.id))?.qty || 0;
              return <div key={cartKey(i.kind, i.id)} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 border ${inC > 0 ? "border-blue-300 bg-blue-50" : "border-gray-100 bg-white"}`}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">{getIcon(i.category)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-2"><span>{i.name}</span><KindBadge kind={i.kind} compact/></p>
                    <p className="text-xs text-emerald-600">{av} beschikbaar</p>
                  </div>
                </div>
                <button onClick={() => addToCart(i)} disabled={av === 0} className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-30 flex items-center justify-center flex-shrink-0">+</button>
              </div>;
            })}
            {filteredForAdder.length > 30 && <p className="text-xs text-gray-400 text-center">…nog {filteredForAdder.length - 30} verborgen. Zoek of scan om er sneller bij te komen.</p>}
          </div>
        </div>}
      </div>

      {addedCart.length > 0 && <div className="bg-white rounded-2xl shadow-sm border border-blue-200">
        <div className="px-5 py-3 border-b border-blue-100"><h3 className="font-bold text-blue-900 text-sm">Toegevoegd bij ophalen</h3></div>
        {addedCart.map((c) => <div key={c.key} className="px-5 py-3 flex items-center justify-between gap-2 border-b border-gray-50 last:border-0">
          <p className="text-sm font-medium flex items-center gap-2 flex-wrap"><span>{c.qty}x {c.itemName}</span><KindBadge kind={c.kind} compact/></p>
          <div className="flex items-center gap-2">
            <button onClick={() => decCart(c.key)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200">-</button>
            <span className="w-6 text-center font-bold text-blue-700">{c.qty}</span>
            <button onClick={() => removeFromCart(c.key)} className="text-red-400 hover:text-red-600" aria-label="Verwijderen"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 5L5 13M5 5l8 8"/></svg></button>
          </div>
        </div>)}
      </div>}

      {submitError && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-red-800">{submitError.message}</p>
        {submitError.blocked && <ul className="mt-2 space-y-1 text-sm text-red-700">
          {submitError.blocked.map((label, idx) => <li key={idx}>{"\u2022"} {label}</li>)}
        </ul>}
        {submitError.conflicts && <ul className="mt-2 space-y-1 text-sm text-red-700">
          {submitError.conflicts.map((c, idx) => <li key={idx}>
            {"\u2022"} {c.material_name || c.set_name || "item"}: gevraagd {c.gevraagd}, beschikbaar {c.beschikbaar}
          </li>)}
        </ul>}
      </div>}
    </div>

    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl p-4 z-40">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm">
            {totalScanned} gescand{totalAdded > 0 ? ` + ${totalAdded} extra` : ""}
          </p>
          <p className="text-xs text-gray-500">
            {untouchedItems.length > 0
              ? `${untouchedItems.length} item${untouchedItems.length === 1 ? "" : "s"} nog open`
              : (removedIds.size > 0 ? `${removedIds.size} niet meegenomen` : "alles afgehandeld")}
          </p>
        </div>
        <button
          onClick={submit}
          disabled={submitting || untouchedItems.length > 0 || (totalScanned === 0 && totalAdded === 0)}
          className="px-6 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 disabled:opacity-40"
        >
          {submitting ? "Bezig..." : "Ophalen bevestigen"}
        </button>
      </div>
    </div>
  </div>;
}
