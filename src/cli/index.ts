#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "./open-browser.js";
import { BD_INSTALL_MESSAGE, hasBd } from "./preflight.js";
import { startTenchefServer } from "../server/index.js";

const DEFAULT_ACCENT = "#2F4FE0";

interface CliOptions {
  dir: string;
  port?: number;
  noOpen: boolean;
  accent: string;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!(await hasBd())) {
    process.stderr.write(BD_INSTALL_MESSAGE);
    process.exit(1);
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const webDir = path.resolve(__dirname, "../web");
  const started = await startTenchefServer({
    projectDir: options.dir,
    webDir,
    accent: options.accent,
    port: options.port
  });

  process.stdout.write(`tenchef running at ${started.url}\n`);
  if (!options.noOpen) openBrowser(started.url);

  const shutdown = () => {
    started.close().finally(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function parseArgs(args: string[]): CliOptions {
  let dir = process.cwd();
  let port: number | undefined;
  let noOpen = false;
  let accent = DEFAULT_ACCENT;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--no-open") {
      noOpen = true;
    } else if (arg === "--port") {
      const value = args[index + 1];
      if (!value) throw new Error("--port requires a value.");
      port = Number(value);
      index += 1;
    } else if (arg === "--accent") {
      const value = args[index + 1];
      if (!value) throw new Error("--accent requires a value.");
      accent = value;
      index += 1;
    } else if (!arg.startsWith("--")) {
      dir = path.resolve(arg);
    }
  }

  return { dir, port, noOpen, accent };
}

main().catch((error) => {
  if (process.exitCode === 1) return;
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
