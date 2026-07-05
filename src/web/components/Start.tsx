import { colors, fonts } from "../styles/tokens";

interface StartProps {
  onStart: () => void;
}

export function Start({ onStart }: StartProps) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
      <div style={{ maxWidth: 620, width: "100%", textAlign: "center" }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: colors.soft,
            marginBottom: 22
          }}
        >
          A guided interview
        </div>
        <h1
          style={{
            fontFamily: fonts.serif,
            fontWeight: 400,
            fontSize: 62,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            margin: "0 0 20px"
          }}
        >
          Let&apos;s scope your product.
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: "#5B5B57", margin: "0 auto 40px", maxWidth: 480 }}>
          Answer a short set of visual questions. We&apos;ll turn them into a plan you can mark up, then a living PRD
          with a task checklist to build against.
        </p>
        <div
          style={{
            display: "flex",
            gap: 0,
            justifyContent: "center",
            alignItems: "stretch",
            margin: "0 auto 44px",
            maxWidth: 540,
            border: `1px solid ${colors.line}`,
            borderRadius: 16,
            overflow: "hidden",
            background: colors.white
          }}
        >
          {[
            ["1", "Interview"],
            ["2", "Review & annotate"],
            ["3", "PRD & build"]
          ].map(([num, label], index) => (
            <div
              key={num}
              style={{
                flex: 1,
                padding: "22px 16px",
                borderRight: index < 2 ? `1px solid ${colors.line}` : undefined
              }}
            >
              <div style={{ fontFamily: fonts.serif, fontSize: 26, color: colors.ink }}>{num}</div>
              <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        <button
          className="tc-dark-button"
          onClick={onStart}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "15px 28px",
            borderRadius: 12,
            background: colors.ink,
            color: colors.white,
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: "-0.01em"
          }}
        >
          Start the interview <span style={{ fontSize: 18, lineHeight: 1 }}>&rarr;</span>
        </button>
        <div style={{ fontSize: 13, color: "#B0B0AA", marginTop: 18 }}>8 questions &middot; about 2 minutes</div>
      </div>
    </div>
  );
}
