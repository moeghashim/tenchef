import { AUDIENCE, DIRECTION, FEATURES, METRIC, PLATFORMS, QUESTIONS, TIMELINE } from "./questions";
import type {
  Answers,
  AppState,
  BuildTask,
  PendingComment,
  PlanRevision,
  ProductPlan,
  TaskGroup
} from "./types";

export type AppAction =
  | { type: "START" }
  | { type: "SET_TEXT"; qid: keyof Answers; value: string }
  | { type: "SELECT_SINGLE"; qid: keyof Answers; value: string }
  | { type: "TOGGLE_MULTI"; qid: "platforms" | "features"; value: string }
  | { type: "SELECT_VISUAL"; value: string }
  | { type: "BACK" }
  | { type: "NEXT" }
  | { type: "BACK_TO_INTERVIEW" }
  | { type: "BACK_TO_PLAN" }
  | { type: "TOGGLE_COMMENT" }
  | { type: "OPEN_PENDING"; pending: PendingComment }
  | { type: "UPDATE_PENDING"; value: string }
  | { type: "CANCEL_PENDING" }
  | { type: "SUBMIT_PENDING" }
  | { type: "DELETE_COMMENT"; num: number }
  | { type: "SET_HOVERED"; target: string | null }
  | { type: "RESOLVE_COMMENT"; num: number }
  | { type: "SEND_START" }
  | { type: "APPLY_REVISION"; revision: PlanRevision; sentCount: number }
  | { type: "REVISION_ERROR"; message: string }
  | { type: "DISMISS_REVISION" }
  | { type: "GENERATE_PRD" }
  | { type: "SET_TASKS"; tasks: BuildTask[] }
  | { type: "HYDRATE_TASKS"; tasks: BuildTask[] }
  | { type: "TOGGLE_TASK_LOCAL"; id: string }
  | { type: "RESTORE"; snapshot: Partial<AppState> }
  | { type: "RESTART" };

export const initialAnswers: Answers = {
  platforms: [],
  features: []
};

export function createInitialState(): AppState {
  return {
    screen: "start",
    qIndex: 0,
    answers: { ...initialAnswers },
    commentMode: false,
    comments: [],
    pending: null,
    nextNum: 1,
    hoveredAnnot: null,
    tasks: [],
    plan: null,
    sending: false,
    revision: null,
    revisionError: null
  };
}

export function buildTasks(features: string[], metricLabel: string): BuildTask[] {
  let n = 0;
  const mk = (label: string, group: TaskGroup): BuildTask => ({
    id: `t${n++}`,
    label,
    group,
    done: false
  });

  return [
    mk("Set up repo, CI & environments", "Foundation"),
    mk("Authentication & user accounts", "Foundation"),
    mk("Design system & app shell", "Foundation"),
    ...features.map((feature) => mk(feature, "Core features")),
    mk(`Wire up ${(metricLabel || "adoption").toLowerCase()} analytics`, "Launch"),
    mk("QA pass & bug bash", "Launch"),
    mk("Launch & rollout plan", "Launch")
  ];
}

