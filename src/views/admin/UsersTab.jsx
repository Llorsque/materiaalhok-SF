import { Modal } from "../../components/Modal";
import { encodeCode128B } from "../../utils/barcode";
import { genLoginCode } from "../../utils/bons";

export function UsersTab({ users, setUsers, addLog, newUser, setNewUser, editUser, setEditUser }) {
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
}
