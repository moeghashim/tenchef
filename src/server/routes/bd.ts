import { Hono } from "hono";
import { createTasksWithDependencies, initBeads, listTenchefTasks, setTaskClosed } from "../beads.js";
import type { BuildTask } from "../beads.js";

interface CreateBody {
  tasks?: BuildTask[];
}

interface CloseBody {
  id?: string;
  done?: boolean;
}

export function bdRoutes(projectDir: string): Hono {
  const app = new Hono();

  app.post("/init", async (context) => {
    await initBeads(projectDir);
    return context.json({ ok: true });
  });

  app.post("/create", async (context) => {
    const body = (await context.req.json()) as CreateBody;
    if (!Array.isArray(body.tasks)) return context.text("Missing tasks.", 400);
    const tasks = await createTasksWithDependencies(projectDir, body.tasks);
    return context.json({ tasks });
  });

  app.post("/close", async (context) => {
    const body = (await context.req.json()) as CloseBody;
    if (!body.id) return context.text("Missing id.", 400);
    await setTaskClosed(projectDir, body.id, body.done !== false);
    return context.json({ ok: true });
  });

  app.get("/list", async (context) => {
    const tasks = await listTenchefTasks(projectDir);
    return context.json(tasks);
  });

  return app;
}
