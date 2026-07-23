import { useState, useEffect, useCallback } from "react";
import { DEFAULT_BRANDING } from "./data/defaults";
import { store, session } from "./utils/storage";
import { genItemBarcode, syncBarcodeCounter } from "./utils/barcode";
import { getMaterials, getUsers, getSets, getBons, getLogs, logout as apiLogout } from "./api/client";
import { LoginView } from "./views/LoginView";
import { AdminView } from "./views/AdminView";
import { UserView } from "./views/UserView";

// Auto-logout bij inactiviteit. Verlaag tijdelijk naar bv. 30 * 1000 om te testen.
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

export default function App() {
  const [user, setUser] = useState(null);
  const [eq, setEq] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [sets, setSets] = useState([]);
  const [setsLoading, setSetsLoading] = useState(false);
  const [setsError, setSetsError] = useState(null);
  const [bons, setBons] = useState([]);
  const [bonsLoading, setBonsLoading] = useState(false);
  const [bonsError, setBonsError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [ok, setOk] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // 200ms-throttle: zet loading pas op true als de fetch langer duurt,
  // zodat snelle responses geen flikkering geven.
  const refreshMaterials = useCallback(async () => {
    setMaterialsError(null);
    const t = setTimeout(() => setMaterialsLoading(true), 200);
    try {
      const data = await getMaterials();
      let counter = 0;
      data.forEach((i) => { counter++; if (!i.barcode) i.barcode = genItemBarcode(counter); });
      syncBarcodeCounter(counter);
      setEq(data);
    } catch (err) {
      setMaterialsError(err);
    } finally {
      clearTimeout(t);
      setMaterialsLoading(false);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    setUsersError(null);
    const t = setTimeout(() => setUsersLoading(true), 200);
    try {
      setUsers(await getUsers());
    } catch (err) {
      setUsersError(err);
    } finally {
      clearTimeout(t);
      setUsersLoading(false);
    }
  }, []);

  const refreshSets = useCallback(async () => {
    setSetsError(null);
    const t = setTimeout(() => setSetsLoading(true), 200);
    try {
      setSets(await getSets());
    } catch (err) {
      setSetsError(err);
    } finally {
      clearTimeout(t);
      setSetsLoading(false);
    }
  }, []);

  const refreshBons = useCallback(async () => {
    setBonsError(null);
    const t = setTimeout(() => setBonsLoading(true), 200);
    try {
      setBons(await getBons());
    } catch (err) {
      setBonsError(err);
    } finally {
      clearTimeout(t);
      setBonsLoading(false);
    }
  }, []);

  // Recente logs voor het dashboard (top-8-overzicht). LogTab doet zijn eigen
  // paginated fetch — deze 200 is enkel voor "Recente activiteit".
  const refreshLogs = useCallback(async () => {
    try {
      const data = await getLogs({ limit: 200 });
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
    } catch {
      // Recente activiteit is niet kritisch; stil falen is oké hier.
    }
  }, []);

  // localStorage blijft bron voor branding.
  // mhok-user staat in sessionStorage zodat de sessie eindigt bij browser/laptop-herstart.
  // mhok-eq6, mhok-users, mhok-bons en mhok-logs worden bewust NIET meer ingelezen —
  // logs komen sinds v1.2.0 uit de backend, de rest sinds de SQLite-migratie.
  useEffect(() => {
    setBranding(store.get("mhok-brand") || DEFAULT_BRANDING);
    try { localStorage.removeItem("mhok-user"); } catch {}
    try { localStorage.removeItem("mhok-logs"); } catch {}
    const u = session.get("mhok-user");
    if (u) setUser(u);
    setOk(true);
  }, []);

  // Eerste backend-fetch zodra de app klaar is met initialiseren.
  useEffect(() => {
    if (!ok) return;
    refreshMaterials();
    refreshUsers();
    refreshSets();
    refreshBons();
    refreshLogs();
  }, [ok, refreshMaterials, refreshUsers, refreshSets, refreshBons, refreshLogs]);

  useEffect(() => { if (ok) store.set("mhok-brand", branding); }, [branding, ok]);

  // Backwards-compatible addLog: sinds v1.2.0 logt de backend zelf. Deze
  // callback triggert alleen nog een refresh, zodat het dashboard de zojuist
  // geschreven regel direct ziet. Argumenten worden bewust genegeerd.
  const addLog = useCallback(() => { refreshLogs(); }, [refreshLogs]);
  const handleLogin = (u) => { setSessionExpired(false); setUser(u); session.set("mhok-user", u); };
  const handleLogout = () => {
    // Server best-effort informeren; client-side sowieso uitloggen zodat een
    // haperende backend geen "kan niet uitloggen"-situatie oplevert.
    apiLogout();
    setUser(null);
    session.remove("mhok-user");
  };
  const handleAutoLogout = () => { apiLogout(); setUser(null); session.remove("mhok-user"); setSessionExpired(true); };

  // Wanneer een API-call een 401 teruggeeft, dispatcht de client een event.
  // We wissen de user (token is al door de client opgeruimd) en tonen het
  // "sessie verlopen"-bericht op het loginscherm.
  useEffect(() => {
    const handler = () => { setUser(null); session.remove("mhok-user"); setSessionExpired(true); };
    window.addEventListener("mhok:auth-expired", handler);
    return () => window.removeEventListener("mhok:auth-expired", handler);
  }, []);

  // Auto-logout na INACTIVITY_TIMEOUT_MS — reset bij muis/toets/klik/scroll/touch.
  useEffect(() => {
    if (!user) return;
    let timer = setTimeout(handleAutoLogout, INACTIVITY_TIMEOUT_MS);
    const reset = () => { clearTimeout(timer); timer = setTimeout(handleAutoLogout, INACTIVITY_TIMEOUT_MS); };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, reset, true));
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, reset, true)); };
  }, [user]);

  if (!ok) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Laden...</p></div>;
  if (!user) return <LoginView onLogin={handleLogin} branding={branding} usersLoading={usersLoading} usersError={usersError} refreshUsers={refreshUsers} sessionExpired={sessionExpired} onDismissSessionExpired={()=>setSessionExpired(false)}/>;
  if (user.role === "admin") return <AdminView eq={eq} setEq={setEq} materialsLoading={materialsLoading} materialsError={materialsError} setMaterialsError={setMaterialsError} refreshMaterials={refreshMaterials} users={users} setUsers={setUsers} usersLoading={usersLoading} usersError={usersError} setUsersError={setUsersError} refreshUsers={refreshUsers} sets={sets} refreshSets={refreshSets} bons={bons} bonsLoading={bonsLoading} bonsError={bonsError} setBonsError={setBonsError} refreshBons={refreshBons} logs={logs} addLog={addLog} branding={branding} setBranding={setBranding} onLogout={handleLogout}/>;
  return <UserView eq={eq} materialsLoading={materialsLoading} materialsError={materialsError} setMaterialsError={setMaterialsError} refreshMaterials={refreshMaterials} sets={sets} bons={bons} bonsLoading={bonsLoading} bonsError={bonsError} setBonsError={setBonsError} refreshBons={refreshBons} addLog={addLog} branding={branding} onLogout={handleLogout} user={user}/>;
}
