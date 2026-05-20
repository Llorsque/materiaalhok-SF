import { useState, useEffect, useRef } from "react";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { login as apiLogin, loginByBarcode } from "../api/client";

export function LoginView({ onLogin, branding, usersLoading, usersError, refreshUsers, sessionExpired, onDismissSessionExpired }) {
  const [mode, setMode] = useState("scan");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanBuffer, setScanBuffer] = useState("");
  const [welcome, setWelcome] = useState(null);
  const scanInputRef = useRef(null);
  const scanTimerRef = useRef(null);
  const scanInFlightRef = useRef(false);

  const finishLogin = (u) => {
    setWelcome(u);
    setTimeout(() => onLogin(u), 3000);
  };

  const go = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const u = await apiLogin(email.trim(), pass);
      finishLogin(u);
    } catch (err) {
      if (err.status === 401) {
        setError("E-mailadres of wachtwoord onjuist");
      } else {
        setError(err.message || "Inloggen mislukt");
      }
    } finally {
      setBusy(false);
    }
  };

  const tryScanLogin = async (val) => {
    const code = val.trim();
    if (!code || code.length < 3) return;
    if (scanInFlightRef.current) return;
    scanInFlightRef.current = true;
    try {
      const u = await loginByBarcode(code);
      finishLogin(u);
    } catch (err) {
      if (err.status === 401) {
        setError("Badge niet herkend");
      } else {
        setError(err.message || "Inloggen mislukt");
      }
      setScanBuffer("");
    } finally {
      scanInFlightRef.current = false;
    }
  };

  const handleScanChange = (val) => {
    setScanBuffer(val);
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    if (val.trim().length >= 3) {
      scanTimerRef.current = setTimeout(() => tryScanLogin(val), 150);
    }
  };

  const handleScanKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      tryScanLogin(scanBuffer);
    }
    if (e.key === "F3" || (e.ctrlKey && e.key === "f") || (e.ctrlKey && e.key === "g")) {
      e.preventDefault();
    }
  };

  // Aggressive focus: capture ALL keystrokes and redirect to scan input
  useEffect(() => {
    if (mode !== "scan" || welcome) return;
    const handler = (e) => {
      if (e.key === "F3" || e.key === "F5" || e.key === "F6" ||
          (e.ctrlKey && (e.key === "f" || e.key === "g" || e.key === "l" || e.key === "d")) ||
          e.key === "/" || (e.altKey && e.key === "d")) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (scanInputRef.current && document.activeElement !== scanInputRef.current) {
        scanInputRef.current.focus();
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          setScanBuffer(prev => prev + e.key);
          if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
          scanTimerRef.current = setTimeout(() => {
            setScanBuffer(cur => { tryScanLogin(cur); return cur; });
          }, 150);
        }
      }
    };
    window.addEventListener("keydown", handler, true);
    const clickHandler = () => {
      setTimeout(() => {
        if (scanInputRef.current && document.activeElement !== scanInputRef.current) scanInputRef.current.focus();
      }, 10);
    };
    window.addEventListener("click", clickHandler, true);
    if (scanInputRef.current) scanInputRef.current.focus();
    const interval = setInterval(() => { if (scanInputRef.current) scanInputRef.current.focus(); }, 300);
    return () => { window.removeEventListener("keydown", handler, true); window.removeEventListener("click", clickHandler, true); clearInterval(interval); };
  }, [mode, welcome]);

  // Welcome screen
  if (welcome) return <div className="min-h-screen flex items-center justify-center p-4" style={{background: `linear-gradient(135deg, ${branding.color}20, #f8fafc, ${branding.color}15)`}}>
    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-10 text-center">
      <div className="text-6xl mb-4">{"\ud83d\udc4b"}</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Welkom</h1>
      <p className="text-xl font-semibold" style={{color:branding.color}}>{welcome.name}</p>
      <p className="text-sm text-gray-400 mt-4">Even geduld...</p>
      <div className="mt-6 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full animate-pulse" style={{backgroundColor:branding.color, width:"100%", animation:"shrink 3s linear forwards"}}/>
      </div>
      <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  </div>;

  return <div className="min-h-screen flex items-center justify-center p-4" style={{background: branding.loginBg ? `url(${branding.loginBg}) center/cover` : `linear-gradient(135deg, ${branding.color}15, #f8fafc, ${branding.color}10)`}}>
    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
      <div className="text-center mb-6">
        {branding.logo ? <img src={branding.logo} className="rounded-2xl object-contain mx-auto mb-4" style={{width:branding.loginLogoSize||64,height:branding.loginLogoSize||64}} alt=""/> : <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4" style={{backgroundColor:branding.color}}>{"\ud83c\udfc5"}</div>}
        <h1 className="text-2xl font-bold text-gray-900">{branding.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{branding.subtitle}</p>
      </div>

      <ConnectionBanner loading={usersLoading} error={usersError} onRetry={refreshUsers} resource="Gebruikers"/>

      {sessionExpired && <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800 flex items-start justify-between gap-3">
        <span>Sessie verlopen {"\u2014"} log opnieuw in</span>
        <button onClick={onDismissSessionExpired} className="text-amber-700 hover:text-amber-900 font-bold leading-none" aria-label="Sluiten">{"\u00d7"}</button>
      </div>}

      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button onClick={()=>{setMode("scan");setError("");setScanBuffer("")}} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode==="scan"?"bg-white shadow-sm text-gray-900":"text-gray-500"}`}>{"\ud83d\udcf7"} Scan badge</button>
        <button onClick={()=>{setMode("manual");setError("")}} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode==="manual"?"bg-white shadow-sm text-gray-900":"text-gray-500"}`}>{"\ud83d\udd11"} Inloggen</button>
      </div>

      {error&&<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">{error}</div>}

      {mode === "scan" ? (
        <div className="space-y-4 text-center">
          <div className="py-6">
            <div className="text-5xl mb-3">{"\ud83d\udcf3"}</div>
            <p className="text-gray-700 font-medium">Scan je persoonlijke badge</p>
            <p className="text-gray-400 text-sm mt-1">Richt de scanner op je barcode</p>
          </div>
          <input
            ref={scanInputRef}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Wacht op scan..."
            value={scanBuffer}
            onChange={e => handleScanChange(e.target.value)}
            onKeyDown={handleScanKeyDown}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">E-mailadres</label><input type="email" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={email} onChange={e=>{setEmail(e.target.value);setError("")}} onKeyDown={e=>e.key==="Enter"&&go()} autoComplete="email"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Wachtwoord</label><input type="password" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={pass} onChange={e=>{setPass(e.target.value);setError("")}} onKeyDown={e=>e.key==="Enter"&&go()} autoComplete="current-password"/></div>
          <button onClick={go} disabled={busy} className="w-full py-3 rounded-xl text-white font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed" style={{backgroundColor:branding.color}}>{busy ? "Bezig..." : "Inloggen"}</button>
        </div>
      )}
    </div>
  </div>;
}
