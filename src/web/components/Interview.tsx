import type { CSSProperties, Dispatch } from "react";
import type { AppAction } from "../state/reducer";
import { QUESTIONS } from "../state/questions";
import type { Answers, Question } from "../state/types";
import { colors, fonts } from "../styles/tokens";

interface InterviewProps {
  answers: Answers;
  accent: string;
  qIndex: number;
  dispatch: Dispatch<AppAction>;
  onAutoNext: () => void;
}

function selectedValue(answers: Answers, question: Question): string | string[] | undefined {
  return answers[question.id];
}

function optionRowStyle(selected: boolean, accent: string): CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    width: "100%",
    textAlign: "left",
    padding: "16px 18px",
    borderRadius: 14,
    cursor: "pointer",
    font: "inherit",
    color: colors.ink,
    border: `1px solid ${selected ? accent : "#E7E6E1"}`,
    background: selected ? `${accent}0F` : colors.white,
    transition: "all .14s ease"
  };
}

function indicatorStyle(selected: boolean, multi: boolean, accent: string): CSSProperties {
  return {
    flex: "0 0 auto",
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: multi ? 7 : "50%",
    border: `1px solid ${selected ? accent : "#C9C8C2"}`,
    background: selected ? accent : colors.white,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all .14s"
  };
}

function visualCardStyle(selected: boolean, accent: string): CSSProperties {
  return {
    padding: 14,
    borderRadius: 16,
    cursor: "pointer",
    font: "inherit",
    textAlign: "left",
    border: `1px solid ${selected ? accent : "#E7E6E1"}`,
    background: selected ? `${accent}0A` : colors.white,
    transition: "all .14s"
  };
}

