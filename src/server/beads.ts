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

export const MAX_LABEL_LENGTH = 200;

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

// Returns an error message if the label should be rejected, or null.
// Rejects: non-string, empty, leading '-' (bd would parse as a flag), > 200 chars.
export function validateBuildTaskLabel(label: unknown): string | null {
  if (typeof label !== "string") return "Task label must be a string.";
  const trimmed = label.trim();
  if (!trimmed) return "Task label must not be empty.";
  if (trimmed.startsWith("-")) return "Task label must not start with '-'.";
  if (trimmed.length > MAX_LABEL_LENGTH) return `Task label must be at most ${MAX_LABEL_LENGTH} characters.`;
  return null;
}

export function buildCreateArgs(task: BuildTask): string[] {
  return ["create", task.label, "--type", "task", "--label", "tenchef", "--label", groupToLabel(task.group)];
}

export function buildDependencyArgs(blockedId: string, blockerId: string): string[] {
  return ["dep", "add", blockedId, blockerId];
}

export function buildCloseArgs(id: string): string[] {
  return ["close", id];
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

export async function listTenchefTasks(cwd: string): Promise<BuildTask[]> {
  if (!existsSync(path.join(cwd, ".beads"))) return [];
  try {
    const result = await runBd(["list", "--json"], cwd);
    return normalizeList(result.stdout);
  } catch {
    return readTasksFromJsonl(cwd);
  }
}

export function normalizeList(stdout: string): BuildTask[] {
  const parsed = JSON.parse(stdout || "[]") as unknown;
  const items = Array.isArray(parsed) ? parsed : [];
  return items.flatMap((item) => {
    const task = normalizeItem(item as BdListItem);
    return task ? [task] : [];
  });
}

function normalizeItem(item: BdListItem): BuildTask | null {
  const labels = Array.isArray(item.labels) ? item.labels : [];
  if (labels.length && !labels.includes("tenchef")) return null;
  const group = item.group ? labelToGroup(item.group) : labels.map(labelToGroup).find(Boolean);
  if (!group) return null;
  const label = item.title || item.label || item.name;
  const id = item.id;
  if (!label || !id) return null;
  const status = (item.status || "").toLowerCase();
  return {
    // Use the stable beadsId as the local id. Synthesizing `bd-${index}`
    // meant a reorder in `bd list` would silently reshuffle React keys and
    // task-toggle targets.
    id,
    label,
    group,
    done: status === "closed" || status === "done" || status === "complete",
    beadsId: id
  };
}

// Parses the stable id (JSON `{"id": "..."}` or a bare `PREFIX-123`
// pattern) out of `bd create` stdout. Returns undefined on anything else —
// no last-resort regex that would grab the first word of an error message.
export function parseCreatedId(stdout: string): string | undefined {
  const text = stdout.trim();
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as { id?: unknown; issue?: { id?: unknown } };
    const value = parsed.id || parsed.issue?.id;
    return value ? String(value) : undefined;
  } catch {
    const match = text.match(/[A-Za-z][A-Za-z0-9_-]*-\d+/);
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
      .flatMap((line) => {
        try {
          const item = JSON.parse(line) as BdListItem;
          const task = normalizeItem(item);
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
