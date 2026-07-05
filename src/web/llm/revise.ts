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

export async function revisePlan(params: {
  provider: LlmProvider;
  apiKey: string;
  plan: ProductPlan;
  comments: PlanComment[];
}): Promise<PlanRevision> {
  const prompt = buildRevisePrompt(params.plan, params.comments);
  const text =
    params.provider === "anthropic"
      ? await callAnthropic(params.apiKey, prompt)
      : await callOpenAi(params.apiKey, prompt);
  return extractJsonObject(text);
}
