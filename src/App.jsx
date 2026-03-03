import { useState, useEffect } from "react";

const INIT = [
  { id: 1, name: "Volleybal", category: "Balsport", status: "available", borrower: "", location: "Opslagruimte A", returnDate: "", notes: "Mikasa MVA200" },
  { id: 2, name: "Badmintonset (4 rackets)", category: "Racketsport", status: "in-use", borrower: "Team Blauw", location: "Sporthal Noord", returnDate: "2026-03-05", notes: "2 shuttles extra" },
  { id: 3, name: "Voetbal", category: "Balsport", status: "available", borrower: "", location: "Opslagruimte A", returnDate: "", notes: "Maat 5" },
  { id: 4, name: "Springtouwen (10x)", category: "Fitness", status: "in-use", borrower: "Lisa de Vries", location: "Gymzaal West", returnDate: "2026-03-03", notes: "" },
  { id: 5, name: "Basketbal", category: "Balsport", status: "maintenance", borrower: "", location: "Reparatie", returnDate: "2026-03-10", notes: "Moet opgepompt" },
  { id: 6, name: "Hockeysticks (12x)", category: "Teamsport", status: "available", borrower: "", location: "Opslagruimte B", returnDate: "", notes: "Incl. ballen" },
  { id: 7, name: "Tennisrackets (4x)", category: "Racketsport", status: "in-use", borrower: "Mark Jansen", location: "Tennisbaan 2", returnDate: "2026-03-04", notes: "Met ballen" },
  { id: 8, name: "Yogamatten (15x)", category: "Fitness", status: "available", borrower: "", location: "Opslagruimte C", returnDate: "", notes: "Paars, 6mm" },
];

const CATS = ["Alle", "Balsport", "Racketsport", "Fitness", "Teamsport", "Overig"];
const STS = { available: "Beschikbaar", "in-use": "In gebruik", maintenance: "Onderhoud" };
const STO = ["available", "in-use", "maintenance"];
const getIcon = (c) => ({ Balsport: "\u26bd", Racketsport: "\ud83c\udff8", Fitness: "\ud83d\udcaa", Teamsport: "\ud83c\udfd1" }[c] || "\ud83c\udfc5");

function Badge({ status }) {
  const c = { available: "bg-emerald-100 text-emerald-800 border-emerald-200", "in-use": "bg-amber-100 text-amber-800 border-amber-200", maintenance: "bg-rose-100 text-rose-800 border-rose-200" };
  const d = { available: "bg-emerald-500", "in-use": "bg-amber-500", maintenance: "bg-rose-500" };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${c[status]}`}><span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${d[status]}`}/>{STS[status]}</span>;
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black bg-opacity-40"/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 5L5 15M5 5l10 10"/></svg></button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function Form({ item, onSave, onCancel }) {
  const [f, setF] = useState(item || { name: "", category: "Balsport", status: "available", borrower: "", location: "", returnDate: "", notes: "" });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));
  const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const lc = "block text-sm font-medium text-gray-700 mb-1.5";
  return (
    <div className="space-y-4">
      <div><label className={lc}>Naam *</label><input className={ic} value={f.name} onChange={e => u("name", e.target.value)} placeholder="Bijv. Volleybal"/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lc}>Categorie</label><select className={ic} value={f.category} onChange={e => u("category", e.target.value)}>{CATS.filter(c=>c!=="Alle").map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label className={lc}>Status</label><select className={ic} value={f.status} onChange={e => u("status", e.target.value)}>{STO.map(s=><option key={s} value={s}>{STS[s]}</option>)}</select></div>
      </div>
      <div><label className={lc}>Locatie *</label><input className={ic} value={f.location} onChange={e => u("location", e.target.value)} placeholder="Bijv. Opslagruimte A"/></div>
      {f.status === "in-use" && <div className="grid grid-cols-2 gap-3">
        <div><label className={lc}>Geleend door</label><input className={ic} value={f.borrower} onChange={e => u("borrower", e.target.value)} placeholder="Naam of team"/></div>
        <div><label className={lc}>Retour op</label><input type="date" className={ic} value={f.returnDate} onChange={e => u("returnDate", e.target.value)}/></div>
      </div>}
      {f.status === "maintenance" && <div><label className={lc}>Verwacht terug</label><input type="date" className={ic} value={f.returnDate} onChange={e => u("returnDate", e.target.value)}/></div>}
      <div><label className={lc}>Notities</label><textarea className={ic+" resize-none"} rows={2} value={f.notes} onChange={e => u("notes", e.target.value)} placeholder="Extra info..."/></div>
      <div className="flex gap-3 pt-2">
        <button onClick={() => f.name.trim() && f.location.trim() && onSave(f)} disabled={!f.name.trim()||!f.location.trim()} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">{item ? "Opslaan" : "Toevoegen"}</button>
        <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50">Annuleren</button>
      </div>
    </div>
  );
}

