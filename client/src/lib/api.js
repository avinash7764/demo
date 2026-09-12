const TOKEN_KEY = 'learnhub_token';

// In-memory fallback so auth still works if localStorage is unavailable
// (e.g. sandboxed iframe previews that block browser storage).
let memToken = null;

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memToken;
  } catch {
    return memToken;
  }
}
export function setToken(token) {
  memToken = token || null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable — keep the token in memory only.
  }
}

// Thin fetch wrapper that injects the auth token and normalises errors.
export async function api(path, { method = 'GET', body, formData, auth = true } = {}) {
  const headers = {};
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (formData) {
    payload = formData; // do not set Content-Type; browser sets the multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, { method, headers, body: payload });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    // Handle expired / invalid sessions gracefully: if a token was present
    // but rejected, clear it so the app signs the user out cleanly instead of
    // surfacing a raw "Authentication required." error.
    if (res.status === 401 && auth && token) {
      setToken(null);
      window.dispatchEvent(new CustomEvent('learnhub:unauthorized'));
    }
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export function thumbUrl(p) {
  if (!p) return null;
  if (/^https?:\/\//.test(p)) return p;
  return `/uploads/${p.replace(/^\/?uploads\//, '')}`;
}
