import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";

interface FsWriteBody {
  path?: string;
  content?: string;
}

// Files the web client is allowed to write. Beads writes go through the
// `bd` CLI, not this route, so PRD.md is the only legitimate target today.
// If additional targets are ever needed, allowlist them here explicitly.
const ALLOWED_PATHS = new Set(["PRD.md"]);

export function fsRoutes(projectDir: string): Hono {
  const app = new Hono();

  app.post("/write", async (context) => {
    let body: FsWriteBody;
    try {
      body = (await context.req.json()) as FsWriteBody;
    } catch {
      return context.text("Invalid request body.", 400);
    }

    const requestedPath = body.path;
    if (typeof requestedPath !== "string" || requestedPath.length === 0) {
      return context.text("Missing path.", 400);
    }
    if (path.isAbsolute(requestedPath) || requestedPath.split(/[\\/]/).includes("..")) {
      return context.text("Refusing to write to that path.", 400);
    }
    if (!ALLOWED_PATHS.has(requestedPath)) {
      return context.text("Refusing to write to that path.", 400);
    }

    const content = body.content;
    if (typeof content !== "string") return context.text("Missing content.", 400);

    const destination = path.resolve(projectDir, requestedPath);
    const root = path.resolve(projectDir);
    if (destination !== root && !destination.startsWith(`${root}${path.sep}`)) {
      return context.text("Refusing to write outside the project directory.", 400);
    }

    if (!existsSync(root)) await mkdir(root, { recursive: true });
    await writeFile(destination, content, "utf8");
    return context.json({ ok: true });
  });

  return app;
}
