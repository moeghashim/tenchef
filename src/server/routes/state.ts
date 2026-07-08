import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";

export function stateRoutes(projectDir: string): Hono {
  const app = new Hono();
  const stateFile = path.join(projectDir, ".tenchef", "state.json");

  app.get("/", async (context) => {
    try {
      const content = await readFile(stateFile, "utf8");
      return context.json({ state: JSON.parse(content) });
    } catch {
      return context.json({ state: null });
    }
  });

  app.post("/", async (context) => {
    const body = (await context.req.json()) as unknown;
    await mkdir(path.dirname(stateFile), { recursive: true });
    await writeFile(stateFile, JSON.stringify(body, null, 2), "utf8");
    return context.json({ ok: true });
  });

  return app;
}
