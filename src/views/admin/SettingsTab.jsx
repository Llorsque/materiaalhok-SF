import { useState, useEffect } from "react";
import { ImageUpload } from "../../components/ImageUpload";
import { Modal } from "../../components/Modal";
import { getResetPreview, executeReset } from "../../api/client";

export function SettingsTab({ branding, setBranding }) {
  const [resetOpen, setResetOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState(null);
  const [resetResult, setResetResult] = useState(null);

  useEffect(() => {
    if (!resetOpen) return;
    setPreview(null);
    setPreviewError(null);
    setConfirmText("");
    setResetError(null);
    setResetResult(null);
    setPreviewLoading(true);
    getResetPreview()
      .then((data) => setPreview(data))
      .catch((err) => setPreviewError(err.message || "Kon preview niet ophalen"))
      .finally(() => setPreviewLoading(false));
  }, [resetOpen]);

  const doReset = async () => {
    setResetting(true);
    setResetError(null);
    try {
      const result = await executeReset();
      setResetResult(result);
    } catch (err) {
      setResetError(err.message || "Reset mislukt");
    } finally {
      setResetting(false);
    }
  };

  const canConfirm = !!preview && confirmText === "RESET" && !resetting && !resetResult;

  return <div className="space-y-6 max-w-xl">
    <h3 className="text-lg font-bold text-gray-900">Instellingen</h3>
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
      <h4 className="font-semibold text-gray-800">Branding</h4>
      <ImageUpload value={branding.logo} onChange={v=>setBranding(p=>({...p,logo:v}))} label="Logo"/>
      {branding.logo && <>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo formaat header ({branding.logoSize || 40}px)</label>
          <div className="flex items-center gap-4">
            <input type="range" min="20" max="80" value={branding.logoSize || 40} onChange={e => setBranding(p => ({...p, logoSize: parseInt(e.target.value)}))} className="flex-1 accent-blue-600"/>
            <div className="bg-gray-100 rounded-xl p-2 flex items-center justify-center" style={{width:80,height:80}}>
              <img src={branding.logo} className="rounded-lg object-contain" style={{width:branding.logoSize||40,height:branding.logoSize||40}} alt="preview"/>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo formaat loginscherm ({branding.loginLogoSize || 64}px)</label>
          <div className="flex items-center gap-4">
            <input type="range" min="32" max="160" value={branding.loginLogoSize || 64} onChange={e => setBranding(p => ({...p, loginLogoSize: parseInt(e.target.value)}))} className="flex-1 accent-blue-600"/>
            <div className="bg-gray-100 rounded-xl p-2 flex items-center justify-center" style={{width:100,height:100}}>
              <img src={branding.logo} className="rounded-lg object-contain" style={{width:branding.loginLogoSize||64,height:branding.loginLogoSize||64}} alt="preview"/>
            </div>
          </div>
        </div>
      </>}
      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Titel</label><input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={branding.title} onChange={e=>setBranding(p=>({...p,title:e.target.value}))}/></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Ondertitel</label><input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={branding.subtitle} onChange={e=>setBranding(p=>({...p,subtitle:e.target.value}))}/></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Kleur</label><div className="flex items-center gap-3"><input type="color" value={branding.color} onChange={e=>setBranding(p=>({...p,color:e.target.value}))} className="w-10 h-10 rounded-lg cursor-pointer border-0"/><span className="text-sm text-gray-500">{branding.color}</span></div></div>
      <ImageUpload value={branding.loginBg} onChange={v=>setBranding(p=>({...p,loginBg:v}))} label="Login achtergrond"/>
    </div>

    <div className="bg-red-50 rounded-2xl p-6 shadow-sm border-2 border-red-200 space-y-3">
      <div className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
        <h4 className="font-semibold text-red-900">Gevarenzone</h4>
      </div>
      <p className="text-sm text-red-800">
        Zet de tool terug naar een schone start vóór livegang. Alle bonnen worden gewist,
        maar materialen, sets en gebruikers blijven behouden. Er wordt automatisch een
        backup gemaakt vóór de reset.
      </p>
      <button
        onClick={() => setResetOpen(true)}
        className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700"
      >
        Reset bonnen voor livegang
      </button>
    </div>

    <div className="text-xs text-gray-400 text-center pt-2">Versie {__APP_VERSION__}</div>

    <Modal open={resetOpen} onClose={() => !resetting && setResetOpen(false)} title="Reset bonnen voor livegang">
      {previewLoading && <p className="text-sm text-gray-500">Preview laden…</p>}
      {previewError && <p className="text-sm text-red-600">{previewError}</p>}

      {preview && !resetResult && <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-900 mb-2">Wordt gewist</p>
          <ul className="text-sm text-red-800 space-y-1">
            <li>• {preview.wipe.bons} bonnen</li>
            <li>• {preview.wipe.bon_items} regels op bonnen</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-900 mb-2">Blijft behouden</p>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• {preview.keep.materials} materialen</li>
            <li>• {preview.keep.sets} sets</li>
            <li>• {preview.keep.users} gebruikers</li>
            <li>• {preview.keep.logs} logregels</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 space-y-1">
          <p>• Bonnummers beginnen daarna weer bij 1.</p>
          <p>• Er wordt automatisch een backup gemaakt in <code className="text-xs">server/backups/</code> vóór de reset.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Typ <span className="font-mono font-bold">RESET</span> om te bevestigen
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RESET"
            disabled={resetting}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {resetError && <p className="text-sm text-red-600">{resetError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => setResetOpen(false)}
            disabled={resetting}
            className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            onClick={doReset}
            disabled={!canConfirm}
            className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {resetting ? "Bezig…" : "Definitief resetten"}
          </button>
        </div>
      </div>}

      {resetResult && <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-900 mb-2">Reset voltooid</p>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• {resetResult.wiped.bons} bonnen gewist</li>
            <li>• {resetResult.wiped.bon_items} bonregels gewist</li>
            <li>• Bonnummers beginnen weer bij 1</li>
          </ul>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
          <p className="font-medium mb-1">Backup opgeslagen als:</p>
          <code className="text-xs break-all">server/backups/{resetResult.backup.filename}</code>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => { setResetOpen(false); window.location.reload(); }}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Sluiten en herladen
          </button>
        </div>
      </div>}
    </Modal>
  </div>;
}
