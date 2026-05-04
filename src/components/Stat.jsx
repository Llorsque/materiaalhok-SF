export function Stat({ label, value, color, icon }) {
  return <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p><p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p></div><div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg">{icon}</div></div></div>;
}
