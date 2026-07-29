import { useMemo, useState } from "react";
import { Modal } from "../../components/Modal";
import { NewBonButton } from "../../components/NewBonButton";
import { fmt } from "../../utils/format";
import { fmtDate, fmtDT } from "../../utils/date";
import { bonIsOverdue } from "../../utils/bons";

// One-pager. Drie overzichtsblokken naast elkaar op wide screens; op mobile
// stacken. Snelknop "Nieuwe bon aanmaken" boven de blokken. De cijferstats
// (voorraad, waarde, aantallen) staan compact rechtsboven met een pop-up
// voor de details — ze zijn nuttig maar niet waarvoor je hier bent.

const MAX_ROWS = 5;

export function DashboardTab({
  bons,
  totalStock,
  totalUnavail,
  totalValue,
  materialCount,
  setCount,
  reservedBons,
  onBonClick,
  onOpenNewBonFlow,
  onOpenNewExternalBonFlow,
  onGoToBonsWithFilter,
}) {
  const [statsOpen, setStatsOpen] = useState(false);

  const now = useMemo(() => new Date(), []);
  const in24h = useMemo(() => new Date(now.getTime() + 24 * 3600 * 1000), [now]);

  // Reserveringen sorteren op ophaaldatum (start_date), eerstvolgende bovenaan.
  const upcomingReservations = useMemo(() => {
    return (reservedBons || []).slice().sort((a, b) => {
      const av = a.start_date || "";
      const bv = b.start_date || "";
      return av.localeCompare(bv);
    });
  }, [reservedBons]);

  // Actieve bonnen waarvan return_date binnen nu + 24u valt (en niet al te laat).
  const dueSoon = useMemo(() => {
    return (bons || []).filter((b) => {
      if (b.status !== "active") return false;
      if (!b.return_date) return false;
      const ret = new Date(b.return_date);
      if (Number.isNaN(ret.getTime())) return false;
      return ret >= now && ret <= in24h;
    }).sort((a, b) => (a.return_date || "").localeCompare(b.return_date || ""));
  }, [bons, now, in24h]);

  // Alle actieve bonnen, gesorteerd op retourdatum.
  const activeBons = useMemo(() => {
    return (bons || []).filter((b) => b.status === "active")
      .sort((a, b) => (a.return_date || "").localeCompare(b.return_date || ""));
  }, [bons]);

  return <div className="space-y-6">
    {/* Snelknop-rij: nieuwe bon links, compacte stats-tile rechts */}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <NewBonButton options={[
        {
          key: "intern",
          label: "Voor interne gebruiker",
          description: "Namens iemand met een account",
          onSelect: onOpenNewBonFlow,
        },
        {
          key: "extern",
          label: "Voor externe huurder",
          description: "Verhuur aan een externe organisatie",
          onSelect: onOpenNewExternalBonFlow,
        },
      ]}/>

      <button
        type="button"
        onClick={() => setStatsOpen(true)}
        className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-sm hover:bg-gray-50 shadow-sm"
        title="Cijfers en totalen"
      >
        <span className="text-gray-500">Cijfers</span>
        <span className="text-gray-300">·</span>
        <span className="font-semibold text-gray-900">{totalStock}</span><span className="text-xs text-gray-500">voorraad</span>
        <span className="text-gray-300">·</span>
        <span className="font-semibold text-emerald-700">{Math.max(0, totalStock - totalUnavail)}</span><span className="text-xs text-gray-500">vrij</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>

    {/* Drie overzichtsblokken naast elkaar op ≥ lg; anders 2/1 kolommen. */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1) Eerstvolgende reserveringen */}
      <OverviewCard
        title="Eerstvolgende reserveringen"
        icon={"\ud83d\udcc5"}
        accent="purple"
        count={upcomingReservations.length}
        empty="Geen reserveringen"
        seeAll={upcomingReservations.length > MAX_ROWS ? { label: "Bekijk alle", onClick: () => onGoToBonsWithFilter("reserved") } : null}
      >
        {upcomingReservations.slice(0, MAX_ROWS).map((b) => <BonRow key={b.id}
          onClick={() => onBonClick(b)}
          left={<>
            <p className="text-sm font-semibold text-gray-900 truncate">{(b.is_external ? b.external_org : b.user_name) || "\u2014"}</p>
            <p className="text-xs text-gray-500 truncate">Ophalen {fmtDate(b.start_date)}</p>
          </>}
          rightMono={b.bon_number}
        />)}
      </OverviewCard>

      {/* 2) Retouren binnen 24 uur */}
      <OverviewCard
        title="Retour binnen 24 uur"
        icon={"\u23f0"}
        accent="amber"
        count={dueSoon.length}
        empty="Niets binnen 24 uur"
        seeAll={null /* deze is per definitie kort; geen 'bekijk alle' */}
      >
        {dueSoon.map((b) => <BonRow key={b.id}
          onClick={() => onBonClick(b)}
          left={<>
            <p className="text-sm font-semibold text-gray-900 truncate">{(b.is_external ? b.external_org : b.user_name) || "\u2014"}</p>
            <p className="text-xs text-amber-700 truncate">Retour {fmtDT(b.return_date)}</p>
          </>}
          rightMono={b.bon_number}
        />)}
      </OverviewCard>

      {/* 3) Actieve bonnen */}
      <OverviewCard
        title="Actieve bonnen"
        icon={"\ud83d\udce4"}
        accent="blue"
        count={activeBons.length}
        empty="Geen actieve bonnen"
        seeAll={activeBons.length > MAX_ROWS ? { label: "Bekijk alle", onClick: () => onGoToBonsWithFilter("active") } : null}
      >
        {activeBons.slice(0, MAX_ROWS).map((b) => {
          const overdue = bonIsOverdue(b);
          return <BonRow key={b.id}
            onClick={() => onBonClick(b)}
            left={<>
              <p className="text-sm font-semibold text-gray-900 truncate">{(b.is_external ? b.external_org : b.user_name) || "\u2014"}</p>
              <p className={`text-xs truncate ${overdue ? "text-red-700 font-medium" : "text-gray-500"}`}>Retour {fmtDate(b.return_date)}{overdue ? " — te laat" : ""}</p>
            </>}
            rightMono={b.bon_number}
          />;
        })}
      </OverviewCard>
    </div>

    {/* Cijferpop-up */}
    <Modal open={statsOpen} onClose={() => setStatsOpen(false)} title="Cijfers en totalen">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Voorraad totaal" value={totalStock} color="text-gray-800" icon={"\ud83d\udce6"}/>
        <StatTile label="Beschikbaar" value={Math.max(0, totalStock - totalUnavail)} color="text-emerald-600" icon={"\u2705"}/>
        <StatTile label="Materialen" value={materialCount} color="text-indigo-600" icon={"\ud83e\uddf1"}/>
        <StatTile label="Sets" value={setCount} color="text-purple-600" icon={"\ud83c\udff7\ufe0f"}/>
        <StatTile label="Actieve bonnen" value={activeBons.length} color="text-amber-600" icon={"\ud83d\udce4"}/>
        <StatTile label="Reserveringen" value={reservedBons.length} color="text-purple-600" icon={"\ud83d\udcc5"}/>
        <StatTile label="Waarde" value={fmt(totalValue)} color="text-gray-700" icon={"\ud83d\udcb0"} span={2}/>
      </div>
    </Modal>
  </div>;
}

