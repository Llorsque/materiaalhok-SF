import { useState, useMemo, useEffect } from "react";
import { AppHeader } from "../components/AppHeader";
import { Modal } from "../components/Modal";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { BackupBanner } from "../components/BackupBanner";
import { NotificationBell } from "../components/NotificationBell";
import { unavailableQty, bonIsOverdue } from "../utils/bons";
import { encodeCode128B, nextMaterialBarcode, nextSetBarcode } from "../utils/barcode";
import { createMaterial, updateMaterial, deleteMaterial, createSet, updateSet, deleteSet, updateBon, deleteBon, returnBon, getBackupStatus } from "../api/client";
import { AdminForm } from "./admin/AdminForm";
import { SetForm } from "./admin/SetForm";
import { DashboardTab } from "./admin/DashboardTab";
import { BonsTab } from "./admin/BonsTab";
import { ItemsTab } from "./admin/ItemsTab";
import { SetsTab } from "./admin/SetsTab";
import { InsightsTab } from "./admin/InsightsTab";
import { LogTab } from "./admin/LogTab";
import { BarcodesTab } from "./admin/BarcodesTab";
import { UsersTab } from "./admin/UsersTab";
import { SettingsTab } from "./admin/SettingsTab";
import { ImportTab } from "./admin/ImportTab";
import { ItemDetailModal } from "./admin/ItemDetailModal";
import { SetDetailModal } from "./admin/SetDetailModal";
import { BonDetailModal } from "./admin/BonDetailModal";
import { AdminBonFlow } from "./admin/AdminBonFlow";
import { DamageTab } from "./admin/DamageTab";

