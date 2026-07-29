import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/Modal";
import { fmtDT } from "../../utils/date";
import { getDamageReports, resolveDamageReport } from "../../api/client";

const REASON_LABEL = { lost: "Kwijt", broken: "Kapot" };
const STATUS_LABEL = {
  open: "Open",
  repaired: "Gerepareerd",
  replaced: "Vervangen",
  written_off: "Afgeschreven",
};
const RESOLUTION_OPTIONS = [
  { value: "repaired",    title: "Gerepareerd",  description: "Voorraad gaat terug omhoog (uniek: weer beschikbaar)." },
  { value: "replaced",    title: "Vervangen",    description: "Nieuw exemplaar aangeschaft — voorraad gaat terug omhoog (uniek: weer beschikbaar)." },
  { value: "written_off", title: "Afgeschreven", description: "Blijft eraf. Uniek exemplaar blijft 'buiten dienst' in de inventaris." },
];

export function DamageTab({ reports, reportsLoading, reportsError, refreshDamage, refreshMaterials, refreshSets, addLog }) {
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'open' | 'resolved'
  const [reasonFilter, setReasonFilter] = useState("all"); // 'all' | 'lost' | 'broken'
  const [target, setTarget] = useState(null);
  const [resolution, setResolution] = useState("repaired");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState(null);

  useEffect(() => { refreshDamage(); }, [refreshDamage]);

  const filtered = useMemo(() => {
    return (reports || []).filter((r) => {
      if (statusFilter === "open" && r.status !== "open") return false;
      if (statusFilter === "resolved" && r.status === "open") return false;
      if (reasonFilter !== "all" && r.reason !== reasonFilter) return false;
      return true;
    });
  }, [reports, statusFilter, reasonFilter]);

  const open = filtered.filter((r) => r.status === "open");
  const resolved = filtered.filter((r) => r.status !== "open");

  const openResolve = (r) => {
    setTarget(r);
    setResolution("repaired");
    setNotes("");
    setModalError(null);
  };
  const closeResolve = () => {
    if (busy) return;
    setTarget(null);
    setModalError(null);
  };
  const doResolve = async () => {
    if (!target || busy) return;
    setBusy(true);
    setModalError(null);
    try {
      await resolveDamageReport(target.id, { resolution, notes: notes.trim() || undefined });
      await refreshDamage();
      if (refreshMaterials) refreshMaterials();
      if (refreshSets)      refreshSets();
      if (addLog) addLog();
      setTarget(null);
    } catch (err) {
      setModalError(err.message || "Afhandelen mislukt");
    } finally {
      setBusy(false);
    }
  };

  return <div className="space-y-4">
    {reportsError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700">{reportsError.message || String(reportsError)}</div>}

    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[["all","Alles"],["open","Openstaand"],["resolved","Afgehandeld"]].map(([k,l]) =>
          <button key={k} onClick={() => setStatusFilter(k)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === k ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"}`}>{l}</button>
        )}
      </div>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[["all","Alles"],["lost","Kwijt"],["broken","Kapot"]].map(([k,l]) =>
          <button key={k} onClick={() => setReasonFilter(k)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${reasonFilter === k ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"}`}>{l}</button>
        )}
      </div>
      <button onClick={refreshDamage} disabled={reportsLoading} className="ml-auto px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40">{reportsLoading ? "Bezig..." : "Ververs"}</button>
    </div>

    {/* Openstaande meldingen */}
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Openstaand ({open.length})</h3>
      {open.length === 0
        ? <div className="bg-white rounded-2xl px-5 py-8 shadow-sm border border-gray-100 text-center text-sm text-gray-400">Geen open meldingen — alles is afgehandeld.</div>
        : <div className="space-y-2">{open.map((r) => <ReportCard key={r.id} report={r} onResolve={openResolve}/>)}</div>}
    </div>

    {/* Afgehandelde historie */}
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Afgehandeld ({resolved.length})</h3>
      {resolved.length === 0
        ? <p className="text-sm text-gray-400">Nog geen historie met deze filters.</p>
        : <div className="space-y-2">{resolved.map((r) => <ReportCard key={r.id} report={r} onResolve={openResolve}/>)}</div>}
    </div>

    <Modal open={!!target} onClose={closeResolve} title={target ? `Melding afhandelen — ${target.material_name || target.set_name}` : "Melding afhandelen"}>
      {target && <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700">
          <p><strong>{REASON_LABEL[target.reason]}</strong> — {target.quantity}x {target.material_name || target.set_name}</p>
          <p className="text-xs text-gray-500 mt-1">Gemeld op {fmtDT(target.reported_at)} door {target.reported_by_name || "onbekend"} op {target.bon_number || "—"}</p>
          {target.notes && <p className="text-xs text-gray-500 mt-1">Notitie: {target.notes}</p>}
        </div>

        <div className="space-y-2">
          {RESOLUTION_OPTIONS.map((opt) => <label key={opt.value} className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer ${resolution === opt.value ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}>
            <input type="radio" name="resolution" checked={resolution === opt.value} onChange={() => setResolution(opt.value)} className="mt-0.5"/>
            <div>
              <p className="text-sm font-semibold text-gray-900">{opt.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
            </div>
          </label>)}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notitie (optioneel)</label>
          <textarea rows={3} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bijv. nieuwe kop besteld, oude aan de kant gelegd"/>
        </div>

        {modalError && <p className="text-sm text-red-600">{modalError}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={doResolve} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-40">{busy ? "Bezig..." : "Afhandelen"}</button>
          <button onClick={closeResolve} disabled={busy} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 disabled:opacity-40">Annuleren</button>
        </div>
      </div>}
    </Modal>
  </div>;
}

function ReportCard({ report, onResolve }) {
  const isOpen = report.status === "open";
  const displayName = report.material_name || report.set_name || "(onbekend)";
  const reasonColor = report.reason === "lost" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
  const statusColor = isOpen ? "bg-blue-50 text-blue-700 border border-blue-100"
                             : "bg-gray-50 text-gray-600 border border-gray-100";
  return <div className={`bg-white rounded-2xl px-5 py-4 shadow-sm border ${isOpen ? "border-blue-100" : "border-gray-100"}`}>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${reasonColor}`}>{REASON_LABEL[report.reason]}</span>
          <span className="text-sm font-semibold text-gray-900">{report.quantity}x {displayName}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Gemeld {fmtDT(report.reported_at)} door {report.reported_by_name || "onbekend"}{report.bon_number ? <> op <span className="font-mono">{report.bon_number}</span></> : null}
        </p>
        {!isOpen && <p className="text-xs text-gray-500 mt-0.5">
          {STATUS_LABEL[report.status]} op {fmtDT(report.resolved_at)} door {report.resolved_by_name || "onbekend"}
        </p>}
        {report.notes && <p className="text-xs text-gray-500 mt-1 italic">{report.notes}</p>}
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${statusColor}`}>{STATUS_LABEL[report.status]}</span>
        {isOpen && <button onClick={() => onResolve(report)} className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5">Afhandelen</button>}
      </div>
    </div>
  </div>;
}