// -- Sub-componentjes (privé aan deze file) ---------------------------------

function OverviewCard({ title, icon, accent, count, empty, seeAll, children }) {
  const accentClass = {
    purple: "bg-purple-50 text-purple-700",
    amber:  "bg-amber-50 text-amber-700",
    blue:   "bg-blue-50 text-blue-700",
  }[accent] || "bg-gray-50 text-gray-700";
  const items = [].concat(children).filter(Boolean);
  return <section className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
    <header className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-base ${accentClass}`}>{icon}</span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">{title}</h3>
          <p className="text-[11px] text-gray-500">{count} {count === 1 ? "regel" : "regels"} in totaal</p>
        </div>
      </div>
    </header>
    <div className="flex-1 divide-y divide-gray-50">
      {items.length === 0
        ? <p className="px-5 py-8 text-sm text-gray-400 text-center">{empty}</p>
        : items}
    </div>
    {seeAll && <footer className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/60 text-right">
      <button type="button" onClick={seeAll.onClick} className="text-xs font-semibold text-blue-600 hover:underline">
        {seeAll.label} {"\u2192"}
      </button>
    </footer>}
  </section>;
}

function BonRow({ onClick, left, rightMono }) {
  return <button
    type="button"
    onClick={onClick}
    className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-gray-50"
  >
    <div className="min-w-0 flex-1">{left}</div>
    <span className="font-mono text-xs font-bold text-blue-600 flex-shrink-0">{rightMono}</span>
  </button>;
}

function StatTile({ label, value, color, icon, span }) {
  return <div className={`bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3 ${span === 2 ? "col-span-2" : ""}`}>
    <span className="text-2xl">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  </div>;
}
