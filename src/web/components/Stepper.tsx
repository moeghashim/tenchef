import type { Screen } from "../state/types";
import { colors } from "../styles/tokens";

interface StepperProps {
  screen: Screen;
  accent: string;
}

const order: Screen[] = ["interview", "plan", "prd"];
const labels: Record<Screen, string> = {
  start: "",
  interview: "Interview",
  plan: "Review",
  prd: "PRD"
};

export function Stepper({ screen, accent }: StepperProps) {
  const currentIndex = order.indexOf(screen);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {order.map((step, index) => {
        const active = step === screen;
        const done = currentIndex > index && currentIndex !== -1;
        return (
          <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                fontSize: 12.5,
                padding: "5px 11px",
                borderRadius: 99,
                color: active ? colors.white : done ? accent : colors.soft,
                background: active ? colors.ink : "transparent",
                fontWeight: active ? 600 : 500,
                transition: "all .15s"
              }}
            >
              {labels[step]}
            </div>
            {index < order.length - 1 ? <div style={{ width: 14, height: 1, background: "#DAD9D3" }} /> : null}
          </div>
        );
      })}
    </div>
  );
}
