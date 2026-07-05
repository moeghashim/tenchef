import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { startTenchefServer } from "../../src/server/index";
import { buildTasks } from "../../src/web/state/reducer";

let oldPath = process.env.PATH;

beforeEach(() => {
  oldPath = process.env.PATH;
});

afterEach(() => {
  process.env.PATH = oldPath;
});

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
      idleMs: 0
    });
    try {
      const root = await fetch(started.url);
      expect(root.status).toBe(200);

      const token = started.token;
      const authHeaders = { "content-type": "application/json", "x-tenchef-token": token };

      const init = await fetch(`${started.url}/bd/init`, { method: "POST", headers: { "x-tenchef-token": token } });
      expect(init.status).toBe(200);

      const tasks = buildTasks(["Search"], "Activation");
      const create = await fetch(`${started.url}/bd/create`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ tasks })
      });
      expect(create.status).toBe(200);
      const created = (await create.json()) as { tasks: typeof tasks };
      expect(created.tasks.every((task) => task.beadsId)).toBe(true);

      const coreTask = created.tasks.find((task) => task.group === "Core features");
      expect(coreTask?.beadsId).toBeTruthy();
      const close = await fetch(`${started.url}/bd/close`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ id: coreTask?.beadsId, done: true })
      });
      expect(close.status).toBe(200);

      const list = await fetch(`${started.url}/bd/list`, { headers: { "x-tenchef-token": token } });
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
});

async function makeTempDir(prefix: string): Promise<string> {
  return mkdir(path.join(os.tmpdir(), prefix), { recursive: true }).then(() =>
    import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(path.join(os.tmpdir(), prefix)))
  );
}

async function makeFakeBd(): Promise<string> {
  const dir = await makeTempDir("tenchef-fake-bd-");
  const file = path.join(dir, "bd");
  await writeFile(
    file,
    `#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const beadsDir = path.join(process.cwd(), '.beads');
const jsonl = path.join(beadsDir, 'beads.jsonl');

function ensure() {
  fs.mkdirSync(beadsDir, { recursive: true });
  if (!fs.existsSync(jsonl)) fs.writeFileSync(jsonl, '');
}

function records() {
  ensure();
  return fs.readFileSync(jsonl, 'utf8').split('\\n').filter(Boolean).map((line) => JSON.parse(line));
}

function append(record) {
  ensure();
  fs.appendFileSync(jsonl, JSON.stringify(record) + '\\n');
}

if (args[0] === '--version') {
  console.log('bd fake 1.0.0');
  process.exit(0);
}
if (args[0] === 'init') {
  ensure();
  process.exit(0);
}
if (args[0] === 'create') {
  const all = records().filter((record) => record.title);
  const id = 'TEN-' + (all.length + 1);
  const labels = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--label') labels.push(args[i + 1]);
  }
  append({ id, title: args[1], status: 'open', labels });
  console.log(id);
  process.exit(0);
}
if (args[0] === 'dep' && args[1] === 'add') {
  append({ event: 'dep', blocked: args[2], blocker: args[3] });
  process.exit(0);
}
if (args[0] === 'close') {
  const current = records().reverse().find((record) => record.id === args[1] && record.title);
  append({ ...current, status: 'closed' });
  process.exit(0);
}
if (args[0] === 'update') {
  const current = records().reverse().find((record) => record.id === args[1] && record.title);
  const status = args[args.indexOf('--status') + 1] || 'open';
  append({ ...current, status });
  process.exit(0);
}
if (args[0] === 'list' && args[1] === '--json') {
  const byId = new Map();
  for (const record of records()) {
    if (record.id && record.title) byId.set(record.id, record);
  }
  console.log(JSON.stringify([...byId.values()]));
  process.exit(0);
}
console.error('unknown fake bd command ' + args.join(' '));
process.exit(1);
`,
    { mode: 0o755 }
  );
  return dir;
}
