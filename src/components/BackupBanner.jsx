import { useEffect, useState, useCallback } from "react";
import { getBackupStatus, runBackup } from "../api/client";

// Toont een banner boven AdminView wanneer de laatste backup ouder is dan 48
// uur of als de vorige run gefaald is. Geel tussen 48u en 7d; rood vanaf 7d
// of bij een gefaalde run. Wanneer alles fris is: renderen we niets.

const HOUR = 1;
const DAY = 24 * HOUR;

function describeAge(ageHours) {
  if (ageHours === null || ageHours === undefined) return "onbekend";
  if (ageHours < 1) return "minder dan een uur geleden";
  if (ageHours < DAY) {
    const h = Math.round(ageHours);
    return `${h} uur geleden`;
  }
  const days = Math.floor(ageHours / DAY);
  return `${days} dag${days === 1 ? "" : "en"} geleden`;
}

export function BackupBanner() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [runError, setRunError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const s = await getBackupStatus();
      setStatus(s);
    } catch (err) {
      // Bij netwerkfout op de status-call rapporteren we niets — de bestaande
      // ConnectionBanner toont al een verbindingsprobleem.
      setStatus(null);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleRun = async () => {
    if (busy) return;
    setBusy(true);
    setRunError("");
    try {
      const s = await runBackup();
      setStatus(s);
    } catch (err) {
      setRunError(err.message || "Backup mislukt");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;
  // Niets te melden — laatste backup is recent én geslaagd.
  if (!status.isStale && status.success) return null;

  const failed = !status.success;
  const ageDays = status.ageHours !== null ? status.ageHours / DAY : null;
  const isRed = failed || (ageDays !== null && ageDays >= 7);

  const wrapClass = isRed
    ? "bg-red-50 border-red-200 text-red-900"
    : "bg-amber-50 border-amber-200 text-amber-900";
  const btnClass = isRed
    ? "bg-red-600 hover:bg-red-700"
    : "bg-amber-600 hover:bg-amber-700";

  let message;
  if (status.lastBackup === null) {
    message = "Er is nog geen backup gemaakt op deze laptop.";
  } else if (failed) {
    const when = new Date(status.lastBackup).toLocaleString("nl-NL");
    message = `De laatste backup is gefaald op ${when}${status.error ? ` (${status.error})` : ""}.`;
  } else {
    message = `Let op: de laatste backup is van ${describeAge(status.ageHours)}.`;
  }

  return (
    <div className={`border rounded-2xl px-5 py-4 mb-4 ${wrapClass}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{"\u26a0\ufe0f"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{message}</p>
          {runError && (
            <p className="text-xs mt-1 font-mono break-all">{runError}</p>
          )}
        </div>
        <button
          onClick={handleRun}
          disabled={busy}
          className={`px-3 py-1.5 rounded-lg text-white text-xs font-medium flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed ${btnClass}`}
        >
          {busy ? "Bezig..." : "Maak nu een handmatige backup"}
        </button>
      </div>
    </div>
  );
}
