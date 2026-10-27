import { API_URL } from './config';

let authToken = null;
let onUnauthorized = () => {};

export const setToken = (token) => { authToken = token; };
export const setOnUnauthorized = (fn) => { onUnauthorized = fn; };

export const imageUrl = (path) => (path ? API_URL + path : null);

// api('/items', { method: 'POST', body: {...} })  — JSON
// api('/items', { method: 'POST', form })         — multipart (photo upload)
export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, { method, headers, body: payload });
  } catch {
    throw new Error(`Can't reach the server at ${API_URL}. Is the backend running?`);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && authToken) onUnauthorized();
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data; // e.g. { needsVerification, email, retryAfter }
    throw err;
  }
  return data;
}
