const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Build a query string from a params object.
 * - Skips null, undefined, empty strings, and empty arrays.
 * - Arrays are joined with commas into a single param value.
 */
function buildQueryString(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val === null || val === undefined || val === '') return;
    if (Array.isArray(val)) {
      if (val.length === 0) return; // skip empty arrays
      q.append(key, val.join(','));
    } else {
      q.append(key, String(val));
    }
  });
  const str = q.toString();
  return str ? `?${str}` : '';
}

const inFlightRequests = new Map();

async function request(endpoint, options = {}, params = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ha_token') : null;
  const url = `${API_BASE}${endpoint}${buildQueryString(params)}`;
  const method = options.method || 'GET';
  const cacheKey = `${method}:${url}`;

  if (method === 'GET' && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(url, {
        headers,
        cache: 'no-store',
        ...options,
      });

      if (res.status === 204) {
        return null;
      }
      
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error((data && (data.error || data.message)) || `Request failed (${res.status})`);
      }

      return data;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (method === 'GET') {
    inFlightRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}

export const api = {
  get:    (endpoint, params)  => request(endpoint, {}, params),
  post:   (endpoint, body)    => request(endpoint, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (endpoint, body)    => request(endpoint, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (endpoint, body)    => request(endpoint, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (endpoint)          => request(endpoint, { method: 'DELETE' }),
};
