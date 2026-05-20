export function AppHeader({ branding, role, onLogout, children, onAdd, user, onProfileClick }) {
  return <div className="bg-white border-b border-gray-100 shadow-sm">
    <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {branding.logo ? <img src={branding.logo} className="rounded-xl object-contain" style={{width:branding.logoSize||40,height:branding.logoSize||40}} alt=""/> : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg" style={{backgroundColor:branding.color}}>{"\ud83c\udfc5"}</div>}
        <div><h1 className="text-xl font-bold text-gray-900">{branding.title}</h1><p className="text-xs text-gray-500">{role === "admin" ? "Beheerder" : branding.subtitle}</p></div>
      </div>
      <div className="flex items-center gap-2">
        {onAdd && <button onClick={onAdd} className="px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90" style={{backgroundColor:branding.color}}>+ Nieuw</button>}
        {user && <button onClick={onProfileClick} className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold hover:opacity-90 transition-opacity" style={{backgroundColor:branding.color}} title={user.name}>{user.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}</button>}
        {onLogout && <button onClick={onLogout} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50" title="Uitloggen">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Uitloggen</span>
        </button>}
      </div>
    </div>
    {children}
  </div>;
}
