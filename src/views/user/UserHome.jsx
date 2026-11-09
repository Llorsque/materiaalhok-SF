import { Icon } from "../../components/Icon";
import { useState } from "react";
import { AppHeader } from "../../components/AppHeader";
import { Modal } from "../../components/Modal";
import { BonBadge } from "../../components/BonBadge";
import { ConnectionBanner } from "../../components/ConnectionBanner";
import { fmtDate } from "../../utils/date";
import { bonIsOverdue, itemDisplayName, bonActiveItems } from "../../utils/bons";
import { MyBonDetailModal } from "./MyBonDetailModal";
import { updateMyNotifications } from "../../api/client";

const NOTIFY_OPTIONS = [
  {
    key: "notify_reservation",
    title: "Reserveringsbevestiging",
    description: "Mail zodra je een reservering aanmaakt, met de datums en items op een rij.",
  },
  {
    key: "notify_pickup",
    title: "Ophaalbevestiging",
    description: "Mail wanneer je je materiaal daadwerkelijk uit het hok haalt.",
  },
  {
    key: "notify_reminder",
    title: "Retourherinnering",
    description: "Vriendelijke reminder op de laatste werkdag vóór de retourdatum.",
  },
];

function Toggle({ checked, disabled, onChange, id }) {
  return <button
    type="button"
    id={id}
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${checked ? "bg-accent" : "bg-slate-300"} disabled:opacity-40`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}/>
  </button>;
}

function itemLabel(it) {
  const name = itemDisplayName(it);
  return it.set_id != null ? `${name} (set)` : name;
}

function shortItems(bon, limit = 4) {
  const items = bonActiveItems(bon);
  const labels = items.slice(0, limit).map((it) => `${it.quantity}x ${itemLabel(it)}`);
  if (items.length > limit) labels.push(`+${items.length - limit} meer`);
  return labels.join(", ");
}

export function UserHome({ user, branding, bons, bonsLoading, bonsError, refreshBons, onLogout, onModeChange, done, sets, onProfileUpdate }) {
  const [showProfile, setShowProfile] = useState(false);
  const [selectedBonId, setSelectedBonId] = useState(null);
  const selectedBon = selectedBonId != null ? bons.find((b) => b.id === selectedBonId) : null;
  const [notifyBusy, setNotifyBusy] = useState(null); // welke toggle-key nu bezig is
  const [notifyError, setNotifyError] = useState(null);

  // Vult ontbrekende voorkeuren op met 1 (aan) — bestaande gebruikers uit
  // v1.6.0 hebben de nieuwe kolommen wél maar de sessionStorage-user is
  // gemaakt vóór ze bestonden, dus verdedig defensief.
  const currentPref = (key) => (user && user[key] != null ? Number(user[key]) : 1);

  const toggleNotify = async (key, next) => {
    setNotifyError(null);
    setNotifyBusy(key);
    // Optimistisch: direct de UI updaten, terugdraaien als de call faalt.
    const previous = currentPref(key);
    if (onProfileUpdate) onProfileUpdate({ [key]: next ? 1 : 0 });
    try {
      await updateMyNotifications({ [key]: next ? 1 : 0 });
    } catch (err) {
      setNotifyError(err.message || "Bijwerken mislukt");
      if (onProfileUpdate) onProfileUpdate({ [key]: previous });
    } finally {
      setNotifyBusy(null);
    }
  };

  const myBons = bons.filter((b) => b.user_id === user.id && b.status !== "completed");
  const otherActiveBons = bons.filter((b) => b.user_id !== user.id && b.status === "active");

  return <div className="min-h-screen bg-slate-50 flex flex-col">
    <AppHeader branding={branding} role="user" onLogout={onLogout} user={user} onProfileClick={()=>setShowProfile(true)}>
      <div className="max-w-xl mx-auto px-5 pb-3"><p className="text-sm text-slate-500">Welkom, {user.name}</p></div>
    </AppHeader>

    {/* Profile modal */}
    <Modal open={showProfile} onClose={()=>setShowProfile(false)} title={user.name} wide>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold" style={{backgroundColor:branding.color}}>{user.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}</div>
          <div>
            <p className="text-lg font-bold text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email} {"\u00b7"} {user.role==="admin"?"Beheerder":"Gebruiker"}</p>
            {user.login_barcode && <p className="text-xs font-mono text-slate-400 mt-1">Badge: {user.login_barcode}</p>}
          </div>
        </div>

        {(()=>{
          const userBons = bons.filter(b=>b.user_id===user.id).sort((a,b)=>(b.created_at||"").localeCompare(a.created_at||""));
          const active = userBons.filter(b=>b.status!=="completed");
          const completed = userBons.filter(b=>b.status==="completed");
          const totalItems = userBons.reduce((s,b)=>s+bonActiveItems(b).reduce((t,i)=>t+i.quantity,0),0);
          return <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-100 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-accent">{userBons.length}</p><p className="text-xs text-slate-500">Bonnen</p></div>
              <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-amber-600">{active.length}</p><p className="text-xs text-slate-500">Actief</p></div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-emerald-600">{totalItems}</p><p className="text-xs text-slate-500">Items geleend</p></div>
            </div>

            {active.length>0 && <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Actieve bonnen</p>
              <div className="space-y-2">{active.map(b=><div key={b.id} className={`rounded-xl p-3 border ${bonIsOverdue(b)?"border-red-200 bg-red-50":"border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-accent">{b.bon_number}</span><BonBadge bon={b}/></div>
                <p className="text-xs text-slate-500 mt-1">{fmtDate(b.start_date)} {"\u2192"} {fmtDate(b.return_date)}</p>
                <p className="text-xs text-slate-400 mt-1">{shortItems(b)}</p>
              </div>)}</div>
            </div>}

            {completed.length>0 && <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Geschiedenis ({completed.length})</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">{completed.slice(0,20).map(b=><button key={b.id} type="button" onClick={()=>setSelectedBonId(b.id)} className="w-full text-left rounded-xl p-3 border border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-slate-400">{b.bon_number}</span><span className="text-xs text-emerald-600">{<Icon name="check"/>} Compleet</span></div>
                <p className="text-xs text-slate-500 mt-1">{fmtDate(b.start_date)} {"\u2192"} {fmtDate(b.return_date)}</p>
                <p className="text-xs text-slate-400 mt-1">{shortItems(b)}</p>
              </button>)}</div>
            </div>}

            {userBons.length===0 && <p className="text-center text-slate-400 py-4">Nog geen bonnen</p>}
          </div>;
        })()}

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-3">E-mailvoorkeuren</p>
          <div className="space-y-3">
            {NOTIFY_OPTIONS.map((opt) => {
              const checked = currentPref(opt.key) === 1;
              return <div key={opt.key} className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <label htmlFor={`toggle-${opt.key}`} className="text-sm font-semibold text-slate-800 cursor-pointer">{opt.title}</label>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                </div>
                <Toggle id={`toggle-${opt.key}`} checked={checked} disabled={notifyBusy === opt.key} onChange={(v) => toggleNotify(opt.key, v)}/>
              </div>;
            })}
          </div>
          {notifyError && <p className="text-xs text-red-600 mt-2">{notifyError}</p>}
        </div>

        <button onClick={onLogout} className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200">Uitloggen</button>
      </div>
    </Modal>

    {done&&<div className="max-w-4xl mx-auto mt-4 px-5"><div className={`rounded-2xl px-5 py-4 text-center font-semibold border text-base ${done.action==="loan"?"bg-slate-100 text-slate-800 border-slate-200":done.action==="return"?"bg-emerald-50 text-emerald-800 border-emerald-200":done.action==="reservation"?"bg-slate-100 text-slate-800 border-slate-200":"bg-amber-50 text-amber-800 border-amber-200"}`}>{done.text}</div></div>}

    <div className="max-w-4xl mx-auto w-full px-5 py-8 space-y-6">
      <ConnectionBanner loading={bonsLoading} error={bonsError} onRetry={refreshBons} resource="Bonnen"/>

      {/* Vier hoofd-acties — sinds v1.8.0 zijn ophalen en retourneren
          gescheiden zodat de gebruiker weet welke flow 'ie ingaat. Altijd
          bovenaan de pagina, direct onder de header: dit is waarvoor
          gebruikers de tool openen. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { key: "loan", res: false, icon: "out", label: "Lenen", sub: "Nu meenemen" },
          { key: "loan", res: true, icon: "calendar", label: "Reserveren", sub: "Voor later vastleggen" },
          { key: "pickup", res: false, icon: "package", label: "Ophalen", sub: "Reservering meenemen" },
          { key: "return", res: false, icon: "in", label: "Retourneren", sub: "Terugbrengen" },
        ].map((a) => <button key={a.label} onClick={()=>onModeChange(a.key, a.res)} className="group text-left p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-accent hover:shadow-md active:scale-[0.98] transition-all">
          <span className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-2xl sm:text-3xl mb-3 ${a.key === "return" ? "bg-emerald-50 text-emerald-600" : "bg-accent/10 text-accent"}`}><Icon name={a.icon}/></span>
          <span className="block text-base sm:text-lg font-bold text-slate-900">{a.label}</span>
          <span className="block text-xs sm:text-sm text-slate-500 mt-0.5">{a.sub}</span>
        </button>)}
      </div>

      {/* Mijn actieve uitleningen — overzicht onder de acties. */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <p className="text-sm font-semibold text-slate-500 uppercase mb-3">Mijn actieve uitleningen{myBons.length>0?` (${myBons.length})`:""}</p>
        {myBons.length===0 ? <p className="text-sm text-slate-400">Geen actieve uitleningen</p> :
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myBons.map(b=><button key={b.id} type="button" onClick={()=>setSelectedBonId(b.id)} className={`text-left rounded-xl p-4 border transition-all cursor-pointer hover:shadow-md ${bonIsOverdue(b)?"border-red-200 bg-red-50 hover:border-red-300":"border-slate-100 bg-slate-50 hover:border-slate-300 hover:bg-white"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold text-accent">{b.bon_number}</span>
                <BonBadge bon={b}/>
              </div>
              <p className="text-xs text-slate-400 mt-2 break-words">{shortItems(b)}</p>
              <p className="text-xs text-slate-500 mt-1">Retour: {fmtDate(b.return_date)}</p>
            </button>)}
          </div>
        }
      </div>

      <MyBonDetailModal bon={selectedBon} sets={sets} userName={user.name} onClose={()=>setSelectedBonId(null)} onChanged={refreshBons}/>

      {/* Andere uitleningen in het hok (nieuw) — read-only */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <p className="text-sm font-semibold text-slate-500 uppercase mb-3">Andere uitleningen in het hok{otherActiveBons.length>0?` (${otherActiveBons.length})`:""}</p>
        {otherActiveBons.length===0 ? <p className="text-sm text-slate-400">Niemand anders heeft op dit moment materiaal uit</p> :
          <div className="space-y-2">
            {otherActiveBons.map(b=><div key={b.id} className="rounded-xl px-4 py-3 border border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">{b.user_name}</p>
                <p className="text-xs text-slate-500">Retour: {fmtDate(b.return_date)}</p>
              </div>
              <p className="text-xs text-slate-500 mt-1 break-words">{shortItems(b)}</p>
            </div>)}
          </div>
        }
      </div>
    </div>
  </div>;
}
