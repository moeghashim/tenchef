import { request } from "node:http";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startTenchefServer, type StartedServer } from "../../src/server/index";

function rawGet(port: number, urlPath: string, headers: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: "127.0.0.1", port, path: urlPath, method: "GET", headers }, (response) => {
      response.resume();
      response.on("end", () => resolve(response.statusCode ?? 0));
    });
    req.on("error", reject);
    req.end();
  });
}

let oldPath = process.env.PATH;
let started: StartedServer | null = null;

async function makeTempDir(prefix: string): Promise<string> {
  await mkdir(path.join(os.tmpdir(), prefix), { recursive: true });
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

async function makeFakeBd(): Promise<string> {
  const dir = await makeTempDir("tenchef-fake-bd-");
  const file = path.join(dir, "bd");
  await writeFile(
    file,
    `#!/usr/bin/env node
if (process.argv[2] === '--version') { console.log('bd fake 1.0.0'); process.exit(0); }
process.exit(0);
`,
    { mode: 0o755 }
  );
  return dir;
}

beforeEach(async () => {
  oldPath = process.env.PATH;
  const projectDir = await makeTempDir("tenchef-project-");
  const webDir = await makeTempDir("tenchef-web-");
  await writeFile(path.join(webDir, "index.html"), "<html>ok</html>");
  const fakeBin = await makeFakeBd();
  process.env.PATH = `${fakeBin}${path.delimiter}${oldPath || ""}`;
  started = await startTenchefServer({ projectDir, webDir, accent: "#2F4FE0", idleMs: 0 });
});

afterEach(async () => {
  process.env.PATH = oldPath;
  if (started) {
    await started.close();
    started = null;
  }
});

describe("server security", () => {
  it("rejects /fs/write without a session token", async () => {
    if (!started) throw new Error("server not started");
    const response = await fetch(`${started.url}/fs/write`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "PRD.md", content: "x" })
    });
    expect(response.status).toBe(403);
  });

  it("rejects /bd/init without a session token", async () => {
    if (!started) throw new Error("server not started");
    const response = await fetch(`${started.url}/bd/init`, { method: "POST" });
    expect(response.status).toBe(403);
  });

  it("rejects requests with a mismatched Host header", async () => {
    if (!started) throw new Error("server not started");
    const status = await rawGet(started.port, "/config", { host: "evil.example.com" });
    expect(status).toBe(403);
  });

  it("accepts requests to localhost with the correct Host", async () => {
    if (!started) throw new Error("server not started");
    const status = await rawGet(started.port, "/config", { host: `localhost:${started.port}` });
    expect(status).toBe(200);
  });

  it("rejects POSTs with a foreign Origin header", async () => {
    if (!started) throw new Error("server not started");
    const response = await fetch(`${started.url}/fs/write`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenchef-token": started.token,
        origin: "https://evil.example.com"
      },
      body: JSON.stringify({ path: "PRD.md", content: "x" })
    });
    expect(response.status).toBe(403);
  });

  it("accepts /config on the loopback host and returns the token", async () => {
    if (!started) throw new Error("server not started");
    const response = await fetch(`${started.url}/config`);
    expect(response.status).toBe(200);
    const config = (await response.json()) as { token?: string };
    expect(config.token).toBe(started.token);
  });

  it("accepts an authorized /fs/write with the session token", async () => {
    if (!started) throw new Error("server not started");
    const response = await fetch(`${started.url}/fs/write`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenchef-token": started.token },
      body: JSON.stringify({ path: "PRD.md", content: "# ok\n" })
    });
    expect(response.status).toBe(200);
  });

  it("rejects /fs/write path traversal attempts", async () => {
    if (!started) throw new Error("server not started");
    const response = await fetch(`${started.url}/fs/write`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenchef-token": started.token },
      body: JSON.stringify({ path: "../../etc/passwd", content: "x" })
    });
    expect(response.status).toBe(400);
  });

  it("rejects /fs/write absolute paths", async () => {
    if (!started) throw new Error("server not started");
    const response = await fetch(`${started.url}/fs/write`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenchef-token": started.token },
      body: JSON.stringify({ path: "/tmp/pwned.md", content: "x" })
    });
    expect(response.status).toBe(400);
  });

  it("rejects /fs/write for non-allowlisted paths", async () => {
    if (!started) throw new Error("server not started");
    const response = await fetch(`${started.url}/fs/write`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenchef-token": started.token },
      body: JSON.stringify({ path: "other.md", content: "x" })
    });
    expect(response.status).toBe(400);
  });

  it("rejects /fs/write with malformed JSON (no stack in body)", async () => {
    if (!started) throw new Error("server not started");
    const response = await fetch(`${started.url}/fs/write`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenchef-token": started.token },
      body: "{not-json"
    });
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text.toLowerCase()).not.toContain("syntaxerror");
    expect(text).not.toContain("at ");
  });

  it("rejects /bd/create with malformed JSON", async () => {
    if (!started) throw new Error("server not started");
    const response = await fetch(`${started.url}/bd/create`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenchef-token": started.token },
      body: "not json"
    });
    expect(response.status).toBe(400);
  });

  it("rejects /bd/close with malformed JSON", async () => {
    if (!started) throw new Error("server not started");
    const response = await fetch(`${started.url}/bd/close`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenchef-token": started.token },
      body: ""
    });
    expect(response.status).toBe(400);
  });

  it("rejects /bd/create when a label would be parsed as a bd flag", async () => {
    if (!started) throw new Error("server not started");
    const response = await fetch(`${started.url}/bd/create`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenchef-token": started.token },
      body: JSON.stringify({
        tasks: [{ id: "t0", label: "--rm-rf-my-repo", group: "Core features", done: false }]
      })
    });
    expect(response.status).toBe(400);
  });
});
