export type Screen = "start" | "interview" | "plan" | "prd";

export type QuestionType = "text" | "single" | "multi" | "visual";

export interface ChoiceOption {
  id: string;
  label: string;
  desc?: string;
}

export interface Question {
  id: keyof Answers;
  type: QuestionType;
  kind: string;
  title: string;
  subtitle: string;
  placeholder?: string;
  rows?: number;
  options?: ChoiceOption[];
}

export interface Answers {
  name?: string;
  audience?: string;
  problem?: string;
  platforms: string[];
  direction?: string;
  features: string[];
  metric?: string;
  timeline?: string;
}

export interface Milestone {
  phase: string;
  items: string[];
}

export interface ProductPlan {
  productName: string;
  summary: string;
  audienceLabel: string;
  audienceDesc: string;
  metricLabel: string;
  timelineLabel: string;
  directionLabel: string;
  platforms: string[];
  platformsLabel: string;
  features: string[];
  goals: string[];
  milestones: Milestone[];
  problem: string;
}

export type TaskGroup = "Foundation" | "Core features" | "Launch";

export interface BuildTask {
  id: string;
  label: string;
  group: TaskGroup;
  done: boolean;
  beadsId?: string;
}

export interface PlanComment {
  num: number;
  x: number;
  y: number;
  target: string;
  text: string;
  resolved: boolean;
  addressed?: boolean;
}

export interface PendingComment {
  x: number;
  y: number;
  target: string;
  text: string;
}

export interface RevisionBanner {
  summary: string;
  count: number;
}

export interface AppState {
  screen: Screen;
  qIndex: number;
  answers: Answers;
  commentMode: boolean;
  comments: PlanComment[];
  pending: PendingComment | null;
  nextNum: number;
  hoveredAnnot: string | null;
  tasks: BuildTask[];
  plan: ProductPlan | null;
  sending: boolean;
  revision: RevisionBanner | null;
  revisionError: string | null;
}

export type LlmProvider = "anthropic" | "openai";

export interface KeySettings {
  provider: LlmProvider;
  apiKey: string;
  model: string;
}

export interface PlanRevision {
  productName?: unknown;
  summary?: unknown;
  goals?: unknown;
  platforms?: unknown;
  features?: unknown;
  milestones?: unknown;
  changeSummary?: unknown;
}
