import { describe, expect, it } from "vitest";
import { DEFAULT_ANTHROPIC_MODEL, DEFAULT_OPENAI_MODEL } from "../../src/web/llm/models";

// These defaults are the single source of truth for what tenchef ships with.
// A quiet regression here (e.g. a rollback to `claude-3-5-sonnet-latest`)
// silently degrades revisions for every user, so we pin the constants.

describe("llm default models", () => {
  it("uses a current Anthropic Sonnet model", () => {
    expect(DEFAULT_ANTHROPIC_MODEL).toBe("claude-sonnet-5");
  });

  it("uses a current OpenAI default", () => {
    expect(DEFAULT_OPENAI_MODEL).toBe("gpt-5.1");
  });
});
