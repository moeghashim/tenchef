import { describe, expect, it } from "vitest";
import { buildRevisePrompt, extractJsonObject, revisePlanWithCaller, validateRevision } from "../../src/web/llm/revise";
import type { PlanComment, ProductPlan } from "../../src/web/state/types";

const VALID_REVISION = {
  productName: "Pulse",
  summary: "Pulse helps teams keep context.",
  goals: ["Goal one", "Goal two", "Goal three"],
  platforms: ["Web"],
  features: ["Accounts & auth"],
  milestones: [{ phase: "Foundation", items: ["Scaffold"] }],
  changeSummary: "Tightened the summary."
};

const TEST_PLAN: ProductPlan = {
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

const TEST_COMMENTS: PlanComment[] = [
  { num: 1, x: 10, y: 20, target: "Header", text: "Make it more concrete.", resolved: false }
];

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
    expect(extractJsonObject('```json\n{"productName":"Pulse"}\n```')).toEqual({ productName: "Pulse" });
  });
});

describe("extractJsonObject — adversarial cases", () => {
  it("extracts JSON from a markdown fence with trailing commentary after the fence", () => {
    const input = '```json\n{"productName":"Pulse","summary":"Ok."}\n```\n\nThat\'s my revision — hope it helps!';
    expect(extractJsonObject(input)).toEqual({ productName: "Pulse", summary: "Ok." });
  });

  it("extracts JSON embedded mid-sentence", () => {
    const input =
      'Here is the revision: {"productName":"Pulse","goals":["A","B","C"]} — let me know if you want changes.';
    expect(extractJsonObject(input)).toEqual({ productName: "Pulse", goals: ["A", "B", "C"] });
  });

  it("throws (rather than returning a garbage value) when the response has no JSON at all", () => {
    expect(() => extractJsonObject("Sorry, I can't help with that request right now.")).toThrow(SyntaxError);
  });

  it("throws when the response opens a brace but never closes it", () => {
    expect(() => extractJsonObject("Here's my attempt: { unfinished")).toThrow(SyntaxError);
  });

  it("throws when the response contains multiple separate {} blocks that don't form valid JSON", () => {
    // The current strategy grabs from the first `{` to the last `}`. When
    // the model emits two unrelated objects, that slice is not valid JSON
    // and should fail loudly rather than pick the wrong one.
    expect(() => extractJsonObject('{"a":1} and then also {"b":2}')).toThrow(SyntaxError);
  });

  it("throws when the payload is a JSON array instead of an object", () => {
    // The design prompt asks for an object; an array would break APPLY_REVISION.
    // Better to reject than to spread wrongly-shaped values into the plan.
    expect(() => extractJsonObject("[1, 2, 3]")).toThrow();
  });
});

describe("revision validation", () => {
  it("accepts a complete revision", () => {
    expect(validateRevision(VALID_REVISION)).toEqual([]);
  });

  it("reports every malformed field", () => {
    const errors = validateRevision({
      productName: 42,
      summary: "",
      goals: "not an array",
      platforms: [],
      features: [null],
      milestones: [{ phase: "Foundation" }],
      changeSummary: undefined
    });
    expect(errors).toHaveLength(7);
  });

  it("retries once with the validation error, then applies the corrected response", async () => {
    const prompts: string[] = [];
    const responses = ['{"productName": 42}', JSON.stringify(VALID_REVISION)];
    const revision = await revisePlanWithCaller(
      async (prompt) => {
        prompts.push(prompt);
        return responses[prompts.length - 1];
      },
      TEST_PLAN,
      TEST_COMMENTS
    );
    expect(revision).toEqual(VALID_REVISION);
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain("Your previous response was rejected because");
    expect(prompts[1]).toContain("summary must be a non-empty string");
  });

  it("throws when the retry is also invalid", async () => {
    await expect(revisePlanWithCaller(async () => "not json at all", TEST_PLAN, TEST_COMMENTS)).rejects.toThrow();
  });
});
