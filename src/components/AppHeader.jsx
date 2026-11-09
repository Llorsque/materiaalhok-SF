// v2: kopbalk die ook op een telefoon past. Op smalle schermen wordt de titel
// ingekort, krimpt "+ Nieuw" tot een plusje en toont Uitloggen alleen het
// icoon. Op de laptop blijft alles zoals het was.
export function AppHeader({ branding, role, onLogout, children, onAdd, user, onProfileClick, notificationSlot }) {
  return <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
    <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {branding.logo ? <img src={branding.logo} className="rounded-xl object-contain flex-shrink-0" style={{width:branding.logoSize||40,height:branding.logoSize||40}} alt=""/> : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0" style={{backgroundColor:branding.color}}>{"🏅"}</div>}
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{branding.title}</h1>
          <p className="text-xs text-slate-500 truncate">{role === "admin" ? "Beheerder" : branding.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onAdd && <button onClick={onAdd} className="h-10 px-3 sm:px-4 rounded-xl text-white text-sm font-semibold hover:opacity-90" style={{backgroundColor:branding.color}} title="Toevoegen">
          <span className="sm:hidden text-lg leading-none">+</span><span className="hidden sm:inline">+ Nieuw</span>
        </button>}
        {notificationSlot}
        {user && <button onClick={onProfileClick} className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold hover:opacity-90 transition-opacity" style={{backgroundColor:branding.color}} title={user.name}>{user.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}</button>}
        {onLogout && <button onClick={onLogout} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50" title="Uitloggen" aria-label="Uitloggen">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span className="hidden sm:inline">Uitloggen</span>
        </button>}
      </div>
    </div>
    {children}
  </div>;
}
