/**
 * src/lib/api.js
 * Satu-satunya modul untuk berkomunikasi dengan backend API.
 * - Menempelkan token Authorization secara otomatis
 * - Menangani 401 dengan callback logout (didaftarkan dari AuthContext)
 */

const BASE = '/api';
let _onUnauthorized = null;

/** Daftarkan callback yang dipanggil saat API menjawab 401 */
export function setUnauthorizedHandler(fn) {
  _onUnauthorized = fn;
}

/** Ambil token dari sessionStorage (tidak di-log) */
function getToken() {
  return sessionStorage.getItem('sa_token');
}

/** Simpan token */
export function saveToken(token) {
  sessionStorage.setItem('sa_token', token);
}

/** Hapus token */
export function removeToken() {
  sessionStorage.removeItem('sa_token');
}

/** Cek apakah token tersedia */
export function hasToken() {
  return Boolean(sessionStorage.getItem('sa_token'));
}

/**
 * Request wrapper utama
 * @param {string} path - path relatif, mis. '/services'
 * @param {RequestInit} options
 */
async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Jangan set Content-Type untuk FormData (biar browser atur boundary)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (_onUnauthorized) _onUnauthorized();
    throw new ApiError(res.status, 'Sesi tidak valid atau sudah berakhir');
  }

  // Untuk download (blob)
  if (options._blob) {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message || 'Terjadi kesalahan');
    }
    return res.blob();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.message || 'Terjadi kesalahan pada server');
  }
  return data;
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (body) => request('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  me:       ()     => request('/auth/me'),
};

// ─── Services ─────────────────────────────────────────────────────────────────
export const services = {
  list: () => request('/services'),
};

// ─── Consultations ────────────────────────────────────────────────────────────
export const consultations = {
  create: (body) => request('/consultations', { method: 'POST', body: JSON.stringify(body) }),
  list:   ()     => request('/consultations'),
  get:    (id)   => request(`/consultations/${id}`),
  updateStatus: (id, body) =>
    request(`/consultations/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  uploadManuscript: (id, formData) =>
    request(`/consultations/${id}/manuscripts`, { method: 'POST', body: formData }),
};

// ─── Manuscripts ──────────────────────────────────────────────────────────────
export const manuscripts = {
  download: (id) => request(`/manuscripts/${id}/download`, { _blob: true }),
};
