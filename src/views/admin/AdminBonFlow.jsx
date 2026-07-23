import { useMemo, useState } from "react";
import { LoanFlow } from "../user/LoanFlow";

// Wrap rond de bestaande LoanFlow zodat een admin namens een bestaande
// gebruiker een bon (of reservering) kan aanmaken. Alle voorraad-, weekend-
// en datumcontroles komen gratis mee uit LoanFlow; hier voegen we alleen de
// keuze "voor wie?" en "direct lenen of reservering?" toe.
export function AdminBonFlow({ users, eq, materialsLoading, materialsError, refreshMaterials, sets, bons, refreshBons, setBonsError, onCancel, onDone }) {
  const [q, setQ] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [mode, setMode] = useState(null); // "loan" | "reservation"

  // Alleen echte gebruikers — admins zijn expliciet uitgesloten.
  const eligibleUsers = useMemo(
    () => (users || []).filter((u) => u.role === "user"),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return eligibleUsers;
    return eligibleUsers.filter((u) =>
      u.name.toLowerCase().includes(needle) || (u.email || "").toLowerCase().includes(needle),
    );
  }, [eligibleUsers, q]);

  if (selectedUser && mode) {
    return <LoanFlow
      eq={eq}
      materialsLoading={materialsLoading}
      materialsError={materialsError}
      refreshMaterials={refreshMaterials}
      sets={sets}
      bons={bons}
      refreshBons={refreshBons}
      setBonsError={setBonsError}
      user={selectedUser}
      isReservation={mode === "reservation"}
      // Vanaf de eerste LoanFlow-stap terug betekent: keer terug naar de
      // gebruikerskeuze in deze wrapper. Niet meteen de hele flow sluiten.
      onCancel={() => { setSelectedUser(null); setMode(null); }}
      onDone={onDone}
    />;
  }

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 pb-24">
    <div className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-xl mx-auto px-5 py-4 flex items-center justify-between">
        <button onClick={onCancel} className="flex items-center gap-2 text-blue-600 text-sm font-medium">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          Terug
        </button>
        <h2 className="text-lg font-bold text-gray-900">Nieuwe bon namens gebruiker</h2>
        <div className="w-16"/>
      </div>
    </div>

    <div className="max-w-xl mx-auto px-5 py-6 space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-900">
        Kies eerst voor welke gebruiker je de bon aanmaakt. De bon komt op naam
        van die gebruiker; jij wordt vastgelegd als degene die 'm heeft
        ingeschoten.
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Voor wie is de bon?</h3>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Zoek op naam of e-mail..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>
        {filteredUsers.length === 0
          ? <p className="text-sm text-gray-400 text-center py-6">Geen gebruikers gevonden</p>
          : <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-xl">
              {filteredUsers.map((u) => <button
                key={u.id}
                type="button"
                onClick={() => setSelectedUser(u)}
                className={`w-full text-left px-4 py-3 hover:bg-blue-50 ${selectedUser?.id === u.id ? "bg-blue-50" : "bg-white"}`}
              >
                <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </button>)}
            </div>}
        {selectedUser && <p className="text-sm text-blue-700 bg-blue-50 rounded-xl px-4 py-2">
          Gekozen: <span className="font-semibold">{selectedUser.name}</span>
        </p>}
      </div>

      {selectedUser && <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Wat wordt het?</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode("loan")}
            className="py-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md"
          >
            <span className="text-3xl block mb-1">{"\ud83d\udce4"}</span>
            <span className="text-sm">Direct lenen</span>
          </button>
          <button
            onClick={() => setMode("reservation")}
            className="py-6 rounded-2xl bg-purple-500 hover:bg-purple-600 text-white font-bold shadow-md"
          >
            <span className="text-3xl block mb-1">{"\ud83d\udcc5"}</span>
            <span className="text-sm">Reserveren</span>
          </button>
        </div>
      </div>}
    </div>
  </div>;
}
