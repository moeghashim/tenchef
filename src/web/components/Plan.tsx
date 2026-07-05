import { useRef } from "react";
import type { CSSProperties, Dispatch, MouseEvent } from "react";
import type { AppAction } from "../state/reducer";
import type { AppState, PlanComment } from "../state/types";
import { colors, fonts, tint } from "../styles/tokens";

interface PlanProps {
  state: AppState;
  accent: string;
  dispatch: Dispatch<AppAction>;
  onSendToModel: () => void;
  onGeneratePrd: () => void;
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

function annotationStyle(extra: CSSProperties = {}): CSSProperties {
  return {
    borderRadius: 12,
    padding: "10px 14px",
    marginLeft: -16,
    marginRight: -16,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "transparent",
    ...extra
  };
}

function classFor(target: string, active: string | null, comments: PlanComment[]): string {
  if (active === target) return "annot-active";
  if (comments.some((comment) => !comment.addressed && comment.target === target)) return "annot-soft";
  return "";
}

export function Plan({ state, accent, dispatch, onSendToModel, onGeneratePrd }: PlanProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const plan = state.plan;
  if (!plan) return null;

  const pendingCount = state.comments.filter((comment) => !comment.addressed).length;
  const activeAnnot = state.hoveredAnnot || state.pending?.target || null;
  const sendDisabled = state.sending || pendingCount === 0;
  const success = colors.success;
  const annotClass = {
    header: classFor("Header", activeAnnot, state.comments),
    audience: classFor("Audience & goals", activeAnnot, state.comments),
    platforms: classFor("Platforms", activeAnnot, state.comments),
    features: classFor("Feature scope", activeAnnot, state.comments),
    milestones: classFor("Milestones", activeAnnot, state.comments)
  };

  const canvasStyle = {
    flex: 1,
    minWidth: 0,
    maxWidth: 720,
    background: colors.white,
    border: `1px solid ${colors.line}`,
    borderRadius: 18,
    padding: "40px 44px",
    position: "relative",
    cursor: state.commentMode ? "crosshair" : "default",
    "--annot-soft-bg": tint(accent, 0.08),
    "--annot-soft-bd": tint(accent, 0.5),
    "--annot-active-bg": tint(accent, 0.16),
    "--annot-active-bd": accent
  } as CSSProperties & Record<string, string | number>;

  const handleCanvasClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!state.commentMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const target = event.target as HTMLElement;
    const annot = target.closest("[data-annot]");
    const rect = canvas.getBoundingClientRect();
    dispatch({
      type: "OPEN_PENDING",
      pending: {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        target: annot?.getAttribute("data-annot") || "Plan",
        text: ""
      }
    });
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ borderBottom: `1px solid ${colors.line}`, background: colors.white }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Review the plan</div>
            <div style={{ fontSize: 13, color: "#9A9A94" }}>
              {state.commentMode
                ? "Click anywhere on the plan to pin a comment."
                : "Add comments, send them to the model to revise the plan, then generate the PRD."}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => dispatch({ type: "TOGGLE_COMMENT" })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "10px 16px",
                borderRadius: 10,
                cursor: "pointer",
                font: "inherit",
                fontSize: 14,
                fontWeight: 500,
                border: `1px solid ${state.commentMode ? accent : colors.lineStrong}`,
                background: state.commentMode ? `${accent}12` : colors.white,
                color: state.commentMode ? accent : colors.text
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {state.commentMode ? "Done" : "Comment"}
            </button>
            <button
              onClick={onSendToModel}
              disabled={sendDisabled}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 10,
                font: "inherit",
                fontSize: 14,
                fontWeight: 500,
                cursor: sendDisabled ? "default" : "pointer",
                border: `1px solid ${sendDisabled ? "#E7E6E1" : accent}`,
                background: sendDisabled ? colors.white : `${accent}12`,
                color: sendDisabled ? "#B8B8B2" : accent
              }}
            >
              {state.sending ? (
                <span className="spin" style={{ width: 13, height: 13, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block" }} />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
              )}
              {state.sending ? "Revising..." : pendingCount > 0 ? `Send to model \u00b7 ${pendingCount}` : "Send to model"}
            </button>
            <button
              className="tc-dark-button"
              onClick={onGeneratePrd}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 10,
                background: colors.ink,
                color: colors.white,
                border: "none",
                cursor: "pointer",
                fontSize: 14.5,
                fontWeight: 500
              }}
            >
              Generate PRD <span style={{ fontSize: 15, lineHeight: 1 }}>&rarr;</span>
            </button>
          </div>
        </div>
        {state.revision ? (
          <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "13px 16px", borderRadius: 12, background: "#F0F7F2", border: "1px solid #CFE6D8" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1F8A5B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flex: "0 0 auto" }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="9 12 11.5 14.5 16 9.5" />
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1F6B47" }}>
                  Updated from {state.revision.count} {state.revision.count === 1 ? "comment" : "comments"}
                </div>
                <div style={{ fontSize: 13.5, color: "#3D6651", lineHeight: 1.5, marginTop: 2 }}>{state.revision.summary}</div>
              </div>
              <button className="tc-success-close" onClick={() => dispatch({ type: "DISMISS_REVISION" })} style={{ background: "transparent", border: "none", color: "#7FA890", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>
                &times;
              </button>
            </div>
          </div>
        ) : null}
        {state.revisionError ? (
          <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 16px", borderRadius: 12, background: "#FBF1EE", border: "1px solid #EAD2CA" }}>
              <div style={{ flex: 1, fontSize: 13.5, color: "#8A4B38" }}>{state.revisionError}</div>
              <button className="tc-error-close" onClick={() => dispatch({ type: "DISMISS_REVISION" })} style={{ background: "transparent", border: "none", color: "#C09A8D", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>
                &times;
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 28, maxWidth: 1080, width: "100%", margin: "0 auto", padding: "32px 24px 80px", alignItems: "flex-start" }}>
        <div ref={canvasRef} onClick={handleCanvasClick} style={canvasStyle}>
          <div data-annot="Header" className={annotClass.header} style={annotationStyle({ marginTop: -6 })}>
            <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: colors.soft, marginBottom: 14 }}>Product plan</div>
            <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 46, lineHeight: 1.06, letterSpacing: "-0.02em", margin: "0 0 14px" }}>{plan.productName}</h1>
            <p style={{ fontSize: 17.5, lineHeight: 1.6, color: "#4D4D49", margin: 0, maxWidth: "62ch" }}>{plan.summary}</p>
          </div>

          <div style={{ height: 1, background: colors.line, margin: "30px 0" }} />

          <div data-annot="Audience & goals" className={annotClass.audience} style={annotationStyle({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 })}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.soft, marginBottom: 10 }}>Built for</div>
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{plan.audienceLabel}</div>
              <div style={{ fontSize: 14.5, color: colors.muted, marginTop: 3 }}>{plan.audienceDesc}</div>
              <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.soft, margin: "22px 0 10px" }}>Success measured by</div>
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{plan.metricLabel}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.soft, marginBottom: 12 }}>Primary goals</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {plan.goals.map((goal) => (
                  <div key={goal} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={bulletStyle(accent)} />
                    <div style={{ fontSize: 15, lineHeight: 1.5, color: colors.text }}>{goal}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: colors.line, margin: "30px 0" }} />

          <div data-annot="Platforms" className={annotClass.platforms} style={annotationStyle({ marginBottom: 30 })}>
            <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.soft, marginBottom: 12 }}>
              Platforms &middot; {plan.directionLabel} direction
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {plan.platforms.map((platform) => (
                <span key={platform} style={{ display: "inline-flex", alignItems: "center", padding: "7px 14px", borderRadius: 99, border: `1px solid ${colors.lineStrong}`, background: "#FBFBF9", fontSize: 14, fontWeight: 500, color: colors.text }}>
                  {platform}
                </span>
              ))}
            </div>
          </div>

          <div data-annot="Feature scope" className={annotClass.features} style={annotationStyle({ marginBottom: 30 })}>
            <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.soft, marginBottom: 14 }}>
              Feature scope &middot; v1
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {plan.features.map((feature) => (
                <div key={feature} style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 15px", border: `1px solid ${colors.line}`, borderRadius: 11, background: colors.white }}>
                  <div style={bulletStyle(accent)} />
                  <span style={{ fontSize: 14.5, fontWeight: 500, color: "#2D2D29" }}>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div data-annot="Milestones" className={annotClass.milestones} style={annotationStyle({ marginBottom: 6 })}>
            <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.soft, marginBottom: 14 }}>
              Milestones &middot; {plan.timelineLabel}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {plan.milestones.map((milestone) => (
                <div key={milestone.phase} style={{ border: `1px solid ${colors.line}`, borderRadius: 12, padding: 16, background: "#FBFBF9" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 9 }}>{milestone.phase}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {milestone.items.map((item) => (
                      <div key={item} style={{ fontSize: 13, color: colors.muted, lineHeight: 1.4 }}>{item}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {state.comments.map((comment) => (
            <div
              key={comment.num}
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "absolute",
                left: comment.x,
                top: comment.y,
                transform: "translate(-50%,-50%)",
                width: 26,
                height: 26,
                borderRadius: "50% 50% 50% 2px",
                background: comment.addressed ? success : accent,
                color: colors.white,
                fontSize: 12.5,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: `0 2px 8px ${comment.addressed ? success : accent}55`,
                zIndex: 5
              }}
            >
              {comment.num}
            </div>
          ))}

          {state.pending ? (
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "absolute",
                left: Math.min(state.pending.x, 480),
                top: state.pending.y + 14,
                width: 260,
                background: colors.white,
                border: `1px solid ${colors.lineStrong}`,
                borderRadius: 12,
                padding: 14,
                boxShadow: "0 8px 28px rgba(20,20,20,0.14)",
                zIndex: 10
              }}
            >
              <div style={{ fontSize: 12, color: "#9A9A94", marginBottom: 8 }}>
                Comment on <b style={{ color: colors.text, fontWeight: 600 }}>{state.pending.target}</b>
              </div>
              <textarea
                className="tc-textarea"
                value={state.pending.text}
                onChange={(event) => dispatch({ type: "UPDATE_PENDING", value: event.target.value })}
                placeholder="What should change?"
                rows={3}
                autoFocus
                style={{ width: "100%", border: `1px solid ${colors.lineStrong}`, borderRadius: 9, padding: "10px 12px", fontSize: 14, lineHeight: 1.45, resize: "none", outline: "none" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 9 }}>
                <button onClick={() => dispatch({ type: "CANCEL_PENDING" })} style={{ padding: "7px 13px", borderRadius: 8, background: "transparent", border: `1px solid ${colors.lineStrong}`, color: "#7A7A75", cursor: "pointer", fontSize: 13 }}>
                  Cancel
                </button>
                <button onClick={() => dispatch({ type: "SUBMIT_PENDING" })} style={{ padding: "7px 13px", borderRadius: 8, background: accent, color: colors.white, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                  Add comment
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ flex: "0 0 296px", position: "sticky", top: 88 }}>
          <div style={{ background: colors.white, border: `1px solid ${colors.line}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: `1px solid ${colors.line}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Comments</span>
              <span style={{ fontSize: 12, color: colors.soft, background: "#F2F1EC", padding: "3px 9px", borderRadius: 99 }}>{state.comments.length}</span>
            </div>
            {state.comments.length ? (
              <div style={{ maxHeight: "62vh", overflow: "auto" }}>
                {state.comments.map((comment) => (
                  <div
                    key={comment.num}
                    onMouseEnter={() => dispatch({ type: "SET_HOVERED", target: comment.target })}
                    onMouseLeave={() => dispatch({ type: "SET_HOVERED", target: null })}
                    onClick={() => dispatch({ type: "SET_HOVERED", target: comment.target })}
                    style={{
                      padding: "14px 18px",
                      borderBottom: "1px solid #F2F1EC",
                      display: "flex",
                      gap: 11,
                      cursor: "pointer",
                      transition: "background .14s ease",
                      background: state.hoveredAnnot === comment.target ? `${accent}0E` : "transparent"
                    }}
                  >
                    <div style={{ flex: "0 0 auto", width: 22, height: 22, borderRadius: "50% 50% 50% 2px", background: comment.addressed ? success : accent, color: colors.white, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {comment.num}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: colors.soft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>{comment.target}</span>
                        {comment.addressed ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap", color: success, background: `${success}14`, padding: "2px 7px", borderRadius: 99 }}>&#10003; Addressed</span> : null}
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.45, color: comment.addressed ? "#9A9A94" : "#2D2D29" }}>{comment.text}</div>
                    </div>
                    <button
                      className="tc-icon-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        dispatch({ type: "DELETE_COMMENT", num: comment.num });
                      }}
                      style={{ background: "transparent", border: "none", color: "#C4C4BE", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0 }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "30px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 13.5, color: colors.soft, lineHeight: 1.55 }}>
                  No comments yet. Click <b style={{ color: "#5B5B57" }}>Comment</b>, then click anywhere on the plan to pin feedback.
                </div>
              </div>
            )}
          </div>
          <button className="tc-soft-button" onClick={() => dispatch({ type: "BACK_TO_INTERVIEW" })} style={{ marginTop: 12, width: "100%", padding: 11, borderRadius: 10, background: "transparent", border: `1px solid ${colors.lineStrong}`, color: "#7A7A75", cursor: "pointer", fontSize: 13.5 }}>
            &larr; Back to interview
          </button>
        </div>
      </div>
    </div>
  );
}
