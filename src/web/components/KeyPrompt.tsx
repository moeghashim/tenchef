import { useState } from "react";
import type { KeySettings, LlmProvider } from "../state/types";
import { ACCENT_OPTIONS, colors, fonts } from "../styles/tokens";

interface KeyPromptProps {
  accent: string;
  onSave: (settings: KeySettings) => void;
}

export function KeyPrompt({ accent, onSave }: KeyPromptProps) {
  const [provider, setProvider] = useState<LlmProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");

  const canSave = apiKey.trim().length > 0;

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
          Your key stays in this browser and is used only for direct plan revisions.
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {(["anthropic", "openai"] as const).map((value) => {
              const selected = value === provider;
              return (
                <button
                  key={value}
                  onClick={() => setProvider(value)}
                  style={{
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: `1px solid ${selected ? accent : colors.lineStrong}`,
                    background: selected ? `${accent}12` : colors.white,
                    color: selected ? accent : colors.text,
                    cursor: "pointer",
                    fontSize: 14.5,
                    fontWeight: 500
                  }}
                >
                  {value === "anthropic" ? "Anthropic" : "OpenAI"}
                </button>
              );
            })}
          </div>
          <input
            className="tc-input"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={provider === "anthropic" ? "sk-ant-..." : "sk-..."}
            type="password"
            style={{
              width: "100%",
              border: `1px solid ${colors.lineStrong}`,
              borderRadius: 12,
              padding: "14px 16px",
              fontSize: 15.5,
              color: colors.ink,
              background: colors.white,
              outline: "none"
            }}
          />
          <button
            className="tc-dark-button"
            disabled={!canSave}
            onClick={() => {
              if (!canSave) return;
              onSave({ provider, apiKey: apiKey.trim() });
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
            Save key
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
