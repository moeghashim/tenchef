import type { KeySettings, LlmProvider } from "./types";

// The API key lives in sessionStorage — it's cleared when the tab
// closes, so it can't linger across unrelated visits or be scraped by
// another localStorage-touching page. The provider choice is not
// sensitive and stays in localStorage so a returning user doesn't have
// to reselect Anthropic vs OpenAI every session.

export const API_KEY_STORAGE_KEY = "tenchef.apiKey";
export const PROVIDER_STORAGE_KEY = "tenchef.provider";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// One-time migration: earlier tenchef builds kept the API key in
// localStorage. Moving it to sessionStorage on first load reduces the
// window in which a compromised page can exfiltrate it, without
// forcing users to re-enter the key immediately after upgrading.
function migrateLegacyKey(local: StorageLike, session: StorageLike): void {
  const legacy = local.getItem(API_KEY_STORAGE_KEY);
  if (!legacy) return;
  if (!session.getItem(API_KEY_STORAGE_KEY)) {
    session.setItem(API_KEY_STORAGE_KEY, legacy);
  }
  local.removeItem(API_KEY_STORAGE_KEY);
}

export function loadKeySettingsFrom(local: StorageLike, session: StorageLike): KeySettings | null {
  migrateLegacyKey(local, session);
  const apiKey = session.getItem(API_KEY_STORAGE_KEY);
  const provider = local.getItem(PROVIDER_STORAGE_KEY) as LlmProvider | null;
  if (!apiKey || (provider !== "anthropic" && provider !== "openai")) return null;
  return { apiKey, provider };
}

export function saveKeySettingsTo(local: StorageLike, session: StorageLike, settings: KeySettings): void {
  session.setItem(API_KEY_STORAGE_KEY, settings.apiKey);
  local.setItem(PROVIDER_STORAGE_KEY, settings.provider);
}
