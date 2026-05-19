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

  const res = await fetch(`${BASE_URL}${path}`, opts);

  // Lege body (bv. toekomstige 204's) niet door JSON.parse halen.
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = (data && data.error) || `HTTP ${res.status}`;
    const err = new Error(message);
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
