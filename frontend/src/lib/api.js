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

/** Helper build query string */
function toQueryString(params = {}) {
  const parts = [];
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
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
    const data = await res.json().catch(() => ({}));
    // Hanya trigger handler logout jika bukan dari endpoint login itu sendiri
    if (_onUnauthorized && !path.startsWith('/auth/login')) {
      _onUnauthorized();
    }
    throw new ApiError(res.status, data.message || 'Email atau kata sandi salah');
  }

  // Untuk download (blob)
  if (options._blob) {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message || 'Terjadi kesalahan saat mengunduh file');
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
  register:       (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:          (body) => request('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  me:             ()     => request('/auth/me'),
  updateProfile:  (body) => request('/auth/me',       { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (body) => request('/auth/password', { method: 'PATCH', body: JSON.stringify(body) }),
  forgotPassword: (body) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword:  (body) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── Services (Publik) ────────────────────────────────────────────────────────
export const services = {
  list: () => request('/services'),
};

// ─── Settings (Rekening & Pengaturan) ─────────────────────────────────────────
export const settings = {
  payment:     ()     => request('/settings/payment'),
  adminGet:    ()     => request('/admin/settings'),
  adminUpdate: (body) => request('/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),
};

// ─── Consultations ────────────────────────────────────────────────────────────
export const consultations = {
  create:       (body) => request('/consultations', { method: 'POST', body: JSON.stringify(body) }),
  summary:      ()     => request('/consultations/summary'),
  list:         (params) => request(`/consultations${toQueryString(params)}`),
  get:          (id)   => request(`/consultations/${id}`),
  assign:       (id, consultant_id) =>
    request(`/consultations/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ consultant_id }) }),
  updateStatus: (id, body) =>
    request(`/consultations/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  uploadManuscript: (id, formData) =>
    request(`/consultations/${id}/manuscripts`, { method: 'POST', body: formData }),
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const payments = {
  list:          (params) => request(`/payments${toQueryString(params)}`),
  uploadProof:   (consultationId, formData) =>
    request(`/consultations/${consultationId}/payments/proof`, { method: 'POST', body: formData }),
  downloadProof: (id) => request(`/payments/${id}/proof`, { _blob: true }),
  update:        (id, body) => request(`/payments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

// ─── Messages & Diskusi ───────────────────────────────────────────────────────
export const messages = {
  list:               (consultationId, afterId) =>
    request(`/consultations/${consultationId}/messages${afterId ? `?after_id=${afterId}` : ''}`),
  send:               (consultationId, formData) =>
    request(`/consultations/${consultationId}/messages`, { method: 'POST', body: formData }),
  markRead:           (consultationId) =>
    request(`/consultations/${consultationId}/messages/read`, { method: 'PATCH' }),
  downloadAttachment: (id) => request(`/messages/${id}/attachment`, { _blob: true }),
};

// ─── Manuscripts ──────────────────────────────────────────────────────────────
export const manuscripts = {
  download: (id) => request(`/manuscripts/${id}/download`, { _blob: true }),
};

// ─── Admin Management ─────────────────────────────────────────────────────────
export const admin = {
  stats:       ()       => request('/admin/stats'),
  consultants: ()       => request('/admin/consultants'),
  users: {
    list:   (params)   => request(`/admin/users${toQueryString(params)}`),
    update: (id, body) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  services: {
    list:   ()         => request('/admin/services'),
    create: (body)     => request('/admin/services', { method: 'POST', body: JSON.stringify(body) }),
    get:    (id)       => request(`/admin/services/${id}`),
    update: (id, body) => request(`/admin/services/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id)       => request(`/admin/services/${id}`, { method: 'DELETE' }),
  },
};