function Stat({ label, value, color, icon }) {
  return <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p><p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p></div><div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg">{icon}</div></div></div>;
}

export default function App() {
  const [eq, setEq] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Alle");
  const [sf, setSf] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [detail, setDetail] = useState(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sportmateriaal");
      if (saved) setEq(JSON.parse(saved));
      else { setEq(INIT); localStorage.setItem("sportmateriaal", JSON.stringify(INIT)); }
    } catch { setEq(INIT); }
    setOk(true);
  }, []);

  useEffect(() => {
    if (!ok) return;
    try { localStorage.setItem("sportmateriaal", JSON.stringify(eq)); } catch {}
  }, [eq, ok]);

  const add = (i) => { setEq(p => [...p, { ...i, id: Date.now() }]); setAddOpen(false); };
  const save = (i) => { setEq(p => p.map(e => e.id === edit.id ? { ...i, id: edit.id } : e)); setEdit(null); };
  const del = (id) => { setEq(p => p.filter(e => e.id !== id)); setDetail(null); };
  const ret = (id) => { setEq(p => p.map(e => e.id === id ? { ...e, status: "available", borrower: "", returnDate: "" } : e)); setDetail(null); };
  const reset = () => { setEq(INIT); try { localStorage.setItem("sportmateriaal", JSON.stringify(INIT)); } catch {} };

  const filt = eq.filter(i => {
    const s = q.toLowerCase();
    return (i.name.toLowerCase().includes(s) || i.borrower.toLowerCase().includes(s) || i.location.toLowerCase().includes(s))
      && (cat === "Alle" || i.category === cat) && (sf === "all" || i.status === sf);
  });

  const st = { t: eq.length, a: eq.filter(e => e.status === "available").length, u: eq.filter(e => e.status === "in-use").length, m: eq.filter(e => e.status === "maintenance").length };
  const ov = eq.filter(e => e.returnDate && new Date(e.returnDate) < new Date() && e.status !== "available");

  if (!ok) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Laden...</p></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold">S</div>
            <div><h1 className="text-xl font-bold text-gray-900">Sportmateriaal Tracker</h1><p className="text-xs text-gray-500">Beheer en volg al het sportmateriaal</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100">Reset</button>
            <button onClick={() => setAddOpen(true)} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm flex items-center gap-1.5"><span className="text-lg leading-none">+</span> Nieuw item</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Totaal" value={st.t} color="text-gray-700" icon="\ud83d\udce6"/>
          <Stat label="Beschikbaar" value={st.a} color="text-emerald-600" icon="\u2705"/>
          <Stat label="In gebruik" value={st.u} color="text-amber-600" icon="\ud83c\udfc3"/>
          <Stat label="Onderhoud" value={st.m} color="text-rose-500" icon="\ud83d\udd27"/>
        </div>

        {ov.length > 0 && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <div className="flex items-start gap-3"><span className="text-lg">\u26a0\ufe0f</span><div>
            <p className="font-semibold text-red-800 text-sm">Te laat teruggebracht ({ov.length})</p>
            <div className="mt-1 space-y-0.5">{ov.map(i => <p key={i.id} className="text-xs text-red-700"><span className="font-medium">{i.name}</span> \u2014 {i.borrower||"Onbekend"} (verwacht: {new Date(i.returnDate).toLocaleDateString("nl-NL")})</p>)}</div>
          </div></div>
        </div>}

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Zoek op naam, gebruiker of locatie..." value={q} onChange={e => setQ(e.target.value)}/>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">{CATS.map(c => <button key={c} onClick={() => setCat(c)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${cat===c?"bg-blue-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{c}</button>)}</div>
            <div className="flex gap-1.5">{[["all","Alle"],...Object.entries(STS)].map(([k,l])=><button key={k} onClick={()=>setSf(k)} className={`px-2.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${sf===k?"bg-gray-800 text-white":"bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{l}</button>)}</div>
          </div>
        </div>

        <div className="space-y-2">
          {filt.length===0 ? <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100"><p className="text-gray-500 text-sm">Geen materiaal gevonden</p></div>
          : filt.map(i => {
            const late = i.returnDate && new Date(i.returnDate) < new Date() && i.status !== "available";
            return <div key={i.id} onClick={() => setDetail(i)} className={`bg-white rounded-2xl px-5 py-4 shadow-sm border cursor-pointer hover:shadow-md transition-all ${late?"border-red-200":"border-gray-100 hover:border-gray-200"}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">{getIcon(i.category)}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><p className="font-semibold text-gray-900 text-sm truncate">{i.name}</p>{late && <span className="text-xs text-red-600 font-medium flex-shrink-0">Te laat</span>}</div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">\ud83d\udccd {i.location}{i.borrower && ` \u00b7 \ud83d\udc64 ${i.borrower}`}{i.returnDate && i.status!=="available" && ` \u00b7 \ud83d\udcc5 ${new Date(i.returnDate).toLocaleDateString("nl-NL")}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge status={i.status}/>
                  {i.status==="in-use" && <button onClick={e=>{e.stopPropagation();ret(i.id)}} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 border border-emerald-200">Retour</button>}
                </div>
              </div>
            </div>;
          })}
        </div>
        <p className="text-center text-xs text-gray-400 pt-2">{filt.length} van {eq.length} items</p>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nieuw materiaal toevoegen"><Form onSave={add} onCancel={() => setAddOpen(false)}/></Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Materiaal bewerken">{edit && <Form item={edit} onSave={save} onCancel={() => setEdit(null)}/>}</Modal>
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Details">
        {detail && <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">{getIcon(detail.category)}</div>
            <div><h3 className="font-bold text-gray-900">{detail.name}</h3><p className="text-sm text-gray-500">{detail.category}</p></div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Status</span><Badge status={detail.status}/></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Locatie</span><span className="font-medium text-gray-900">{detail.location}</span></div>
            {detail.borrower && <div className="flex justify-between text-sm"><span className="text-gray-500">Geleend door</span><span className="font-medium text-gray-900">{detail.borrower}</span></div>}
            {detail.returnDate && detail.status!=="available" && <div className="flex justify-between text-sm"><span className="text-gray-500">Verwachte retour</span><span className={`font-medium ${new Date(detail.returnDate)<new Date()?"text-red-600":"text-gray-900"}`}>{new Date(detail.returnDate).toLocaleDateString("nl-NL")}{new Date(detail.returnDate)<new Date()&&" (Te laat!)"}</span></div>}
            {detail.notes && <div className="flex justify-between text-sm"><span className="text-gray-500">Notities</span><span className="font-medium text-gray-900 text-right max-w-xs">{detail.notes}</span></div>}
          </div>
          <div className="flex gap-2 pt-2">
            {detail.status==="in-use" && <button onClick={()=>ret(detail.id)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700">Markeer als retour</button>}
            <button onClick={()=>{setEdit(detail);setDetail(null)}} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">Bewerken</button>
            <button onClick={()=>del(detail.id)} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 border border-red-200">Verwijder</button>
          </div>
        </div>}
      </Modal>
    </div>
  );
}
