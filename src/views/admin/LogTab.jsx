import { fmtDT } from "../../utils/date";

export function LogTab({ recentLogs, logFilter, setLogFilter }) {
  const filtLogs = logFilter?recentLogs.filter(l=>l.detail.toLowerCase().includes(logFilter.toLowerCase())):recentLogs;
  return <div className="space-y-4">
    <div className="relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Zoek..." value={logFilter} onChange={e=>setLogFilter(e.target.value)}/></div>
    {filtLogs.length===0?<p className="text-gray-400 text-center py-8 text-sm">Geen regels</p>:<div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">{filtLogs.slice(0,200).map(l=><div key={l.id} className="px-4 py-3 text-sm"><span className="text-xs text-gray-400">{fmtDT(l.date)}</span><p className="text-gray-700 mt-0.5">{l.detail}</p></div>)}</div>}
  </div>;
}
