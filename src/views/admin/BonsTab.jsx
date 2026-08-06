import { useMemo, useState } from "react";
import { BonCard } from "../../components/BonCard";
import { ConnectionBanner } from "../../components/ConnectionBanner";
import { ViewToggle, TileGrid, Tile } from "../../components/TileGrid";
import { bonIsOverdue, bonRemaining } from "../../utils/bons";
import { fmtDate } from "../../utils/date";

const EXTERNAL_KEY = "__external__";
const ALL_KEY      = "__all__";

export function BonsTab({
  bons, bonsLoading, bonsError, refreshBons,
  reservedBons, overdueBons,
  bonFilter, setBonFilter,
  onBonClick, onNewBon,
}) {
  const [view, setView]     = useState("list");
  const [sortOrder, setSort] = useState("newest");
  const [userKey, setUserKey] = useState(ALL_KEY);

  // Status-filter (bestaand) — combineert met de nieuwe filters hieronder.
  const statusFiltered = bonFilter === "active"     ? bons.filter(b => b.status === "active")
                       : bonFilter === "reserved"   ? reservedBons
                       : bonFilter === "overdue"    ? overdueBons
                       : bonFilter === "completed"  ? bons.filter(b => b.status === "completed")
                       : bons;

  // Gebruikersopties + counts. Externe bonnen krijgen een aparte ingang in
  // dezelfde dropdown zodat ze in één blik van gewone gebruikersbonnen te
  // onderscheiden zijn — groeperen onder één gebruiker zou verwarrend zijn
  // want ze horen bij een organisatie, niet bij een persoon.
  const userOptions = useMemo(() => {
    const map = new Map();
    let externalCount = 0;
    for (const b of bons) {
      const isExternal = b.is_external === 1 || b.is_external === true || !b.user_id;
      if (isExternal) { externalCount++; continue; }
      const key = String(b.user_id);
      const label = b.user_name || "Onbekende gebruiker";
      const prev = map.get(key);
      if (prev) prev.count++;
      else map.set(key, { key, label, count: 1 });
    }
    const users = [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "nl"));
    return { users, externalCount };
  }, [bons]);

  const userFiltered = userKey === ALL_KEY
    ? statusFiltered
    : userKey === EXTERNAL_KEY
      ? statusFiltered.filter(b => b.is_external === 1 || b.is_external === true || !b.user_id)
      : statusFiltered.filter(b => String(b.user_id) === userKey);

  // Sorteren: created_at leidend (als aanwezig), anders id — beide monotoon
  // oplopend. De frontend is nu de bron van waarheid; backend sorteert
  // toevallig ook DESC id, dus "Nieuwste eerst" botst niet met de fetch-
  // volgorde, maar we regelen het hier zodat de toggle altijd klopt.
  const sorted = useMemo(() => {
    const arr = userFiltered.slice();
    arr.sort((a, b) => {
      const av = a.created_at || String(a.id).padStart(12, "0");
      const bv = b.created_at || String(b.id).padStart(12, "0");
      const cmp = av.localeCompare(bv);
      return sortOrder === "newest" ? -cmp : cmp;
    });
    return arr;
  }, [userFiltered, sortOrder]);

  return <div className="space-y-4">
    <ConnectionBanner loading={bonsLoading} error={bonsError} onRetry={refreshBons} resource="Bonnen"/>

    <div className="flex flex-wrap items-center gap-2 justify-between">
      <div className="flex gap-2 overflow-x-auto">
        {[["active","Actief"],["reserved","Gereserveerd"],["overdue","Te laat"],["completed","Afgerond"],["all","Alle"]].map(([k,l]) =>
          <button key={k} onClick={() => setBonFilter(k)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${bonFilter === k ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{l}</button>
        )}
      </div>
      {onNewBon && <button onClick={onNewBon} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 whitespace-nowrap">{"\u2795"} Nieuwe bon</button>}
    </div>

    <div className="flex flex-wrap items-center gap-2 justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={userKey}
          onChange={(e) => setUserKey(e.target.value)}
          aria-label="Filter op gebruiker"
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={ALL_KEY}>Alle gebruikers ({bons.length})</option>
          {userOptions.externalCount > 0 && <option value={EXTERNAL_KEY}>Externe bonnen ({userOptions.externalCount})</option>}
          {userOptions.users.map(u => <option key={u.key} value={u.key}>{u.label} ({u.count})</option>)}
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sorteren"
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="newest">Nieuwste eerst</option>
          <option value="oldest">Oudste eerst</option>
        </select>
      </div>
      <ViewToggle view={view} onChange={setView} accent="blue" />
    </div>

    {sorted.length === 0
      ? <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100"><p className="text-gray-500 text-sm">Geen bonnen</p></div>
      : view === "list"
        ? <div className="space-y-2">{sorted.map(b => <BonCard key={b.id} bon={b} onClick={() => onBonClick(b)} showUser showAdminMark/>)}</div>
        : <TileGrid>{sorted.map(b => {
            const isExternal = b.is_external === 1 || b.is_external === true;
            const displayName = isExternal ? (b.external_org || "Externe huurder") : (b.user_name || "\u2014");
            const overdue = bonIsOverdue(b);
            const rem = bonRemaining(b);
            const items = b.items || [];
            const total = items.length;
            const ret = items.filter(it => it.returned).length;

            let statusText, statusTone;
            if (b.status === "completed") { statusText = "Compleet";   statusTone = "emerald"; }
            else if (b.status === "reserved") { statusText = "Gereserveerd"; statusTone = "purple"; }
            else if (overdue)                { statusText = "Te laat";      statusTone = "red"; }
            else if (ret > 0 && ret < total) { statusText = `Deels retour (${ret}/${total})`; statusTone = "amber"; }
            else                             { statusText = "Actief";       statusTone = "blue"; }

            const badges = [{ text: statusText, tone: statusTone }];
            if (isExternal) badges.push({ text: "Extern", tone: "purple" });
            if (b.return_date) badges.push({ text: `Retour ${fmtDate(b.return_date)}`, tone: "gray" });
            if (b.status !== "completed" && rem.length > 0) badges.push({ text: `${rem.length} open`, tone: "gray" });

            return <Tile
              key={b.id}
              onClick={() => onBonClick(b)}
              title={b.bon_number}
              titleClassName="font-mono text-sm font-bold text-blue-600 truncate"
              subtitle={displayName}
              badges={badges}
            />;
          })}</TileGrid>}
  </div>;
}
