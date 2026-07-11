import { useState } from "react";
import { validateAnthropicKey } from "../llm/anthropic";
import { DEFAULT_ANTHROPIC_MODEL, DEFAULT_OPENAI_MODEL } from "../llm/models";
import { validateOpenAiKey } from "../llm/openai";
import type { KeySettings, LlmProvider } from "../state/types";
import { ACCENT_OPTIONS, colors, fonts } from "../styles/tokens";

interface KeyPromptProps {
  accent: string;
  claudeCliAvailable: boolean;
  onSave: (settings: KeySettings) => void;
}

const PROVIDER_LABELS: Record<LlmProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  "claude-code": "Claude Code"
};

function defaultModelFor(provider: LlmProvider): string {
  if (provider === "anthropic") return DEFAULT_ANTHROPIC_MODEL;
  if (provider === "openai") return DEFAULT_OPENAI_MODEL;
  return "";
}

export function KeyPrompt({ accent, claudeCliAvailable, onSave }: KeyPromptProps) {
  const [provider, setProvider] = useState<LlmProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_ANTHROPIC_MODEL);
  const [modelEdited, setModelEdited] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClaudeCode = provider === "claude-code";
  const canSave = isClaudeCode
    ? claudeCliAvailable && !checking
    : apiKey.trim().length > 0 && model.trim().length > 0 && !checking;

  const selectProvider = (value: LlmProvider) => {
    setProvider(value);
    setError(null);
    if (!modelEdited) setModel(defaultModelFor(value));
  };

  const save = async () => {
    if (!canSave) return;
    const trimmedKey = apiKey.trim();
    const trimmedModel = model.trim();
    if (isClaudeCode) {
      onSave({ provider, apiKey: "", model: trimmedModel });
      return;
    }
    setChecking(true);
    setError(null);
    const problem =
      provider === "anthropic"
        ? await validateAnthropicKey(trimmedKey, trimmedModel)
        : await validateOpenAiKey(trimmedKey, trimmedModel);
    setChecking(false);
    if (problem) {
      setError(problem);
      return;
    }
    onSave({ provider, apiKey: trimmedKey, model: trimmedModel });
  };

  const inputStyle = {
    width: "100%",
    border: `1px solid ${colors.lineStrong}`,
    borderRadius: 12,
    padding: "14px 16px",
    fontSize: 15.5,
    color: colors.ink,
    background: colors.white,
    outline: "none"
  } as const;

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
      <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: colors.soft,
            marginBottom: 22
          }}
        >
          Bring your own key
        </div>
        <h1
          style={{
            fontFamily: fonts.serif,
            fontWeight: 400,
            fontSize: 54,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            margin: "0 0 18px"
          }}
        >
          Connect a model.
        </h1>
        <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "#5B5B57", margin: "0 auto 30px", maxWidth: 450 }}>
          Your key stays in this browser session — cleared when you close the tab — and is used only for direct plan
          revisions.
        </p>
        <div
          style={{
            background: colors.white,
            border: `1px solid ${colors.line}`,
            borderRadius: 16,
            padding: 18,
            textAlign: "left"
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {(["anthropic", "openai", "claude-code"] as const).map((value) => {
              const selected = value === provider;
              return (
                <button
                  key={value}
                  onClick={() => selectProvider(value)}
                  style={{
                    padding: "11px 10px",
                    borderRadius: 10,
                    border: `1px solid ${selected ? accent : colors.lineStrong}`,
                    background: selected ? `${accent}12` : colors.white,
                    color: selected ? accent : colors.text,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  {PROVIDER_LABELS[value]}
                </button>
              );
            })}
          </div>
          {isClaudeCode ? null : (
            <input
              className="tc-input"
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                setError(null);
              }}
              placeholder={provider === "anthropic" ? "sk-ant-..." : "sk-..."}
              type="password"
              style={inputStyle}
            />
          )}
          <input
            className="tc-input"
            value={model}
            onChange={(event) => {
              setModel(event.target.value);
              setModelEdited(true);
              setError(null);
            }}
            placeholder={isClaudeCode ? "Default model (optional override, e.g. sonnet)" : defaultModelFor(provider)}
            type="text"
            aria-label="Model"
            style={{ ...inputStyle, marginTop: isClaudeCode ? 0 : 10 }}
          />
          <div style={{ fontSize: 12.5, color: colors.soft, marginTop: 8 }}>
            {isClaudeCode
              ? claudeCliAvailable
                ? "Revisions run through your local Claude Code CLI — no API key needed."
                : "Claude Code CLI was not found on this machine. Install it or pick another provider."
              : "Model used for plan revisions. The default is a current general-availability model."}
          </div>
          {error ? (
            <div style={{ fontSize: 13.5, color: "#B4372E", marginTop: 10, lineHeight: 1.5 }}>{error}</div>
          ) : null}
          <button
            className="tc-dark-button"
            disabled={!canSave}
            onClick={() => {
              void save();
            }}
            style={{
              marginTop: 14,
              width: "100%",
              padding: "13px 18px",
              borderRadius: 11,
              background: canSave ? colors.ink : "#D6D5CE",
              color: colors.white,
              border: "none",
              cursor: canSave ? "pointer" : "default",
              fontSize: 15,
              fontWeight: 500
            }}
          >
            {checking ? "Checking key…" : isClaudeCode ? "Use Claude Code" : "Save key"}
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          {ACCENT_OPTIONS.map((option) => (
            <span
              key={option}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: option,
                opacity: option === accent ? 1 : 0.35
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
