import { useState, useEffect, useRef, useMemo } from "react";
import { CATS } from "../../data/defaults";
import { ConnectionBanner } from "../../components/ConnectionBanner";
import { getIcon } from "../../utils/format";
import { fmtDate, today, isWeekend } from "../../utils/date";
import { availQty, availSetQty } from "../../utils/bons";

const WEEKEND_MSG_START = "Ophaaldatum kan alleen op een werkdag vallen. Kies maandag t/m vrijdag.";
const WEEKEND_MSG_END = "Retourdatum kan alleen op een werkdag vallen. Kies maandag t/m vrijdag.";
import { createBon } from "../../api/client";
import { KindBadge } from "../../components/KindBadge";

const cartKey = (kind, id) => `${kind}:${id}`;

// v1.20.2: absolute bovengrens voor invulling in de cart. Bewust hoger dan
// elke realistische voorraad zodat de gebruiker de "Max X beschikbaar in
// deze periode"-melding kan zien i.p.v. tegen een onzichtbare muur op de
// totale stock aan te lopen. Puur een technische veiligheidsmarge tegen
// absurde invoer — inhoudelijk begrenst de melding en de submit-blokkering.
const MAX_QTY = 999;

// `user` is verplicht voor interne bonnen (dan zit user_id in de payload).
// Voor externe bonnen laat de aanroeper `user` weg en levert een
// `createBonOverride(basePayload) => finalPayload` die user_id vervangt door
// het `external` blok. `confirmExtras` is een optionele React-node die
// bovenaan de bevestigstap komt (bv. huurder + bedragen tonen).
export function LoanFlow({ eq, materialsLoading, materialsError, refreshMaterials, sets, bons, refreshBons, setBonsError, user, isReservation, onCancel, onDone, createBonOverride, confirmExtras }) {
  const [cart, setCart] = useState([]);
  const [endDate, setEndDate] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [q, setQ] = useState(""); const [cat, setCat] = useState("Alle");
  const [kindFilter, setKindFilter] = useState("both"); // "both" | "material" | "set"
  const [loanStep, setLoanStep] = useState(1);
  const [loanScanInput, setLoanScanInput] = useState("");
  const [loanScanMsg, setLoanScanMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null); // {message, conflicts?: [...]}
  const [expandedSets, setExpandedSets] = useState(() => new Set());
  const loanScanRef = useRef(null);
  const loanScanTimer = useRef(null);
  const loanScanValue = useRef("");
  const totalCartQty = cart.reduce((s, c) => s + c.qty, 0);
  const startDateInvalid = isWeekend(startDate);
  const endDateInvalid = isWeekend(endDate);

  useEffect(() => {
    const handler = (e) => {
      const activeRef = loanScanRef.current;
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

  // Gecombineerde lijst van materialen + sets met een 'kind'-discriminator.
  // Cart-items zoeken op kind+id zodat materiaal-id 5 en set-id 5 niet botsen.
  const allItems = useMemo(() => {
    const mats = (eq || []).map((m) => ({ ...m, kind: "material" }));
    const ss = (sets || []).map((s) => ({ ...s, kind: "set" }));
    return [...mats, ...ss];
  }, [eq, sets]);

  // v1.20.0: beschikbaarheid voor DE GEKOZEN PERIODE. Bij een reservering
  // heeft de gebruiker in stap 1 start+eind gekozen; bij een directe leen
  // is start = vandaag en heeft de gebruiker in stap 1 alleen de retour-
  // datum gekozen. Voor de materiaal-stap moet endDate dus altijd al gezet
  // zijn — anders gebruiken we een defensieve fallback (vandaag) zodat de
  // helpers geen NaN-gedrag krijgen.
  const getAvailForItem = (item) => {
    const availFn = item.kind === "set" ? availSetQty : availQty;
    return availFn(item, bons, startDate, endDate || startDate);
  };

  // v1.20.1: zachte grens. De +knop en het aantal-veld staan overschrijding
  // van het periode-beschikbare aantal TOE — pas dan wordt de melding "Max X
  // beschikbaar in deze periode" ook echt bereikbaar. v1.20.2: de absolute
  // bovengrens is niet meer de totale stock (die de gebruiker niet kent),
  // maar `MAX_QTY` — puur om absurde invoer te vangen. De aanmaak-knop
  // verderop blokkeert nog wel op periode-overschrijding, zodat je geen bon
  // kunt sturen die de backend toch met een 409 zou weigeren.
  const addToCart = (item) => {
    const key = cartKey(item.kind, item.id);
    const inC = cart.find((c) => c.key === key)?.qty || 0;
    if (inC >= MAX_QTY) return;
    if (cart.find((c) => c.key === key)) {
      setCart((p) => p.map((c) => (c.key === key ? { ...c, qty: c.qty + 1 } : c)));
    } else {
      setCart((p) => [...p, {
        key,
        kind: item.kind,
        itemId: item.id,
        itemName: item.name,
        barcode: item.barcode,
        unit: item.unit,
        qty: 1,
      }]);
    }
  };

  // Typen in het aantal-veld gaat via deze setter. Klamp op [0, MAX_QTY], en
  // laat het item uit de cart verdwijnen zodra het naar 0 wordt gezet. De
  // periode-overschrijding wordt daarna zichtbaar via de rode melding + de
  // geblokkeerde aanmaak-knop.
  const setCartQty = (item, rawQty) => {
    const parsed = Math.floor(Number(rawQty));
    const clamped = Number.isFinite(parsed) ? Math.max(0, Math.min(MAX_QTY, parsed)) : 0;
    const key = cartKey(item.kind, item.id);
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.key === key);
      if (clamped === 0) {
        return idx === -1 ? prev : prev.filter((c) => c.key !== key);
      }
      if (idx === -1) {
        return [...prev, {
          key,
          kind: item.kind,
          itemId: item.id,
          itemName: item.name,
          barcode: item.barcode,
          unit: item.unit,
          qty: clamped,
        }];
      }
      return prev.map((c) => (c.key === key ? { ...c, qty: clamped } : c));
    });
  };

  const removeFromCart = (key) => {
    setCart((p) => {
      const ex = p.find((c) => c.key === key);
      if (!ex) return p;
      if (ex.qty <= 1) return p.filter((c) => c.key !== key);
      return p.map((c) => (c.key === key ? { ...c, qty: c.qty - 1 } : c));
    });
  };

  const toggleSetExpanded = (id) => {
    setExpandedSets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleLoanScan = () => {
    const code = loanScanValue.current.trim();
    if (!code) return;
    const upper = code.toUpperCase();
    let item = allItems.find((i) => i.barcode === code || i.barcode === upper);
    if (!item) {
      const numId = parseInt(code, 10);
      if (!Number.isNaN(numId)) {
        // Bij numerieke scan: prefereer materiaal (gedragsbehoud), valt anders terug op set.
        item = allItems.find((i) => i.kind === "material" && i.id === numId)
            || allItems.find((i) => i.kind === "set" && i.id === numId);
      }
    }
    if (!item) item = allItems.find((i) => i.name.toLowerCase().includes(code.toLowerCase()));
    if (item) {
      const av = getAvailForItem(item);
      const key = cartKey(item.kind, item.id);
      const inC = cart.find((c) => c.key === key)?.qty || 0;
      if (inC >= MAX_QTY) {
        setLoanScanMsg({ ok: false, text: `\u26a0\ufe0f ${item.name} \u2014 maximaal ${MAX_QTY} per bon` });
      } else {
        addToCart(item);
        const newCount = inC + 1;
        if (newCount > av) {
          setLoanScanMsg({ ok: true, text: `\u26a0\ufe0f ${item.name} toegevoegd (${newCount}x) \u2014 max ${av} beschikbaar in deze periode` });
        } else {
          setLoanScanMsg({ ok: true, text: `\u2705 ${item.name} toegevoegd (${newCount}x)` });
        }
      }
    } else {
      setLoanScanMsg({ ok: false, text: "\u274c Niet gevonden" });
    }
    setLoanScanInput(""); loanScanValue.current = "";
    setTimeout(() => setLoanScanMsg(null), 2500);
  };

  const submitBon = async () => {
    if (cart.length === 0 || !endDate || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const basePayload = {
        // Intentie is leidend voor de status op de backend. Een reservering
        // blijft 'reserved' tot de PickupFlow 'm ophaalt, ook als de start-
        // datum vandaag is; een directe uitlening wordt meteen 'active'.
        intent: isReservation ? "reservation" : "loan",
        start_date: startDate,
        return_date: endDate,
        items: cart.map((c) => (
          c.kind === "set"
            ? { set_id: c.itemId, quantity: c.qty }
            : { material_id: c.itemId, quantity: c.qty }
        )),
      };
      if (user) basePayload.user_id = user.id;
      const payload = createBonOverride ? createBonOverride(basePayload) : basePayload;
      const created = await createBon(payload);
      await refreshBons();
      onDone({
        action: isReservation ? "reservation" : "loan",
        text: `${created.bon_number} ${isReservation ? "gereserveerd" : "aangemaakt"}!`,
      });
    } catch (err) {
      if (err.status === 409 && Array.isArray(err.details)) {
        setSubmitError({ message: "Niet beschikbaar in deze periode", conflicts: err.details });
      } else {
        setSubmitError({ message: err.message || "Aanmaken mislukt" });
        setBonsError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // v1.20.0: beide flows beginnen met een periode-stap. Bij een reservering
  // kiest de gebruiker start+eind, bij een directe leen alleen retour
  // (start = vandaag). Daarna pas de materiaal-lijst filteren op wat in die
  // periode beschikbaar is.
  const resSteps = ["Periode","Materiaal","Bevestig"];
  const totalSteps = resSteps.length;
  const itemStep = 2;
  const confirmStep = 3;

  // v1.20.1: zachte grens. De gebruiker mag boven het periode-beschikbare
  // aantal invullen (met melding), maar aanmaken is dan geblokkeerd. Zonder
  // deze check zou de backend hem alsnog met een 409 weigeren; nu vangen we
  // dat al aan de frontend af.
  const hasOverage = cart.some((c) => {
    const lookup = c.kind === "set" ? (sets || []) : eq;
    const item = lookup.find((e) => e.id === c.itemId);
    if (!item) return false;
    const av = getAvailForItem({ ...item, kind: c.kind });
    return c.qty > av;
  });

  const availableForPeriod = allItems.filter((i) => {
    if (kindFilter === "material" && i.kind !== "material") return false;
    if (kindFilter === "set" && i.kind !== "set") return false;
    return getAvailForItem(i) > 0
      && i.name.toLowerCase().includes(q.toLowerCase())
      && (cat === "Alle" || i.category === cat);
  });

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 pb-32">
    <div className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-xl mx-auto px-5 py-4 flex items-center justify-between">
        <button onClick={()=>{if(loanStep>1)setLoanStep(loanStep-1);else{onCancel();setCart([]);setEndDate("");setStartDate(today());setQ("");setCat("Alle");setLoanStep(1)}}} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>{loanStep>1?"Vorige":"Terug"}</button>
        <h2 className="text-lg font-bold text-gray-900">{isReservation?"Reservering":"Nieuwe bon"}</h2>
        <div className="w-16"/>
      </div>
      <div className="max-w-xl mx-auto px-5 pb-3 flex items-center gap-2">
        {resSteps.map((label, idx) => {const s=idx+1; return <div key={s} className="flex items-center gap-2 flex-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${loanStep>=s?isReservation?"bg-purple-600 text-white":"bg-blue-600 text-white":"bg-gray-200 text-gray-500"}`}>{s}</div>
          <span className={`text-xs font-medium ${loanStep>=s?"text-gray-900":"text-gray-400"}`}>{label}</span>
          {s<totalSteps&&<div className={`flex-1 h-0.5 rounded ${loanStep>s?isReservation?"bg-purple-600":"bg-blue-600":"bg-gray-200"}`}/>}
        </div>;})}
      </div>
    </div>

    <div className="max-w-xl mx-auto px-5 pt-4">
      <ConnectionBanner loading={materialsLoading} error={materialsError} onRetry={refreshMaterials} resource="Materialen"/>
    </div>

    {/* STEP 1: Periode eerst (voor zowel leen als reservering). Bij een
        directe leen is de ophaaldatum vast op vandaag; bij een reservering
        mag de gebruiker beide kiezen. */}
    {loanStep===1 && <div className="max-w-xl mx-auto px-5 py-6 space-y-5">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
        <h3 className="font-bold text-gray-900 text-lg">{"\ud83d\udcc5"} {isReservation ? "Wanneer heb je het materiaal nodig?" : "Wanneer breng je het terug?"}</h3>
        {isReservation ? <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ophaaldatum</label>
            <input type="date" className={`w-full px-4 py-3.5 rounded-xl border bg-gray-50 text-base focus:outline-none focus:ring-2 ${startDateInvalid ? "border-red-300 focus:ring-red-500" : "border-gray-200 focus:ring-purple-500"}`} value={startDate} onChange={e=>setStartDate(e.target.value)} min={today()}/>
            {startDateInvalid && <p className="mt-1.5 text-sm text-red-600">{WEEKEND_MSG_START}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Retourdatum</label>
            <input type="date" className={`w-full px-4 py-3.5 rounded-xl border bg-gray-50 text-base focus:outline-none focus:ring-2 ${endDateInvalid ? "border-red-300 focus:ring-red-500" : "border-gray-200 focus:ring-purple-500"}`} value={endDate} onChange={e=>setEndDate(e.target.value)} min={startDate||today()}/>
            {endDateInvalid && <p className="mt-1.5 text-sm text-red-600">{WEEKEND_MSG_END}</p>}
          </div>
        </> : <>
          <p className="text-sm text-gray-600">Ophaaldatum: <span className="font-medium text-gray-900">{fmtDate(startDate)}</span> (vandaag)</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Retourdatum</label>
            <input type="date" className={`w-full px-4 py-3.5 rounded-xl border bg-gray-50 text-base focus:outline-none focus:ring-2 ${endDateInvalid ? "border-red-300 focus:ring-red-500" : "border-gray-200 focus:ring-blue-500"}`} value={endDate} onChange={e=>setEndDate(e.target.value)} min={today()}/>
            {endDateInvalid && <p className="mt-1.5 text-sm text-red-600">{WEEKEND_MSG_END}</p>}
          </div>
        </>}
        {startDate && endDate && !startDateInvalid && !endDateInvalid && <p className={`text-sm rounded-xl px-4 py-3 ${isReservation ? "text-purple-700 bg-purple-50" : "text-blue-700 bg-blue-50"}`}>{"\ud83d\udcc6"} Periode: {fmtDate(startDate)} t/m {fmtDate(endDate)} ({Math.max(1,Math.round((new Date(endDate)-new Date(startDate))/(1000*60*60*24)))} dagen)</p>}
      </div>
      <button onClick={()=>setLoanStep(2)} disabled={!startDate||!endDate||startDateInvalid||endDateInvalid} className={`w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-40 shadow-lg ${isReservation ? "bg-purple-500 hover:bg-purple-600" : "bg-blue-600 hover:bg-blue-700"}`}>
        Bekijk beschikbaarheid {"\u2192"}
      </button>
    </div>}

    {/* ITEMS STEP */}
    {loanStep===itemStep && <div className="max-w-xl mx-auto px-5 py-6 space-y-4">
      <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${isReservation ? "bg-purple-50 text-purple-800" : "bg-blue-50 text-blue-800"}`}>
        {"\ud83d\udcc5"} {fmtDate(startDate)} t/m {fmtDate(endDate)} {"\u2014"} beschikbaarheid voor deze periode
      </div>

      {/* Scan to add */}
      <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
        <label className="block text-sm font-medium text-blue-800 mb-2">{"\ud83d\udcf3"} Scan materiaal of set om toe te voegen</label>
        <div className="flex gap-2">
          <input ref={loanScanRef} className="flex-1 px-4 py-3 rounded-xl border border-blue-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Scan barcode..." value={loanScanInput} onChange={e=>{const v=e.target.value;setLoanScanInput(v);loanScanValue.current=v;if(loanScanTimer.current)clearTimeout(loanScanTimer.current);if(v.trim().length>=3)loanScanTimer.current=setTimeout(()=>handleLoanScan(),150)}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(loanScanTimer.current)clearTimeout(loanScanTimer.current);handleLoanScan()}}} autoFocus autoComplete="off"/>
          <button onClick={handleLoanScan} className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">+</button>
        </div>
        {loanScanMsg && <div className={`mt-2 rounded-xl px-4 py-2.5 text-sm font-medium ${loanScanMsg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{loanScanMsg.text}</div>}
      </div>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200"/>
        <span className="text-xs text-gray-400">of zoek handmatig</span>
        <div className="flex-1 h-px bg-gray-200"/>
      </div>

      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Zoek materiaal of set..." value={q} onChange={e=>setQ(e.target.value)}/>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[["both","Beide"],["material","Materialen"],["set","Sets"]].map(([k,l]) => (
          <button key={k} onClick={()=>setKindFilter(k)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${kindFilter===k?(k==="set"?"bg-purple-600 text-white shadow-sm":k==="material"?"bg-blue-600 text-white shadow-sm":"bg-gray-700 text-white shadow-sm"):"text-gray-600 hover:text-gray-900"}`}>{l}</button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATS.map(c => <button key={c} onClick={()=>setCat(c)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${cat===c?"bg-blue-600 text-white shadow-sm":"bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>{c}</button>)}
      </div>

      <div className="space-y-3">
        {availableForPeriod.length===0 ? <div className="bg-white rounded-2xl p-10 text-center border border-gray-100"><p className="text-gray-400">{isReservation?"Niets beschikbaar in deze periode":"Niets gevonden"}</p></div>
        : availableForPeriod.map((i) => {
          const key = cartKey(i.kind, i.id);
          const av = getAvailForItem(i);
          const inC = cart.find((c) => c.key === key)?.qty || 0;
          const isSet = i.kind === "set";
          const expanded = isSet && expandedSets.has(i.id);
          const over = inC > av;
          return <div key={key} className={`bg-white rounded-2xl px-5 py-4 border-2 transition-all ${inC > 0 ? (isSet?"border-purple-400 shadow-md":"border-blue-400 shadow-md") : "border-gray-100 hover:border-gray-200"}`}>
            <div className="flex items-center gap-4">
              {i.photo ? <img src={i.photo} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt=""/> : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">{getIcon(i.category)}</div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-base">{i.name}</p>
                  {isSet && <button type="button" onClick={() => toggleSetExpanded(i.id)} className="text-purple-600 hover:text-purple-800 text-sm leading-none px-1" title={expanded ? "Verberg samenstelling" : "Toon samenstelling"} aria-label={expanded ? "Verberg samenstelling" : "Toon samenstelling"}>{expanded ? "\u2304" : "\u25b8"}</button>}
                  <KindBadge kind={i.kind}/>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{i.category || "\u2014"} {"\u00b7"} <span className="text-emerald-600 font-medium">{av} beschikbaar</span></p>
                {isSet && expanded && <p className="text-xs text-gray-600 mt-2 bg-purple-50 rounded-lg px-3 py-2 whitespace-pre-line">{i.composition?.trim() ? i.composition : "(geen samenstelling vastgelegd)"}</p>}
              </div>
              <div className="flex items-center gap-2">
                {inC > 0 && <button onClick={() => removeFromCart(key)} className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 font-bold text-lg hover:bg-gray-200 flex items-center justify-center">-</button>}
                {inC > 0 && <input
                  type="number"
                  min={0}
                  max={MAX_QTY}
                  value={inC}
                  onChange={(e) => setCartQty(i, e.target.value)}
                  className={`w-14 h-10 rounded-xl border text-lg font-bold text-center focus:outline-none focus:ring-2 ${over ? "border-red-300 text-red-600 focus:ring-red-500" : "border-gray-200 focus:ring-blue-500 " + (isSet?"text-purple-600":"text-blue-600")}`}
                />}
                <button onClick={() => addToCart(i)} disabled={inC >= MAX_QTY} className={`w-10 h-10 rounded-xl text-white font-bold text-lg disabled:opacity-30 flex items-center justify-center ${isSet?"bg-purple-600 hover:bg-purple-700":"bg-blue-600 hover:bg-blue-700"}`}>+</button>
              </div>
            </div>
            {over && <p className="mt-2 text-xs font-medium text-red-600">Max {av} beschikbaar in deze periode</p>}
          </div>;
        })}
      </div>
    </div>}

    {/* CONFIRM STEP */}
    {loanStep===confirmStep && <div className="max-w-xl mx-auto px-5 py-6 space-y-5">
      {confirmExtras}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 text-lg mb-4">{isReservation ? "\ud83d\udcc5 Reservering overzicht" : "\ud83d\uddd2 Bon overzicht"}</h3>
        <div className="space-y-3">
          {cart.map((c) => {
            const lookup = c.kind === "set" ? (sets || []) : eq;
            const item = lookup.find((e) => e.id === c.itemId);
            const av = item ? getAvailForItem({ ...item, kind: c.kind }) : 0;
            const isSet = c.kind === "set";
            const composition = isSet ? (item?.composition || "").trim() : "";
            const over = c.qty > av;
            const itemForCart = item ? { ...item, kind: c.kind } : null;
            return <div key={c.key} className={`rounded-xl px-4 py-3 ${isSet?"bg-purple-50":"bg-blue-50"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{c.itemName}</span>
                  <KindBadge kind={c.kind}/>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={()=>removeFromCart(c.key)} className="w-8 h-8 rounded-lg bg-white text-gray-600 font-bold text-sm hover:bg-gray-100 flex items-center justify-center border border-gray-200">-</button>
                  <input
                    type="number"
                    min={0}
                    max={MAX_QTY}
                    value={c.qty}
                    onChange={(e) => { if (itemForCart) setCartQty(itemForCart, e.target.value); }}
                    className={`w-12 h-8 rounded-lg border text-sm font-bold text-center focus:outline-none focus:ring-2 ${over ? "border-red-300 text-red-600 focus:ring-red-500" : "border-gray-200 focus:ring-blue-500 " + (isSet?"text-purple-700":"text-blue-700")}`}
                  />
                  <button onClick={()=>{if(itemForCart)addToCart(itemForCart)}} disabled={c.qty>=MAX_QTY} className="w-8 h-8 rounded-lg bg-white text-gray-600 font-bold text-sm hover:bg-gray-100 flex items-center justify-center border border-gray-200 disabled:opacity-30">+</button>
                  <button onClick={() => setCart((p) => p.filter((x) => x.key !== c.key))} className="text-red-400 hover:text-red-600 p-1 ml-1"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 5L5 13M5 5l8 8"/></svg></button>
                </div>
              </div>
              {over && <p className="mt-2 text-xs font-medium text-red-600">Max {av} beschikbaar in deze periode</p>}
              {isSet && <p className="text-xs text-purple-900/80 mt-2 bg-white/60 rounded-lg px-3 py-2 whitespace-pre-line">{composition || "(geen samenstelling vastgelegd)"}</p>}
            </div>;
          })}
        </div>
      </div>

      <div className={`rounded-2xl px-5 py-4 text-sm ${isReservation ? "bg-purple-50 text-purple-800" : "bg-blue-50 text-blue-800"}`}>
        <p className="font-semibold">{"\ud83d\udcc5"} {isReservation ? "Reserveringsperiode" : "Leenperiode"}</p>
        <p className="mt-1">Ophalen: {fmtDate(startDate)} {"\u2014"} Retour: {fmtDate(endDate)}</p>
      </div>

      {submitError && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-red-800">{submitError.message}</p>
        {submitError.conflicts && <ul className="mt-2 space-y-1 text-sm text-red-700">
          {submitError.conflicts.map((c, idx) => <li key={idx}>
            {"\u2022"} {c.material_name || c.set_name || "item"}: gevraagd {c.gevraagd}, beschikbaar {c.beschikbaar}
          </li>)}
        </ul>}
      </div>}

      {hasOverage && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 text-sm font-medium text-red-700">
        Pas de aantallen aan: minstens één item overschrijdt het beschikbare voor deze periode.
      </div>}

      <button onClick={submitBon} disabled={cart.length === 0 || !endDate || submitting || startDateInvalid || endDateInvalid || hasOverage} className={`w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-40 shadow-lg ${isReservation ? "bg-purple-500 hover:bg-purple-600" : "bg-amber-500 hover:bg-amber-600"}`}>
        {submitting ? "Bezig..." : (isReservation ? "\ud83d\udcc5 Reservering bevestigen" : "\ud83d\udce4 Bon aanmaken")} ({totalCartQty} items)
      </button>
    </div>}

    {/* Floating cart bar */}
    {loanStep===itemStep && <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl p-4 z-40">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        <div>
          {cart.length > 0 ? <p className="font-semibold text-gray-900">{totalCartQty} item{totalCartQty !== 1 ? "s" : ""} geselecteerd</p> : <p className="text-gray-400">Selecteer materiaal of set</p>}
          {cart.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{cart.map(c => `${c.qty}x ${c.itemName}`).join(", ")}</p>}
        </div>
        <button onClick={() => setLoanStep(confirmStep)} disabled={cart.length === 0} className={`px-6 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-30 shadow-sm ${isReservation ? "bg-purple-500 hover:bg-purple-600" : "bg-blue-600 hover:bg-blue-700"}`}>
          Ga verder {"\u2192"}
        </button>
      </div>
    </div>}
  </div>;
}
