import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { materials as INIT } from "./data/materials";
import { CATS, DEFAULT_USERS, DEFAULT_BRANDING } from "./data/defaults";
import { store } from "./utils/storage";
import { fmt, getIcon, readFile } from "./utils/format";
import { fmtDate, fmtDT, today, isoNow } from "./utils/date";
import { encodeCode128B, genItemBarcode, nextBarcode, syncBarcodeCounter } from "./utils/barcode";
import { loanedQty, reservedQty, unavailableQty, availQty, bonIsOverdue, bonRemaining, bonComplete, genBonNr, genLoginCode } from "./utils/bons";

function ImageUpload({ value, onChange, label, className }) {
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

function ItemPhoto({ photo, size }) {
  const s = size === "sm" ? "w-9 h-9" : size === "lg" ? "w-16 h-16" : "w-12 h-12";
  if (photo) return <img src={photo} className={`${s} rounded-xl object-cover`} alt=""/>;
  return null;
}

function BarcodeSVG({ code, name, small }) {
  if (!code) return null;
  const modules = encodeCode128B(code);
  if (!modules) return null;
  const moduleW = small ? 1.5 : 2.2;
  const qz = 15;
  const w = modules.length * moduleW + qz * 2;
  const h = small ? 45 : 70;
  const rects = [];
  let x = qz;
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === '1') rects.push(<rect key={i} x={x} y={4} width={moduleW} height={h} fill="black"/>);
    x += moduleW;
  }
  return (
    <svg viewBox={`0 0 ${w} ${h + (small ? 20 : 32)}`} width={w} height={h + (small ? 20 : 32)} style={{background:"white"}}>
      <rect width={w} height={h + (small ? 20 : 32)} fill="white"/>
      {rects}
      <text x={w/2} y={h + (small ? 15 : 20)} textAnchor="middle" fontSize={small ? 11 : 14} fontFamily="monospace" fontWeight="bold">{code}</text>
      {!small && name && <text x={w/2} y={h + 31} textAnchor="middle" fontSize={9} fontFamily="sans-serif" fill="#666">{name.length > 35 ? name.slice(0,32) + "..." : name}</text>}
    </svg>
  );
}

// --- UI ---
function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
    <div className="absolute inset-0 bg-black/40"/>
    <div className={`relative bg-white rounded-2xl shadow-2xl ${wide?"max-w-3xl":"max-w-lg"} w-full mx-4 max-h-[90vh] overflow-y-auto`} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 5L5 15M5 5l10 10"/></svg></button>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  </div>;
}
function Stat({ label, value, color, icon }) {
  return <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p><p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p></div><div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg">{icon}</div></div></div>;
}

function BonBadge({ bon }) {
  if (bon.status === "completed") return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Compleet</span>;
  if (bon.status === "reserved") return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">{"\ud83d\udcc5"} Gereserveerd</span>;
  if (bonIsOverdue(bon)) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">{"\u26a0\ufe0f"} Te laat</span>;
  const total = bon.items.reduce((s,i)=>s+i.qty,0), ret = bon.items.reduce((s,i)=>s+(i.returned||0),0);
  if (ret > 0) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Deels retour ({ret}/{total})</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Actief</span>;
}

function BonCard({ bon, onClick, showUser }) {
  const rem = bonRemaining(bon); const overdue = bonIsOverdue(bon);
  return <div onClick={onClick} className={`bg-white rounded-2xl px-5 py-4 shadow-sm border cursor-pointer hover:shadow-md ${overdue&&bon.status!=="completed"?"border-red-200":"border-gray-100 hover:border-gray-200"}`}>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2"><span className="font-mono text-sm font-bold text-blue-600">{bon.number}</span><BonBadge bon={bon}/></div>
        <p className="text-xs text-gray-500 mt-1">{showUser&&<><span className="font-medium">{bon.user}</span> {"\u00b7"} </>}{fmtDate(bon.startDate)} {"\u2192"} {fmtDate(bon.endDate)}{bon.status!=="completed"&&<> {"\u00b7"} {rem.length} open</>}</p>
      </div>
      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
    </div>
  </div>;
}

