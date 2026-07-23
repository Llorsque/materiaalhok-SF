// API-client voor de materiaalhok-SF backend.
// Eén plek voor alle HTTP-calls richting de Express-server. Schermen en
// componenten roepen deze functies aan en weten verder niets van fetch,
// JSON-serialisatie of error-handling.

// LET OP: BASE_URL is voor nu hardgecoded. Als we later via een env-var
// willen configureren (bijv. productie vs lokaal), schakel dan over op
// `import.meta.env.VITE_API_BASE_URL` met deze constante als fallback.
const BASE_URL = 'http://localhost:3001';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { Accept: 'application/json' },
  };
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
export const getUsers   = ()         => request('GET',    '/api/users');
export const getUser    = (id)       => request('GET',    `/api/users/${id}`);
export const createUser = (data)     => request('POST',   '/api/users', data);
export const updateUser = (id, data) => request('PUT',    `/api/users/${id}`, data);
export const deleteUser = (id)       => request('DELETE', `/api/users/${id}`);

// --- Auth ------------------------------------------------------------------
export const login          = (email, password) => request('POST', '/api/login', { email, password });
export const loginByBarcode = (login_barcode)   => request('POST', '/api/login/scan', { login_barcode });

// --- Import ----------------------------------------------------------------
// Excel-upload gaat via multipart/form-data, dus omzeilt het JSON-pad.
async function uploadFile(path, file) {
  const fd = new FormData();
  fd.append('file', file);
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method: 'POST', body: fd });
  } catch (e) {
    const err = new Error(e.message || 'Geen verbinding met de server');
    err.kind = 'network';
    throw err;
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
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
