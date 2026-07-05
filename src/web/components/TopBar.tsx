import type { Screen } from "../state/types";
import { colors } from "../styles/tokens";
import { Stepper } from "./Stepper";

interface TopBarProps {
  screen: Screen;
  accent: string;
  showStepper?: boolean;
}

function topRightLabel(screen: Screen): string {
  if (screen === "interview") return "Step 1 of 3";
  if (screen === "plan") return "Step 2 of 3";
  if (screen === "prd") return "Step 3 of 3";
  return "";
}

export function TopBar({ screen, accent, showStepper = true }: TopBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 32px",
        borderBottom: `1px solid ${colors.line}`,
        background: "rgba(247,246,243,0.85)",
        backdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 30
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: colors.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: 2, background: colors.white }} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>tenchef</span>
        <span style={{ fontSize: 13, color: colors.soft, fontWeight: 400 }}>PRD studio</span>
      </div>
      {showStepper ? <Stepper screen={screen} accent={accent} /> : <div />}
      <div style={{ fontSize: 13, color: colors.soft, minWidth: 90, textAlign: "right" }}>
        {topRightLabel(screen)}
      </div>
    </div>
  );
}
