const TOKEN_KEY = "tenchef.token";

let cachedToken: string | null = null;

export function bootstrapToken(): void {
  const match = window.location.hash.match(/token=([A-Za-z0-9]+)/);
  if (match) {
    cachedToken = match[1];
    window.sessionStorage.setItem(TOKEN_KEY, cachedToken);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  } else {
    cachedToken = window.sessionStorage.getItem(TOKEN_KEY);
  }
}

export function getToken(): string | null {
  return cachedToken;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (cachedToken) headers.set("x-tenchef-token", cachedToken);
  const response = await fetch(path, { ...init, headers });
  if (response.status === 401) {
    throw new Error("This tab is no longer authorized. Reopen the URL printed in your terminal.");
  }
  return response;
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