export function Interview({ answers, accent, qIndex, dispatch, onAutoNext }: InterviewProps) {
  const question = QUESTIONS[qIndex];
  const fillPct = Math.round(((qIndex + 1) / QUESTIONS.length) * 100);
  const value = selectedValue(answers, question);
  const isText = question.type === "text";
  const isChoice = question.type === "single" || question.type === "multi";
  const isVisual = question.type === "visual";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: 680, width: "100%", margin: "0 auto", padding: "34px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: colors.soft, letterSpacing: "0.02em" }}>
            Question {qIndex + 1} of {QUESTIONS.length}
          </span>
          <span style={{ fontSize: 13, color: colors.soft }}>{question.kind}</span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: colors.line, overflow: "hidden" }}>
          <div
            style={{
              width: `${fillPct}%`,
              height: "100%",
              background: accent,
              borderRadius: 99,
              transition: "width .3s ease"
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "44px 24px 120px" }}>
        <div style={{ maxWidth: 680, width: "100%" }}>
          <h2
            style={{
              fontFamily: fonts.serif,
              fontWeight: 400,
              fontSize: 44,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              margin: "0 0 10px"
            }}
          >
            {question.title}
          </h2>
          <p style={{ fontSize: 16, color: "#7A7A75", margin: "0 0 32px", lineHeight: 1.55 }}>{question.subtitle}</p>

          {isText ? (
            <textarea
              className="tc-textarea"
              value={typeof value === "string" ? value : ""}
              onChange={(event) => dispatch({ type: "SET_TEXT", qid: question.id, value: event.target.value })}
              placeholder={question.placeholder}
              rows={question.rows || 3}
              style={{
                width: "100%",
                border: `1px solid ${colors.lineStrong}`,
                borderRadius: 14,
                padding: "18px 20px",
                fontSize: 18,
                lineHeight: 1.5,
                color: colors.ink,
                background: colors.white,
                resize: "none",
                outline: "none"
              }}
            />
          ) : null}

          {isChoice ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(question.options || []).map((option) => {
                const multi = question.type === "multi";
                const selected = multi
                  ? Array.isArray(value) && value.includes(option.id)
                  : value === option.id;
                return (
                  <button
                    className="tc-option"
                    key={option.id}
                    onClick={() => {
                      if (multi) dispatch({ type: "TOGGLE_MULTI", qid: question.id as "platforms" | "features", value: option.id });
                      else {
                        dispatch({ type: "SELECT_SINGLE", qid: question.id, value: option.id });
                        window.setTimeout(onAutoNext, 220);
                      }
                    }}
                    style={optionRowStyle(selected, accent)}
                  >
                    <div style={indicatorStyle(selected, multi, accent)}>
                      {selected ? (
                        multi ? (
                          <div style={{ color: colors.white, fontSize: 12, fontWeight: 700, lineHeight: 1 }}>&#10003;</div>
                        ) : (
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors.white }} />
                        )
                      ) : null}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.01em" }}>{option.label}</div>
                      <div style={{ fontSize: 13.5, color: "#9A9A94", marginTop: 2 }}>{option.desc || ""}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {isVisual ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <VisualChoice id="minimal" label="Minimal" desc="Airy, lots of whitespace" selected={answers.direction === "minimal"} accent={accent} onPick={() => {
                dispatch({ type: "SELECT_VISUAL", value: "minimal" });
                window.setTimeout(onAutoNext, 220);
              }} />
              <VisualChoice id="editorial" label="Editorial" desc="Serif, typographic" selected={answers.direction === "editorial"} accent={accent} onPick={() => {
                dispatch({ type: "SELECT_VISUAL", value: "editorial" });
                window.setTimeout(onAutoNext, 220);
              }} />
              <VisualChoice id="vivid" label="Vivid" desc="Bold blocks & color" selected={answers.direction === "vivid"} accent={accent} onPick={() => {
                dispatch({ type: "SELECT_VISUAL", value: "vivid" });
                window.setTimeout(onAutoNext, 220);
              }} />
              <VisualChoice id="utility" label="Utilitarian" desc="Dense, data-rich" selected={answers.direction === "utility"} accent={accent} onPick={() => {
                dispatch({ type: "SELECT_VISUAL", value: "utility" });
                window.setTimeout(onAutoNext, 220);
              }} />
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ position: "sticky", bottom: 0, borderTop: `1px solid ${colors.line}`, background: "rgba(247,246,243,0.9)", backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            className="tc-soft-button"
            onClick={() => dispatch({ type: "BACK" })}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "11px 18px",
              borderRadius: 10,
              background: "transparent",
              border: "1px solid transparent",
              color: "#7A7A75",
              cursor: "pointer",
              fontSize: 14.5
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>&larr;</span> Back
          </button>
          <button
            className="tc-dark-button"
            onClick={() => dispatch({ type: "NEXT" })}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "12px 24px",
              borderRadius: 11,
              background: colors.ink,
              color: colors.white,
              border: "none",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 500
            }}
          >
            {qIndex >= QUESTIONS.length - 1 ? "Generate plan" : "Continue"} <span style={{ fontSize: 16, lineHeight: 1 }}>&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface VisualChoiceProps {
  id: "minimal" | "editorial" | "vivid" | "utility";
  label: string;
  desc: string;
  selected: boolean;
  accent: string;
  onPick: () => void;
}

function VisualChoice({ id, label, desc, selected, accent, onPick }: VisualChoiceProps) {
  return (
    <button className="tc-visual-card" onClick={onPick} style={visualCardStyle(selected, accent)}>
      {id === "minimal" ? (
        <div style={{ height: 88, borderRadius: 9, background: "#F4F3EF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ width: "38%", height: 7, borderRadius: 99, background: "#D6D5CE" }} />
          <div style={{ width: "22%", height: 5, borderRadius: 99, background: "#E4E3DC" }} />
        </div>
      ) : null}
      {id === "editorial" ? (
        <div style={{ height: 88, borderRadius: 9, background: "#F4F3EF", padding: 14, display: "flex", flexDirection: "column", justifyContent: "center", gap: 7 }}>
          <div style={{ width: "70%", height: 11, borderRadius: 3, background: "#CFCEC6" }} />
          <div style={{ width: "90%", height: 5, borderRadius: 99, background: "#E4E3DC" }} />
          <div style={{ width: "80%", height: 5, borderRadius: 99, background: "#E4E3DC" }} />
        </div>
      ) : null}
      {id === "vivid" ? (
        <div style={{ height: 88, borderRadius: 9, background: "#F4F3EF", padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: colors.ink }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ width: "80%", height: 6, borderRadius: 99, background: "#D6D5CE" }} />
            <div style={{ width: "55%", height: 6, borderRadius: 99, background: "#E4E3DC" }} />
          </div>
        </div>
      ) : null}
      {id === "utility" ? (
        <div style={{ height: 88, borderRadius: 9, background: "#F4F3EF", padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <div style={{ background: "#E1E0D9", borderRadius: 4 }} />
          <div style={{ background: "#E1E0D9", borderRadius: 4 }} />
          <div style={{ background: "#E1E0D9", borderRadius: 4 }} />
          <div style={{ background: "#E8E7E0", borderRadius: 4 }} />
          <div style={{ background: "#E8E7E0", borderRadius: 4 }} />
          <div style={{ background: "#E8E7E0", borderRadius: 4 }} />
        </div>
      ) : null}
      <div style={{ textAlign: "left", marginTop: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 13, color: "#9A9A94", marginTop: 2 }}>{desc}</div>
      </div>
    </button>
  );
}