export function buildPlanFromAnswers(answers: Answers): { plan: ProductPlan; tasks: BuildTask[] } {
  const name = (answers.name || "").trim() || "Untitled Product";
  const audience = AUDIENCE.find((option) => option.id === answers.audience) || {
    label: "Users",
    desc: "A broad audience"
  };
  const platforms = answers.platforms
    .map((id) => PLATFORMS.find((platform) => platform.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  if (!platforms.length) platforms.push("Web");

  const features = answers.features
    .map((id) => FEATURES.find((feature) => feature.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  if (!features.length) features.push("Core experience");

  const metric = METRIC.find((option) => option.id === answers.metric) || { label: "Adoption" };
  const timeline = TIMELINE.find((option) => option.id === answers.timeline) || { label: "This quarter" };
  const directionLabel = DIRECTION[answers.direction || ""] || "Minimal";
  const problem = (answers.problem || "").trim();

  const summary = problem
    ? `${name} is a ${directionLabel.toLowerCase()} product for ${audience.label.toLowerCase()}. ${problem.charAt(0).toUpperCase()}${problem.slice(1)}`
    : `${name} is a ${directionLabel.toLowerCase()} product for ${audience.label.toLowerCase()}, focused on a sharp, well-scoped v1.`;

  const goals = [
    `Deliver a focused v1 that lets ${audience.label.toLowerCase()} ${problem ? "solve the problem above" : "get value in the first session"}.`,
    `Optimize the first run for ${metric.label.toLowerCase()} as the headline metric.`,
    `Ship across ${platforms.join(", ")} without diluting the core flow.`
  ];

  const half = Math.ceil(features.length / 2);
  const milestones = [
    { phase: "Foundation", items: ["Project scaffold & environments", "Auth & data model", "UI shell"] },
    { phase: "Core build", items: features.slice(0, half) },
    { phase: "Launch", items: [...features.slice(half), "QA & instrumentation", "Rollout"] }
  ];

  const plan: ProductPlan = {
    productName: name,
    summary,
    audienceLabel: audience.label,
    audienceDesc: audience.desc || "",
    metricLabel: metric.label,
    timelineLabel: timeline.label,
    directionLabel,
    platforms,
    platformsLabel: platforms.join(" \u00b7 "),
    features,
    goals,
    milestones,
    problem
  };

  return { plan, tasks: buildTasks(features, metric.label) };
}

function applyRevisionToPlan(plan: ProductPlan, revision: PlanRevision): ProductPlan {
  const nextPlan = { ...plan };
  if (revision.productName) nextPlan.productName = String(revision.productName);
  if (revision.summary) nextPlan.summary = String(revision.summary);
  if (Array.isArray(revision.goals) && revision.goals.length) nextPlan.goals = revision.goals.map(String);
  if (Array.isArray(revision.platforms) && revision.platforms.length) {
    nextPlan.platforms = revision.platforms.map(String);
    nextPlan.platformsLabel = nextPlan.platforms.join(" \u00b7 ");
  }
  if (Array.isArray(revision.features) && revision.features.length) {
    nextPlan.features = revision.features.map(String);
  }
  if (Array.isArray(revision.milestones) && revision.milestones.length) {
    nextPlan.milestones = revision.milestones.map((milestone) => {
      const value = milestone as { phase?: unknown; items?: unknown };
      return {
        phase: String(value.phase || ""),
        items: Array.isArray(value.items) ? value.items.map(String) : []
      };
    });
  }
  return nextPlan;
}

function mergeHydratedTasks(current: BuildTask[], hydrated: BuildTask[]): BuildTask[] {
  if (!current.length) return hydrated;
  return current.map((task) => {
    const byBeadsId = task.beadsId ? hydrated.find((candidate) => candidate.beadsId === task.beadsId) : undefined;
    const byLabel = hydrated.find((candidate) => candidate.label === task.label && candidate.group === task.group);
    const match = byBeadsId || byLabel;
    return match ? { ...task, beadsId: match.beadsId, done: match.done } : task;
  });
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "START":
      return { ...state, screen: "interview", qIndex: 0 };
    case "SET_TEXT":
      return { ...state, answers: { ...state.answers, [action.qid]: action.value } };
    case "SELECT_SINGLE":
      return { ...state, answers: { ...state.answers, [action.qid]: action.value } };
    case "TOGGLE_MULTI": {
      const current = state.answers[action.qid];
      const hasValue = current.includes(action.value);
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.qid]: hasValue ? current.filter((value) => value !== action.value) : [...current, action.value]
        }
      };
    }
    case "SELECT_VISUAL":
      return { ...state, answers: { ...state.answers, direction: action.value } };
    case "BACK":
      return state.qIndex === 0
        ? { ...state, screen: "start" }
        : { ...state, qIndex: state.qIndex - 1 };
    case "NEXT": {
      if (state.qIndex >= QUESTIONS.length - 1) {
        const built = buildPlanFromAnswers(state.answers);
        return {
          ...state,
          ...built,
          screen: "plan",
          revision: null,
          revisionError: null
        };
      }
      return { ...state, qIndex: state.qIndex + 1 };
    }
    case "BACK_TO_INTERVIEW":
      return { ...state, screen: "interview", commentMode: false, pending: null };
    case "BACK_TO_PLAN":
      return { ...state, screen: "plan" };
    case "TOGGLE_COMMENT":
      return { ...state, commentMode: !state.commentMode, pending: null };
    case "OPEN_PENDING":
      return { ...state, pending: action.pending };
    case "UPDATE_PENDING":
      return state.pending ? { ...state, pending: { ...state.pending, text: action.value } } : state;
    case "CANCEL_PENDING":
      return { ...state, pending: null };
    case "SUBMIT_PENDING": {
      if (!state.pending || !state.pending.text.trim()) return { ...state, pending: null };
      const comment = {
        num: state.nextNum,
        x: state.pending.x,
        y: state.pending.y,
        target: state.pending.target,
        text: state.pending.text.trim(),
        resolved: false,
        addressed: false
      };
      return {
        ...state,
        comments: [...state.comments, comment],
        nextNum: state.nextNum + 1,
        pending: null
      };
    }
    case "DELETE_COMMENT":
      return { ...state, comments: state.comments.filter((comment) => comment.num !== action.num) };
    case "SET_HOVERED":
      return { ...state, hoveredAnnot: action.target };
    case "RESOLVE_COMMENT":
      return {
        ...state,
        comments: state.comments.map((comment) =>
          comment.num === action.num ? { ...comment, resolved: !comment.resolved } : comment
        )
      };
    case "SEND_START":
      return {
        ...state,
        sending: true,
        revisionError: null,
        revision: null,
        commentMode: false,
        pending: null
      };
    case "APPLY_REVISION": {
      if (!state.plan) return { ...state, sending: false };
      const nextPlan = applyRevisionToPlan(state.plan, action.revision);
      const nextTasks = buildTasks(nextPlan.features, nextPlan.metricLabel);
      return {
        ...state,
        plan: nextPlan,
        tasks: nextTasks,
        comments: state.comments.map((comment) =>
          comment.addressed ? comment : { ...comment, addressed: true, resolved: true }
        ),
        sending: false,
        revision: {
          summary: action.revision.changeSummary
            ? String(action.revision.changeSummary)
            : "Plan updated to address your comments.",
          count: action.sentCount
        }
      };
    }
    case "REVISION_ERROR":
      return { ...state, sending: false, revisionError: action.message };
    case "DISMISS_REVISION":
      return { ...state, revision: null, revisionError: null };
    case "GENERATE_PRD":
      return { ...state, screen: "prd", commentMode: false, pending: null };
    case "SET_TASKS":
      return { ...state, tasks: action.tasks };
    case "HYDRATE_TASKS":
      return { ...state, tasks: mergeHydratedTasks(state.tasks, action.tasks) };
    case "TOGGLE_TASK_LOCAL":
      return {
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.id ? { ...task, done: !task.done } : task))
      };
    case "RESTORE":
      return {
        ...createInitialState(),
        ...action.snapshot,
        sending: false,
        pending: null,
        revisionError: null
      };
    case "RESTART":
      return createInitialState();
    default:
      return state;
  }
}
