import type { CSSProperties, Dispatch } from "react";
import type { AppAction } from "../state/reducer";
import { TASK_GROUPS } from "../state/prd";
import type { AppState, BuildTask } from "../state/types";
import { colors, fonts } from "../styles/tokens";

interface PrdProps {
  state: AppState;
  accent: string;
  dispatch: Dispatch<AppAction>;
  onToggleTask: (task: BuildTask) => void;
}

function bulletStyle(accent: string): CSSProperties {
  return {
    flex: "0 0 auto",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: accent,
    marginTop: 7
  };
}

export function Prd({ state, accent, dispatch, onToggleTask }: PrdProps) {
  const plan = state.plan;
  if (!plan) return null;

  const totalCount = state.tasks.length;
  const doneCount = state.tasks.filter((task) => task.done).length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        gap: 28,
        maxWidth: 1080,
        width: "100%",
        margin: "0 auto",
        padding: "36px 24px 90px",
        alignItems: "flex-start"
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: 720,
          background: colors.white,
          border: `1px solid ${colors.line}`,
          borderRadius: 18,
          padding: "48px 52px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: colors.soft }}>
            Product requirements
          </div>
          <div style={{ fontSize: 12, color: "#B0B0AA" }}>
            {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <h1
          style={{
            fontFamily: fonts.serif,
            fontWeight: 400,
            fontSize: 48,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            margin: "0 0 18px"
          }}
        >
          {plan.productName}
        </h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 30 }}>
          <Meta label="For" value={plan.audienceLabel} />
          <Divider />
          <Meta label="Platforms" value={plan.platformsLabel} />
          <Divider />
          <Meta label="Target" value={plan.timelineLabel} />
        </div>

        <div style={{ fontFamily: fonts.serif, fontSize: 22, letterSpacing: "-0.01em", margin: "0 0 10px" }}>
          Overview
        </div>
        <p style={{ fontSize: 16, lineHeight: 1.65, color: colors.text, margin: "0 0 16px" }}>{plan.summary}</p>
        {!plan.problem ? (
          <p style={{ fontSize: 16, lineHeight: 1.65, color: colors.text, margin: "0 0 34px" }}>
            This v1 keeps scope intentionally tight: ship the smallest set of features that proves the core value,
            instrument the headline metric, and iterate from real usage.
          </p>
        ) : (
          <div style={{ marginBottom: 34 }} />
        )}

        <div style={{ fontFamily: fonts.serif, fontSize: 22, letterSpacing: "-0.01em", margin: "0 0 14px" }}>Goals</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 34 }}>
          {plan.goals.map((goal) => (
            <div key={goal} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <div style={bulletStyle(accent)} />
              <div style={{ fontSize: 15.5, lineHeight: 1.55, color: colors.text }}>{goal}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 6px" }}>
          <div style={{ fontFamily: fonts.serif, fontSize: 22, letterSpacing: "-0.01em" }}>Build checklist</div>
          <div style={{ fontSize: 13, color: colors.muted }}>
            {doneCount} / {totalCount} done
          </div>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: colors.line, overflow: "hidden", margin: "0 0 24px" }}>
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: accent,
              borderRadius: 99,
              transition: "width .35s ease"
            }}
          />
        </div>

        {TASK_GROUPS.map((group) => {
          const tasks = state.tasks.filter((task) => task.group === group);
          if (!tasks.length) return null;
          return (
            <div key={group} style={{ marginBottom: 22 }}>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: colors.soft,
                  marginBottom: 10
                }}
              >
                {group}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    className="tc-task-row"
                    onClick={() => onToggleTask(task)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      textAlign: "left",
                      padding: "13px 15px",
                      borderRadius: 11,
                      cursor: "pointer",
                      font: "inherit",
                      border: `1px solid ${task.done ? "#E7E6E1" : colors.line}`,
                      background: task.done ? "#FAFAF8" : colors.white,
                      transition: "all .14s"
                    }}
                  >
                    <div
                      style={{
                        flex: "0 0 auto",
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        border: `1px solid ${task.done ? accent : "#CFCEC8"}`,
                        background: task.done ? accent : colors.white,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all .14s"
                      }}
                    >
                      {task.done ? (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
                    </div>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: task.done ? colors.soft : "#2D2D29",
                        textDecoration: task.done ? "line-through" : "none"
                      }}
                    >
                      {task.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {state.comments.length ? (
          <div style={{ marginTop: 14, borderTop: `1px solid ${colors.line}`, paddingTop: 26 }}>
            <div style={{ fontFamily: fonts.serif, fontSize: 22, letterSpacing: "-0.01em", marginBottom: 14 }}>
              Feedback to address
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {state.comments.map((comment) => (
                <button
                  key={comment.num}
                  onClick={() => dispatch({ type: "RESOLVE_COMMENT", num: comment.num })}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    width: "100%",
                    textAlign: "left",
                    padding: "13px 15px",
                    borderRadius: 12,
                    cursor: "pointer",
                    font: "inherit",
                    border: `1px solid ${colors.line}`,
                    background: comment.resolved ? "#FAFAF8" : colors.white,
                    transition: "all .14s"
                  }}
                >
                  <div
                    style={{
                      flex: "0 0 auto",
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      marginTop: 1,
                      border: `1px solid ${comment.resolved ? accent : "#CFCEC8"}`,
                      background: comment.resolved ? accent : colors.white,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {comment.resolved ? (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : null}
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 12, color: colors.soft }}>{comment.target}</div>
                    <div
                      style={{
                        fontSize: 14.5,
                        lineHeight: 1.45,
                        color: comment.resolved ? colors.soft : "#2D2D29",
                        textDecoration: comment.resolved ? "line-through" : "none",
                        marginTop: 2
                      }}
                    >
                      {comment.text}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ flex: "0 0 268px", position: "sticky", top: 88 }}>
        <div
          style={{
            background: colors.white,
            border: `1px solid ${colors.line}`,
            borderRadius: 16,
            padding: 22,
            textAlign: "center"
          }}
        >
          <div style={{ fontFamily: fonts.serif, fontSize: 42, lineHeight: 1, letterSpacing: "-0.01em" }}>{pct}%</div>
          <div style={{ fontSize: 13, color: "#9A9A94", marginTop: 6 }}>of the build complete</div>
          <div style={{ height: 1, background: colors.line, margin: "18px 0" }} />
          <div style={{ fontSize: 13, color: colors.muted, lineHeight: 1.55, textAlign: "left" }}>
            Hand this PRD to your build agent. Check tasks off as they ship &mdash; the progress updates live.
          </div>
        </div>
        <button
          className="tc-soft-button"
          onClick={() => dispatch({ type: "BACK_TO_PLAN" })}
          style={{
            marginTop: 12,
            width: "100%",
            padding: 11,
            borderRadius: 10,
            background: "transparent",
            border: `1px solid ${colors.lineStrong}`,
            color: "#7A7A75",
            cursor: "pointer",
            fontSize: 13.5
          }}
        >
          &larr; Back to plan
        </button>
        <button
          className="tc-icon-button"
          onClick={() => dispatch({ type: "RESTART" })}
          style={{
            marginTop: 8,
            width: "100%",
            padding: 11,
            borderRadius: 10,
            background: "transparent",
            border: "none",
            color: "#B0B0AA",
            cursor: "pointer",
            fontSize: 13
          }}
        >
          Start over
        </button>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#B0B0AA" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, background: colors.line }} />;
}