export function AdminView({ eq, setEq, materialsLoading, materialsError, setMaterialsError, refreshMaterials, users, setUsers, usersLoading, usersError, setUsersError, refreshUsers, sets, refreshSets, bons, bonsLoading, bonsError, setBonsError, refreshBons, logs, addLog, damageReports, damageLoading, damageError, refreshDamage, branding, setBranding, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [q, setQ] = useState(""); const [cat, setCat] = useState("Alle");
  const [addOpen, setAddOpen] = useState(false); const [edit, setEdit] = useState(null);
  const [detail, setDetail] = useState(null); const [bonDetail, setBonDetail] = useState(null);
  const [bonFilter, setBonFilter] = useState("all");
  const [newUser, setNewUser] = useState({name:"",email:"",password:"",role:"user"});
  const [editUser, setEditUser] = useState(null);
  const [adminScan, setAdminScan] = useState("");
  const [adminScanMsg, setAdminScanMsg] = useState(null);
  // Sets-tab state: eigen zoek/filter/scan, aparte add/edit-modals, detail-modal en error-slot.
  const [setsQ, setSetsQ] = useState(""); const [setsCat, setSetsCat] = useState("Alle");
  const [setsScan, setSetsScan] = useState("");
  const [setsScanMsg, setSetsScanMsg] = useState(null);
  const [newSetOpen, setNewSetOpen] = useState(false);
  const [editSet, setEditSet] = useState(null);
  const [activeSet, setActiveSet] = useState(null);
  const [setsError, setSetsError] = useState(null);
  // Wanneer true: neemt de hele admin-view over met de AdminBonFlow, zodat
  // de admin ongestoord door de leenflow kan lopen namens een gebruiker.
  const [newBonMode, setNewBonMode] = useState(false);
  const [newBonToast, setNewBonToast] = useState(null);
  // Backup-status voor de notificatiebel. We fetchen 'm hier zodat het
  // belletje op elk tabblad up-to-date is; BackupBanner blijft ook z'n
  // eigen fetch doen — dat is een kleine dubbeling maar houdt de banner
  // stand-alone bruikbaar.
  const [backupStatus, setBackupStatus] = useState(null);
  useEffect(() => { getBackupStatus().then(setBackupStatus).catch(() => setBackupStatus(null)); }, []);

  const totalStock = useMemo(()=>eq.reduce((s,e)=>s+e.stock,0),[eq]);
  const totalUnavail = useMemo(()=>eq.reduce((s,e)=>s+unavailableQty(bons,e.id),0),[eq,bons]);
  const totalValue = useMemo(()=>eq.reduce((s,e)=>s+(e.pricePerUnit||0)*e.stock,0),[eq]);
  const activeBons = bons.filter(b=>b.status==="active");
  const overdueBons = bons.filter(bonIsOverdue);
  const reservedBons = bons.filter(b=>b.status==="reserved");
  const openBons = bons.filter(b=>b.status!=="completed");

  const oneYearAgo = useMemo(()=>{const d=new Date();d.setFullYear(d.getFullYear()-1);return d.toISOString();},[]);
  const recentLogs = useMemo(()=>logs.filter(l=>l.date>=oneYearAgo),[logs,oneYearAgo]);

  const add = async (i) => {
    try {
      const manualBarcode = typeof i.barcode === "string" ? i.barcode.trim() : "";
      const barcode = manualBarcode || nextMaterialBarcode(eq);
      await createMaterial({ ...i, barcode });
      await refreshMaterials();
      addLog("edit", `${i.name} toegevoegd`);
      setAddOpen(false);
    } catch (err) {
      setMaterialsError(err);
    }
  };

  const save = async (i) => {
    try {
      const payload = { ...i };
      // Lege barcode in edit-modus = behoud bestaande (backend gebruikt existing
      // als veld undefined is).
      if (typeof payload.barcode !== "string" || payload.barcode.trim() === "") {
        delete payload.barcode;
      } else {
        payload.barcode = payload.barcode.trim();
      }
      await updateMaterial(edit.id, payload);
      await refreshMaterials();
      addLog("edit", `${i.name} bewerkt`);
      setEdit(null);
    } catch (err) {
      setMaterialsError(err);
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
      setMaterialsError(err);
    }
  };

  const regenBarcode = async (id) => {
    const nb = nextMaterialBarcode(eq);
    const item = eq.find(e => e.id === id);
    try {
      const updated = await updateMaterial(id, { barcode: nb });
      await refreshMaterials();
      setDetail(prev => prev && prev.id === id ? { ...prev, ...updated } : prev);
      if (item) addLog("edit", `Barcode ${item.name} vernieuwd: ${nb}`);
    } catch (err) {
      setMaterialsError(err);
    }
  };

  // Sets-handlers — spiegelen de materiaal-handlers hierboven. Aparte error-slot
  // (setsError) zodat een set-actie geen materiaal-banner in de UI opent.
  const addSet = async (s) => {
    try {
      const manualBarcode = typeof s.barcode === "string" ? s.barcode.trim() : "";
      const barcode = manualBarcode || nextSetBarcode(sets);
      await createSet({ ...s, barcode });
      await refreshSets();
      setNewSetOpen(false);
    } catch (err) {
      setSetsError(err);
    }
  };

  const saveSet = async (s) => {
    try {
      const payload = { ...s };
      if (typeof payload.barcode !== "string" || payload.barcode.trim() === "") {
        delete payload.barcode;
      } else {
        payload.barcode = payload.barcode.trim();
      }
      await updateSet(editSet.id, payload);
      await refreshSets();
      setEditSet(null);
    } catch (err) {
      setSetsError(err);
    }
  };

  const delSet = async (id) => {
    const s = sets.find(x => x.id === id);
    if (!confirm(`"${s?.name}" verwijderen?`)) return;
    try {
      await deleteSet(id);
      await refreshSets();
      setActiveSet(null);
    } catch (err) {
      setSetsError(err);
    }
  };

  const regenSetBarcode = async (id) => {
    const nb = nextSetBarcode(sets);
    try {
      const updated = await updateSet(id, { barcode: nb });
      await refreshSets();
      setActiveSet(prev => prev && prev.id === id ? { ...prev, ...updated } : prev);
    } catch (err) {
      setSetsError(err);
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
      setBonsError(err);
    }
  };

  const handleBonUpdate = async (bonId, payload) => {
    try {
      const updated = await updateBon(bonId, payload);
      await refreshBons();
      setBonDetail(updated);
    } catch (err) {
      setBonsError(err);
    }
  };

  const handleBonItemReturn = async (bonId, bonItemId) => {
    try {
      const updated = await returnBon(bonId, [{ id: bonItemId, returned: true }]);
      await refreshBons();
      setBonDetail(updated);
    } catch (err) {
      setBonsError(err);
    }
  };

  const handleBonDelete = async (bon) => {
    if (!confirm(`Bon ${bon.bon_number} verwijderen?`)) return;
    try {
      await deleteBon(bon.id);
      await refreshBons();
      setBonDetail(null);
    } catch (err) {
      setBonsError(err);
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
    // Soft-deleted items (Ronde B) tellen niet mee — die zijn nooit meegenomen.
    yearBons.forEach((b) => (b.items || []).forEach((bi) => {
      if (bi.removed_at_pickup === 1) return;
      if (bi.material_id === itemId) {
        count += bi.quantity;
        const key = b.user_name || "-";
        borrowers[key] = (borrowers[key] || 0) + bi.quantity;
      }
    }));
    return { count, borrowers };
  };

  const openDamageCount = (damageReports || []).filter((r) => r.status === "open").length;
  const tabs=[["dashboard","Dashboard"],["bons","Bonnen"],["items","Materiaal"],["sets","Sets"],["damage","Schade / verlies"],["insights","Inzichten"],["log","Logboek"],["barcodes","Barcodes"],["users","Gebruikers"],["import","Import"],["settings","Instellingen"]];

  // -- Notificaties voor het belletje in de header ----------------------
  // Elke categorie is een aparte bron; het belletje groepeert ze zelf.
  // Klik navigeert direct naar het juiste tabblad of opent het bon-detail.
  const notifications = useMemo(() => {
    const list = [];

    // Backup: alleen als stale of gefaald (BackupBanner-logica gespiegeld).
    if (backupStatus && (backupStatus.isStale || !backupStatus.success)) {
      const failed = !backupStatus.success;
      list.push({
        id: "backup",
        type: "backup",
        severity: failed ? "red" : "amber",
        title: failed ? "De laatste backup is gefaald" : "Geen recente backup",
        subtitle: backupStatus.lastBackup
          ? `Laatst: ${new Date(backupStatus.lastBackup).toLocaleString("nl-NL")}`
          : "Nog geen backup gemaakt op deze laptop",
        onClick: () => setTab("settings"),
      });
    }

    // Bonnen te laat.
    for (const b of overdueBons) {
      list.push({
        id: `overdue-${b.id}`,
        type: "overdue",
        severity: "red",
        title: `${b.bon_number} — ${b.user_name || "onbekende gebruiker"}`,
        subtitle: `Retour was ${new Date(b.return_date).toLocaleDateString("nl-NL", { day: "2-digit", month: "short" })}`,
        onClick: () => setBonDetail(b),
      });
    }

    // Openstaande kwijt/schade-meldingen.
    for (const r of (damageReports || [])) {
      if (r.status !== "open") continue;
      const name = r.material_name || r.set_name || "item";
      list.push({
        id: `damage-${r.id}`,
        type: "damage",
        severity: "amber",
        title: `${r.quantity}x ${name} — ${r.reason === "lost" ? "kwijt" : "kapot"}`,
        subtitle: r.bon_number ? `Gemeld op ${r.bon_number}` : "Geen bon gekoppeld",
        onClick: () => setTab("damage"),
      });
    }

    // Incomplete retouren: actieve bonnen met een mix van retour en open items.
    for (const b of bons) {
      if (b.status !== "active") continue;
      const items = (b.items || []).filter((bi) => bi.removed_at_pickup !== 1);
      const anyReturned = items.some((bi) => bi.returned === 1);
      const anyOpen     = items.some((bi) => bi.returned === 0);
      if (anyReturned && anyOpen) {
        list.push({
          id: `incomplete-${b.id}`,
          type: "incomplete",
          severity: "amber",
          title: `${b.bon_number} — ${b.user_name || "onbekende gebruiker"}`,
          subtitle: "Gedeeltelijk retour, niet alles binnen",
          onClick: () => setBonDetail(b),
        });
      }
    }

    return list;
  }, [backupStatus, overdueBons, damageReports, bons]);

  // Wanneer de admin een bon aanmaakt namens iemand, nemen we het hele scherm
  // over met AdminBonFlow. Dat spiegelt hoe UserView tussen home en LoanFlow
  // wisselt — geen tab-inhoud + flow tegelijkertijd op één pagina.
  if (newBonMode) {
    return <AdminBonFlow
      users={users}
      eq={eq}
      materialsLoading={materialsLoading}
      materialsError={materialsError}
      refreshMaterials={refreshMaterials}
      sets={sets}
      bons={bons}
      refreshBons={refreshBons}
      setBonsError={setBonsError}
      onCancel={() => setNewBonMode(false)}
      onDone={(res) => { setNewBonMode(false); setNewBonToast(res); addLog(); }}
    />;
  }

  const goToBonsWithFilter = (filter) => { setBonFilter(filter); setTab("bons"); };
  const openNewBonFlow = () => { setNewBonToast(null); setNewBonMode(true); };

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
    <AppHeader
      branding={branding} role="admin" onLogout={onLogout}
      onAdd={() => tab === "sets" ? setNewSetOpen(true) : setAddOpen(true)}
      notificationSlot={<NotificationBell notifications={notifications}/>}
    >
      <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
        {tabs.map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${tab===k?"border-blue-600 text-blue-600":"border-transparent text-gray-500 hover:text-gray-700"}`}>{l}{k==="bons"&&openBons.length>0?` (${openBons.length})`:""}{k==="damage"&&openDamageCount>0?` (${openDamageCount})`:""}</button>)}
      </div>
    </AppHeader>

    <div className="max-w-6xl mx-auto px-4 py-6">
      <BackupBanner/>
      <ConnectionBanner loading={materialsLoading} error={materialsError} onRetry={refreshMaterials} resource="Materialen"/>
      {tab==="dashboard"&&<DashboardTab
        bons={bons}
        totalStock={totalStock}
        totalUnavail={totalUnavail}
        totalValue={totalValue}
        materialCount={eq.length}
        setCount={sets.length}
        reservedBons={reservedBons}
        onBonClick={setBonDetail}
        onOpenNewBonFlow={openNewBonFlow}
        onGoToBonsWithFilter={goToBonsWithFilter}
      />}
      {tab==="bons"&&<>
        {newBonToast && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 mb-3 text-sm text-emerald-800 flex items-center justify-between gap-3"><span>{newBonToast.text}</span><button onClick={()=>setNewBonToast(null)} className="text-emerald-700 hover:text-emerald-900 font-bold" aria-label="Sluiten">{"\u00d7"}</button></div>}
        <BonsTab bons={bons} bonsLoading={bonsLoading} bonsError={bonsError} refreshBons={refreshBons} reservedBons={reservedBons} overdueBons={overdueBons} bonFilter={bonFilter} setBonFilter={setBonFilter} onBonClick={setBonDetail} onNewBon={openNewBonFlow}/>
      </>}
      {tab==="items"&&<ItemsTab eq={eq} bons={bons} q={q} setQ={setQ} cat={cat} setCat={setCat} onItemClick={setDetail} adminScan={adminScan} setAdminScan={setAdminScan} adminScanMsg={adminScanMsg} setAdminScanMsg={setAdminScanMsg}/>}
      {tab==="sets"&&<>
        {setsError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-3 text-sm text-red-700 flex items-center justify-between gap-3"><span>{setsError.message}</span><button onClick={()=>setSetsError(null)} className="text-red-700 hover:text-red-900 font-bold" aria-label="Sluiten">{"\u00d7"}</button></div>}
        <SetsTab sets={sets} bons={bons} q={setsQ} setQ={setSetsQ} cat={setsCat} setCat={setSetsCat} onSetClick={setActiveSet} scanValue={setsScan} setScanValue={setSetsScan} scanMsg={setsScanMsg} setScanMsg={setSetsScanMsg}/>
      </>}
      {tab==="damage"&&<DamageTab reports={damageReports} reportsLoading={damageLoading} reportsError={damageError} refreshDamage={refreshDamage} refreshMaterials={refreshMaterials} refreshSets={refreshSets} addLog={addLog}/>}
      {tab==="insights"&&<InsightsTab eq={eq} bons={bons} oneYearAgo={oneYearAgo}/>}
      {tab==="log"&&<LogTab/>}
      {tab==="barcodes"&&<BarcodesTab eq={eq} sets={sets}/>}
      {tab==="users"&&<UsersTab users={users} usersLoading={usersLoading} usersError={usersError} setUsersError={setUsersError} refreshUsers={refreshUsers} addLog={addLog} newUser={newUser} setNewUser={setNewUser} editUser={editUser} setEditUser={setEditUser}/>}
      {tab==="import"&&<ImportTab refreshMaterials={refreshMaterials} refreshSets={refreshSets}/>}
      {tab==="settings"&&<SettingsTab branding={branding} setBranding={setBranding}/>}
    </div>

    <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Nieuw materiaal"><AdminForm onSave={add} onCancel={()=>setAddOpen(false)}/></Modal>
    <Modal open={!!edit} onClose={()=>setEdit(null)} title="Bewerken">{edit&&<AdminForm item={edit} onSave={save} onCancel={()=>setEdit(null)}/>}</Modal>

    <Modal open={newSetOpen} onClose={()=>setNewSetOpen(false)} title="Nieuwe set"><SetForm onSave={addSet} onCancel={()=>setNewSetOpen(false)}/></Modal>
    <Modal open={!!editSet} onClose={()=>setEditSet(null)} title="Set bewerken">{editSet&&<SetForm item={editSet} onSave={saveSet} onCancel={()=>setEditSet(null)}/>}</Modal>

    <ItemDetailModal detail={detail} setDetail={setDetail} bons={bons} eq={eq} addLog={addLog} getItemStats={getItemStats} onPrint={handlePrint} onEdit={setEdit} onDelete={del} onOpenBon={setBonDetail} onRegenBarcode={regenBarcode} damageReports={damageReports} onOpenDamage={() => setTab("damage")}/>
    <SetDetailModal detail={activeSet} setDetail={setActiveSet} bons={bons} onEdit={setEditSet} onDelete={delSet} onPrint={handlePrint} onRegenBarcode={regenSetBarcode} onOpenBon={setBonDetail}/>
    <BonDetailModal bonDetail={bonDetail} setBonDetail={setBonDetail} onForceComplete={forceCompleteBon} onUpdateBon={handleBonUpdate} onItemReturn={handleBonItemReturn} onDeleteBon={handleBonDelete}/>
  </div>;
}
