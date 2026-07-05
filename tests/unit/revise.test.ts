import { describe, expect, it } from "vitest";
import { buildRevisePrompt, extractJsonObject } from "../../src/web/llm/revise";
import type { PlanComment, ProductPlan } from "../../src/web/state/types";

describe("revise prompt", () => {
  it("matches the design prompt structure", () => {
    const plan: ProductPlan = {
      productName: "Pulse",
      summary: "Pulse helps teams keep context.",
      audienceLabel: "Businesses",
      audienceDesc: "Teams & companies",
      metricLabel: "Activation",
      timelineLabel: "This quarter",
      directionLabel: "Minimal",
      platforms: ["Web"],
      platformsLabel: "Web",
      features: ["Accounts & auth"],
      goals: ["Goal one", "Goal two", "Goal three"],
      milestones: [{ phase: "Foundation", items: ["Scaffold"] }],
      problem: "Teams lose context."
    };
    const comments: PlanComment[] = [
      { num: 1, x: 10, y: 20, target: "Header", text: "Make it more concrete.", resolved: false }
    ];

    expect(buildRevisePrompt(plan, comments)).toMatchInlineSnapshot(`
      "You are a senior product manager revising a product plan based on reviewer comments.

      CURRENT PLAN (JSON):
      {"productName":"Pulse","summary":"Pulse helps teams keep context.","goals":["Goal one","Goal two","Goal three"],"platforms":["Web"],"features":["Accounts & auth"],"milestones":[{"phase":"Foundation","items":["Scaffold"]}]}

      REVIEWER COMMENTS (each tied to a section of the plan):
      1. [section: Header] Make it more concrete.

      Revise the plan so that every comment is fully addressed. Keep it tight, concrete and realistic. Return ONLY minified JSON (no markdown fences, no commentary) with EXACTLY these keys: productName (string), summary (string, 1-2 sentences), goals (array of 3 short strings), platforms (array of strings), features (array of short strings), milestones (array of objects each {phase:string, items:array of short strings}), changeSummary (string, one sentence describing what you changed)."
    `);
  });

  it("extracts fenced provider JSON", () => {
    expect(extractJsonObject("```json\n{\"productName\":\"Pulse\"}\n```")).toEqual({ productName: "Pulse" });
  });
});
