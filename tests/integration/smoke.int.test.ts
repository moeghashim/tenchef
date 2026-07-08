import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildTasks } from "../../src/web/state/reducer";
import { makeFakeBd, makeTempDir } from "../helpers/fake-bd";

interface RunningCli {
  child: ChildProcess;
  url: string;
  token: string;
}

let running: RunningCli | null = null;

afterEach(async () => {
  if (running) {
    const exited = waitForExit(running.child);
    running.child.kill("SIGINT");
    await exited;
    running = null;
  }
});

function hasRealBd(): boolean {
  const result = spawnSync("bd", ["--version"], { stdio: "ignore" });
  return !result.error && result.status === 0;
}

async function startCli(projectDir: string, env: NodeJS.ProcessEnv): Promise<RunningCli> {
  const child = spawn(process.execPath, [path.resolve("dist/cli/index.js"), projectDir, "--no-open"], {
    cwd: process.cwd(),
    env
  });
  const url = await new Promise<string>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => reject(new Error(`CLI did not start. stdout: ${stdout} stderr: ${stderr}`)), 15000);
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
      const match = stdout.match(/tenchef running at (\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`CLI exited early with code ${code}. stderr: ${stderr}`));
    });
  });

  const parsed = new URL(url);
  const token = (parsed.hash.match(/token=([a-f0-9]+)/) || [])[1];
  if (!token) throw new Error(`No token in printed URL: ${url}`);
  running = { child, url: `${parsed.protocol}//${parsed.host}`, token };
  return running;
}

function waitForExit(child: ChildProcess): Promise<number | null> {
  return new Promise((resolve) => child.on("exit", (code) => resolve(code)));
}

function authed(token: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { ...(init.headers as Record<string, string>), "x-tenchef-token": token } };
}

describe("cli smoke", () => {
  it("boots, serves the app, answers the API with a token, and shuts down on SIGINT", async () => {
    const projectDir = await makeTempDir("tenchef-smoke-");
    const fakeBin = await makeFakeBd();
    const cli = await startCli(projectDir, {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`
    });

    const root = await fetch(cli.url);
    expect(root.status).toBe(200);

    const list = await fetch(`${cli.url}/bd/list`, authed(cli.token));
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual([]);

    const unauthorized = await fetch(`${cli.url}/bd/list`);
    expect(unauthorized.status).toBe(401);

    const exited = waitForExit(cli.child);
    cli.child.kill("SIGINT");
    expect(await exited).toBe(0);
    running = null;
  });

  it.skipIf(!hasRealBd())("runs the full generate flow against a real bd install", async () => {
    const projectDir = await makeTempDir("tenchef-smoke-real-bd-");
    const cli = await startCli(projectDir, { ...process.env });

    const init = await fetch(`${cli.url}/bd/init`, authed(cli.token, { method: "POST" }));
    expect(init.status).toBe(200);
    expect(existsSync(path.join(projectDir, ".beads"))).toBe(true);

    const tasks = buildTasks(["Search", "Notifications"], "Activation");
    const create = await fetch(
      `${cli.url}/bd/create`,
      authed(cli.token, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tasks })
      })
    );
    expect(create.status).toBe(200);
    const created = (await create.json()) as { tasks: typeof tasks };
    expect(created.tasks).toHaveLength(tasks.length);
    expect(created.tasks.every((task) => task.beadsId)).toBe(true);

    const target = created.tasks.find((task) => task.group === "Core features");
    const close = await fetch(
      `${cli.url}/bd/close`,
      authed(cli.token, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: target?.beadsId, done: true })
      })
    );
    expect(close.status).toBe(200);

    const list = await fetch(`${cli.url}/bd/list`, authed(cli.token));
    expect(list.status).toBe(200);
    const listed = (await list.json()) as typeof tasks;
    expect(listed.find((task) => task.beadsId === target?.beadsId)?.done).toBe(true);

    const write = await fetch(
      `${cli.url}/fs/write`,
      authed(cli.token, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: "PRD.md", content: "# Smoke PRD\n" })
      })
    );
    expect(write.status).toBe(200);
    expect(existsSync(path.join(projectDir, "PRD.md"))).toBe(true);
  }, 30000);
});
