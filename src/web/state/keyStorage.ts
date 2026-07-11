import { DEFAULT_ANTHROPIC_MODEL, DEFAULT_OPENAI_MODEL } from "../llm/models";
import type { KeySettings, LlmProvider } from "./types";

// The API key lives in sessionStorage — it's cleared when the tab
// closes, so it can't linger across unrelated visits or be scraped by
// another localStorage-touching page. The provider choice and model name
// are not sensitive and stay in localStorage so a returning user doesn't
// have to reselect them every session.

export const API_KEY_STORAGE_KEY = "tenchef.apiKey";
export const PROVIDER_STORAGE_KEY = "tenchef.provider";
export const MODEL_STORAGE_KEY = "tenchef.model";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isProvider(value: string | null): value is LlmProvider {
  return value === "anthropic" || value === "openai" || value === "claude-code";
}

function defaultModelFor(provider: LlmProvider): string {
  if (provider === "anthropic") return DEFAULT_ANTHROPIC_MODEL;
  if (provider === "openai") return DEFAULT_OPENAI_MODEL;
  return "";
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
  const apiKey = session.getItem(API_KEY_STORAGE_KEY) || "";
  const provider = local.getItem(PROVIDER_STORAGE_KEY);
  if (!isProvider(provider)) return null;
  // Claude Code runs through the local CLI and needs no key.
  if (provider !== "claude-code" && !apiKey) return null;
  const model = local.getItem(MODEL_STORAGE_KEY) ?? defaultModelFor(provider);
  return { apiKey, provider, model };
}

export function saveKeySettingsTo(local: StorageLike, session: StorageLike, settings: KeySettings): void {
  if (settings.apiKey) session.setItem(API_KEY_STORAGE_KEY, settings.apiKey);
  else session.removeItem(API_KEY_STORAGE_KEY);
  local.setItem(PROVIDER_STORAGE_KEY, settings.provider);
  local.setItem(MODEL_STORAGE_KEY, settings.model);
}
