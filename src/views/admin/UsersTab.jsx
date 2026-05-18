import { Modal } from "../../components/Modal";
import { ConnectionBanner } from "../../components/ConnectionBanner";
import { encodeCode128B } from "../../utils/barcode";
import { genLoginCode } from "../../utils/bons";
import { createUser, updateUser, deleteUser as apiDeleteUser } from "../../api/client";

export function UsersTab({ users, usersLoading, usersError, setUsersError, refreshUsers, addLog, newUser, setNewUser, editUser, setEditUser }) {
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
    } catch (err) {
      setUsersError(err.message || "Aanmaken mislukt");
    }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Gebruiker "${u.name}" verwijderen?`)) return;
    try {
      await apiDeleteUser(u.id);
      await refreshUsers();
      addLog("edit", `Gebruiker "${u.name}" (${u.email}) verwijderd`);
    } catch (err) {
      setUsersError(err.message || "Verwijderen mislukt");
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
      setUsersError(err.message || "Opslaan mislukt");
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
    const w = window.open('','_blank');
    const badges = users.map(u => {
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
    w.document.write(`<html><head><title>Badges</title><style>body{font-family:sans-serif;display:flex;flex-wrap:wrap;gap:20px;padding:20px;justify-content:center}
      .badge{border:2px solid #ccc;border-radius:12px;padding:20px;text-align:center;width:280px;break-inside:avoid}
      .name{font-size:18px;font-weight:bold;margin-bottom:2px}
      .role{font-size:12px;color:#666;margin-bottom:12px}
      @media print{.badge{border:2px solid #000}}</style></head>
      <body>${badges}<script>setTimeout(()=>window.print(),500)<\/script></body></html>`);
  };

  return <div className="space-y-6 max-w-2xl">
    <ConnectionBanner loading={usersLoading} error={usersError} onRetry={refreshUsers} resource="Gebruikers"/>

    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold text-gray-900">Gebruikers ({users.length})</h3>
      <button onClick={printAllBadges} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">{"\ud83d\udda8"} Print alle badges</button>
    </div>

    {/* User list */}
    <div className="space-y-2">
      {users.map(u => <div key={u.id} className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${u.role==="admin"?"bg-blue-600":"bg-gray-500"}`}>{u.name.charAt(0).toUpperCase()}</div>
            <div>
              <p className="font-semibold text-gray-900">{u.name}</p>
              <p className="text-xs text-gray-500">{u.email} {"\u00b7"} {u.role==="admin"?"Beheerder":"Gebruiker"} {"\u00b7"} <span className="font-mono">{u.login_barcode||"geen code"}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>printBadge(u)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200">{"\ud83d\udda8"}</button>
            <button onClick={()=>setEditUser({...u, password: ""})} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100">Bewerken</button>
            <button onClick={()=>handleDelete(u)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100">Verwijder</button>
          </div>
        </div>
      </div>)}
    </div>

    {/* Add new user */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
      <h4 className="font-semibold text-gray-800">Nieuwe gebruiker</h4>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lc}>Naam</label><input className={ic} value={newUser.name} onChange={e=>setNewUser(p=>({...p,name:e.target.value}))} placeholder="Bijv. Jan de Vries"/></div>
        <div><label className={lc}>E-mailadres</label><input type="email" className={ic} value={newUser.email||""} onChange={e=>setNewUser(p=>({...p,email:e.target.value}))} placeholder="bijv. jan@voorbeeld.nl"/></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lc}>Wachtwoord</label><input className={ic} value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} placeholder="Minimaal 6 tekens"/></div>
        <div><label className={lc}>Rol</label><select className={ic} value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}><option value="user">Gebruiker</option><option value="admin">Beheerder</option></select></div>
      </div>
      <p className="text-xs text-gray-400">Er wordt automatisch een unieke badge-code aangemaakt</p>
      <button onClick={addUser} disabled={!newUser.name?.trim()||!newUser.email?.trim()||!newUser.password?.trim()} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-40">Gebruiker toevoegen</button>
    </div>

    {/* Edit modal */}
    <Modal open={!!editUser} onClose={()=>setEditUser(null)} title="Gebruiker bewerken">
      {editUser&&<div className="space-y-4">
        <div><label className={lc}>Naam</label><input className={ic} value={editUser.name} onChange={e=>setEditUser(p=>({...p,name:e.target.value}))}/></div>
        <div><label className={lc}>E-mailadres</label><input type="email" className={ic} value={editUser.email||""} onChange={e=>setEditUser(p=>({...p,email:e.target.value}))}/></div>
        <div><label className={lc}>Nieuw wachtwoord <span className="text-gray-400 font-normal">(laat leeg om ongewijzigd te houden)</span></label><input className={ic} value={editUser.password||""} onChange={e=>setEditUser(p=>({...p,password:e.target.value}))} placeholder="Minimaal 6 tekens"/></div>
        <div><label className={lc}>Badge-code</label><div className="flex gap-2"><input value={editUser.login_barcode||""} disabled className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-500 font-mono"/><button onClick={()=>setEditUser(p=>({...p,login_barcode:genLoginCode()}))} className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200">Nieuwe code</button></div></div>
        <div><label className={lc}>Rol</label><select className={ic} value={editUser.role} onChange={e=>setEditUser(p=>({...p,role:e.target.value}))}><option value="user">Gebruiker</option><option value="admin">Beheerder</option></select></div>
        <div className="flex gap-3 pt-2">
          <button onClick={saveUser} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">Opslaan</button>
          <button onClick={()=>setEditUser(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50">Annuleren</button>
        </div>
      </div>}
    </Modal>
  </div>;
}