function AppHeader({ branding, role, onLogout, children, onAdd, user, onProfileClick }) {
  return <div className="bg-white border-b border-gray-100 shadow-sm">
    <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {branding.logo ? <img src={branding.logo} className="rounded-xl object-contain" style={{width:branding.logoSize||40,height:branding.logoSize||40}} alt=""/> : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg" style={{backgroundColor:branding.color}}>{"\ud83c\udfc5"}</div>}
        <div><h1 className="text-xl font-bold text-gray-900">{branding.title}</h1><p className="text-xs text-gray-500">{role === "admin" ? "Beheerder" : branding.subtitle}</p></div>
      </div>
      <div className="flex items-center gap-2">
        {onAdd && <button onClick={onAdd} className="px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90" style={{backgroundColor:branding.color}}>+ Nieuw</button>}
        {user && <button onClick={onProfileClick} className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold hover:opacity-90 transition-opacity" style={{backgroundColor:branding.color}} title={user.label}>{user.label.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}</button>}
        {!user && <button onClick={onLogout} className="px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100">Uitloggen</button>}
      </div>
    </div>
    {children}
  </div>;
}

// ============ LOGIN ============
function LoginScreen({ onLogin, branding, users }) {
  const [mode, setMode] = useState("scan");
  const [user, setUser] = useState(""); const [pass, setPass] = useState(""); const [error, setError] = useState("");
  const [scanBuffer, setScanBuffer] = useState("");
  const [welcome, setWelcome] = useState(null);
  const scanInputRef = useRef(null);
  const scanTimerRef = useRef(null);
  const go = () => { const f = users.find(u=>u.username===user&&u.password===pass); if(f) { setWelcome(f); setTimeout(()=>onLogin(f), 3000); } else setError("Onjuiste inloggegevens"); };

  const tryScanLogin = (val) => {
    const code = val.trim();
    if (!code || code.length < 3) return;
    const found = users.find(u => u.loginCode === code || u.loginCode === code.toUpperCase() || u.loginCode === code.replace(/^0+/, ''));
    if (found) {
      setWelcome(found);
      setTimeout(() => onLogin(found), 3000);
    } else {
      setError("Badge niet herkend");
      setScanBuffer("");
    }
  };

  const handleScanChange = (val) => {
    setScanBuffer(val);
    // Clear any pending timer
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    // Auto-submit 150ms after last character (scanner sends chars fast, then stops)
    if (val.trim().length >= 3) {
      scanTimerRef.current = setTimeout(() => tryScanLogin(val), 150);
    }
  };

  const handleScanKeyDown = (e) => {
    // If Enter comes (some scanners send it), submit immediately
    if (e.key === "Enter") {
      e.preventDefault();
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      tryScanLogin(scanBuffer);
    }
    // Block browser shortcuts
    if (e.key === "F3" || (e.ctrlKey && e.key === "f") || (e.ctrlKey && e.key === "g")) {
      e.preventDefault();
    }
  };

  // Aggressive focus: capture ALL keystrokes and redirect to scan input
  useEffect(() => {
    if (mode !== "scan" || welcome) return;
    const handler = (e) => {
      // Block browser search/address bar shortcuts
      if (e.key === "F3" || e.key === "F5" || e.key === "F6" ||
          (e.ctrlKey && (e.key === "f" || e.key === "g" || e.key === "l" || e.key === "d")) ||
          e.key === "/" || (e.altKey && e.key === "d")) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Force focus to scan input
      if (scanInputRef.current && document.activeElement !== scanInputRef.current) {
        scanInputRef.current.focus();
        // If it's a printable character, don't lose it
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          setScanBuffer(prev => prev + e.key);
          // Trigger auto-submit timer
          if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
          scanTimerRef.current = setTimeout(() => {
            setScanBuffer(cur => { tryScanLogin(cur); return cur; });
          }, 150);
        }
      }
    };
    window.addEventListener("keydown", handler, true);
    // Also block focus leaving via click
    const clickHandler = () => {
      setTimeout(() => {
        if (scanInputRef.current && document.activeElement !== scanInputRef.current) scanInputRef.current.focus();
      }, 10);
    };
    window.addEventListener("click", clickHandler, true);
    // Initial focus
    if (scanInputRef.current) scanInputRef.current.focus();
    const interval = setInterval(() => { if (scanInputRef.current) scanInputRef.current.focus(); }, 300);
    return () => { window.removeEventListener("keydown", handler, true); window.removeEventListener("click", clickHandler, true); clearInterval(interval); };
  }, [mode, welcome, users]);

  // Welcome screen
  if (welcome) return <div className="min-h-screen flex items-center justify-center p-4" style={{background: `linear-gradient(135deg, ${branding.color}20, #f8fafc, ${branding.color}15)`}}>
    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-10 text-center">
      <div className="text-6xl mb-4">{"\ud83d\udc4b"}</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Welkom</h1>
      <p className="text-xl font-semibold" style={{color:branding.color}}>{welcome.label}</p>
      <p className="text-sm text-gray-400 mt-4">Even geduld...</p>
      <div className="mt-6 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full animate-pulse" style={{backgroundColor:branding.color, width:"100%", animation:"shrink 3s linear forwards"}}/>
      </div>
      <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  </div>;

  return <div className="min-h-screen flex items-center justify-center p-4" style={{background: branding.loginBg ? `url(${branding.loginBg}) center/cover` : `linear-gradient(135deg, ${branding.color}15, #f8fafc, ${branding.color}10)`}}>
    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
      <div className="text-center mb-6">
        {branding.logo ? <img src={branding.logo} className="rounded-2xl object-contain mx-auto mb-4" style={{width:branding.loginLogoSize||64,height:branding.loginLogoSize||64}} alt=""/> : <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4" style={{backgroundColor:branding.color}}>{"\ud83c\udfc5"}</div>}
        <h1 className="text-2xl font-bold text-gray-900">{branding.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{branding.subtitle}</p>
      </div>

      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button onClick={()=>{setMode("scan");setError("");setScanBuffer("")}} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode==="scan"?"bg-white shadow-sm text-gray-900":"text-gray-500"}`}>{"\ud83d\udcf7"} Scan badge</button>
        <button onClick={()=>{setMode("manual");setError("")}} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode==="manual"?"bg-white shadow-sm text-gray-900":"text-gray-500"}`}>{"\ud83d\udd11"} Inloggen</button>
      </div>

      {error&&<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">{error}</div>}

      {mode === "scan" ? (
        <div className="space-y-4 text-center">
          <div className="py-6">
            <div className="text-5xl mb-3">{"\ud83d\udcf3"}</div>
            <p className="text-gray-700 font-medium">Scan je persoonlijke badge</p>
            <p className="text-gray-400 text-sm mt-1">Richt de scanner op je barcode</p>
          </div>
          <input
            ref={scanInputRef}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Wacht op scan..."
            value={scanBuffer}
            onChange={e => handleScanChange(e.target.value)}
            onKeyDown={handleScanKeyDown}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Gebruikersnaam</label><input className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={user} onChange={e=>{setUser(e.target.value);setError("")}} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Wachtwoord</label><input type="password" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={pass} onChange={e=>{setPass(e.target.value);setError("")}} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
          <button onClick={go} className="w-full py-3 rounded-xl text-white font-semibold hover:opacity-90" style={{backgroundColor:branding.color}}>Inloggen</button>
        </div>
      )}
    </div>
  </div>;
}

// ============ ADMIN FORM ============
function AdminForm({ item, onSave, onCancel }) {
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

// ============ ADMIN ============
function AdminView({ eq, setEq, bons, setBons, logs, addLog, branding, setBranding, users, setUsers, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [q, setQ] = useState(""); const [cat, setCat] = useState("Alle");
  const [addOpen, setAddOpen] = useState(false); const [edit, setEdit] = useState(null);
  const [detail, setDetail] = useState(null); const [bonDetail, setBonDetail] = useState(null);
  const [printItems, setPrintItems] = useState([]);
  const [logFilter, setLogFilter] = useState(""); const [bonFilter, setBonFilter] = useState("active");
  const [newUser, setNewUser] = useState({username:"",password:"",label:"",role:"user",email:""});
  const [editUser, setEditUser] = useState(null);
  const [adminScan, setAdminScan] = useState("");
  const [adminScanMsg, setAdminScanMsg] = useState(null);
  const adminScanRef = useRef(null);

  const totalStock = useMemo(()=>eq.reduce((s,e)=>s+e.stock,0),[eq]);
  const totalUnavail = useMemo(()=>eq.reduce((s,e)=>s+unavailableQty(bons,e.id)+(e.maintenance||0),0),[eq,bons]);
  const totalValue = useMemo(()=>eq.reduce((s,e)=>s+(e.pricePerUnit||0)*e.stock,0),[eq]);
  const activeBons = bons.filter(b=>b.status!=="completed");
  const overdueBons = activeBons.filter(bonIsOverdue);
  const reservedBons = bons.filter(b=>b.status==="reserved");
  const filtBons = bonFilter==="active"?bons.filter(b=>b.status==="active"):bonFilter==="reserved"?reservedBons:bonFilter==="overdue"?overdueBons:bonFilter==="completed"?bons.filter(b=>b.status==="completed"):bons;

  const oneYearAgo = useMemo(()=>{const d=new Date();d.setFullYear(d.getFullYear()-1);return d.toISOString();},[]);
  const recentLogs = useMemo(()=>logs.filter(l=>l.date>=oneYearAgo),[logs,oneYearAgo]);
  const filtLogs = logFilter?recentLogs.filter(l=>l.detail.toLowerCase().includes(logFilter.toLowerCase())):recentLogs;
  const filt = eq.filter(i=>i.name.toLowerCase().includes(q.toLowerCase())&&(cat==="Alle"||i.category===cat));

  const add=(i)=>{setEq(p=>[...p,{...i,id:Date.now(),barcode:nextBarcode(),maintenance:i.maintenance||0}]);addLog("edit",`${i.name} toegevoegd`);setAddOpen(false)};
  const save=(i)=>{setEq(p=>p.map(e=>e.id===edit.id?{...e,...i}:e));addLog("edit",`${i.name} bewerkt`);setEdit(null)};
  const del=(id)=>{const it=eq.find(e=>e.id===id);if(!confirm(`"${it?.name}" verwijderen?`))return;setEq(p=>p.filter(e=>e.id!==id));addLog("edit",`${it.name} verwijderd`);setDetail(null)};
  const forceComplete=(bonId)=>{setBons(p=>p.map(b=>b.id===bonId?{...b,status:"completed",completedDate:isoNow(),items:b.items.map(i=>({...i,returned:i.qty}))}:b));const bon=bons.find(b=>b.id===bonId);if(bon)addLog("return",`${bon.number} geforceerd afgerond`);setBonDetail(null)};

  const handlePrint=(items)=>{const pw=window.open('','_blank');const svgs=items.map(i=>{
    const bc=i.barcode||"NOCODE";const modules=encodeCode128B(bc);const mw=2.5;const bw=modules.length*mw+40;const bh=90;
    const rects=[];let x=20;
    for(let j=0;j<modules.length;j++){if(modules[j]==='1')rects.push(`<rect x="${x}" y="10" width="${mw}" height="${bh}" fill="black"/>`);x+=mw;}
    return`<div style="display:inline-block;margin:12px;padding:15px;border:1px solid #ccc;text-align:center;break-inside:avoid"><svg viewBox="0 0 ${bw} ${bh+40}" width="${bw}" height="${bh+40}" style="background:white"><rect width="${bw}" height="${bh+40}" fill="white"/>${rects.join('')}<text x="${bw/2}" y="${bh+24}" text-anchor="middle" font-size="16" font-family="monospace" font-weight="bold">${bc}</text><text x="${bw/2}" y="${bh+36}" text-anchor="middle" font-size="10" font-family="sans-serif" fill="#666">${i.name.length>35?i.name.slice(0,35)+'...':i.name}</text></svg></div>`;
    }).join('');pw.document.write(`<html><head><title>Barcodes</title><style>body{font-family:sans-serif}@media print{body{margin:0}}</style></head><body>${svgs}<script>setTimeout(()=>window.print(),500)<\/script></body></html>`)};

  const getItemStats=(itemId)=>{const year=bons.filter(b=>b.startDate>=oneYearAgo);let count=0;const borrowers={};year.forEach(b=>b.items.forEach(bi=>{if(bi.itemId===itemId){count+=bi.qty;borrowers[b.user]=(borrowers[b.user]||0)+bi.qty}}));return{count,borrowers}};

  const handleAdminScan = () => {
    const code = adminScan.trim();
    if (!code) return;
    const numId = parseInt(code, 10);
    let item = eq.find(i => i.barcode === code || i.barcode === code.toUpperCase());
    if (!item) { const numId = parseInt(code, 10); item = eq.find(i => i.id === numId); }
    if (!item) item = eq.find(i => i.name.toLowerCase().includes(code.toLowerCase()));
    if (item) {
      setDetail(item);
      setAdminScanMsg(null);
    } else {
      setAdminScanMsg({ ok: false, text: "\u274c Artikel niet gevonden" });
      setTimeout(() => setAdminScanMsg(null), 2500);
    }
    setAdminScan("");
  };

  // Keep focus on admin scan field when items tab is active
  useEffect(() => {
    if (tab !== "items" || !adminScanRef.current) return;
    const handler = (e) => {
      if (e.key === "F3" || (e.ctrlKey && e.key === "f") || e.key === "/") e.preventDefault();
      if (adminScanRef.current && adminScanRef.current.offsetParent !== null &&
          document.activeElement !== adminScanRef.current &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "SELECT" &&
          document.activeElement?.tagName !== "TEXTAREA") {
        adminScanRef.current.focus();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [tab]);

  const tabs=[["dashboard","Dashboard"],["bons","Bonnen"],["items","Materiaal"],["insights","Inzichten"],["log","Logboek"],["barcodes","Barcodes"],["users","Gebruikers"],["settings","Instellingen"]];

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
    <AppHeader branding={branding} role="admin" onLogout={onLogout} onAdd={()=>setAddOpen(true)}>
      <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
        {tabs.map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${tab===k?"border-blue-600 text-blue-600":"border-transparent text-gray-500 hover:text-gray-700"}`}>{l}{k==="bons"&&activeBons.length>0?` (${activeBons.length})`:""}</button>)}
      </div>
    </AppHeader>

    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* DASHBOARD */}
      {tab==="dashboard"&&<div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Voorraad" value={totalStock} color="text-gray-700" icon={"\ud83d\udce6"}/>
          <Stat label="Beschikbaar" value={totalStock-totalUnavail} color="text-emerald-600" icon={"\u2705"}/>
          <Stat label="Actieve bonnen" value={bons.filter(b=>b.status==="active").length} color="text-amber-600" icon={"\ud83d\udce4"}/>
          <Stat label="Reserveringen" value={reservedBons.length} color="text-purple-600" icon={"\ud83d\udcc5"}/>
          <Stat label="Waarde" value={fmt(totalValue)} color="text-gray-600" icon={"\ud83d\udcb0"}/>
        </div>
        {overdueBons.length>0&&<div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4"><div className="flex items-start gap-3"><span className="text-lg">{"\u26a0\ufe0f"}</span><div><p className="font-semibold text-red-800 text-sm">Verlopen bonnen ({overdueBons.length})</p>{overdueBons.map(b=><p key={b.id} className="text-xs text-red-700 mt-1 cursor-pointer hover:underline" onClick={()=>setBonDetail(b)}><span className="font-mono font-bold">{b.number}</span> {"\u2014"} {b.user} {"\u2014"} {fmtDate(b.endDate)}</p>)}</div></div></div>}
        {activeBons.length>0&&<div><h3 className="text-sm font-bold text-gray-700 mb-3">Actieve bonnen</h3><div className="space-y-2">{activeBons.slice(0,10).map(b=><BonCard key={b.id} bon={b} onClick={()=>setBonDetail(b)} showUser/>)}</div></div>}
        <div><h3 className="text-sm font-bold text-gray-700 mb-3">Recente activiteit</h3>{recentLogs.length===0?<p className="text-sm text-gray-400">Geen activiteit</p>:<div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">{recentLogs.slice(0,8).map(l=><div key={l.id} className="px-4 py-3 text-sm"><span className="text-xs text-gray-400">{fmtDT(l.date)}</span><p className="text-gray-700 mt-0.5">{l.detail}</p></div>)}</div>}</div>
      </div>}

      {/* BONNEN */}
      {tab==="bons"&&<div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto">{[["active","Actief"],["reserved","Gereserveerd"],["overdue","Te laat"],["completed","Afgerond"],["all","Alle"]].map(([k,l])=><button key={k} onClick={()=>setBonFilter(k)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${bonFilter===k?"bg-blue-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{l}</button>)}</div>
        {filtBons.length===0?<div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100"><p className="text-gray-500 text-sm">Geen bonnen</p></div>:<div className="space-y-2">{filtBons.map(b=><BonCard key={b.id} bon={b} onClick={()=>setBonDetail(b)} showUser/>)}</div>}
      </div>}

      {/* MATERIAAL */}
      {tab==="items"&&<div className="space-y-4">
        {/* Scan bar */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400">{"\ud83d\udcf3"}</span>
              <input ref={adminScanRef} className="w-full pl-11 pr-4 py-3 rounded-xl border border-blue-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Scan barcode om artikel te openen..." value={adminScan} onChange={e=>setAdminScan(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAdminScan()} autoFocus/>
            </div>
            <button onClick={handleAdminScan} className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">Zoek</button>
          </div>
          {adminScanMsg && <div className={`mt-2 rounded-xl px-4 py-2.5 text-sm font-medium ${adminScanMsg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{adminScanMsg.text}</div>}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Filter op naam..." value={q} onChange={e=>setQ(e.target.value)}/></div>
          <div className="flex gap-1.5 overflow-x-auto">{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${cat===c?"bg-blue-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{c}</button>)}</div>
        </div></div>
        <div className="space-y-2">{filt.map(i=>{const av=availQty(i,bons);const lo=loanedQty(bons,i.id);const res=bons.filter(b=>b.status==="reserved").reduce((s,b)=>{let t=0;b.items.forEach(bi=>{if(bi.itemId===i.id)t+=bi.qty});return s+t},0);
          return <div key={i.id} onClick={()=>setDetail(i)} className="bg-white rounded-2xl px-5 py-3.5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {i.photo?<img src={i.photo} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" alt=""/>:<div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-base flex-shrink-0">{getIcon(i.category)}</div>}
                <div className="min-w-0"><p className="font-semibold text-gray-900 text-sm truncate">{i.name}</p><p className="text-xs text-gray-500 mt-0.5">{i.stock} {i.unit} {"\u00b7"} {i.category}</p></div>
              </div>
              <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{av}</span>
                {lo>0&&<span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{lo} uit</span>}
                {res>0&&<span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{res} res</span>}
              </div>
            </div>
          </div>})}</div>
      </div>}

      {/* INZICHTEN */}
      {tab==="insights"&&(()=>{
        // Compute usage stats from bons
        const itemUsage = {};
        eq.forEach(i => { itemUsage[i.id] = { name: i.name, category: i.category, stock: i.stock, unit: i.unit, totalLoaned: 0, bonCount: 0, borrowers: {}, months: {} }; });
        const yearBons = bons.filter(b => b.startDate >= oneYearAgo);
        yearBons.forEach(b => {
          const month = b.startDate?.slice(0, 7) || "";
          b.items.forEach(bi => {
            if (itemUsage[bi.itemId]) {
              const u = itemUsage[bi.itemId];
              u.totalLoaned += bi.qty;
              u.bonCount += 1;
              u.borrowers[b.user] = (u.borrowers[b.user] || 0) + bi.qty;
              if (month) u.months[month] = (u.months[month] || 0) + bi.qty;
            }
          });
        });

        const allItems = Object.values(itemUsage);
        const mostUsed = [...allItems].sort((a, b) => b.totalLoaned - a.totalLoaned);
        const leastUsed = [...allItems].filter(i => i.stock > 0).sort((a, b) => a.totalLoaned - b.totalLoaned);
        const neverUsed = allItems.filter(i => i.totalLoaned === 0);

        // Category stats
        const catStats = {};
        allItems.forEach(i => {
          if (!catStats[i.category]) catStats[i.category] = { items: 0, totalLoaned: 0, bonCount: 0 };
          catStats[i.category].items += 1;
          catStats[i.category].totalLoaned += i.totalLoaned;
          catStats[i.category].bonCount += i.bonCount;
        });

        // Monthly totals
        const monthTotals = {};
        yearBons.forEach(b => {
          const m = b.startDate?.slice(0, 7) || "";
          if (m) { monthTotals[m] = (monthTotals[m] || 0) + 1; }
        });
        const months = Object.entries(monthTotals).sort((a, b) => a[0].localeCompare(b[0]));
        const maxMonth = Math.max(1, ...months.map(m => m[1]));

        // User stats
        const userStats = {};
        yearBons.forEach(b => {
          if (!userStats[b.user]) userStats[b.user] = { bons: 0, items: 0 };
          userStats[b.user].bons += 1;
          userStats[b.user].items += b.items.reduce((s, i) => s + i.qty, 0);
        });

        const barW = (v, max) => `${Math.max(2, (v / Math.max(1, max)) * 100)}%`;

        return <div className="space-y-8">
          <h3 className="text-lg font-bold text-gray-900">Inzichten (afgelopen jaar)</h3>

          {/* Overview stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Bonnen" value={yearBons.length} color="text-blue-600" icon={"\ud83d\udcdd"}/>
            <Stat label="Items uitgeleend" value={allItems.reduce((s, i) => s + i.totalLoaned, 0)} color="text-amber-600" icon={"\ud83d\udce4"}/>
            <Stat label="Unieke items" value={allItems.filter(i => i.totalLoaned > 0).length} color="text-emerald-600" icon={"\ud83d\udce6"}/>
            <Stat label="Nooit gebruikt" value={neverUsed.length} color="text-gray-500" icon={"\ud83d\udca4"}/>
          </div>

          {/* Monthly chart */}
          {months.length > 0 && <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h4 className="font-semibold text-gray-800 mb-4">{"\ud83d\udcc8"} Uitleningen per maand</h4>
            <div className="space-y-2">
              {months.map(([m, count]) => <div key={m} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 flex-shrink-0">{new Date(m + "-01").toLocaleDateString("nl-NL", { month: "short", year: "2-digit" })}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-2 transition-all" style={{ width: barW(count, maxMonth) }}>
                    <span className="text-xs text-white font-bold">{count}</span>
                  </div>
                </div>
              </div>)}
            </div>
          </div>}

          {/* Category breakdown */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h4 className="font-semibold text-gray-800 mb-4">{"\ud83d\udcca"} Gebruik per categorie</h4>
            <div className="space-y-3">
              {Object.entries(catStats).sort((a, b) => b[1].totalLoaned - a[1].totalLoaned).map(([cat, s]) => {
                const maxCat = Math.max(1, ...Object.values(catStats).map(c => c.totalLoaned));
                return <div key={cat} className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">{getIcon(cat)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{cat}</span>
                      <span className="text-xs text-gray-500">{s.totalLoaned} stuks in {s.bonCount} bonnen</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: barW(s.totalLoaned, maxCat) }}/>
                    </div>
                  </div>
                </div>;
              })}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Most used */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-800 mb-4">{"\ud83d\udd25"} Meest uitgeleend</h4>
              <div className="space-y-3">
                {mostUsed.filter(i => i.totalLoaned > 0).slice(0, 15).map((i, idx) => <div key={i.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 3 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{i.name}</p>
                    <p className="text-xs text-gray-500">{i.category}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{i.totalLoaned}x</p>
                    <p className="text-xs text-gray-400">{i.bonCount} bonnen</p>
                  </div>
                </div>)}
              </div>
            </div>

            {/* Least used */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-800 mb-4">{"\ud83d\udca4"} Minst uitgeleend</h4>
              {neverUsed.length > 0 && <div className="mb-4 bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Nooit gebruikt ({neverUsed.length})</p>
                <div className="flex flex-wrap gap-1">
                  {neverUsed.slice(0, 20).map(i => <span key={i.name} className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">{i.name}</span>)}
                  {neverUsed.length > 20 && <span className="px-2 py-0.5 text-gray-400 text-xs">+{neverUsed.length - 20} meer</span>}
                </div>
              </div>}
              <div className="space-y-3">
                {leastUsed.filter(i => i.totalLoaned > 0).slice(0, 10).map((i, idx) => <div key={i.name} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{i.name}</p>
                    <p className="text-xs text-gray-500">{i.category} {"\u00b7"} {i.stock} op voorraad</p>
                  </div>
                  <span className="text-sm text-gray-400 font-medium">{i.totalLoaned}x</span>
                </div>)}
              </div>
            </div>
          </div>

          {/* User stats */}
          {Object.keys(userStats).length > 0 && <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h4 className="font-semibold text-gray-800 mb-4">{"\ud83d\udc65"} Gebruik per gebruiker</h4>
            <div className="space-y-3">
              {Object.entries(userStats).sort((a, b) => b[1].items - a[1].items).map(([user, s]) => {
                const maxUser = Math.max(1, ...Object.values(userStats).map(u => u.items));
                return <div key={user} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900 w-32 flex-shrink-0 truncate">{user}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div className="h-full bg-purple-400 rounded-full flex items-center justify-end pr-2 transition-all" style={{ width: barW(s.items, maxUser) }}>
                      {s.items > 0 && <span className="text-xs text-white font-bold">{s.items}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 w-16 text-right">{s.bons} bonnen</span>
                </div>;
              })}
            </div>
          </div>}

          {/* Usage rate */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h4 className="font-semibold text-gray-800 mb-2">{"\ud83d\udcca"} Gebruikspercentage</h4>
            <p className="text-xs text-gray-500 mb-4">Hoeveel van de voorraad is het afgelopen jaar minstens 1x uitgeleend</p>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray={`${((allItems.filter(i=>i.totalLoaned>0).length/Math.max(1,allItems.length))*100).toFixed(0)} 100`} strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{((allItems.filter(i=>i.totalLoaned>0).length/Math.max(1,allItems.length))*100).toFixed(0)}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-700"><span className="font-semibold text-emerald-600">{allItems.filter(i=>i.totalLoaned>0).length}</span> van de <span className="font-semibold">{allItems.length}</span> items is minstens 1x gebruikt</p>
                <p className="text-sm text-gray-500 mt-1"><span className="font-semibold text-gray-400">{neverUsed.length}</span> items zijn nog nooit uitgeleend</p>
              </div>
            </div>
          </div>
        </div>;
      })()}

      {/* LOG */}
      {tab==="log"&&<div className="space-y-4">
        <div className="relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Zoek..." value={logFilter} onChange={e=>setLogFilter(e.target.value)}/></div>
        {filtLogs.length===0?<p className="text-gray-400 text-center py-8 text-sm">Geen regels</p>:<div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">{filtLogs.slice(0,200).map(l=><div key={l.id} className="px-4 py-3 text-sm"><span className="text-xs text-gray-400">{fmtDT(l.date)}</span><p className="text-gray-700 mt-0.5">{l.detail}</p></div>)}</div>}
      </div>}

      {/* BARCODES */}
      {tab==="barcodes"&&<div className="space-y-4">
        <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Barcodes</h3><div className="flex gap-2">
          <button onClick={()=>setPrintItems(eq)} className="px-3 py-2 rounded-xl bg-gray-100 text-xs font-medium hover:bg-gray-200">Alles</button>
          <button onClick={()=>setPrintItems([])} className="px-3 py-2 rounded-xl bg-gray-100 text-xs font-medium hover:bg-gray-200">Niets</button>
          {printItems.length>0&&<button onClick={()=>handlePrint(printItems)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">Print ({printItems.length})</button>}
        </div></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{eq.map(i=>{const sel=printItems.some(p=>p.id===i.id);return <div key={i.id} onClick={()=>setPrintItems(p=>sel?p.filter(x=>x.id!==i.id):[...p,i])} className={`bg-white rounded-xl p-3 border-2 cursor-pointer ${sel?"border-blue-500 shadow-md":"border-gray-100 hover:border-gray-200"}`}><div className="flex justify-center mb-2"><BarcodeSVG code={i.barcode||""} name={i.name} small/></div><p className="text-xs font-medium text-gray-900 text-center truncate">{i.name}</p></div>})}</div>
      </div>}

      {/* GEBRUIKERS */}
      {tab==="users"&&(()=>{
        const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
        const lc = "block text-sm font-medium text-gray-700 mb-1.5";

        const addUser = () => {
          if(!newUser.username.trim()||!newUser.password.trim()||!newUser.label.trim()) return;
          if(users.some(u=>u.username===newUser.username.trim())) { alert("Gebruikersnaam bestaat al"); return; }
          const u = {...newUser, username:newUser.username.trim(), label:newUser.label.trim(), loginCode: genLoginCode()};
          setUsers(p=>[...p,u]);
          addLog("edit",`Gebruiker "${u.label}" (${u.username}) aangemaakt`);
          setNewUser({username:"",password:"",label:"",role:"user"});
        };

        const deleteUser = (username) => {
          if(username==="admin") { alert("Admin account kan niet verwijderd worden"); return; }
          const u = users.find(x=>x.username===username);
          if(!confirm(`Gebruiker "${u?.label}" verwijderen?`)) return;
          setUsers(p=>p.filter(x=>x.username!==username));
          addLog("edit",`Gebruiker "${u?.label}" (${username}) verwijderd`);
        };

        const saveUser = () => {
          if(!editUser||!editUser.label.trim()||!editUser.password.trim()) return;
          setUsers(p=>p.map(u=>u.username===editUser.username?editUser:u));
          addLog("edit",`Gebruiker "${editUser.label}" bijgewerkt`);
          setEditUser(null);
        };

        const printBadge = (u) => {
          const w = window.open('','_blank');
          const code = u.loginCode || "NOCODE";
          const modules = encodeCode128B(code);
          const mw = 2.5; const bw = modules.length * mw + 40; const bh = 80;
          const rects = []; let x = 20;
          for (let j = 0; j < modules.length; j++) { if (modules[j] === '1') rects.push(`<rect x="${x}" y="10" width="${mw}" height="${bh}" fill="black"/>`); x += mw; }
          w.document.write(`<html><head><title>Badge - ${u.label}</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
            .badge{border:2px solid #ccc;border-radius:16px;padding:30px;text-align:center;width:350px}
            .name{font-size:24px;font-weight:bold;margin-bottom:4px}
            .role{font-size:14px;color:#666;margin-bottom:20px}
            .code{font-family:monospace;font-size:16px;font-weight:bold;margin-top:8px;letter-spacing:2px}
            .hint{font-size:11px;color:#999;margin-top:12px}
            @media print{body{min-height:auto}.badge{border:2px solid #000}}</style></head>
            <body><div class="badge">
              <div class="name">${u.label}</div>
              <div class="role">${u.role === "admin" ? "Beheerder" : "Gebruiker"}</div>
              <svg viewBox="0 0 ${bw} ${bh + 30}" width="${bw}" height="${bh + 30}" style="background:white">
                ${rects.join('')}
                <text x="${bw/2}" y="${bh + 22}" text-anchor="middle" font-size="14" font-family="monospace" font-weight="bold">${code}</text>
              </svg>
              <div class="hint">Scan deze badge om in te loggen</div>
            </div>
            <script>setTimeout(()=>window.print(),500)<\/script></body></html>`);
        };

        const printAllBadges = () => {
          const w = window.open('','_blank');
          const badges = users.map(u => {
            const code = u.loginCode || "NOCODE";
            const modules = encodeCode128B(code);
            const mw = 2; const bw = modules.length * mw + 30; const bh = 60;
            const rects = []; let x = 15;
            for (let j = 0; j < modules.length; j++) { if (modules[j] === '1') rects.push(`<rect x="${x}" y="8" width="${mw}" height="${bh}" fill="black"/>`); x += mw; }
            return `<div class="badge">
              <div class="name">${u.label}</div>
              <div class="role">${u.role === "admin" ? "Beheerder" : "Gebruiker"}</div>
              <svg viewBox="0 0 ${bw} ${bh + 24}" width="${bw}" height="${bh + 24}" style="background:white">
                ${rects.join('')}
                <text x="${bw/2}" y="${bh + 18}" text-anchor="middle" font-size="12" font-family="monospace" font-weight="bold">${code}</text>
              </svg>
            </div>`;
          }).join('');
          w.document.write(`<html><head><title>Badges</title><style>body{font-family:sans-serif;display:flex;flex-wrap:wrap;gap:20px;padding:20px;justify-content:center}
            .badge{border:2px solid #ccc;border-radius:12px;padding:20px;text-align:center;width:280px;break-inside:avoid}
            .name{font-size:18px;font-weight:bold;margin-bottom:2px}
            .role{font-size:12px;color:#666;margin-bottom:12px}
            @media print{.badge{border:2px solid #000}}</style></head>
            <body>${badges}<script>setTimeout(()=>window.print(),500)<\/script></body></html>`);
        };

        return <div className="space-y-6 max-w-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Gebruikers ({users.length})</h3>
            <button onClick={printAllBadges} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">{"\ud83d\udda8"} Print alle badges</button>
          </div>

          {/* User list */}
          <div className="space-y-2">
            {users.map(u => <div key={u.username} className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${u.role==="admin"?"bg-blue-600":"bg-gray-500"}`}>{u.label.charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="font-semibold text-gray-900">{u.label}</p>
                    <p className="text-xs text-gray-500">@{u.username} {"\u00b7"} {u.role==="admin"?"Beheerder":"Gebruiker"} {"\u00b7"} <span className="font-mono">{u.loginCode||"geen code"}</span></p>
                    {u.email && <p className="text-xs text-gray-400">{u.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>printBadge(u)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200">{"\ud83d\udda8"}</button>
                  <button onClick={()=>setEditUser({...u})} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100">Bewerken</button>
                  {u.username!=="admin"&&<button onClick={()=>deleteUser(u.username)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100">Verwijder</button>}
                </div>
              </div>
            </div>)}
          </div>

          {/* Add new user */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h4 className="font-semibold text-gray-800">Nieuwe gebruiker</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lc}>Naam</label><input className={ic} value={newUser.label} onChange={e=>setNewUser(p=>({...p,label:e.target.value}))} placeholder="Bijv. Jan de Vries"/></div>
              <div><label className={lc}>Gebruikersnaam</label><input className={ic} value={newUser.username} onChange={e=>setNewUser(p=>({...p,username:e.target.value.toLowerCase().replace(/\s/g,"")}))} placeholder="Bijv. jan"/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lc}>Wachtwoord</label><input className={ic} value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} placeholder="Kies een wachtwoord"/></div>
              <div><label className={lc}>Rol</label><select className={ic} value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}><option value="user">Gebruiker</option><option value="admin">Beheerder</option></select></div>
            </div>
            <div><label className={lc}>E-mailadres</label><input type="email" className={ic} value={newUser.email||""} onChange={e=>setNewUser(p=>({...p,email:e.target.value}))} placeholder="bijv. jan@voorbeeld.nl"/></div>
            <p className="text-xs text-gray-400">Er wordt automatisch een unieke badge-code aangemaakt</p>
            <button onClick={addUser} disabled={!newUser.username.trim()||!newUser.password.trim()||!newUser.label.trim()} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-40">Gebruiker toevoegen</button>
          </div>

          {/* Edit modal */}
          <Modal open={!!editUser} onClose={()=>setEditUser(null)} title="Gebruiker bewerken">
            {editUser&&<div className="space-y-4">
              <div><label className={lc}>Naam</label><input className={ic} value={editUser.label} onChange={e=>setEditUser(p=>({...p,label:e.target.value}))}/></div>
              <div><label className={lc}>Gebruikersnaam</label><input value={editUser.username} disabled className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-500"/></div>
              <div><label className={lc}>Wachtwoord</label><input className={ic} value={editUser.password} onChange={e=>setEditUser(p=>({...p,password:e.target.value}))}/></div>
              <div><label className={lc}>E-mailadres</label><input type="email" className={ic} value={editUser.email||""} onChange={e=>setEditUser(p=>({...p,email:e.target.value}))}/></div>
              <div><label className={lc}>Badge-code</label><div className="flex gap-2"><input value={editUser.loginCode||""} disabled className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-500 font-mono"/><button onClick={()=>setEditUser(p=>({...p,loginCode:genLoginCode()}))} className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200">Nieuwe code</button></div></div>
              <div><label className={lc}>Rol</label><select className={ic} value={editUser.role} onChange={e=>setEditUser(p=>({...p,role:e.target.value}))} disabled={editUser.username==="admin"}><option value="user">Gebruiker</option><option value="admin">Beheerder</option></select></div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveUser} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">Opslaan</button>
                <button onClick={()=>setEditUser(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50">Annuleren</button>
              </div>
            </div>}
          </Modal>
        </div>;
      })()}

      {/* SETTINGS */}
      {tab==="settings"&&<div className="space-y-6 max-w-xl">
        <h3 className="text-lg font-bold text-gray-900">Instellingen</h3>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h4 className="font-semibold text-gray-800">Branding</h4>
          <ImageUpload value={branding.logo} onChange={v=>setBranding(p=>({...p,logo:v}))} label="Logo"/>
          {branding.logo && <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo formaat header ({branding.logoSize || 40}px)</label>
              <div className="flex items-center gap-4">
                <input type="range" min="20" max="80" value={branding.logoSize || 40} onChange={e => setBranding(p => ({...p, logoSize: parseInt(e.target.value)}))} className="flex-1 accent-blue-600"/>
                <div className="bg-gray-100 rounded-xl p-2 flex items-center justify-center" style={{width:80,height:80}}>
                  <img src={branding.logo} className="rounded-lg object-contain" style={{width:branding.logoSize||40,height:branding.logoSize||40}} alt="preview"/>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo formaat loginscherm ({branding.loginLogoSize || 64}px)</label>
              <div className="flex items-center gap-4">
                <input type="range" min="32" max="160" value={branding.loginLogoSize || 64} onChange={e => setBranding(p => ({...p, loginLogoSize: parseInt(e.target.value)}))} className="flex-1 accent-blue-600"/>
                <div className="bg-gray-100 rounded-xl p-2 flex items-center justify-center" style={{width:100,height:100}}>
                  <img src={branding.logo} className="rounded-lg object-contain" style={{width:branding.loginLogoSize||64,height:branding.loginLogoSize||64}} alt="preview"/>
                </div>
              </div>
            </div>
          </>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Titel</label><input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={branding.title} onChange={e=>setBranding(p=>({...p,title:e.target.value}))}/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Ondertitel</label><input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={branding.subtitle} onChange={e=>setBranding(p=>({...p,subtitle:e.target.value}))}/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Kleur</label><div className="flex items-center gap-3"><input type="color" value={branding.color} onChange={e=>setBranding(p=>({...p,color:e.target.value}))} className="w-10 h-10 rounded-lg cursor-pointer border-0"/><span className="text-sm text-gray-500">{branding.color}</span></div></div>
          <ImageUpload value={branding.loginBg} onChange={v=>setBranding(p=>({...p,loginBg:v}))} label="Login achtergrond"/>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h4 className="font-semibold text-gray-800">Data</h4>
          <button onClick={()=>{if(confirm("Alles resetten?")){store.set("mhok-eq6",INIT);store.set("mhok-bons",[]);store.set("mhok-logs",[]);store.set("mhok-brand",DEFAULT_BRANDING);window.location.reload()}}} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-200 hover:bg-red-100">Reset alle data</button>
        </div>
      </div>}
    </div>

    <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Nieuw materiaal"><AdminForm onSave={add} onCancel={()=>setAddOpen(false)}/></Modal>
    <Modal open={!!edit} onClose={()=>setEdit(null)} title="Bewerken">{edit&&<AdminForm item={edit} onSave={save} onCancel={()=>setEdit(null)}/>}</Modal>

    <Modal open={!!detail} onClose={()=>setDetail(null)} title="Materiaal" wide>
      {detail&&(()=>{const av=availQty(detail,bons);const stats=getItemStats(detail.id);const itemBons=bons.filter(b=>b.status!=="completed"&&b.items.some(bi=>bi.itemId===detail.id));
        return <div className="space-y-4">
          <div className="flex items-center gap-3">
            {detail.photo?<img src={detail.photo} className="w-16 h-16 rounded-xl object-cover" alt=""/>:<div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">{getIcon(detail.category)}</div>}
            <div className="flex-1"><h3 className="font-bold text-gray-900">{detail.name}</h3><p className="text-sm text-gray-500">{detail.category} {"\u00b7"} {detail.stock} {detail.unit}</p></div>
            <BarcodeSVG code={detail.barcode||""} name={detail.name} small/>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Barcode</span><span className="font-mono font-medium text-gray-900">{detail.barcode||"geen"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Beschikbaar</span><span className="font-medium text-emerald-600">{av}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Uitgeleend</span><span className="font-medium text-amber-600">{loanedQty(bons,detail.id)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Onderhoud</span><span className="font-medium">{detail.maintenance||0}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Prijs</span><span className="font-medium">{fmt(detail.pricePerUnit)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Uitgeleend (jaar)</span><span className="font-medium">{stats.count}x</span></div>
            {Object.keys(stats.borrowers).length>0&&<div><span className="text-gray-500">Door:</span><div className="mt-1 flex flex-wrap gap-1">{Object.entries(stats.borrowers).sort((a,b)=>b[1]-a[1]).map(([n,c])=><span key={n} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{n} ({c}x)</span>)}</div></div>}
          </div>
          {itemBons.length>0&&<div><p className="text-xs font-semibold text-gray-500 uppercase mb-2">Bonnen met dit item</p>{itemBons.map(b=><BonCard key={b.id} bon={b} onClick={()=>{setDetail(null);setBonDetail(b)}} showUser/>)}</div>}
          <div className="flex gap-2 pt-2">
            <button onClick={()=>{setEdit(detail);setDetail(null)}} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">Bewerken</button>
            <button onClick={()=>{const nb=nextBarcode();setEq(p=>p.map(e=>e.id===detail.id?{...e,barcode:nb}:e));setDetail(prev=>({...prev,barcode:nb}));addLog("edit",`Barcode ${detail.name} vernieuwd: ${nb}`)}} className="px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-sm border border-amber-200" title="Nieuwe barcode">{"\ud83d\udd04"}</button>
            <button onClick={()=>handlePrint([detail])} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm">{"\ud83d\udda8"}</button>
            <button onClick={()=>del(detail.id)} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">Verwijder</button>
          </div>
        </div>})()}
    </Modal>

    <Modal open={!!bonDetail} onClose={()=>setBonDetail(null)} title={bonDetail?`Bon ${bonDetail.number}`:""} wide>
      {bonDetail&&<div className="space-y-4">
        <div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">{"\ud83d\udc64"} {bonDetail.user}</p><p className="text-sm text-gray-500">{fmtDate(bonDetail.startDate)} {"\u2192"} {fmtDate(bonDetail.endDate)}</p></div><BonBadge bon={bonDetail}/></div>
        <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">{bonDetail.items.map((bi,idx)=>{const rem=bi.qty-(bi.returned||0);return <div key={idx} className="px-4 py-3 flex items-center justify-between"><div><p className="text-sm font-medium">{bi.itemName}</p><p className="text-xs text-gray-500">{bi.qty} {bi.unit} {bi.returned>0&&`\u2014 ${bi.returned} retour`}</p></div><div className="flex items-center gap-2">{rem>0?<span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">{rem} open</span>:<span className="text-xs text-emerald-600">{"\u2705"}</span>}{bonDetail.status!=="completed"&&rem>0&&<button onClick={()=>{const nb={...bonDetail,items:bonDetail.items.map((i,j)=>j===idx?{...i,returned:i.qty}:i)};setBons(p=>p.map(b=>b.id===bonDetail.id?nb:b));setBonDetail(nb);addLog("return",`${bonDetail.number}: ${bi.itemName} retour (admin)`)}} className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs hover:bg-emerald-200">Retour</button>}</div></div>})}</div>
        {/* Edit dates */}
        {bonDetail.status!=="completed"&&<div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Bon aanpassen</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Startdatum</label><input type="date" className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={bonDetail.startDate} onChange={e=>{const nb={...bonDetail,startDate:e.target.value};setBons(p=>p.map(b=>b.id===bonDetail.id?nb:b));setBonDetail(nb)}}/></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Einddatum</label><input type="date" className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={bonDetail.endDate} onChange={e=>{const nb={...bonDetail,endDate:e.target.value};setBons(p=>p.map(b=>b.id===bonDetail.id?nb:b));setBonDetail(nb)}}/></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Status</label><select className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={bonDetail.status} onChange={e=>{const nb={...bonDetail,status:e.target.value};setBons(p=>p.map(b=>b.id===bonDetail.id?nb:b));setBonDetail(nb);addLog("edit",`${bonDetail.number} status gewijzigd naar ${e.target.value}`)}}><option value="reserved">Gereserveerd</option><option value="active">Actief</option><option value="completed">Compleet</option></select></div>
        </div>}
        <div className="flex gap-2 pt-2">
          {bonDetail.status!=="completed"&&<button onClick={()=>forceComplete(bonDetail.id)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700">Forceer compleet</button>}
          <button onClick={()=>{if(!confirm(`Bon ${bonDetail.number} verwijderen?`))return;setBons(p=>p.filter(b=>b.id!==bonDetail.id));addLog("edit",`${bonDetail.number} verwijderd door beheerder`);setBonDetail(null)}} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 border border-red-200">Verwijder bon</button>
        </div>
      </div>}
    </Modal>
  </div>;
}

// ============ USER ============
function UserView({ eq, bons, setBons, addLog, branding, onLogout, user }) {
  const [mode, setMode] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const scanRef = useRef(null);

  // Global key capture: redirect all keyboard input to active scan field, prevent browser search
  useEffect(() => {
    const handler = (e) => {
      const activeRef = loanScanRef.current || scanRef.current;
      if (!activeRef) return;
      if (e.key === "F3" || (e.ctrlKey && e.key === "f") || (e.ctrlKey && e.key === "g") || e.key === "/") {
        e.preventDefault();
      }
      // Only redirect focus if the active ref is visible in the DOM
      if (activeRef.offsetParent !== null && document.activeElement !== activeRef && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "SELECT" && document.activeElement?.tagName !== "TEXTAREA") {
        activeRef.focus();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);
  const [cart, setCart] = useState([]); const [endDate, setEndDate] = useState(""); const [startDate, setStartDate] = useState(today());
  const [isReservation, setIsReservation] = useState(false);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("Alle");
  const [returnBon, setReturnBon] = useState(null);
  const [scanInput, setScanInput] = useState(""); const [scanMsg, setScanMsg] = useState(null);
  const scanTimer = useRef(null);
  const scanValue = useRef("");
  const [done, setDone] = useState(null);
  const [loanStep, setLoanStep] = useState(1);
  const [loanScanInput, setLoanScanInput] = useState("");
  const [loanScanMsg, setLoanScanMsg] = useState(null);
  const loanScanRef = useRef(null);
  const loanScanTimer = useRef(null);
  const loanScanValue = useRef("");
  const totalCartQty = cart.reduce((s, c) => s + c.qty, 0);

  const myBons = bons.filter(b=>b.user===user.label&&b.status!=="completed");

  const available = eq.filter(i=>{
    const av = availQty(i,bons);
    return av>0&&i.name.toLowerCase().includes(q.toLowerCase())&&(cat==="Alle"||i.category===cat);
  });

  const addToCart=(item)=>{const av=availQty(item,bons);const inC=cart.find(c=>c.itemId===item.id)?.qty||0;if(inC>=av)return;if(cart.find(c=>c.itemId===item.id))setCart(p=>p.map(c=>c.itemId===item.id?{...c,qty:c.qty+1}:c));else setCart(p=>[...p,{itemId:item.id,itemName:item.name,barcode:item.barcode,unit:item.unit,qty:1,returned:0}])};
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
        setLoanScanMsg({ ok: false, text: `\u26a0\ufe0f ${item.name} — niet meer beschikbaar` });
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
    setDone({action:isReservation?"reservation":"loan",text:`${bon.number} ${isReservation?"gereserveerd":"aangemaakt"}!`});
    setCart([]);setEndDate("");setStartDate(today());setMode(null);setIsReservation(false);setLoanStep(1);
    setTimeout(()=>setDone(null),4000);
  };

  const handleScan=()=>{
    if(!returnBon||!scanValue.current.trim())return;
    const code=scanValue.current.trim();
    const matchItem=eq.find(i=>i.barcode===code||i.barcode===code.toUpperCase());
    let bonItem=matchItem?returnBon.items.find(bi=>bi.itemId===matchItem.id&&(bi.qty-(bi.returned||0))>0):null;
    if(!bonItem){const numId=parseInt(code,10);bonItem=returnBon.items.find(bi=>bi.itemId===numId&&(bi.qty-(bi.returned||0))>0);}
    if(!bonItem)bonItem=returnBon.items.find(bi=>bi.itemName.toLowerCase().includes(code.toLowerCase())&&(bi.qty-(bi.returned||0))>0);
    if(bonItem){
      const nr=(bonItem.returned||0)+1;
      setBons(p=>p.map(b=>b.id===returnBon.id?{...b,items:b.items.map(i=>i.itemId===bonItem.itemId?{...i,returned:nr}:i)}:b));
      setReturnBon(prev=>({...prev,items:prev.items.map(i=>i.itemId===bonItem.itemId?{...i,returned:nr}:i)}));
      setScanMsg({ok:true,text:`\u2705 ${bonItem.itemName} (${nr}/${bonItem.qty})`});
      addLog("return",`${returnBon.number}: 1x ${bonItem.itemName} retour`);
    } else setScanMsg({ok:false,text:"\u274c Niet gevonden op deze bon"});
    setScanInput("");scanValue.current="";setTimeout(()=>setScanMsg(null),3000);
  };

  const pickupScan=()=>{
    if(!returnBon||!scanValue.current.trim())return;
    const code=scanValue.current.trim();
    const matchItem=eq.find(i=>i.barcode===code||i.barcode===code.toUpperCase());
    let bonItem=matchItem?returnBon.items.find(bi=>bi.itemId===matchItem.id&&(bi.pickedUp||0)<bi.qty):null;
    if(!bonItem){const numId=parseInt(code,10);bonItem=returnBon.items.find(bi=>bi.itemId===numId&&(bi.pickedUp||0)<bi.qty);}
    if(!bonItem)bonItem=returnBon.items.find(bi=>bi.itemName.toLowerCase().includes(code.toLowerCase())&&(bi.pickedUp||0)<bi.qty);
    if(bonItem){
      const nr=(bonItem.pickedUp||0)+1;
      setBons(p=>p.map(b=>b.id===returnBon.id?{...b,items:b.items.map(i=>i.itemId===bonItem.itemId?{...i,pickedUp:nr}:i)}:b));
      setReturnBon(prev=>({...prev,items:prev.items.map(i=>i.itemId===bonItem.itemId?{...i,pickedUp:nr}:i)}));
      setScanMsg({ok:true,text:`\u2705 ${bonItem.itemName} opgehaald (${nr}/${bonItem.qty})`});
      addLog("loan",`${returnBon.number}: 1x ${bonItem.itemName} opgehaald`);
    } else setScanMsg({ok:false,text:"\u274c Niet gevonden op deze bon"});
    setScanInput("");scanValue.current="";setTimeout(()=>setScanMsg(null),3000);
  };

  const finishPickup=()=>{
    setBons(p=>p.map(b=>b.id===returnBon.id?{...b,status:"active"}:b));
    addLog("loan",`${returnBon.number} opgehaald door ${user.label}`);
    setDone({action:"loan",text:`${returnBon.number} is opgehaald!`});
    setReturnBon(null);setMode(null);setTimeout(()=>setDone(null),4000);
  };

  const finishReturn=()=>{
    const bon=returnBon;const isComp=bonComplete(bon);
    if(isComp){setBons(p=>p.map(b=>b.id===bon.id?{...b,status:"completed",completedDate:isoNow()}:b));addLog("return",`${bon.number} volledig retour`);setDone({action:"return",text:`${bon.number} compleet!`})}
    else{const rem=bonRemaining(bon);addLog("return",`${bon.number} deels retour. Open: ${rem.map(i=>`${i.qty-(i.returned||0)}x ${i.itemName}`).join(", ")}`);setDone({action:"partial",text:`${bon.number} deels retour`})}
    setReturnBon(null);setMode(null);setTimeout(()=>setDone(null),4000);
  };

  // HOME
  if(!mode) return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex flex-col">
    <AppHeader branding={branding} role="user" onLogout={onLogout} user={user} onProfileClick={()=>setShowProfile(true)}>
      <div className="max-w-xl mx-auto px-5 pb-3"><p className="text-sm text-gray-500">Welkom, {user.label}</p></div>
    </AppHeader>

    {/* Profile modal */}
    <Modal open={showProfile} onClose={()=>setShowProfile(false)} title={user.label} wide>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold" style={{backgroundColor:branding.color}}>{user.label.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}</div>
          <div>
            <p className="text-lg font-bold text-gray-900">{user.label}</p>
            <p className="text-sm text-gray-500">@{user.username} {"\u00b7"} {user.role==="admin"?"Beheerder":"Gebruiker"}</p>
            {user.loginCode && <p className="text-xs font-mono text-gray-400 mt-1">Badge: {user.loginCode}</p>}
          </div>
        </div>

        {/* User's bon history */}
        {(()=>{
          const userBons = bons.filter(b=>b.user===user.label).sort((a,b)=>b.createdAt?.localeCompare(a.createdAt||"")||0);
          const active = userBons.filter(b=>b.status!=="completed");
          const completed = userBons.filter(b=>b.status==="completed");
          const totalItems = userBons.reduce((s,b)=>s+b.items.reduce((t,i)=>t+i.qty,0),0);
          return <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-blue-600">{userBons.length}</p><p className="text-xs text-gray-500">Bonnen</p></div>
              <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-amber-600">{active.length}</p><p className="text-xs text-gray-500">Actief</p></div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-emerald-600">{totalItems}</p><p className="text-xs text-gray-500">Items geleend</p></div>
            </div>

            {active.length>0 && <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Actieve bonnen</p>
              <div className="space-y-2">{active.map(b=><div key={b.id} className={`rounded-xl p-3 border ${bonIsOverdue(b)?"border-red-200 bg-red-50":"border-gray-200 bg-gray-50"}`}>
                <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-blue-600">{b.number}</span><BonBadge bon={b}/></div>
                <p className="text-xs text-gray-500 mt-1">{fmtDate(b.startDate)} {"\u2192"} {fmtDate(b.endDate)}</p>
                <p className="text-xs text-gray-400 mt-1">{b.items.map(i=>`${i.qty}x ${i.itemName}`).join(", ")}</p>
              </div>)}</div>
            </div>}

            {completed.length>0 && <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Geschiedenis ({completed.length})</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">{completed.slice(0,20).map(b=><div key={b.id} className="rounded-xl p-3 border border-gray-100 bg-white">
                <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-gray-400">{b.number}</span><span className="text-xs text-emerald-600">{"\u2705"} Compleet</span></div>
                <p className="text-xs text-gray-500 mt-1">{fmtDate(b.startDate)} {"\u2192"} {fmtDate(b.endDate)}</p>
                <p className="text-xs text-gray-400 mt-1">{b.items.map(i=>`${i.qty}x ${i.itemName}`).join(", ")}</p>
              </div>)}</div>
            </div>}

            {userBons.length===0 && <p className="text-center text-gray-400 py-4">Nog geen bonnen</p>}
          </div>;
        })()}

        <button onClick={onLogout} className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">Uitloggen</button>
      </div>
    </Modal>
    {done&&<div className="max-w-4xl mx-auto mt-4 px-5"><div className={`rounded-2xl px-5 py-4 text-center font-semibold border text-base ${done.action==="loan"?"bg-blue-50 text-blue-800 border-blue-200":done.action==="return"?"bg-emerald-50 text-emerald-800 border-emerald-200":done.action==="reservation"?"bg-purple-50 text-purple-800 border-purple-200":"bg-amber-50 text-amber-800 border-amber-200"}`}>{done.text}</div></div>}
    <div className="max-w-4xl mx-auto w-full px-5 py-8 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <button onClick={()=>setMode("loan")} className="py-10 rounded-3xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xl transition-all hover:scale-105 active:scale-95">
          <span className="text-4xl block mb-2">{"\ud83d\udce4"}</span><span className="text-lg">Materiaal lenen</span>
        </button>
        <button onClick={()=>{setMode("loan");setIsReservation(true)}} className="py-10 rounded-3xl bg-purple-500 hover:bg-purple-600 text-white font-bold shadow-xl transition-all hover:scale-105 active:scale-95">
          <span className="text-4xl block mb-2">{"\ud83d\udcc5"}</span><span className="text-lg">Reserveren</span>
        </button>
        <button onClick={()=>setMode("return")} className="py-10 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-xl transition-all hover:scale-105 active:scale-95">
          <span className="text-4xl block mb-2">{"\ud83d\udce5"}</span><span className="text-lg">Retour / Ophalen</span>
        </button>
      </div>

      {myBons.length>0&&<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Actieve bonnen ({myBons.length})</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{myBons.map(b=><div key={b.id} className={`rounded-xl p-4 border ${bonIsOverdue(b)?"border-red-200 bg-red-50":"border-gray-100 bg-gray-50"}`}>
          <div className="flex items-center justify-between"><span className="font-mono text-sm font-bold text-blue-600">{b.number}</span><BonBadge bon={b}/></div>
          <p className="text-sm text-gray-500 mt-2">{fmtDate(b.startDate)} {"\u2192"} {fmtDate(b.endDate)}</p>
          <p className="text-xs text-gray-400 mt-1 truncate">{b.items.map(i=>`${i.qty}x ${i.itemName}`).join(", ")}</p>
        </div>)}</div>
      </div>}
    </div>
  </div>;

  // NEW LOAN / RESERVATION — step-based
  const resSteps = isReservation ? ["Periode","Materiaal","Bevestig"] : ["Materiaal","Bevestig"];
  const totalSteps = resSteps.length;
  const itemStep = isReservation ? 2 : 1;
  const confirmStep = isReservation ? 3 : 2;

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

  const availableForPeriod = eq.filter(i => {
    return getAvailForItem(i) > 0 && i.name.toLowerCase().includes(q.toLowerCase()) && (cat === "Alle" || i.category === cat);
  });

  if(mode==="loan") return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 pb-32">
    <div className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-xl mx-auto px-5 py-4 flex items-center justify-between">
        <button onClick={()=>{if(loanStep>1)setLoanStep(loanStep-1);else{setMode(null);setCart([]);setEndDate("");setStartDate(today());setIsReservation(false);setQ("");setCat("Alle");setLoanStep(1)}}} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>{loanStep>1?"Vorige":"Terug"}</button>
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

  // RETURN / PICKUP - select bon
  if(mode==="return"&&!returnBon) return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
    <div className="bg-white border-b border-gray-100 shadow-sm"><div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
      <button onClick={()=>setMode(null)} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Terug</button>
      <h2 className="text-lg font-bold text-gray-900">Kies een bon</h2><div className="w-16"/>
    </div></div>
    <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
      {myBons.length===0?<div className="text-center py-12"><p className="text-4xl mb-3">{"\ud83d\udce6"}</p><p className="text-gray-500">Geen actieve bonnen</p></div>
      :myBons.map(b=><div key={b.id} onClick={()=>setReturnBon(b)} className={`bg-white rounded-2xl px-5 py-4 shadow-sm border cursor-pointer hover:shadow-md ${b.status==="reserved"?"border-purple-200 hover:border-purple-300":"border-gray-100 hover:border-gray-200"}`}>
        <div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><span className="font-mono text-sm font-bold text-blue-600">{b.number}</span><BonBadge bon={b}/></div><p className="text-xs text-gray-500 mt-1">{b.items.map(i=>i.itemName).join(", ")}</p></div>
        <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{backgroundColor:b.status==="reserved"?"#f3e8ff":"#ecfdf5",color:b.status==="reserved"?"#7c3aed":"#059669"}}>{b.status==="reserved"?"Ophalen":"Retour"}</span></div>
      </div>)}
    </div>
  </div>;

  // SCAN - pickup or return
  if(mode==="return"&&returnBon) {
    const isPickup = returnBon.status === "reserved";
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="bg-white border-b border-gray-100 shadow-sm"><div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
        <button onClick={()=>setReturnBon(null)} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Terug</button>
        <h2 className="text-lg font-bold text-gray-900">{isPickup?"Ophalen":"Retour"} {returnBon.number}</h2><div className="w-16"/>
      </div></div>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className={`rounded-2xl p-5 shadow-sm border ${isPickup?"bg-purple-50 border-purple-200":"bg-white border-gray-100"}`}>
          <label className="block text-sm font-medium text-gray-700 mb-2">{isPickup?"Scan materiaal om op te halen":"Scan materiaal om te retourneren"}</label>
          <div className="flex gap-2">
            <input ref={scanRef} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Scan materiaal..." value={scanInput} onChange={e=>{const v=e.target.value;setScanInput(v);scanValue.current=v;if(scanTimer.current)clearTimeout(scanTimer.current);if(v.trim().length>=3)scanTimer.current=setTimeout(()=>{isPickup?pickupScan():handleScan()},150)}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(scanTimer.current)clearTimeout(scanTimer.current);isPickup?pickupScan():handleScan()}}} autoFocus autoComplete="off"/>
            <button onClick={isPickup?pickupScan:handleScan} className={`px-5 py-3 rounded-xl text-white font-semibold text-sm ${isPickup?"bg-purple-500 hover:bg-purple-600":"bg-emerald-500 hover:bg-emerald-600"}`}>{isPickup?"\ud83d\udce4":"\ud83d\udce5"}</button>
          </div>
          {scanMsg&&<div className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium ${scanMsg.ok?"bg-emerald-50 text-emerald-800":"bg-red-50 text-red-800"}`}>{scanMsg.text}</div>}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-bold text-gray-900 text-sm">Items</h3></div>
          {returnBon.items.map((bi,idx)=>{const rem=isPickup?bi.qty-(bi.pickedUp||0):bi.qty-(bi.returned||0);return <div key={idx} className={`px-5 py-3 flex items-center justify-between border-b border-gray-50 last:border-0 ${rem===0?"bg-emerald-50/50":""}`}><div><p className="text-sm font-medium">{bi.itemName}</p><p className="text-xs text-gray-500">{isPickup?`${bi.pickedUp||0}/${bi.qty} opgehaald`:`${bi.returned||0}/${bi.qty} gescand`}</p></div>{rem===0?<span className="text-emerald-600">{"\u2705"}</span>:<span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">{rem} open</span>}</div>})}
        </div>
        <button onClick={isPickup?finishPickup:finishReturn} className={`w-full py-3 rounded-xl text-white font-bold text-sm ${isPickup?"bg-purple-500 hover:bg-purple-600":"bg-emerald-500 hover:bg-emerald-600"}`}>
          {isPickup?"Ophalen afronden":(bonComplete(returnBon)?"\u2705 Bon afronden":"\ud83d\udce5 Afronden (deels retour)")}
        </button>
        {!isPickup&&!bonComplete(returnBon)&&<p className="text-xs text-amber-600 text-center">Openstaande items blijven op de bon staan.</p>}
      </div>
    </div>;
  }
  return null;
}

// ============ MAIN ============
export default function App() {
  const [user, setUser] = useState(null);
  const [eq, setEq] = useState([]);
  const [bons, setBons] = useState([]);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [ok, setOk] = useState(false);

  useEffect(()=>{
    const saved = store.get("mhok-eq6");
    const data = saved || INIT;
    let counter = 0;
    data.forEach(i => { counter++; if (!i.barcode) i.barcode = genItemBarcode(counter); });
    syncBarcodeCounter(counter);
    setEq(data);
    setBons(store.get("mhok-bons")||[]);
    setLogs(store.get("mhok-logs")||[]);
    setBranding(store.get("mhok-brand")||DEFAULT_BRANDING);
    setUsers(store.get("mhok-users")||DEFAULT_USERS);
    const u=store.get("mhok-user");
    if(u)setUser(u);
    setOk(true);
  },[]);
  useEffect(()=>{if(ok)store.set("mhok-eq6",eq)},[eq,ok]);
  useEffect(()=>{if(ok)store.set("mhok-bons",bons)},[bons,ok]);
  useEffect(()=>{if(ok)store.set("mhok-logs",logs)},[logs,ok]);
  useEffect(()=>{if(ok)store.set("mhok-brand",branding)},[branding,ok]);
  useEffect(()=>{if(ok)store.set("mhok-users",users)},[users,ok]);

  const addLog=useCallback((action,detail)=>setLogs(p=>[{id:Date.now(),date:isoNow(),action,detail},...p]),[]);
  const handleLogin=(u)=>{setUser(u);store.set("mhok-user",u)};
  const handleLogout=()=>{setUser(null);store.set("mhok-user",null)};

  // Auto-logout after 5 minutes of inactivity
  useEffect(() => {
    if (!user) return;
    let timer = setTimeout(() => handleLogout(), 5 * 60 * 1000);
    const reset = () => { clearTimeout(timer); timer = setTimeout(() => handleLogout(), 5 * 60 * 1000); };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, reset, true));
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, reset, true)); };
  }, [user]);

  if(!ok)return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Laden...</p></div>;
  if(!user)return <LoginScreen onLogin={handleLogin} branding={branding} users={users}/>;
  if(user.role==="admin")return <AdminView eq={eq} setEq={setEq} bons={bons} setBons={setBons} logs={logs} addLog={addLog} branding={branding} setBranding={setBranding} users={users} setUsers={setUsers} onLogout={handleLogout}/>;
  return <UserView eq={eq} bons={bons} setBons={setBons} addLog={addLog} branding={branding} onLogout={handleLogout} user={user}/>;
}
