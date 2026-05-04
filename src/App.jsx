import { useState, useEffect, useCallback } from "react";
import { materials as INIT } from "./data/materials";
import { DEFAULT_USERS, DEFAULT_BRANDING } from "./data/defaults";
import { store } from "./utils/storage";
import { isoNow } from "./utils/date";
import { genItemBarcode, syncBarcodeCounter } from "./utils/barcode";
import { LoginView } from "./views/LoginView";
import { AdminView } from "./views/AdminView";
import { UserView } from "./views/UserView";

export default function App() {
  const [user, setUser] = useState(null);
  const [eq, setEq] = useState([]);
  const [bons, setBons] = useState([]);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [ok, setOk] = useState(false);

  useEffect(()=>{
    const saved = store.get("mhok-eq6");
    const data = saved || INIT;
    let counter = 0;
    data.forEach(i => { counter++; if (!i.barcode) i.barcode = genItemBarcode(counter); });
    syncBarcodeCounter(counter);
    setEq(data);
    setBons(store.get("mhok-bons")||[]);
    setLogs(store.get("mhok-logs")||[]);
    setBranding(store.get("mhok-brand")||DEFAULT_BRANDING);
    setUsers(store.get("mhok-users")||DEFAULT_USERS);
    const u=store.get("mhok-user");
    if(u)setUser(u);
    setOk(true);
  },[]);
  useEffect(()=>{if(ok)store.set("mhok-eq6",eq)},[eq,ok]);
  useEffect(()=>{if(ok)store.set("mhok-bons",bons)},[bons,ok]);
  useEffect(()=>{if(ok)store.set("mhok-logs",logs)},[logs,ok]);
  useEffect(()=>{if(ok)store.set("mhok-brand",branding)},[branding,ok]);
  useEffect(()=>{if(ok)store.set("mhok-users",users)},[users,ok]);

  const addLog=useCallback((action,detail)=>setLogs(p=>[{id:Date.now(),date:isoNow(),action,detail},...p]),[]);
  const handleLogin=(u)=>{setUser(u);store.set("mhok-user",u)};
  const handleLogout=()=>{setUser(null);store.set("mhok-user",null)};

  // Auto-logout after 5 minutes of inactivity
  useEffect(() => {
    if (!user) return;
    let timer = setTimeout(() => handleLogout(), 5 * 60 * 1000);
    const reset = () => { clearTimeout(timer); timer = setTimeout(() => handleLogout(), 5 * 60 * 1000); };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, reset, true));
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, reset, true)); };
  }, [user]);

  if(!ok)return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Laden...</p></div>;
  if(!user)return <LoginView onLogin={handleLogin} branding={branding} users={users}/>;
  if(user.role==="admin")return <AdminView eq={eq} setEq={setEq} bons={bons} setBons={setBons} logs={logs} addLog={addLog} branding={branding} setBranding={setBranding} users={users} setUsers={setUsers} onLogout={handleLogout}/>;
  return <UserView eq={eq} bons={bons} setBons={setBons} addLog={addLog} branding={branding} onLogout={handleLogout} user={user}/>;
}
