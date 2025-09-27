// ── Basic Auth helpers (optional; for stable dev/prod behind Basic) ───────────
function _getBasicAuthHeader(): Record<string, string> {
  try {
    const b64 = localStorage.getItem('basicAuthB64') || '';
    if (b64) return { Authorization: `Basic ${b64}` };
  } catch {}
  return {};
}

export function setBasicAuthCredentials(username: string, password: string): void {
  try {
    const b64 = typeof btoa === 'function' ? btoa(`${username}:${password}`) : '';
    if (b64) localStorage.setItem('basicAuthB64', b64);
  } catch {}
}

export function clearBasicAuthCredentials(): void {
  try { localStorage.removeItem('basicAuthB64'); } catch {}
}

function _finalizeUrl(url: string): string {
  return url.startsWith('/api') || url.startsWith('/assets') || url.startsWith('/static') ? url : `/api${url}`;
}

async function _handleResponse<T>(res: Response, tryNavigateOn401: boolean): Promise<T> {
  if (!res.ok) {
    if (res.status === 401 && tryNavigateOn401) {
      // Trigger browser Basic Auth prompt via navigation
      try { window.location.assign('/api/health'); } catch {}
    }
    throw new Error(`HTTP ${res.status}`);
  }
  try { return await res.json() as T; } catch { return undefined as unknown as T; }
}

export async function getJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const finalUrl = _finalizeUrl(url);
  const headers = { ..._getBasicAuthHeader(), ...(init?.headers || {}) } as Record<string, string>;
  const res = await fetch(finalUrl, { credentials: 'include', ...init, headers });
  return _handleResponse<T>(res, !('Authorization' in headers));
}

export async function postJSON<T>(url: string, body?: any, init?: RequestInit): Promise<T> {
  const finalUrl = _finalizeUrl(url);
  const headers = { 'Content-Type': 'application/json', ..._getBasicAuthHeader(), ...(init?.headers || {}) } as Record<string, string>;
  const res = await fetch(finalUrl, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: body == null ? undefined : JSON.stringify(body),
    ...init,
  });
  return _handleResponse<T>(res, !('Authorization' in headers));
}


