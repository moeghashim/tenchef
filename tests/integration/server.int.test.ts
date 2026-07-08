import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { startTenchefServer } from "../../src/server/index";
import { buildTasks } from "../../src/web/state/reducer";
import { makeFakeBd, makeTempDir } from "../helpers/fake-bd";

const TOKEN = "test-token-1234";

let oldPath = process.env.PATH;

beforeEach(() => {
  oldPath = process.env.PATH;
});

afterEach(() => {
  process.env.PATH = oldPath;
});

function authed(init: RequestInit = {}): RequestInit {
  return { ...init, headers: { ...(init.headers as Record<string, string>), "x-tenchef-token": TOKEN } };
}

describe("server integration", () => {
  it("initializes beads, creates tasks with blockers, closes tasks, and lists state", async () => {
    const projectDir = await makeTempDir("tenchef-project-");
    const webDir = await makeTempDir("tenchef-web-");
    await writeFile(path.join(webDir, "index.html"), "<html>ok</html>");
    const fakeBin = await makeFakeBd();
    process.env.PATH = `${fakeBin}${path.delimiter}${oldPath || ""}`;

    const started = await startTenchefServer({
      projectDir,
      webDir,
      accent: "#2F4FE0",
      token: TOKEN,
      idleMs: 0
    });
    try {
      const root = await fetch(started.url);
      expect(root.status).toBe(200);

      const init = await fetch(`${started.url}/bd/init`, authed({ method: "POST" }));
      expect(init.status).toBe(200);

      const tasks = buildTasks(["Search"], "Activation");
      const create = await fetch(
        `${started.url}/bd/create`,
        authed({
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
        authed({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: coreTask?.beadsId, done: true })
        })
      );
      expect(close.status).toBe(200);

      const list = await fetch(`${started.url}/bd/list`, authed());
      const listed = (await list.json()) as typeof tasks;
      expect(listed.find((task) => task.beadsId === coreTask?.beadsId)?.done).toBe(true);

      const jsonl = await readFile(path.join(projectDir, ".beads", "beads.jsonl"), "utf8");
      expect(jsonl).toContain("\"event\":\"dep\"");
      expect(jsonl).toContain("\"blocked\":\"TEN-4\"");
      expect(jsonl).toContain("\"blocker\":\"TEN-1\"");
    } finally {
      await started.close();
    }
  });

  it("rejects API requests without the token or from a foreign origin", async () => {
    const projectDir = await makeTempDir("tenchef-project-");
    const webDir = await makeTempDir("tenchef-web-");
    await writeFile(path.join(webDir, "index.html"), "<html>ok</html>");
    const fakeBin = await makeFakeBd();
    process.env.PATH = `${fakeBin}${path.delimiter}${oldPath || ""}`;

    const started = await startTenchefServer({
      projectDir,
      webDir,
      accent: "#2F4FE0",
      token: TOKEN,
      idleMs: 0
    });
    try {
      const noToken = await fetch(`${started.url}/fs/write`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: "PRD.md", content: "attack" })
      });
      expect(noToken.status).toBe(401);

      const badToken = await fetch(`${started.url}/bd/list`, {
        headers: { "x-tenchef-token": "wrong" }
      });
      expect(badToken.status).toBe(401);

      const foreignOrigin = await fetch(
        `${started.url}/fs/write`,
        authed({
          method: "POST",
          headers: { "content-type": "application/json", origin: "https://evil.example" },
          body: JSON.stringify({ path: "PRD.md", content: "attack" })
        })
      );
      expect(foreignOrigin.status).toBe(403);

      const localOrigin = await fetch(
        `${started.url}/bd/list`,
        authed({ headers: { origin: started.url } })
      );
      expect(localOrigin.status).toBe(200);

      const staticPage = await fetch(started.url);
      expect(staticPage.status).toBe(200);
    } finally {
      await started.close();
    }
  });
});
