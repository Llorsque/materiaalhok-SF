import { useState } from "react";
import { AppHeader } from "../../components/AppHeader";
import { Modal } from "../../components/Modal";
import { BonBadge } from "../../components/BonBadge";
import { ConnectionBanner } from "../../components/ConnectionBanner";
import { fmtDate } from "../../utils/date";
import { bonIsOverdue, itemDisplayName } from "../../utils/bons";
import { MyBonDetailModal } from "./MyBonDetailModal";

function itemLabel(it) {
  const name = itemDisplayName(it);
  return it.set_id != null ? `${name} (set)` : name;
}

function shortItems(bon, limit = 4) {
  const items = bon.items || [];
  const labels = items.slice(0, limit).map((it) => `${it.quantity}x ${itemLabel(it)}`);
  if (items.length > limit) labels.push(`+${items.length - limit} meer`);
  return labels.join(", ");
}

export function UserHome({ user, branding, bons, bonsLoading, bonsError, refreshBons, onLogout, onModeChange, done, sets }) {
  const [showProfile, setShowProfile] = useState(false);
  const [selectedBonId, setSelectedBonId] = useState(null);
  const selectedBon = selectedBonId != null ? bons.find((b) => b.id === selectedBonId) : null;

  const myBons = bons.filter((b) => b.user_id === user.id && b.status !== "completed");
  const otherActiveBons = bons.filter((b) => b.user_id !== user.id && b.status === "active");

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex flex-col">
    <AppHeader branding={branding} role="user" onLogout={onLogout} user={user} onProfileClick={()=>setShowProfile(true)}>
      <div className="max-w-xl mx-auto px-5 pb-3"><p className="text-sm text-gray-500">Welkom, {user.name}</p></div>
    </AppHeader>

    {/* Profile modal */}
    <Modal open={showProfile} onClose={()=>setShowProfile(false)} title={user.name} wide>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold" style={{backgroundColor:branding.color}}>{user.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}</div>
          <div>
            <p className="text-lg font-bold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email} {"\u00b7"} {user.role==="admin"?"Beheerder":"Gebruiker"}</p>
            {user.login_barcode && <p className="text-xs font-mono text-gray-400 mt-1">Badge: {user.login_barcode}</p>}
          </div>
        </div>

        {(()=>{
          const userBons = bons.filter(b=>b.user_id===user.id).sort((a,b)=>(b.created_at||"").localeCompare(a.created_at||""));
          const active = userBons.filter(b=>b.status!=="completed");
          const completed = userBons.filter(b=>b.status==="completed");
          const totalItems = userBons.reduce((s,b)=>s+(b.items||[]).reduce((t,i)=>t+i.quantity,0),0);
          return <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-blue-600">{userBons.length}</p><p className="text-xs text-gray-500">Bonnen</p></div>
              <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-amber-600">{active.length}</p><p className="text-xs text-gray-500">Actief</p></div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-emerald-600">{totalItems}</p><p className="text-xs text-gray-500">Items geleend</p></div>
            </div>

            {active.length>0 && <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Actieve bonnen</p>
              <div className="space-y-2">{active.map(b=><div key={b.id} className={`rounded-xl p-3 border ${bonIsOverdue(b)?"border-red-200 bg-red-50":"border-gray-200 bg-gray-50"}`}>
                <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-blue-600">{b.bon_number}</span><BonBadge bon={b}/></div>
                <p className="text-xs text-gray-500 mt-1">{fmtDate(b.start_date)} {"\u2192"} {fmtDate(b.return_date)}</p>
                <p className="text-xs text-gray-400 mt-1">{shortItems(b)}</p>
              </div>)}</div>
            </div>}

            {completed.length>0 && <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Geschiedenis ({completed.length})</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">{completed.slice(0,20).map(b=><div key={b.id} className="rounded-xl p-3 border border-gray-100 bg-white">
                <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-gray-400">{b.bon_number}</span><span className="text-xs text-emerald-600">{"\u2705"} Compleet</span></div>
                <p className="text-xs text-gray-500 mt-1">{fmtDate(b.start_date)} {"\u2192"} {fmtDate(b.return_date)}</p>
                <p className="text-xs text-gray-400 mt-1">{shortItems(b)}</p>
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
      <ConnectionBanner loading={bonsLoading} error={bonsError} onRetry={refreshBons} resource="Bonnen"/>

      {/* Mijn actieve uitleningen (nieuw) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Mijn actieve uitleningen{myBons.length>0?` (${myBons.length})`:""}</p>
        {myBons.length===0 ? <p className="text-sm text-gray-400">Geen actieve uitleningen</p> :
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myBons.map(b=><button key={b.id} type="button" onClick={()=>setSelectedBonId(b.id)} className={`text-left rounded-xl p-4 border transition-all cursor-pointer hover:shadow-md ${bonIsOverdue(b)?"border-red-200 bg-red-50 hover:border-red-300":"border-gray-100 bg-gray-50 hover:border-gray-300 hover:bg-white"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold text-blue-600">{b.bon_number}</span>
                <BonBadge bon={b}/>
              </div>
              <p className="text-xs text-gray-400 mt-2 break-words">{shortItems(b)}</p>
              <p className="text-xs text-gray-500 mt-1">Retour: {fmtDate(b.return_date)}</p>
            </button>)}
          </div>
        }
      </div>

      {/* Drie hoofd-acties */}
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

      <MyBonDetailModal bon={selectedBon} sets={sets} userName={user.name} onClose={()=>setSelectedBonId(null)}/>

      {/* Andere uitleningen in het hok (nieuw) — read-only */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Andere uitleningen in het hok{otherActiveBons.length>0?` (${otherActiveBons.length})`:""}</p>
        {otherActiveBons.length===0 ? <p className="text-sm text-gray-400">Niemand anders heeft op dit moment materiaal uit</p> :
          <div className="space-y-2">
            {otherActiveBons.map(b=><div key={b.id} className="rounded-xl px-4 py-3 border border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-700">{b.user_name}</p>
                <p className="text-xs text-gray-500">Retour: {fmtDate(b.return_date)}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1 break-words">{shortItems(b)}</p>
            </div>)}
          </div>
        }
      </div>
    </div>
  </div>;
}
