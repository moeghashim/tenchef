import { describe, expect, it } from "vitest";
import { appReducer, buildPlanFromAnswers, buildTasks, createInitialState } from "../../src/web/state/reducer";
import type { AppState } from "../../src/web/state/types";

describe("appReducer", () => {
  it("moves through start, interview, plan, and prd", () => {
    let state = createInitialState();
    state = appReducer(state, { type: "START" });
    expect(state.screen).toBe("interview");

    state = appReducer(state, { type: "SET_TEXT", qid: "name", value: "Pulse" });
    state = appReducer(state, { type: "NEXT" });
    state = appReducer(state, { type: "SELECT_SINGLE", qid: "audience", value: "business" });
    state = appReducer(state, { type: "NEXT" });
    state = appReducer(state, { type: "SET_TEXT", qid: "problem", value: "teams lose context." });
    state = appReducer(state, { type: "NEXT" });
    state = appReducer(state, { type: "TOGGLE_MULTI", qid: "platforms", value: "web" });
    state = appReducer(state, { type: "NEXT" });
    state = appReducer(state, { type: "SELECT_VISUAL", value: "minimal" });
    state = appReducer(state, { type: "NEXT" });
    state = appReducer(state, { type: "TOGGLE_MULTI", qid: "features", value: "auth" });
    state = appReducer(state, { type: "NEXT" });
    state = appReducer(state, { type: "SELECT_SINGLE", qid: "metric", value: "activation" });
    state = appReducer(state, { type: "NEXT" });
    state = appReducer(state, { type: "SELECT_SINGLE", qid: "timeline", value: "quarter" });
    state = appReducer(state, { type: "NEXT" });

    expect(state.screen).toBe("plan");
    expect(state.plan?.productName).toBe("Pulse");
    expect(state.tasks.map((task) => task.group)).toContain("Core features");

    state = appReducer(state, { type: "GENERATE_PRD" });
    expect(state.screen).toBe("prd");
  });

  it("backs from question one to start and otherwise decrements", () => {
    let state = appReducer(createInitialState(), { type: "START" });
    state = appReducer(state, { type: "BACK" });
    expect(state.screen).toBe("start");

    state = appReducer(state, { type: "START" });
    state = appReducer(state, { type: "NEXT" });
    expect(state.qIndex).toBe(1);
    state = appReducer(state, { type: "BACK" });
    expect(state.qIndex).toBe(0);
  });

  it("adds, deletes, resolves, and highlights comments", () => {
    let state = createInitialState();
    state = appReducer(state, { type: "TOGGLE_COMMENT" });
    state = appReducer(state, { type: "OPEN_PENDING", pending: { x: 12, y: 24, target: "Header", text: "" } });
    state = appReducer(state, { type: "UPDATE_PENDING", value: "Make the name sharper." });
    state = appReducer(state, { type: "SUBMIT_PENDING" });
    expect(state.comments).toHaveLength(1);
    expect(state.comments[0].num).toBe(1);

    state = appReducer(state, { type: "SET_HOVERED", target: "Header" });
    expect(state.hoveredAnnot).toBe("Header");
    state = appReducer(state, { type: "RESOLVE_COMMENT", num: 1 });
    expect(state.comments[0].resolved).toBe(true);
    state = appReducer(state, { type: "DELETE_COMMENT", num: 1 });
    expect(state.comments).toHaveLength(0);
  });

  it("applies revisions, marks sent comments addressed, and rebuilds tasks", () => {
    const built = buildPlanFromAnswers({
      name: "Pulse",
      audience: "business",
      problem: "teams lose context.",
      platforms: ["web"],
      direction: "minimal",
      features: ["auth"],
      metric: "activation",
      timeline: "quarter"
    });
    let state: AppState = {
      ...createInitialState(),
      plan: built.plan,
      tasks: built.tasks,
      comments: [{ num: 1, x: 1, y: 2, target: "Feature scope", text: "Add search.", resolved: false }]
    };
    state = appReducer(state, { type: "SEND_START" });
    state = appReducer(state, {
      type: "APPLY_REVISION",
      sentCount: 1,
      revision: {
        productName: "Pulse OS",
        summary: "Sharper summary.",
        goals: ["One", "Two", "Three"],
        platforms: ["Web"],
        features: ["Search"],
        milestones: [{ phase: "Core build", items: ["Search"] }],
        changeSummary: "Added search."
      }
    });

    expect(state.plan?.productName).toBe("Pulse OS");
    expect(state.comments[0].addressed).toBe(true);
    expect(state.tasks.some((task) => task.label === "Search")).toBe(true);
  });

  it("toggles tasks, hydrates from beads, and restarts", () => {
    let state = { ...createInitialState(), tasks: buildTasks(["Search"], "Activation") };
    state = appReducer(state, { type: "TOGGLE_TASK_LOCAL", id: "t0" });
    expect(state.tasks[0].done).toBe(true);
    state = appReducer(state, {
      type: "HYDRATE_TASKS",
      tasks: [{ ...state.tasks[0], done: false, beadsId: "TEN-1" }]
    });
    expect(state.tasks[0].done).toBe(false);
    expect(state.tasks[0].beadsId).toBe("TEN-1");
    state = appReducer(state, { type: "RESTART" });
    expect(state).toEqual(createInitialState());
  });
});
