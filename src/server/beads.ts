import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export type TaskGroup = "Foundation" | "Core features" | "Launch";

export interface BuildTask {
  id: string;
  label: string;
  group: TaskGroup;
  done: boolean;
  beadsId?: string;
}

export interface BdRunResult {
  stdout: string;
  stderr: string;
}

export interface BdListItem {
  id?: string;
  title?: string;
  label?: string;
  name?: string;
  status?: string;
  labels?: string[];
  group?: string;
}

export function groupToLabel(group: TaskGroup): string {
  if (group === "Foundation") return "foundation";
  if (group === "Core features") return "core";
  return "launch";
}

export function labelToGroup(label: string): TaskGroup | null {
  const normalized = label.toLowerCase();
  if (normalized === "foundation") return "Foundation";
  if (normalized === "core" || normalized === "core features") return "Core features";
  if (normalized === "launch") return "Launch";
  return null;
}

export function buildCreateArgs(task: BuildTask): string[] {
  return ["create", task.label, "--type", "task", "--label", "tenchef", "--label", groupToLabel(task.group)];
}

export function buildDependencyArgs(blockedId: string, blockerId: string): string[] {
  return ["dep", "add", blockedId, blockerId];
}

export function buildCloseArgs(id: string): string[] {
  // --force: tenchef's own Foundation → Core → Launch blockers would otherwise
  // reject closing a task before its blockers; a checkbox tick is an explicit
  // user decision, so it wins over dependency order.
  return ["close", id, "--force"];
}

export function buildReopenArgs(id: string): string[] {
  return ["update", id, "--status", "open"];
}

export function runBd(args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env): Promise<BdRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("bd", args, { cwd, env });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || `bd ${args.join(" ")} exited with code ${code}`));
    });
  });
}

export async function initBeads(cwd: string): Promise<void> {
  if (existsSync(path.join(cwd, ".beads"))) return;
  await runBd(["init"], cwd);
}

export async function createBead(cwd: string, task: BuildTask): Promise<BuildTask> {
  const result = await runBd(buildCreateArgs(task), cwd);
  const beadsId = parseCreatedId(result.stdout) || task.beadsId;
  return beadsId ? { ...task, beadsId } : task;
}

export async function createTasksWithDependencies(cwd: string, tasks: BuildTask[]): Promise<BuildTask[]> {
  await initBeads(cwd);
  const created: BuildTask[] = [];
  for (const task of tasks) {
    created.push(await createBead(cwd, task));
  }

  const foundation = created.filter((task) => task.group === "Foundation" && task.beadsId);
  const core = created.filter((task) => task.group === "Core features" && task.beadsId);
  const launch = created.filter((task) => task.group === "Launch" && task.beadsId);

  for (const coreTask of core) {
    for (const blocker of foundation) {
      await runBd(buildDependencyArgs(coreTask.beadsId as string, blocker.beadsId as string), cwd);
    }
  }
  for (const launchTask of launch) {
    for (const blocker of core) {
      await runBd(buildDependencyArgs(launchTask.beadsId as string, blocker.beadsId as string), cwd);
    }
  }

  return created;
}

export async function setTaskClosed(cwd: string, id: string, done: boolean): Promise<void> {
  await runBd(done ? buildCloseArgs(id) : buildReopenArgs(id), cwd);
}

export function buildListArgs(): string[] {
  // --all: closed issues drop out of the default listing, which would reset
  // checked-off tasks on reload. --limit 0 lifts the default 50-issue cap.
  return ["list", "--json", "--all", "--label", "tenchef", "--limit", "0"];
}

export async function listTenchefTasks(cwd: string): Promise<BuildTask[]> {
  if (!existsSync(path.join(cwd, ".beads"))) return [];
  try {
    const result = await runBd(buildListArgs(), cwd);
    return normalizeList(result.stdout);
  } catch {
    try {
      const result = await runBd(["list", "--json"], cwd);
      return normalizeList(result.stdout);
    } catch {
      return readTasksFromJsonl(cwd);
    }
  }
}

export function normalizeList(stdout: string): BuildTask[] {
  const parsed = JSON.parse(stdout || "[]") as unknown;
  const items = Array.isArray(parsed) ? parsed : [];
  return items.flatMap((item, index) => {
    const task = normalizeItem(item as BdListItem, index);
    return task ? [task] : [];
  });
}

function normalizeItem(item: BdListItem, index: number): BuildTask | null {
  const labels = Array.isArray(item.labels) ? item.labels : [];
  if (labels.length && !labels.includes("tenchef")) return null;
  const group = item.group ? labelToGroup(item.group) : labels.map(labelToGroup).find(Boolean);
  if (!group) return null;
  const label = item.title || item.label || item.name;
  const id = item.id;
  if (!label || !id) return null;
  const status = (item.status || "").toLowerCase();
  return {
    id: `bd-${index}`,
    label,
    group,
    done: status === "closed" || status === "done" || status === "complete",
    beadsId: id
  };
}

export function parseCreatedId(stdout: string): string | undefined {
  const text = stdout.trim();
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as { id?: unknown; issue?: { id?: unknown } };
    const value = parsed.id || parsed.issue?.id;
    return value ? String(value) : undefined;
  } catch {
    // bd >= 1.0 prints "✓ Created issue: <prefix>-<suffix> — <title>"; older
    // builds print the bare ID. Suffixes are not always numeric (e.g. "d8k").
    const created = text.match(/Created issue:\s*(\S+)/i);
    if (created) return created[1];
    const match = text.match(/[A-Za-z][A-Za-z0-9_]*-[A-Za-z0-9]+/);
    return match?.[0];
  }
}

async function readTasksFromJsonl(cwd: string): Promise<BuildTask[]> {
  const file = path.join(cwd, ".beads", "beads.jsonl");
  try {
    const content = await readFile(file, "utf8");
    return content
      .split("\n")
      .filter(Boolean)
      .flatMap((line, index) => {
        try {
          const item = JSON.parse(line) as BdListItem;
          const task = normalizeItem(item, index);
          return task ? [task] : [];
        } catch {
          return [];
        }
      });
  } catch {
    await mkdir(path.dirname(file), { recursive: true });
    return [];
  }
}
