// Central source of default LLM models. Update here rather than in the
// per-provider modules — the provider fetchers each read from this file.
//
// Anthropic: claude-sonnet-4-6 supersedes claude-3-5-sonnet-latest, which
// hasn't been the current Sonnet tier since 2025.
// OpenAI: gpt-4o remains the default general-purpose model; revisit if a
// newer tier ships.

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
export const DEFAULT_OPENAI_MODEL = "gpt-4o";
