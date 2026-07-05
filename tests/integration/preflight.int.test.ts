import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";
import { BD_INSTALL_MESSAGE } from "../../src/cli/preflight";

describe("preflight integration", () => {
  it("exits 1 with the install message when bd is missing", async () => {
    const emptyPath = await mkdtemp(path.join(os.tmpdir(), "tenchef-empty-path-"));
    const result = await run(process.execPath, ["dist/cli/index.js", "--no-open"], {
      cwd: process.cwd(),
      env: { ...process.env, PATH: emptyPath }
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toBe(BD_INSTALL_MESSAGE);
  });
});

function run(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv }
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
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
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
