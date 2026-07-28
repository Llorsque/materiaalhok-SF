// API-client voor de materiaalhok-SF backend.
// Eén plek voor alle HTTP-calls richting de Express-server. Schermen en
// componenten roepen deze functies aan en weten verder niets van fetch,
// JSON-serialisatie of error-handling.

// LET OP: BASE_URL is voor nu hardgecoded. Als we later via een env-var
// willen configureren (bijv. productie vs lokaal), schakel dan over op
// `import.meta.env.VITE_API_BASE_URL` met deze constante als fallback.
const BASE_URL = 'http://localhost:3001';

// --- Token-opslag ----------------------------------------------------------
// Token staat in localStorage (blijft over browser-restart heen), de user
// zelf in sessionStorage (verdwijnt bij laptop-herstart). Zo hoeft een admin
// die z'n laptop herstart wél opnieuw in te loggen, maar tussen twee tabs
// werkt de sessie transparant door.
const TOKEN_KEY = 'mhok-token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage kan geblokkeerd zijn (privé-modus, quota vol). Stil
    // negeren is beter dan de app opblazen; requests werken dan alleen
    // niet auth-gebonden.
  }
}

// Signaleert de app dat het token niet meer geldig is. App.jsx luistert
// hierop en stuurt de gebruiker terug naar het loginscherm.
function fireAuthExpired() {
  try {
    window.dispatchEvent(new CustomEvent('mhok:auth-expired'));
  } catch {}
}

// --- Core request ----------------------------------------------------------

async function request(method, path, body) {
  const token = getToken();
  const opts = {
    method,
    headers: { Accept: 'application/json' },
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  // Onderscheid netwerkfout (fetch faalt, geen response) van server-respons-fout
  // (response.ok===false). Beide krijgen een `kind`, zodat UI-componenten als
  // ConnectionBanner een passende stijl en boodschap kunnen kiezen.
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, opts);
  } catch (e) {
    const err = new Error(e.message || 'Geen verbinding met de server');
    err.kind = 'network';
    throw err;
  }

  // Lege body (bv. toekomstige 204's) niet door JSON.parse halen.
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    // 401 bij een verzoek waarbij we wél een token stuurden = onze sessie is
    // ongeldig/verlopen. Token weggooien en de app terug naar login. Bij een
    // login-poging zelf sturen we geen token, dus die 401 gaat gewoon terug
    // als foutmelding naar het loginscherm.
    if (res.status === 401 && token) {
      setToken(null);
      fireAuthExpired();
    }

    const message = (data && data.error) || `HTTP ${res.status}`;
    const err = new Error(message);
    err.kind = 'response';
    err.status = res.status;
    err.details = data && data.details;
    throw err;
  }

  return data;
}

// --- Materials -------------------------------------------------------------
export const getMaterials   = ()         => request('GET',    '/api/materials');
export const getMaterial    = (id)       => request('GET',    `/api/materials/${id}`);
export const createMaterial = (data)     => request('POST',   '/api/materials', data);
export const updateMaterial = (id, data) => request('PUT',    `/api/materials/${id}`, data);
export const deleteMaterial = (id)       => request('DELETE', `/api/materials/${id}`);

// --- Sets ------------------------------------------------------------------
export const getSets   = ()         => request('GET',    '/api/sets');
export const getSet    = (id)       => request('GET',    `/api/sets/${id}`);
export const createSet = (data)     => request('POST',   '/api/sets', data);
export const updateSet = (id, data) => request('PUT',    `/api/sets/${id}`, data);
export const deleteSet = (id)       => request('DELETE', `/api/sets/${id}`);

// --- Users -----------------------------------------------------------------
export const getUsers          = ()             => request('GET',    '/api/users');
export const getUser           = (id)           => request('GET',    `/api/users/${id}`);
export const createUser        = (data)         => request('POST',   '/api/users', data);
export const updateUser        = (id, data)     => request('PUT',    `/api/users/${id}`, data);
export const deleteUser        = (id)           => request('DELETE', `/api/users/${id}`);
export const resetUserPassword = (id, password) => request('PUT',    `/api/users/${id}/password`, { password });

// --- Auth ------------------------------------------------------------------
// login/loginByBarcode: token uit de response strippen en apart opslaan zodat
// de rest van de app niet weet dat 'ie bestaat — die ziet alleen de user.
async function loginRequest(path, body) {
  const data = await request('POST', path, body);
  if (data && data.token) {
    setToken(data.token);
    const { token, ...user } = data;
    return user;
  }
  return data;
}
export const login          = (email, password) => loginRequest('/api/login',      { email, password });
export const loginByBarcode = (login_barcode)   => loginRequest('/api/login/scan', { login_barcode });
export const getMe          = ()                => request('GET', '/api/me');
export const updateMyNotifications = (prefs)    => request('PUT', '/api/me/notifications', prefs);

// Logout probeert de server-side sessie op te ruimen maar wist het token
// hoe dan ook. Als de server niet bereikbaar is willen we alsnog uitloggen
// aan de clientkant.
export async function logout() {
  try { await request('POST', '/api/logout'); } catch {}
  setToken(null);
}

// --- Import ----------------------------------------------------------------
// Excel-upload gaat via multipart/form-data, dus omzeilt het JSON-pad.
async function uploadFile(path, file) {
  const token = getToken();
  const fd = new FormData();
  fd.append('file', file);
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method: 'POST', body: fd, headers });
  } catch (e) {
    const err = new Error(e.message || 'Geen verbinding met de server');
    err.kind = 'network';
    throw err;
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401 && token) {
      setToken(null);
      fireAuthExpired();
    }
    const message = (data && data.error) || `HTTP ${res.status}`;
    const err = new Error(message);
    err.kind = 'response';
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}
export const importPreview = (file) => uploadFile('/api/import/preview', file);
export const importExecute = (file) => uploadFile('/api/import/execute', file);

// --- Backup ----------------------------------------------------------------
export const getBackupStatus = () => request('GET',  '/api/backup/status');
export const runBackup       = () => request('POST', '/api/backup/run');

// --- Admin (reset) ---------------------------------------------------------
export const getResetPreview = () => request('GET',  '/api/admin/reset-preview');
export const executeReset    = () => request('POST', '/api/admin/reset', { confirm: 'RESET' });

// --- Logs ------------------------------------------------------------------
// Bouwt een querystring uit de gedefinieerde params; lege waarden overslaan
// zodat we niet per ongeluk 'action=' als een echte filter meesturen.
export const getLogs = (params = {}) => {
  const qs = new URLSearchParams();
  for (const key of ['limit', 'offset', 'action', 'q', 'from', 'to']) {
    const v = params[key];
    if (v === undefined || v === null || v === '') continue;
    qs.set(key, v);
  }
  const s = qs.toString();
  return request('GET', `/api/logs${s ? `?${s}` : ''}`);
};

// --- Bons ------------------------------------------------------------------
export const getBons    = ()         => request('GET',    '/api/bons');
export const getBon     = (id)       => request('GET',    `/api/bons/${id}`);
export const createBon  = (data)     => request('POST',   '/api/bons', data);
export const updateBon  = (id, data) => request('PUT',    `/api/bons/${id}`, data);
export const deleteBon  = (id)       => request('DELETE', `/api/bons/${id}`);
export const pickupBon  = (id)       => request('POST',   `/api/bons/${id}/pickup`);
// items mag undefined zijn (complete retour) of een array {id, returned}.
export const returnBon  = (id, items) =>
  request('POST', `/api/bons/${id}/return`, items ? { items } : undefined);
