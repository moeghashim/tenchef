import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_ANTHROPIC_MODEL } from "../../src/web/llm/models";
import {
  API_KEY_STORAGE_KEY,
  MODEL_STORAGE_KEY,
  PROVIDER_STORAGE_KEY,
  loadKeySettingsFrom,
  saveKeySettingsTo,
  type StorageLike
} from "../../src/web/state/keyStorage";

class MemStorage implements StorageLike {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  keys(): string[] {
    return [...this.data.keys()];
  }
}

let local: MemStorage;
let session: MemStorage;

beforeEach(() => {
  local = new MemStorage();
  session = new MemStorage();
});

describe("keyStorage", () => {
  it("saves the API key to sessionStorage and the provider/model to localStorage", () => {
    saveKeySettingsTo(local, session, { apiKey: "sk-live", provider: "anthropic", model: "claude-sonnet-5" });
    expect(session.getItem(API_KEY_STORAGE_KEY)).toBe("sk-live");
    expect(local.getItem(PROVIDER_STORAGE_KEY)).toBe("anthropic");
    expect(local.getItem(MODEL_STORAGE_KEY)).toBe("claude-sonnet-5");
    // Do NOT store the key in localStorage.
    expect(local.getItem(API_KEY_STORAGE_KEY)).toBeNull();
  });

  it("returns null when no key has been stored", () => {
    expect(loadKeySettingsFrom(local, session)).toBeNull();
  });

  it("returns null when the provider is missing or invalid", () => {
    session.setItem(API_KEY_STORAGE_KEY, "sk-live");
    expect(loadKeySettingsFrom(local, session)).toBeNull();
    local.setItem(PROVIDER_STORAGE_KEY, "bogus");
    expect(loadKeySettingsFrom(local, session)).toBeNull();
  });

  it("falls back to the provider default model when none is stored", () => {
    session.setItem(API_KEY_STORAGE_KEY, "sk-live");
    local.setItem(PROVIDER_STORAGE_KEY, "anthropic");
    expect(loadKeySettingsFrom(local, session)?.model).toBe(DEFAULT_ANTHROPIC_MODEL);
  });

  it("loads claude-code settings without an API key", () => {
    local.setItem(PROVIDER_STORAGE_KEY, "claude-code");
    expect(loadKeySettingsFrom(local, session)).toEqual({ apiKey: "", provider: "claude-code", model: "" });
  });

  it("clears a stale sessionStorage key when saving claude-code settings", () => {
    session.setItem(API_KEY_STORAGE_KEY, "sk-old");
    saveKeySettingsTo(local, session, { apiKey: "", provider: "claude-code", model: "" });
    expect(session.getItem(API_KEY_STORAGE_KEY)).toBeNull();
  });

  it("migrates a legacy localStorage key into sessionStorage and clears the old copy", () => {
    // Pre-hardening state: previous tenchef stored the key in localStorage.
    local.setItem(API_KEY_STORAGE_KEY, "sk-legacy");
    local.setItem(PROVIDER_STORAGE_KEY, "anthropic");

    const settings = loadKeySettingsFrom(local, session);

    expect(settings).toEqual({ apiKey: "sk-legacy", provider: "anthropic", model: DEFAULT_ANTHROPIC_MODEL });
    expect(session.getItem(API_KEY_STORAGE_KEY)).toBe("sk-legacy");
    // The critical guarantee: the key no longer lives in localStorage.
    expect(local.getItem(API_KEY_STORAGE_KEY)).toBeNull();
  });

  it("does not overwrite a sessionStorage key when a legacy localStorage key is also present", () => {
    session.setItem(API_KEY_STORAGE_KEY, "sk-current");
    local.setItem(API_KEY_STORAGE_KEY, "sk-legacy");
    local.setItem(PROVIDER_STORAGE_KEY, "anthropic");

    loadKeySettingsFrom(local, session);

    expect(session.getItem(API_KEY_STORAGE_KEY)).toBe("sk-current");
    expect(local.getItem(API_KEY_STORAGE_KEY)).toBeNull();
  });
});
