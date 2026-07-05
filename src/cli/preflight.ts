import { spawn } from "node:child_process";

export const BD_INSTALL_MESSAGE = `tenchef requires beads (bd) to be installed.

Install one of:
  brew install beads
  npm i -g @beads/bd
  pipx install beads-mcp

Docs: https://github.com/gastownhall/beads
`;

export async function hasBd(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("bd", ["--version"], { env, stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export async function requireBd(): Promise<void> {
  if (await hasBd()) return;
  process.stderr.write(BD_INSTALL_MESSAGE);
  process.exitCode = 1;
  throw new Error("bd missing");
}
