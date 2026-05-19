import { useState } from "react";
import { importPreview, importExecute } from "../../api/client";

// Drie stappen: bestand kiezen → preview → bevestigen. Tussen stappen geen
// reload nodig; we houden het gekozen File-object vast en sturen 'm twee keer.
// (Eens voor preview, eens voor execute — afgesproken zo, geen serverseige
// sessie-state nodig.)
export function ImportTab({ refreshMaterials, refreshSets }) {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState("pick"); // pick | preview | done
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [structuralErrors, setStructuralErrors] = useState(null);
  const [error, setError] = useState("");
  const [executeResult, setExecuteResult] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const reset = () => {
    setFile(null);
    setStep("pick");
    setPreview(null);
    setStructuralErrors(null);
    setError("");
    setExecuteResult(null);
    setShowErrorDetails(false);
  };

  const handlePick = (f) => {
    setFile(f);
    setError("");
    setStructuralErrors(null);
    setPreview(null);
  };

  const handlePreview = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setStructuralErrors(null);
    try {
      const data = await importPreview(file);
      setPreview(data);
      setStep("preview");
    } catch (err) {
      if (err.details && err.details.structuralErrors) {
        setStructuralErrors(err.details.structuralErrors);
        setStep("preview");
      } else {
        setError(err.message || "Bestand verwerken mislukt");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleExecute = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await importExecute(file);
      setExecuteResult(data);
      setStep("done");
      await refreshMaterials();
      await refreshSets();
    } catch (err) {
      setError(err.message || "Importeren mislukt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-lg font-bold text-gray-900">Import vanuit Excel</h3>

      {step === "pick" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h4 className="font-semibold text-gray-800">Stap 1 — bestand kiezen</h4>
          <p className="text-sm text-gray-600">
            Upload een <code className="bg-gray-100 px-1 rounded text-xs">.xlsx</code>-bestand.
            Verwachte tabbladen: <strong>"Losse materialen"</strong> en <strong>"Sets"</strong>.
            Het tabblad <strong>"Nog op te lossen"</strong> wordt genegeerd.
          </p>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => handlePick(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {file && (
            <p className="text-xs text-gray-500">
              Geselecteerd: <span className="font-mono">{file.name}</span> ({Math.round(file.size / 1024)} kB)
            </p>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handlePreview}
              disabled={!file || busy}
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Bestand verwerken..." : "Voorvertonen"}
            </button>
          </div>
        </div>
      )}

      {step === "preview" && structuralErrors && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h4 className="font-semibold text-gray-800">Stap 2 — bestand klopt niet</h4>
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
            <p className="font-medium mb-2">Het bestand voldoet niet aan de verwachte structuur:</p>
            <ul className="list-disc list-inside space-y-1">
              {structuralErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
          <button
            onClick={reset}
            className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
          >
            Probeer een ander bestand
          </button>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h4 className="font-semibold text-gray-800">Stap 2 — preview</h4>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-blue-700">{preview.materialsCount}</p>
              <p className="text-sm text-blue-800">materialen worden aangemaakt of bijgewerkt</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-blue-700">{preview.setsCount}</p>
              <p className="text-sm text-blue-800">sets worden aangemaakt of bijgewerkt</p>
            </div>
          </div>
          {preview.skippedRows > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              <button
                onClick={() => setShowErrorDetails((v) => !v)}
                className="font-medium underline hover:no-underline"
              >
                {preview.skippedRows} rijen overgeslagen wegens fouten {showErrorDetails ? "(verbergen)" : "(tonen)"}
              </button>
              {preview.rowErrorsTruncated && (
                <p className="text-xs mt-1">Alleen de eerste {preview.rowErrors.length} fouten worden getoond.</p>
              )}
              {showErrorDetails && (
                <ul className="mt-2 space-y-1 text-xs">
                  {preview.rowErrors.map((e, i) => (
                    <li key={i}>
                      <span className="font-mono">rij {e.row}</span>, kolom <span className="font-mono">{e.column}</span>: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {preview.ignoredSheetFound && (
            <p className="text-xs text-gray-500">
              Tabblad "Nog op te lossen" gevonden en zoals afgesproken genegeerd.
            </p>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleExecute}
              disabled={busy || (preview.materialsCount === 0 && preview.setsCount === 0)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Importeren..." : "Importeren bevestigen"}
            </button>
            <button
              onClick={reset}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {step === "done" && executeResult && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h4 className="font-semibold text-gray-800">Stap 3 — import voltooid</h4>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 space-y-1">
            <p>{executeResult.createdMaterials} materialen aangemaakt, {executeResult.updatedMaterials} bijgewerkt.</p>
            <p>{executeResult.createdSets} sets aangemaakt, {executeResult.updatedSets} bijgewerkt.</p>
            {executeResult.skippedRows > 0 && (
              <p>{executeResult.skippedRows} rijen overgeslagen wegens fouten.</p>
            )}
          </div>
          <button
            onClick={reset}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Nieuwe import
          </button>
        </div>
      )}
    </div>
  );
}
