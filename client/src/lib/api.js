const TOKEN_KEY = 'learnhub_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
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
