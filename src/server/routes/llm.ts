import { spawn } from "node:child_process";
import { Hono } from "hono";

interface ClaudeBody {
  prompt?: string;
  model?: string;
}

export function hasClaudeCli(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("claude", ["--version"], { env, stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

// When tenchef itself runs inside a Claude Code session, the inherited
// CLAUDECODE / CLAUDE_CODE_* markers make the nested CLI think it's a child
// session and can break its credential resolution. Strip them; leave user
// auth config (ANTHROPIC_API_KEY etc.) untouched.
function cleanClaudeEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const cleaned: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (key === "CLAUDECODE" || key.startsWith("CLAUDE_CODE_")) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

export function runClaudeCli(prompt: string, model: string | undefined, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ["-p", "--output-format", "text"];
    if (model) args.push("--model", model);
    const child = spawn("claude", args, { stdio: ["pipe", "pipe", "pipe"], env: cleanClaudeEnv() });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`claude -p timed out after ${Math.round(timeoutMs / 1000)}s.`));
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0 && stdout.trim()) resolve(stdout);
      else {
        // claude -p reports failures like "Not logged in" on stdout.
        const detail = stderr.trim() || stdout.trim();
        reject(new Error(detail ? `claude -p failed: ${detail}` : `claude -p exited with code ${code}.`));
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

export function llmRoutes(timeoutMs = 180000): Hono {
  const app = new Hono();

  app.post("/claude", async (context) => {
    const body = (await context.req.json()) as ClaudeBody;
    if (!body.prompt || typeof body.prompt !== "string") return context.text("Missing prompt.", 400);
    const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined;
    try {
      const text = await runClaudeCli(body.prompt, model, timeoutMs);
      return context.json({ text });
    } catch (error) {
      return context.text(error instanceof Error ? error.message : "claude -p failed.", 502);
    }
  });

  return app;
}
