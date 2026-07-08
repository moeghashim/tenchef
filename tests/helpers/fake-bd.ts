import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function makeTempDir(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function makeFakeBd(): Promise<string> {
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
if (args[0] === 'list' && args.includes('--json') && args.includes('--all')) {
  const byId = new Map();
  for (const record of records()) {
    if (record.id && record.title) byId.set(record.id, record);
  }
  console.log(JSON.stringify([...byId.values()]));
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
