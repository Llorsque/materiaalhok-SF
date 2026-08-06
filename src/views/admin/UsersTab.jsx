import { useState } from "react";
import { Modal } from "../../components/Modal";
import { ConnectionBanner } from "../../components/ConnectionBanner";
import { TileGrid, Tile } from "../../components/TileGrid";
import { encodeCode128B } from "../../utils/barcode";
import { genLoginCode } from "../../utils/bons";
import { createUser, updateUser, deleteUser as apiDeleteUser, resetUserPassword } from "../../api/client";

export function UsersTab({ users, usersLoading, usersError, setUsersError, refreshUsers, addLog, newUser, setNewUser, editUser, setEditUser }) {
  // Detail-modal: opent bij klik op een tile en biedt de vier acties
  // (print, bewerken, wachtwoord resetten, verwijderen). De onderliggende
  // handlers zijn ongewijzigd — deze modal fungeert alleen als nieuwe
  // ingang, in plaats van de knoppen naast elke lijstregel.
  const [activeUser, setActiveUser] = useState(null);
  // Nieuw-gebruiker-modal: was voorheen een inline formulier onder de lijst.
  const [addOpen, setAddOpen] = useState(false);

  const [resetTarget, setResetTarget] = useState(null);
  const [resetPass, setResetPass] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState(null);
  const [resetDone, setResetDone] = useState(null);

  const openReset = (u) => {
    setResetTarget(u);
    setResetPass("");
    setResetConfirm("");
    setResetError(null);
    setResetDone(null);
  };
  const closeReset = () => {
    if (resetBusy) return;
    setResetTarget(null);
    setResetPass("");
    setResetConfirm("");
    setResetError(null);
    setResetDone(null);
  };
  const confirmReset = async () => {
    setResetError(null);
    if (resetPass.length < 8) { setResetError("Wachtwoord moet minstens 8 tekens zijn"); return; }
    if (resetPass !== resetConfirm) { setResetError("De twee wachtwoorden komen niet overeen"); return; }
    setResetBusy(true);
    try {
      await resetUserPassword(resetTarget.id, resetPass);
      setResetDone({ name: resetTarget.name });
      addLog();
    } catch (err) {
      setResetError(err.message || "Reset mislukt");
    } finally {
      setResetBusy(false);
    }
  };
  const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lc = "block text-sm font-medium text-gray-700 mb-1.5";

  const addUser = async () => {
    if (!newUser.name?.trim() || !newUser.email?.trim() || !newUser.password?.trim()) return;
    try {
      await createUser({
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
        login_barcode: genLoginCode(),
      });
      await refreshUsers();
      addLog("edit", `Gebruiker "${newUser.name.trim()}" (${newUser.email.trim()}) aangemaakt`);
      setNewUser({ name: "", email: "", password: "", role: "user" });
      setAddOpen(false);
    } catch (err) {
      setUsersError(err);
    }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Gebruiker "${u.name}" verwijderen?`)) return;
    try {
      await apiDeleteUser(u.id);
      await refreshUsers();
      addLog("edit", `Gebruiker "${u.name}" (${u.email}) verwijderd`);
      setActiveUser(null);
    } catch (err) {
      setUsersError(err);
    }
  };

  const saveUser = async () => {
    if (!editUser || !editUser.name?.trim() || !editUser.email?.trim()) return;
    try {
      const payload = {
        name: editUser.name.trim(),
        email: editUser.email.trim(),
        role: editUser.role,
        login_barcode: editUser.login_barcode || null,
        notify_reservation: editUser.notify_reservation ? 1 : 0,
        notify_pickup:      editUser.notify_pickup      ? 1 : 0,
        notify_reminder:    editUser.notify_reminder    ? 1 : 0,
      };
      // Alleen meesturen als gebruiker expliciet een nieuw wachtwoord intikt.
      if (editUser.password && editUser.password.trim()) {
        payload.password = editUser.password;
      }
      await updateUser(editUser.id, payload);
      await refreshUsers();
      addLog("edit", `Gebruiker "${editUser.name}" bijgewerkt`);
      setEditUser(null);
    } catch (err) {
      setUsersError(err);
    }
  };

  const printBadge = (u) => {
    const w = window.open('','_blank');
    const code = u.login_barcode || "NOCODE";
    const modules = encodeCode128B(code);
    const mw = 2.5; const bw = modules.length * mw + 40; const bh = 80;
    const rects = []; let x = 20;
    for (let j = 0; j < modules.length; j++) { if (modules[j] === '1') rects.push(`<rect x="${x}" y="10" width="${mw}" height="${bh}" fill="black"/>`); x += mw; }
    w.document.write(`<html><head><title>Badge - ${u.name}</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
      .badge{border:2px solid #ccc;border-radius:16px;padding:30px;text-align:center;width:350px}
      .name{font-size:24px;font-weight:bold;margin-bottom:4px}
      .role{font-size:14px;color:#666;margin-bottom:20px}
      .code{font-family:monospace;font-size:16px;font-weight:bold;margin-top:8px;letter-spacing:2px}
      .hint{font-size:11px;color:#999;margin-top:12px}
      @media print{body{min-height:auto}.badge{border:2px solid #000}}</style></head>
      <body><div class="badge">
        <div class="name">${u.name}</div>
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
    // Admins loggen in met e-mail + wachtwoord en scannen geen badge, dus
    // ze horen niet op het badge-vel. Sorteren op naam (case-insensitieve
    // NL-locale) zodat het vel altijd A-Z staat, onafhankelijk van de
    // volgorde waarin gebruikers zijn aangemaakt.
    const printable = users
      .filter(u => u.role !== "admin")
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "nl", { sensitivity: "base" }));
    const w = window.open('','_blank');
    const badges = printable.map(u => {
      const code = u.login_barcode || "NOCODE";
      const modules = encodeCode128B(code);
      const mw = 2; const bw = modules.length * mw + 30; const bh = 60;
      const rects = []; let x = 15;
      for (let j = 0; j < modules.length; j++) { if (modules[j] === '1') rects.push(`<rect x="${x}" y="8" width="${mw}" height="${bh}" fill="black"/>`); x += mw; }
      return `<div class="badge">
        <div class="name">${u.name}</div>
        <div class="role">${u.role === "admin" ? "Beheerder" : "Gebruiker"}</div>
        <svg viewBox="0 0 ${bw} ${bh + 24}" width="${bw}" height="${bh + 24}" style="background:white">
          ${rects.join('')}
          <text x="${bw/2}" y="${bh + 18}" text-anchor="middle" font-size="12" font-family="monospace" font-weight="bold">${code}</text>
        </svg>
      </div>`;
    }).join('');
    w.document.write(`<html><head><title>Badges (${printable.length})</title><style>body{font-family:sans-serif;display:flex;flex-wrap:wrap;gap:20px;padding:20px;justify-content:center}
      .badge{border:2px solid #ccc;border-radius:12px;padding:20px;text-align:center;width:280px;break-inside:avoid}
      .name{font-size:18px;font-weight:bold;margin-bottom:2px}
      .role{font-size:12px;color:#666;margin-bottom:12px}
      @media print{.badge{border:2px solid #000}}</style></head>
      <body>${badges}<script>setTimeout(()=>window.print(),500)<\/script></body></html>`);
  };

  const openAdd = () => {
    setNewUser({ name: "", email: "", password: "", role: "user" });
    setAddOpen(true);
  };

  const openEditFromDetail = (u) => {
    setEditUser({ ...u, password: "" });
    setActiveUser(null);
  };
  const openResetFromDetail = (u) => {
    openReset(u);
    setActiveUser(null);
  };

  return <div className="space-y-6">
    <ConnectionBanner loading={usersLoading} error={usersError} onRetry={refreshUsers} resource="Gebruikers"/>

    <div className="flex items-center justify-between gap-3">
      <h3 className="text-lg font-bold text-gray-900">Gebruikers ({users.length})</h3>
      <div className="flex items-center gap-2">
        <button onClick={printAllBadges} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">{"\ud83d\udda8"} Print alle badges</button>
        <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 whitespace-nowrap">{"\u2795"} Nieuwe gebruiker</button>
      </div>
    </div>

    <TileGrid>
      {users.map(u => {
        const isAdmin = u.role === "admin";
        const media = <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${isAdmin ? "bg-blue-600" : "bg-gray-500"}`}>
          {(u.name || "?").charAt(0).toUpperCase()}
        </div>;
        return <Tile
          key={u.id}
          onClick={() => setActiveUser(u)}
          media={media}
          title={u.name}
          subtitle={u.email}
          badges={[{ text: isAdmin ? "Beheerder" : "Gebruiker", tone: isAdmin ? "blue" : "gray" }]}
          extra={u.login_barcode && <p className="text-[11px] text-gray-400 font-mono truncate">{u.login_barcode}</p>}
        />;
      })}
    </TileGrid>

    {/* Detail modal — biedt alle acties, geen actieknoppen meer op de tile */}
    <Modal open={!!activeUser} onClose={() => setActiveUser(null)} title={activeUser ? activeUser.name : "Gebruiker"}>
      {activeUser && <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl ${activeUser.role === "admin" ? "bg-blue-600" : "bg-gray-500"}`}>
            {(activeUser.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{activeUser.name}</p>
            <p className="text-xs text-gray-500 truncate">{activeUser.email}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${activeUser.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
              {activeUser.role === "admin" ? "Beheerder" : "Gebruiker"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] uppercase font-semibold text-gray-500 mb-1">Badge-code</p>
            <p className="font-mono text-gray-800">{activeUser.login_barcode || "\u2014"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase font-semibold text-gray-500 mb-1">Rol</p>
            <p className="text-gray-800">{activeUser.role === "admin" ? "Beheerder" : "Gebruiker"}</p>
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase font-semibold text-gray-500 mb-2">E-mailvoorkeuren</p>
          <ul className="text-sm text-gray-700 space-y-1">
            {[
              ["notify_reservation", "Reserveringsbevestiging"],
              ["notify_pickup",      "Ophaalbevestiging"],
              ["notify_reminder",    "Retourherinnering"],
            ].map(([key, label]) => <li key={key} className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${activeUser[key] ? "bg-emerald-500" : "bg-gray-300"}`}/>
              <span>{label}</span>
              <span className="text-xs text-gray-400">{activeUser[key] ? "aan" : "uit"}</span>
            </li>)}
          </ul>
          <p className="text-[11px] text-gray-400 mt-1">Wijzig via Bewerken.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button onClick={() => printBadge(activeUser)} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200">{"\ud83d\udda8"} Print badge</button>
          <button onClick={() => openEditFromDetail(activeUser)} className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100">Bewerken</button>
          <button onClick={() => openResetFromDetail(activeUser)} className="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100">Wachtwoord resetten</button>
          <button onClick={() => handleDelete(activeUser)} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100">Verwijder</button>
        </div>
      </div>}
    </Modal>

    {/* Nieuwe gebruiker — voorheen inline onder de lijst */}
    <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nieuwe gebruiker">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lc}>Naam</label><input className={ic} value={newUser.name} onChange={e=>setNewUser(p=>({...p,name:e.target.value}))} placeholder="Bijv. Jan de Vries"/></div>
          <div><label className={lc}>E-mailadres</label><input type="email" className={ic} value={newUser.email||""} onChange={e=>setNewUser(p=>({...p,email:e.target.value}))} placeholder="bijv. jan@voorbeeld.nl"/></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lc}>Wachtwoord</label><input className={ic} value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} placeholder="Minimaal 6 tekens"/></div>
          <div><label className={lc}>Rol</label><select className={ic} value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}><option value="user">Gebruiker</option><option value="admin">Beheerder</option></select></div>
        </div>
        <p className="text-xs text-gray-400">Er wordt automatisch een unieke badge-code aangemaakt</p>
        <div className="flex gap-3 pt-2">
          <button onClick={addUser} disabled={!newUser.name?.trim()||!newUser.email?.trim()||!newUser.password?.trim()} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-40">Gebruiker toevoegen</button>
          <button onClick={() => setAddOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50">Annuleren</button>
        </div>
      </div>
    </Modal>

    {/* Password reset modal */}
    <Modal open={!!resetTarget} onClose={closeReset} title={resetTarget ? `Wachtwoord resetten \u2014 ${resetTarget.name}` : "Wachtwoord resetten"}>
      {resetTarget && !resetDone && <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900">
          Na het resetten wordt <span className="font-semibold">{resetTarget.name}</span> op alle
          apparaten uitgelogd. De gebruiker moet inloggen met het nieuwe wachtwoord.
        </div>
        <div>
          <label className={lc}>Nieuw wachtwoord *</label>
          <input type="password" autoComplete="new-password" className={ic} value={resetPass} onChange={e=>setResetPass(e.target.value)} placeholder="Minimaal 8 tekens"/>
        </div>
        <div>
          <label className={lc}>Herhaal wachtwoord *</label>
          <input type="password" autoComplete="new-password" className={ic} value={resetConfirm} onChange={e=>setResetConfirm(e.target.value)} placeholder="Typ hetzelfde wachtwoord"/>
        </div>
        {resetError && <p className="text-sm text-red-600">{resetError}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={confirmReset} disabled={resetBusy} className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 disabled:opacity-40">{resetBusy ? "Bezig..." : "Wachtwoord resetten"}</button>
          <button onClick={closeReset} disabled={resetBusy} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 disabled:opacity-40">Annuleren</button>
        </div>
      </div>}
      {resetTarget && resetDone && <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
          Wachtwoord van <span className="font-semibold">{resetDone.name}</span> is bijgewerkt.
          Actieve sessies zijn ongeldig gemaakt.
        </div>
        <button onClick={closeReset} className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">Sluiten</button>
      </div>}
    </Modal>

    {/* Edit modal */}
    <Modal open={!!editUser} onClose={()=>setEditUser(null)} title="Gebruiker bewerken">
      {editUser&&<div className="space-y-4">
        <div><label className={lc}>Naam</label><input className={ic} value={editUser.name} onChange={e=>setEditUser(p=>({...p,name:e.target.value}))}/></div>
        <div><label className={lc}>E-mailadres</label><input type="email" className={ic} value={editUser.email||""} onChange={e=>setEditUser(p=>({...p,email:e.target.value}))}/></div>
        <div><label className={lc}>Nieuw wachtwoord <span className="text-gray-400 font-normal">(laat leeg om ongewijzigd te houden)</span></label><input className={ic} value={editUser.password||""} onChange={e=>setEditUser(p=>({...p,password:e.target.value}))} placeholder="Minimaal 6 tekens"/></div>
        <div><label className={lc}>Badge-code</label><div className="flex gap-2"><input value={editUser.login_barcode||""} disabled className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-500 font-mono"/><button onClick={()=>setEditUser(p=>({...p,login_barcode:genLoginCode()}))} className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200">Nieuwe code</button></div></div>
        <div><label className={lc}>Rol</label><select className={ic} value={editUser.role} onChange={e=>setEditUser(p=>({...p,role:e.target.value}))}><option value="user">Gebruiker</option><option value="admin">Beheerder</option></select></div>
        <div className="pt-1">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">E-mailvoorkeuren</p>
          {[
            ["notify_reservation", "Reserveringsbevestiging"],
            ["notify_pickup", "Ophaalbevestiging"],
            ["notify_reminder", "Retourherinnering"],
          ].map(([key, label]) => <label key={key} className="flex items-center gap-3 py-1.5 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={!!editUser[key]} onChange={e=>setEditUser(p=>({...p, [key]: e.target.checked ? 1 : 0}))}/>
            <span className="text-sm text-gray-700">{label}</span>
          </label>)}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={saveUser} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">Opslaan</button>
          <button onClick={()=>setEditUser(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50">Annuleren</button>
        </div>
      </div>}
    </Modal>
  </div>;
}
