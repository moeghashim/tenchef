import { postJson } from "../api";
import type { LlmProvider, PlanComment, PlanRevision, ProductPlan } from "../state/types";
import { callAnthropic } from "./anthropic";
import { callOpenAi } from "./openai";

interface PlanForModel {
  productName: string;
  summary: string;
  goals: string[];
  platforms: string[];
  features: string[];
  milestones: ProductPlan["milestones"];
}

export function buildRevisePrompt(plan: ProductPlan, comments: PlanComment[]): string {
  const planForModel: PlanForModel = {
    productName: plan.productName,
    summary: plan.summary,
    goals: plan.goals,
    platforms: plan.platforms,
    features: plan.features,
    milestones: plan.milestones
  };
  const commentsText = comments
    .map((comment, i) => `${i + 1}. [section: ${comment.target}] ${comment.text}`)
    .join("\n");
  return (
    "You are a senior product manager revising a product plan based on reviewer comments.\n\n" +
    "CURRENT PLAN (JSON):\n" +
    JSON.stringify(planForModel) +
    "\n\n" +
    "REVIEWER COMMENTS (each tied to a section of the plan):\n" +
    commentsText +
    "\n\n" +
    "Revise the plan so that every comment is fully addressed. Keep it tight, concrete and realistic. " +
    "Return ONLY minified JSON (no markdown fences, no commentary) with EXACTLY these keys: " +
    "productName (string), summary (string, 1-2 sentences), goals (array of 3 short strings), " +
    "platforms (array of strings), features (array of short strings), " +
    "milestones (array of objects each {phase:string, items:array of short strings}), " +
    "changeSummary (string, one sentence describing what you changed)."
  );
}

export function extractJsonObject(text: string): PlanRevision {
  let value = text.trim();
  value = value
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start >= 0 && end > start) value = value.slice(start, end + 1);
  const parsed = JSON.parse(value) as unknown;
  // Reject arrays, null, and primitives. Casting an array to PlanRevision
  // and spreading it into APPLY_REVISION would silently produce a broken
  // plan whose fields are all `undefined`.
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SyntaxError("extractJsonObject expected a JSON object");
  }
  return parsed as PlanRevision;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function validateRevision(revision: PlanRevision): string[] {
  const errors: string[] = [];
  if (typeof revision.productName !== "string" || !revision.productName.trim()) {
    errors.push("productName must be a non-empty string");
  }
  if (typeof revision.summary !== "string" || !revision.summary.trim()) {
    errors.push("summary must be a non-empty string");
  }
  if (!isStringArray(revision.goals) || !revision.goals.length) {
    errors.push("goals must be a non-empty array of strings");
  }
  if (!isStringArray(revision.platforms) || !revision.platforms.length) {
    errors.push("platforms must be a non-empty array of strings");
  }
  if (!isStringArray(revision.features) || !revision.features.length) {
    errors.push("features must be a non-empty array of strings");
  }
  const milestones = revision.milestones;
  const milestonesValid =
    Array.isArray(milestones) &&
    milestones.length > 0 &&
    milestones.every((milestone) => {
      const value = milestone as { phase?: unknown; items?: unknown };
      return typeof value.phase === "string" && isStringArray(value.items);
    });
  if (!milestonesValid) {
    errors.push("milestones must be a non-empty array of {phase: string, items: string[]} objects");
  }
  if (typeof revision.changeSummary !== "string") {
    errors.push("changeSummary must be a string");
  }
  return errors;
}

export function parseRevisionText(text: string): PlanRevision {
  let revision: PlanRevision;
  try {
    revision = extractJsonObject(text);
  } catch (error) {
    throw new Error(`response was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const errors = validateRevision(revision);
  if (errors.length) throw new Error(errors.join("; "));
  return revision;
}

export type LlmCaller = (prompt: string) => Promise<string>;

export async function revisePlanWithCaller(
  call: LlmCaller,
  plan: ProductPlan,
  comments: PlanComment[]
): Promise<PlanRevision> {
  const prompt = buildRevisePrompt(plan, comments);
  const text = await call(prompt);
  try {
    return parseRevisionText(text);
  } catch (error) {
    const feedback =
      `${prompt}\n\nYour previous response was rejected because ${error instanceof Error ? error.message : String(error)}. ` +
      "Return ONLY the corrected minified JSON object with exactly the keys described above.";
    return parseRevisionText(await call(feedback));
  }
}

export async function revisePlan(params: {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  plan: ProductPlan;
  comments: PlanComment[];
}): Promise<PlanRevision> {
  const call: LlmCaller =
    params.provider === "anthropic"
      ? (prompt) => callAnthropic(params.apiKey, params.model, prompt)
      : params.provider === "openai"
        ? (prompt) => callOpenAi(params.apiKey, params.model, prompt)
        : (prompt) =>
            postJson<{ text: string }>("/llm/claude", { prompt, model: params.model || undefined }).then(
              (result) => result.text
            );
  return revisePlanWithCaller(call, params.plan, params.comments);
}
