export function AppHeader({ branding, role, onLogout, children, onAdd, user, onProfileClick }) {
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
