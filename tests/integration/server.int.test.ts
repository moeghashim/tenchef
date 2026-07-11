import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { startTenchefServer, type StartedServer } from "../../src/server/index";
import { buildTasks } from "../../src/web/state/reducer";
import { makeFakeBd, makeTempDir } from "../helpers/fake-bd";
import { makeFakeClaude } from "../helpers/fake-claude";

let oldPath = process.env.PATH;

beforeEach(() => {
  oldPath = process.env.PATH;
});

afterEach(() => {
  process.env.PATH = oldPath;
});

function authed(token: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { ...(init.headers as Record<string, string>), "x-tenchef-token": token } };
}

async function startServer(projectDir: string): Promise<StartedServer> {
  const webDir = await makeTempDir("tenchef-web-");
  await writeFile(path.join(webDir, "index.html"), "<html>ok</html>");
  return startTenchefServer({ projectDir, webDir, accent: "#2F4FE0", idleMs: 0 });
}

describe("server integration", () => {
  it("initializes beads, creates tasks with blockers, closes tasks, and lists state", async () => {
    const projectDir = await makeTempDir("tenchef-project-");
    const fakeBin = await makeFakeBd();
    process.env.PATH = `${fakeBin}${path.delimiter}${oldPath || ""}`;

    const started = await startServer(projectDir);
    try {
      const root = await fetch(started.url);
      expect(root.status).toBe(200);

      const init = await fetch(`${started.url}/bd/init`, authed(started.token, { method: "POST" }));
      expect(init.status).toBe(200);

      const tasks = buildTasks(["Search"], "Activation");
      const create = await fetch(
        `${started.url}/bd/create`,
        authed(started.token, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tasks })
        })
      );
      expect(create.status).toBe(200);
      const created = (await create.json()) as { tasks: typeof tasks };
      expect(created.tasks.every((task) => task.beadsId)).toBe(true);

      const coreTask = created.tasks.find((task) => task.group === "Core features");
      expect(coreTask?.beadsId).toBeTruthy();
      const close = await fetch(
        `${started.url}/bd/close`,
        authed(started.token, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: coreTask?.beadsId, done: true })
        })
      );
      expect(close.status).toBe(200);

      const list = await fetch(`${started.url}/bd/list`, authed(started.token));
      const listed = (await list.json()) as typeof tasks;
      expect(listed.find((task) => task.beadsId === coreTask?.beadsId)?.done).toBe(true);

      const jsonl = await readFile(path.join(projectDir, ".beads", "beads.jsonl"), "utf8");
      expect(jsonl).toContain('"event":"dep"');
      expect(jsonl).toContain('"blocked":"TEN-4"');
      expect(jsonl).toContain('"blocker":"TEN-1"');
    } finally {
      await started.close();
    }
  });

  it("persists and returns session state snapshots", async () => {
    const projectDir = await makeTempDir("tenchef-project-");
    const started = await startServer(projectDir);
    try {
      const empty = await fetch(`${started.url}/state`, authed(started.token));
      expect(empty.status).toBe(200);
      expect(await empty.json()).toEqual({ state: null });

      const snapshot = { screen: "prd", tasks: [{ id: "t0", label: "Search", group: "Core features", done: true }] };
      const save = await fetch(
        `${started.url}/state`,
        authed(started.token, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(snapshot)
        })
      );
      expect(save.status).toBe(200);

      const restored = await fetch(`${started.url}/state`, authed(started.token));
      expect(await restored.json()).toEqual({ state: snapshot });

      const onDisk = await readFile(path.join(projectDir, ".tenchef", "state.json"), "utf8");
      expect(JSON.parse(onDisk)).toEqual(snapshot);

      const unauthorized = await fetch(`${started.url}/state`);
      expect(unauthorized.status).toBe(403);
    } finally {
      await started.close();
    }
  });

  it("advertises the Claude CLI and proxies /llm/claude to it", async () => {
    const projectDir = await makeTempDir("tenchef-project-");
    const fakeClaudeBin = await makeFakeClaude();
    process.env.PATH = `${fakeClaudeBin}${path.delimiter}${oldPath || ""}`;

    const started = await startServer(projectDir);
    try {
      const config = await fetch(`${started.url}/config`);
      const configBody = (await config.json()) as { claudeCli?: boolean; token?: string };
      expect(configBody.claudeCli).toBe(true);
      expect(configBody.token).toBe(started.token);

      const revise = await fetch(
        `${started.url}/llm/claude`,
        authed(started.token, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt: "Revise this plan." })
        })
      );
      expect(revise.status).toBe(200);
      const payload = (await revise.json()) as { text: string };
      const revision = JSON.parse(payload.text) as { productName: string; changeSummary: string };
      expect(revision.productName).toBe("Pulse");
      expect(revision.changeSummary).toBe("Fake change.");

      const missingPrompt = await fetch(
        `${started.url}/llm/claude`,
        authed(started.token, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({})
        })
      );
      expect(missingPrompt.status).toBe(400);

      const unauthorized = await fetch(`${started.url}/llm/claude`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: "attack" })
      });
      expect(unauthorized.status).toBe(403);
    } finally {
      await started.close();
    }
  });
});
