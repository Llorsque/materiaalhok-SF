export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
    <div className="absolute inset-0 bg-black/40"/>
    <div className={`relative bg-white rounded-2xl shadow-2xl ${wide?"max-w-3xl":"max-w-lg"} w-full mx-4 max-h-[90vh] overflow-y-auto`} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 5L5 15M5 5l10 10"/></svg></button>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  </div>;
}
