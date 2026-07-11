export interface TenchefConfig {
  accent?: string;
  token?: string;
  claudeCli?: boolean;
}

let configPromise: Promise<TenchefConfig> | null = null;

// /config is same-origin-readable only (a foreign page can fire requests at
// the local server but cannot read responses), so the per-session API token
// is delivered here and attached to every local API call.
export function getConfig(): Promise<TenchefConfig> {
  if (!configPromise) {
    configPromise = fetch("/config")
      .then((response) => (response.ok ? (response.json() as Promise<TenchefConfig>) : {}))
      .catch(() => ({}));
  }
  return configPromise;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { token } = await getConfig();
  const headers = new Headers(init.headers);
  if (token) headers.set("x-tenchef-token", token);
  return fetch(path, { ...init, headers });
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${path} failed with ${response.status}`);
  }
  return (await response.json()) as T;
}
