import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";

interface FsWriteBody {
  path?: string;
  content?: string;
}

export function fsRoutes(projectDir: string): Hono {
  const app = new Hono();

  app.post("/write", async (context) => {
    const body = (await context.req.json()) as FsWriteBody;
    const relativePath = body.path || "PRD.md";
    const content = body.content;
    if (typeof content !== "string") return context.text("Missing content.", 400);

    const destination = path.resolve(projectDir, relativePath);
    const root = path.resolve(projectDir);
    if (destination !== root && !destination.startsWith(`${root}${path.sep}`)) {
      return context.text("Refusing to write outside the project directory.", 400);
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
    return context.json({ ok: true });
  });

  return app;
}
