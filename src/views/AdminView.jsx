import { useState, useMemo } from "react";
import { AppHeader } from "../components/AppHeader";
import { Modal } from "../components/Modal";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { BackupBanner } from "../components/BackupBanner";
import { unavailableQty, bonIsOverdue } from "../utils/bons";
import { encodeCode128B, nextBarcode } from "../utils/barcode";
import { createMaterial, updateMaterial, deleteMaterial, updateBon, deleteBon, returnBon } from "../api/client";
import { AdminForm } from "./admin/AdminForm";
import { DashboardTab } from "./admin/DashboardTab";
import { BonsTab } from "./admin/BonsTab";
import { ItemsTab } from "./admin/ItemsTab";
import { InsightsTab } from "./admin/InsightsTab";
import { LogTab } from "./admin/LogTab";
import { BarcodesTab } from "./admin/BarcodesTab";
import { UsersTab } from "./admin/UsersTab";
import { SettingsTab } from "./admin/SettingsTab";
import { ImportTab } from "./admin/ImportTab";
import { ItemDetailModal } from "./admin/ItemDetailModal";
import { BonDetailModal } from "./admin/BonDetailModal";

export function AdminView({ eq, setEq, materialsLoading, materialsError, setMaterialsError, refreshMaterials, users, setUsers, usersLoading, usersError, setUsersError, refreshUsers, sets, refreshSets, bons, bonsLoading, bonsError, setBonsError, refreshBons, logs, addLog, branding, setBranding, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [q, setQ] = useState(""); const [cat, setCat] = useState("Alle");
  const [addOpen, setAddOpen] = useState(false); const [edit, setEdit] = useState(null);
  const [detail, setDetail] = useState(null); const [bonDetail, setBonDetail] = useState(null);
  const [logFilter, setLogFilter] = useState(""); const [bonFilter, setBonFilter] = useState("active");
  const [newUser, setNewUser] = useState({name:"",email:"",password:"",role:"user"});
  const [editUser, setEditUser] = useState(null);
  const [adminScan, setAdminScan] = useState("");
  const [adminScanMsg, setAdminScanMsg] = useState(null);

  const totalStock = useMemo(()=>eq.reduce((s,e)=>s+e.stock,0),[eq]);
  const totalUnavail = useMemo(()=>eq.reduce((s,e)=>s+unavailableQty(bons,e.id)+(e.maintenance||0),0),[eq,bons]);
  const totalValue = useMemo(()=>eq.reduce((s,e)=>s+(e.pricePerUnit||0)*e.stock,0),[eq]);
  const activeBons = bons.filter(b=>b.status==="active");
  const overdueBons = bons.filter(bonIsOverdue);
  const reservedBons = bons.filter(b=>b.status==="reserved");
  const openBons = bons.filter(b=>b.status!=="completed");

  const oneYearAgo = useMemo(()=>{const d=new Date();d.setFullYear(d.getFullYear()-1);return d.toISOString();},[]);
  const recentLogs = useMemo(()=>logs.filter(l=>l.date>=oneYearAgo),[logs,oneYearAgo]);

  const add = async (i) => {
    try {
      await createMaterial({ ...i, barcode: nextBarcode() });
      await refreshMaterials();
      addLog("edit", `${i.name} toegevoegd`);
      setAddOpen(false);
    } catch (err) {
      setMaterialsError(err.message || "Toevoegen mislukt");
    }
  };

  const save = async (i) => {
    try {
      await updateMaterial(edit.id, i);
      await refreshMaterials();
      addLog("edit", `${i.name} bewerkt`);
      setEdit(null);
    } catch (err) {
      setMaterialsError(err.message || "Opslaan mislukt");
    }
  };

  const del = async (id) => {
    const it = eq.find(e => e.id === id);
    if (!confirm(`"${it?.name}" verwijderen?`)) return;
    try {
      await deleteMaterial(id);
      await refreshMaterials();
      addLog("edit", `${it.name} verwijderd`);
      setDetail(null);
    } catch (err) {
      setMaterialsError(err.message || "Verwijderen mislukt");
    }
  };

  const regenBarcode = async (id) => {
    const nb = nextBarcode();
    const item = eq.find(e => e.id === id);
    try {
      const updated = await updateMaterial(id, { barcode: nb });
      await refreshMaterials();
      setDetail(prev => prev && prev.id === id ? { ...prev, ...updated } : prev);
      if (item) addLog("edit", `Barcode ${item.name} vernieuwd: ${nb}`);
    } catch (err) {
      setMaterialsError(err.message || "Barcode vernieuwen mislukt");
    }
  };

  // Bon-mutaties — gaan rechtstreeks naar de backend en herladen bons-state.
  // Geen addLog-call: created_at/completed_at op de bon zelf is voortaan de
  // bron van waarheid (zie BESLUITEN/iter-4).
  const forceCompleteBon = async (bonId) => {
    try {
      // returnBon zonder items = "alles retour"; backend zet ook status=completed.
      const updated = await returnBon(bonId);
      await refreshBons();
      setBonDetail(updated);
    } catch (err) {
      setBonsError(err.message || "Forceer compleet mislukt");
    }
  };

  const handleBonUpdate = async (bonId, payload) => {
    try {
      const updated = await updateBon(bonId, payload);
      await refreshBons();
      setBonDetail(updated);
    } catch (err) {
      setBonsError(err.message || "Bon bijwerken mislukt");
    }
  };

  const handleBonItemReturn = async (bonId, bonItemId) => {
    try {
      const updated = await returnBon(bonId, [{ id: bonItemId, returned: true }]);
      await refreshBons();
      setBonDetail(updated);
    } catch (err) {
      setBonsError(err.message || "Retour mislukt");
    }
  };

  const handleBonDelete = async (bon) => {
    if (!confirm(`Bon ${bon.bon_number} verwijderen?`)) return;
    try {
      await deleteBon(bon.id);
      await refreshBons();
      setBonDetail(null);
    } catch (err) {
      setBonsError(err.message || "Verwijderen mislukt");
    }
  };

  const handlePrint=(items)=>{const pw=window.open('','_blank');const svgs=items.map(i=>{
    const bc=i.barcode||"NOCODE";const modules=encodeCode128B(bc);const mw=2.5;const bw=modules.length*mw+40;const bh=90;
    const rects=[];let x=20;
    for(let j=0;j<modules.length;j++){if(modules[j]==='1')rects.push(`<rect x="${x}" y="10" width="${mw}" height="${bh}" fill="black"/>`);x+=mw;}
    return`<div style="display:inline-block;margin:12px;padding:15px;border:1px solid #ccc;text-align:center;break-inside:avoid"><svg viewBox="0 0 ${bw} ${bh+40}" width="${bw}" height="${bh+40}" style="background:white"><rect width="${bw}" height="${bh+40}" fill="white"/>${rects.join('')}<text x="${bw/2}" y="${bh+24}" text-anchor="middle" font-size="16" font-family="monospace" font-weight="bold">${bc}</text><text x="${bw/2}" y="${bh+36}" text-anchor="middle" font-size="10" font-family="sans-serif" fill="#666">${i.name.length>35?i.name.slice(0,35)+'...':i.name}</text></svg></div>`;
    }).join('');pw.document.write(`<html><head><title>Barcodes</title><style>body{font-family:sans-serif}@media print{body{margin:0}}</style></head><body>${svgs}<script>setTimeout(()=>window.print(),500)<\/script></body></html>`)};

  // Items-jaaroverzicht voor het detail-modal. Werkt op de backend-shape.
  const getItemStats = (itemId) => {
    const yearBons = bons.filter((b) => (b.start_date || "") >= oneYearAgo);
    let count = 0;
    const borrowers = {};
    yearBons.forEach((b) => (b.items || []).forEach((bi) => {
      if (bi.material_id === itemId) {
        count += bi.quantity;
        const key = b.user_name || "-";
        borrowers[key] = (borrowers[key] || 0) + bi.quantity;
      }
    }));
    return { count, borrowers };
  };

  const tabs=[["dashboard","Dashboard"],["bons","Bonnen"],["items","Materiaal"],["insights","Inzichten"],["log","Logboek"],["barcodes","Barcodes"],["users","Gebruikers"],["import","Import"],["settings","Instellingen"]];

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
    <AppHeader branding={branding} role="admin" onLogout={onLogout} onAdd={()=>setAddOpen(true)}>
      <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
        {tabs.map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${tab===k?"border-blue-600 text-blue-600":"border-transparent text-gray-500 hover:text-gray-700"}`}>{l}{k==="bons"&&openBons.length>0?` (${openBons.length})`:""}</button>)}
      </div>
    </AppHeader>

    <div className="max-w-6xl mx-auto px-4 py-6">
      <BackupBanner/>
      <ConnectionBanner loading={materialsLoading} error={materialsError} onRetry={refreshMaterials} resource="Materialen"/>
      {tab==="dashboard"&&<DashboardTab bons={bons} totalStock={totalStock} totalUnavail={totalUnavail} totalValue={totalValue} activeBons={activeBons} overdueBons={overdueBons} reservedBons={reservedBons} recentLogs={recentLogs} onBonClick={setBonDetail}/>}
      {tab==="bons"&&<BonsTab bons={bons} bonsLoading={bonsLoading} bonsError={bonsError} refreshBons={refreshBons} reservedBons={reservedBons} overdueBons={overdueBons} bonFilter={bonFilter} setBonFilter={setBonFilter} onBonClick={setBonDetail}/>}
      {tab==="items"&&<ItemsTab eq={eq} bons={bons} q={q} setQ={setQ} cat={cat} setCat={setCat} onItemClick={setDetail} adminScan={adminScan} setAdminScan={setAdminScan} adminScanMsg={adminScanMsg} setAdminScanMsg={setAdminScanMsg}/>}
      {tab==="insights"&&<InsightsTab eq={eq} bons={bons} oneYearAgo={oneYearAgo}/>}
      {tab==="log"&&<LogTab recentLogs={recentLogs} logFilter={logFilter} setLogFilter={setLogFilter}/>}
      {tab==="barcodes"&&<BarcodesTab eq={eq} sets={sets}/>}
      {tab==="users"&&<UsersTab users={users} usersLoading={usersLoading} usersError={usersError} setUsersError={setUsersError} refreshUsers={refreshUsers} addLog={addLog} newUser={newUser} setNewUser={setNewUser} editUser={editUser} setEditUser={setEditUser}/>}
      {tab==="import"&&<ImportTab refreshMaterials={refreshMaterials} refreshSets={refreshSets}/>}
      {tab==="settings"&&<SettingsTab branding={branding} setBranding={setBranding}/>}
    </div>

    <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Nieuw materiaal"><AdminForm onSave={add} onCancel={()=>setAddOpen(false)}/></Modal>
    <Modal open={!!edit} onClose={()=>setEdit(null)} title="Bewerken">{edit&&<AdminForm item={edit} onSave={save} onCancel={()=>setEdit(null)}/>}</Modal>

    <ItemDetailModal detail={detail} setDetail={setDetail} bons={bons} eq={eq} addLog={addLog} getItemStats={getItemStats} onPrint={handlePrint} onEdit={setEdit} onDelete={del} onOpenBon={setBonDetail} onRegenBarcode={regenBarcode}/>
    <BonDetailModal bonDetail={bonDetail} setBonDetail={setBonDetail} onForceComplete={forceCompleteBon} onUpdateBon={handleBonUpdate} onItemReturn={handleBonItemReturn} onDeleteBon={handleBonDelete}/>
  </div>;
}
