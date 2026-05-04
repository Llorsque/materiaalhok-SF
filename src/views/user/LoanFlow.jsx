import { useState, useEffect, useRef } from "react";
import { CATS } from "../../data/defaults";
import { getIcon } from "../../utils/format";
import { fmtDate, today, isoNow } from "../../utils/date";
import { genBonNr } from "../../utils/bons";

export function LoanFlow({ eq, bons, setBons, addLog, user, isReservation, onCancel, onDone }) {
  const [cart, setCart] = useState([]);
  const [endDate, setEndDate] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [q, setQ] = useState(""); const [cat, setCat] = useState("Alle");
  const [loanStep, setLoanStep] = useState(1);
  const [loanScanInput, setLoanScanInput] = useState("");
  const [loanScanMsg, setLoanScanMsg] = useState(null);
  const loanScanRef = useRef(null);
  const loanScanTimer = useRef(null);
  const loanScanValue = useRef("");
  const totalCartQty = cart.reduce((s, c) => s + c.qty, 0);

  // Global key capture: redirect all keyboard input to scan field, prevent browser search
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

  const getAvailForItem = (item) => {
    let av = item.stock - (item.maintenance || 0);
    bons.forEach(b => { if (b.status === "active") b.items.forEach(bi => { if (bi.itemId === item.id) av -= (bi.qty - (bi.returned || 0)); }); });
    if (isReservation && startDate && endDate) {
      bons.forEach(b => { if (b.status === "reserved" && !(b.endDate < startDate || b.startDate > endDate)) b.items.forEach(bi => { if (bi.itemId === item.id) av -= bi.qty; }); });
    } else {
      bons.forEach(b => { if (b.status === "reserved") b.items.forEach(bi => { if (bi.itemId === item.id) av -= bi.qty; }); });
    }
    return Math.max(0, av);
  };

  const addToCart=(item)=>{const av=getAvailForItem(item);const inC=cart.find(c=>c.itemId===item.id)?.qty||0;if(inC>=av)return;if(cart.find(c=>c.itemId===item.id))setCart(p=>p.map(c=>c.itemId===item.id?{...c,qty:c.qty+1}:c));else setCart(p=>[...p,{itemId:item.id,itemName:item.name,barcode:item.barcode,unit:item.unit,qty:1,returned:0}])};
  const removeFromCart=(id)=>{setCart(p=>{const ex=p.find(c=>c.itemId===id);if(!ex)return p;if(ex.qty<=1)return p.filter(c=>c.itemId!==id);return p.map(c=>c.itemId===id?{...c,qty:c.qty-1}:c)})};

  const handleLoanScan = () => {
    const code = loanScanValue.current.trim();
    if (!code) return;
    let item = eq.find(i => i.barcode === code || i.barcode === code.toUpperCase());
    if (!item) { const numId = parseInt(code, 10); item = eq.find(i => i.id === numId); }
    if (!item) item = eq.find(i => i.name.toLowerCase().includes(code.toLowerCase()));
    if (item) {
      const av = getAvailForItem(item);
      const inC = cart.find(c => c.itemId === item.id)?.qty || 0;
      if (av > 0 && inC < av) {
        addToCart(item);
        setLoanScanMsg({ ok: true, text: `\u2705 ${item.name} toegevoegd (${inC + 1}x)` });
      } else {
        setLoanScanMsg({ ok: false, text: `\u26a0\ufe0f ${item.name} \u2014 niet meer beschikbaar` });
      }
    } else {
      setLoanScanMsg({ ok: false, text: "\u274c Niet gevonden" });
    }
    setLoanScanInput(""); loanScanValue.current = "";
    setTimeout(() => setLoanScanMsg(null), 2500);
  };

  const submitBon=()=>{
    if(cart.length===0||!endDate)return;
    const status = isReservation ? "reserved" : "active";
    const bon={id:Date.now(),number:genBonNr(),user:user.label,startDate,endDate,items:cart,status,createdAt:isoNow()};
    setBons(p=>[bon,...p]);
    const desc=cart.map(c=>`${c.qty}x ${c.itemName}`).join(", ");
    addLog(isReservation?"reservation":"loan",`${bon.number}: ${desc} ${isReservation?"gereserveerd":"uitgeleend"} door ${user.label} (${fmtDate(startDate)} - ${fmtDate(endDate)})`);
    onDone({action:isReservation?"reservation":"loan",text:`${bon.number} ${isReservation?"gereserveerd":"aangemaakt"}!`});
  };

  const resSteps = isReservation ? ["Periode","Materiaal","Bevestig"] : ["Materiaal","Bevestig"];
  const totalSteps = resSteps.length;
  const itemStep = isReservation ? 2 : 1;
  const confirmStep = isReservation ? 3 : 2;

  const availableForPeriod = eq.filter(i => {
    return getAvailForItem(i) > 0 && i.name.toLowerCase().includes(q.toLowerCase()) && (cat === "Alle" || i.category === cat);
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

    {/* RESERVATION STEP 1: Pick dates first */}
    {isReservation && loanStep===1 && <div className="max-w-xl mx-auto px-5 py-6 space-y-5">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
        <h3 className="font-bold text-gray-900 text-lg">{"\ud83d\udcc5"} Wanneer heb je het materiaal nodig?</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ophaaldatum</label>
          <input type="date" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-base focus:outline-none focus:ring-2 focus:ring-purple-500" value={startDate} onChange={e=>setStartDate(e.target.value)} min={today()}/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Retourdatum</label>
          <input type="date" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-base focus:outline-none focus:ring-2 focus:ring-purple-500" value={endDate} onChange={e=>setEndDate(e.target.value)} min={startDate||today()}/>
        </div>
        {startDate && endDate && <p className="text-sm text-purple-700 bg-purple-50 rounded-xl px-4 py-3">{"\ud83d\udcc6"} Periode: {fmtDate(startDate)} t/m {fmtDate(endDate)} ({Math.max(1,Math.round((new Date(endDate)-new Date(startDate))/(1000*60*60*24)))} dagen)</p>}
      </div>
      <button onClick={()=>setLoanStep(2)} disabled={!startDate||!endDate} className="w-full py-4 rounded-2xl bg-purple-500 text-white font-bold text-base hover:bg-purple-600 disabled:opacity-40 shadow-lg">
        Bekijk beschikbaarheid {"\u2192"}
      </button>
    </div>}

    {/* ITEMS STEP */}
    {loanStep===itemStep && <div className="max-w-xl mx-auto px-5 py-6 space-y-4">
      {isReservation && <div className="bg-purple-50 rounded-2xl px-4 py-3 text-sm text-purple-800 font-medium">
        {"\ud83d\udcc5"} {fmtDate(startDate)} t/m {fmtDate(endDate)} {"\u2014"} beschikbaarheid voor deze periode
      </div>}

      {/* Scan to add */}
      <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
        <label className="block text-sm font-medium text-blue-800 mb-2">{"\ud83d\udcf3"} Scan materiaal om toe te voegen</label>
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
        <input className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Zoek materiaal..." value={q} onChange={e=>setQ(e.target.value)}/>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATS.map(c => <button key={c} onClick={()=>setCat(c)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${cat===c?"bg-blue-600 text-white shadow-sm":"bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>{c}</button>)}
      </div>

      <div className="space-y-3">
        {availableForPeriod.length===0 ? <div className="bg-white rounded-2xl p-10 text-center border border-gray-100"><p className="text-gray-400">{isReservation?"Geen materiaal beschikbaar in deze periode":"Geen materiaal gevonden"}</p></div>
        : availableForPeriod.map(i => {
          const av = getAvailForItem(i);
          const inC = cart.find(c => c.itemId === i.id)?.qty || 0;
          return <div key={i.id} className={`bg-white rounded-2xl px-5 py-4 border-2 transition-all ${inC > 0 ? "border-blue-400 shadow-md" : "border-gray-100 hover:border-gray-200"}`}>
            <div className="flex items-center gap-4">
              {i.photo ? <img src={i.photo} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt=""/> : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">{getIcon(i.category)}</div>}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-base">{i.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{i.category} {"\u00b7"} <span className="text-emerald-600 font-medium">{av} beschikbaar</span></p>
              </div>
              <div className="flex items-center gap-2">
                {inC > 0 && <button onClick={() => removeFromCart(i.id)} className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 font-bold text-lg hover:bg-gray-200 flex items-center justify-center">-</button>}
                {inC > 0 && <span className="text-lg font-bold w-8 text-center text-blue-600">{inC}</span>}
                <button onClick={() => addToCart(i)} disabled={inC >= av} className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 disabled:opacity-30 flex items-center justify-center">+</button>
              </div>
            </div>
          </div>;
        })}
      </div>
    </div>}

    {/* CONFIRM STEP */}
    {loanStep===confirmStep && <div className="max-w-xl mx-auto px-5 py-6 space-y-5">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 text-lg mb-4">{isReservation ? "\ud83d\udcc5 Reservering overzicht" : "\ud83d\uddd2 Bon overzicht"}</h3>
        <div className="space-y-3">
          {cart.map(c => {const item=eq.find(e=>e.id===c.itemId);const av=item?getAvailForItem(item):0;return <div key={c.itemId} className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-900">{c.itemName}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={()=>removeFromCart(c.itemId)} className="w-8 h-8 rounded-lg bg-white text-gray-600 font-bold text-sm hover:bg-gray-100 flex items-center justify-center border border-gray-200">-</button>
              <span className="w-8 text-center text-blue-700 font-bold">{c.qty}</span>
              <button onClick={()=>{if(item)addToCart(item)}} disabled={c.qty>=av} className="w-8 h-8 rounded-lg bg-white text-gray-600 font-bold text-sm hover:bg-gray-100 flex items-center justify-center border border-gray-200 disabled:opacity-30">+</button>
              <button onClick={() => setCart(p => p.filter(x => x.itemId !== c.itemId))} className="text-red-400 hover:text-red-600 p-1 ml-1"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 5L5 13M5 5l8 8"/></svg></button>
            </div>
          </div>})}
        </div>
      </div>

      {!isReservation && <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 text-lg mb-4">Retourdatum</h3>
        <label className="block text-sm font-medium text-gray-700 mb-2">Wanneer breng je het terug? *</label>
        <input type="date" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" value={endDate} onChange={e => setEndDate(e.target.value)} min={today()}/>
      </div>}

      {isReservation && <div className="bg-purple-50 rounded-2xl px-5 py-4 text-sm text-purple-800">
        <p className="font-semibold">{"\ud83d\udcc5"} Reserveringsperiode</p>
        <p className="mt-1">Ophalen: {fmtDate(startDate)} {"\u2014"} Retour: {fmtDate(endDate)}</p>
      </div>}

      <button onClick={submitBon} disabled={cart.length === 0 || !endDate} className={`w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-40 shadow-lg ${isReservation ? "bg-purple-500 hover:bg-purple-600" : "bg-amber-500 hover:bg-amber-600"}`}>
        {isReservation ? "\ud83d\udcc5 Reservering bevestigen" : "\ud83d\udce4 Bon aanmaken"} ({totalCartQty} items)
      </button>
    </div>}

    {/* Floating cart bar */}
    {loanStep===itemStep && <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl p-4 z-40">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        <div>
          {cart.length > 0 ? <p className="font-semibold text-gray-900">{totalCartQty} item{totalCartQty !== 1 ? "s" : ""} geselecteerd</p> : <p className="text-gray-400">Selecteer materiaal</p>}
          {cart.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{cart.map(c => `${c.qty}x ${c.itemName}`).join(", ")}</p>}
        </div>
        <button onClick={() => setLoanStep(confirmStep)} disabled={cart.length === 0} className={`px-6 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-30 shadow-sm ${isReservation ? "bg-purple-500 hover:bg-purple-600" : "bg-blue-600 hover:bg-blue-700"}`}>
          Ga verder {"\u2192"}
        </button>
      </div>
    </div>}
  </div>;
}
