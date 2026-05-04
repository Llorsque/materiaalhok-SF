import { useState } from "react";
import { AppHeader } from "../../components/AppHeader";
import { Modal } from "../../components/Modal";
import { BonBadge } from "../../components/BonBadge";
import { fmtDate } from "../../utils/date";
import { bonIsOverdue } from "../../utils/bons";

export function UserHome({ user, branding, bons, onLogout, onModeChange, done }) {
  const [showProfile, setShowProfile] = useState(false);
  const myBons = bons.filter(b=>b.user===user.label&&b.status!=="completed");

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex flex-col">
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
        <button onClick={()=>onModeChange("loan", false)} className="py-10 rounded-3xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xl transition-all hover:scale-105 active:scale-95">
          <span className="text-4xl block mb-2">{"\ud83d\udce4"}</span><span className="text-lg">Materiaal lenen</span>
        </button>
        <button onClick={()=>onModeChange("loan", true)} className="py-10 rounded-3xl bg-purple-500 hover:bg-purple-600 text-white font-bold shadow-xl transition-all hover:scale-105 active:scale-95">
          <span className="text-4xl block mb-2">{"\ud83d\udcc5"}</span><span className="text-lg">Reserveren</span>
        </button>
        <button onClick={()=>onModeChange("return", false)} className="py-10 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-xl transition-all hover:scale-105 active:scale-95">
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
}
