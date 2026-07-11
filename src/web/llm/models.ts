// Central source of default LLM models. Update here rather than in the
// per-provider modules — the provider fetchers each read from this file.
//
// Anthropic: claude-sonnet-5 is the current GA Sonnet tier (supersedes
// claude-sonnet-4-6).
// OpenAI: gpt-5.1 is the current general-purpose tier; revisit when a newer
// tier ships.
// Claude Code has no default — an empty model means "let the CLI decide".

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";
export const DEFAULT_OPENAI_MODEL = "gpt-5.1";
