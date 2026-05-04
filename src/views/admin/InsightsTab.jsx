import { Stat } from "../../components/Stat";
import { getIcon } from "../../utils/format";

export function InsightsTab({ eq, bons, oneYearAgo }) {
  // Compute usage stats from bons
  const itemUsage = {};
  eq.forEach(i => { itemUsage[i.id] = { name: i.name, category: i.category, stock: i.stock, unit: i.unit, totalLoaned: 0, bonCount: 0, borrowers: {}, months: {} }; });
  const yearBons = bons.filter(b => b.startDate >= oneYearAgo);
  yearBons.forEach(b => {
    const month = b.startDate?.slice(0, 7) || "";
    b.items.forEach(bi => {
      if (itemUsage[bi.itemId]) {
        const u = itemUsage[bi.itemId];
        u.totalLoaned += bi.qty;
        u.bonCount += 1;
        u.borrowers[b.user] = (u.borrowers[b.user] || 0) + bi.qty;
        if (month) u.months[month] = (u.months[month] || 0) + bi.qty;
      }
    });
  });

  const allItems = Object.values(itemUsage);
  const mostUsed = [...allItems].sort((a, b) => b.totalLoaned - a.totalLoaned);
  const leastUsed = [...allItems].filter(i => i.stock > 0).sort((a, b) => a.totalLoaned - b.totalLoaned);
  const neverUsed = allItems.filter(i => i.totalLoaned === 0);

  // Category stats
  const catStats = {};
  allItems.forEach(i => {
    if (!catStats[i.category]) catStats[i.category] = { items: 0, totalLoaned: 0, bonCount: 0 };
    catStats[i.category].items += 1;
    catStats[i.category].totalLoaned += i.totalLoaned;
    catStats[i.category].bonCount += i.bonCount;
  });

  // Monthly totals
  const monthTotals = {};
  yearBons.forEach(b => {
    const m = b.startDate?.slice(0, 7) || "";
    if (m) { monthTotals[m] = (monthTotals[m] || 0) + 1; }
  });
  const months = Object.entries(monthTotals).sort((a, b) => a[0].localeCompare(b[0]));
  const maxMonth = Math.max(1, ...months.map(m => m[1]));

  // User stats
  const userStats = {};
  yearBons.forEach(b => {
    if (!userStats[b.user]) userStats[b.user] = { bons: 0, items: 0 };
    userStats[b.user].bons += 1;
    userStats[b.user].items += b.items.reduce((s, i) => s + i.qty, 0);
  });

  const barW = (v, max) => `${Math.max(2, (v / Math.max(1, max)) * 100)}%`;

  return <div className="space-y-8">
    <h3 className="text-lg font-bold text-gray-900">Inzichten (afgelopen jaar)</h3>

    {/* Overview stats */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Bonnen" value={yearBons.length} color="text-blue-600" icon={"\ud83d\udcdd"}/>
      <Stat label="Items uitgeleend" value={allItems.reduce((s, i) => s + i.totalLoaned, 0)} color="text-amber-600" icon={"\ud83d\udce4"}/>
      <Stat label="Unieke items" value={allItems.filter(i => i.totalLoaned > 0).length} color="text-emerald-600" icon={"\ud83d\udce6"}/>
      <Stat label="Nooit gebruikt" value={neverUsed.length} color="text-gray-500" icon={"\ud83d\udca4"}/>
    </div>

    {/* Monthly chart */}
    {months.length > 0 && <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h4 className="font-semibold text-gray-800 mb-4">{"\ud83d\udcc8"} Uitleningen per maand</h4>
      <div className="space-y-2">
        {months.map(([m, count]) => <div key={m} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-16 flex-shrink-0">{new Date(m + "-01").toLocaleDateString("nl-NL", { month: "short", year: "2-digit" })}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-2 transition-all" style={{ width: barW(count, maxMonth) }}>
              <span className="text-xs text-white font-bold">{count}</span>
            </div>
          </div>
        </div>)}
      </div>
    </div>}

    {/* Category breakdown */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h4 className="font-semibold text-gray-800 mb-4">{"\ud83d\udcca"} Gebruik per categorie</h4>
      <div className="space-y-3">
        {Object.entries(catStats).sort((a, b) => b[1].totalLoaned - a[1].totalLoaned).map(([cat, s]) => {
          const maxCat = Math.max(1, ...Object.values(catStats).map(c => c.totalLoaned));
          return <div key={cat} className="flex items-center gap-3">
            <span className="text-lg w-8 text-center">{getIcon(cat)}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">{cat}</span>
                <span className="text-xs text-gray-500">{s.totalLoaned} stuks in {s.bonCount} bonnen</span>
              </div>
              <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: barW(s.totalLoaned, maxCat) }}/>
              </div>
            </div>
          </div>;
        })}
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      {/* Most used */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h4 className="font-semibold text-gray-800 mb-4">{"\ud83d\udd25"} Meest uitgeleend</h4>
        <div className="space-y-3">
          {mostUsed.filter(i => i.totalLoaned > 0).slice(0, 15).map((i, idx) => <div key={i.name} className="flex items-center gap-3">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 3 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{i.name}</p>
              <p className="text-xs text-gray-500">{i.category}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-gray-900">{i.totalLoaned}x</p>
              <p className="text-xs text-gray-400">{i.bonCount} bonnen</p>
            </div>
          </div>)}
        </div>
      </div>

      {/* Least used */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h4 className="font-semibold text-gray-800 mb-4">{"\ud83d\udca4"} Minst uitgeleend</h4>
        {neverUsed.length > 0 && <div className="mb-4 bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Nooit gebruikt ({neverUsed.length})</p>
          <div className="flex flex-wrap gap-1">
            {neverUsed.slice(0, 20).map(i => <span key={i.name} className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">{i.name}</span>)}
            {neverUsed.length > 20 && <span className="px-2 py-0.5 text-gray-400 text-xs">+{neverUsed.length - 20} meer</span>}
          </div>
        </div>}
        <div className="space-y-3">
          {leastUsed.filter(i => i.totalLoaned > 0).slice(0, 10).map((i, idx) => <div key={i.name} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{i.name}</p>
              <p className="text-xs text-gray-500">{i.category} {"\u00b7"} {i.stock} op voorraad</p>
            </div>
            <span className="text-sm text-gray-400 font-medium">{i.totalLoaned}x</span>
          </div>)}
        </div>
      </div>
    </div>

    {/* User stats */}
    {Object.keys(userStats).length > 0 && <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h4 className="font-semibold text-gray-800 mb-4">{"\ud83d\udc65"} Gebruik per gebruiker</h4>
      <div className="space-y-3">
        {Object.entries(userStats).sort((a, b) => b[1].items - a[1].items).map(([user, s]) => {
          const maxUser = Math.max(1, ...Object.values(userStats).map(u => u.items));
          return <div key={user} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-900 w-32 flex-shrink-0 truncate">{user}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div className="h-full bg-purple-400 rounded-full flex items-center justify-end pr-2 transition-all" style={{ width: barW(s.items, maxUser) }}>
                {s.items > 0 && <span className="text-xs text-white font-bold">{s.items}</span>}
              </div>
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0 w-16 text-right">{s.bons} bonnen</span>
          </div>;
        })}
      </div>
    </div>}

    {/* Usage rate */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h4 className="font-semibold text-gray-800 mb-2">{"\ud83d\udcca"} Gebruikspercentage</h4>
      <p className="text-xs text-gray-500 mb-4">Hoeveel van de voorraad is het afgelopen jaar minstens 1x uitgeleend</p>
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray={`${((allItems.filter(i=>i.totalLoaned>0).length/Math.max(1,allItems.length))*100).toFixed(0)} 100`} strokeLinecap="round"/>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900">{((allItems.filter(i=>i.totalLoaned>0).length/Math.max(1,allItems.length))*100).toFixed(0)}%</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-700"><span className="font-semibold text-emerald-600">{allItems.filter(i=>i.totalLoaned>0).length}</span> van de <span className="font-semibold">{allItems.length}</span> items is minstens 1x gebruikt</p>
          <p className="text-sm text-gray-500 mt-1"><span className="font-semibold text-gray-400">{neverUsed.length}</span> items zijn nog nooit uitgeleend</p>
        </div>
      </div>
    </div>
  </div>;
}
