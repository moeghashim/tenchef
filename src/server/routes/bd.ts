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
    let body: CreateBody;
    try {
      body = (await context.req.json()) as CreateBody;
    } catch {
      return context.text("Invalid request body.", 400);
    }
    if (!Array.isArray(body.tasks)) return context.text("Missing tasks.", 400);
    const tasks = await createTasksWithDependencies(projectDir, body.tasks);
    return context.json({ tasks });
  });

  app.post("/close", async (context) => {
    let body: CloseBody;
    try {
      body = (await context.req.json()) as CloseBody;
    } catch {
      return context.text("Invalid request body.", 400);
    }
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
