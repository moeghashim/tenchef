import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";
import { Hono, type MiddlewareHandler } from "hono";
import { bdRoutes } from "./routes/bd.js";
import { fsRoutes } from "./routes/fs.js";

export interface TenchefAppOptions {
  projectDir: string;
  webDir: string;
  accent: string;
  port: number;
  token: string;
  onRequest?: () => void;
}

export interface StartServerOptions {
  projectDir: string;
  webDir: string;
  accent: string;
  port?: number;
  idleMs?: number;
}

export interface StartedServer {
  server: Server;
  port: number;
  url: string;
  token: string;
  close: () => Promise<void>;
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2"
};

function hostGuard(port: number): MiddlewareHandler {
  const allowed = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  return async (context, next) => {
    const host = context.req.header("host");
    if (!host || !allowed.has(host)) return context.text("Forbidden.", 403);
    await next();
  };
}

function apiGuard(token: string, port: number): MiddlewareHandler {
  const allowedOrigins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
  return async (context, next) => {
    const provided = context.req.header("x-tenchef-token");
    if (provided !== token) return context.text("Forbidden.", 403);
    if (context.req.method === "POST") {
      const origin = context.req.header("origin");
      if (origin && !allowedOrigins.has(origin)) return context.text("Forbidden.", 403);
    }
    await next();
  };
}

export function createTenchefApp(options: TenchefAppOptions): Hono {
  const app = new Hono();

  app.use("*", hostGuard(options.port));
  app.use("*", async (_context, next) => {
    options.onRequest?.();
    await next();
  });
  app.use("/fs/*", apiGuard(options.token, options.port));
  app.use("/bd/*", apiGuard(options.token, options.port));

  app.get("/config", (context) => context.json({ accent: options.accent, token: options.token }));
  app.route("/fs", fsRoutes(options.projectDir));
  app.route("/bd", bdRoutes(options.projectDir));

  app.get("*", async (context) => serveStatic(context.req.path, options.webDir));

  return app;
}

export async function startTenchefServer(options: StartServerOptions): Promise<StartedServer> {
  let idleTimer: NodeJS.Timeout | null = null;
  const idleMs = options.idleMs ?? 30 * 60 * 1000;
  let app: Hono | null = null;
  let boundPort = options.port ?? 0;

  const resetIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (idleMs > 0) {
      idleTimer = setTimeout(() => {
        server.close();
      }, idleMs);
      idleTimer.unref();
    }
  };

  const server: Server = createServer((request, response) => {
    if (!app) {
      response.statusCode = 503;
      response.end("Server initializing.");
      return;
    }
    void handleRequest(app, request, response, boundPort);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not determine server port.");
  boundPort = address.port;
  const url = `http://127.0.0.1:${boundPort}`;
  const token = randomUUID();

  resetIdle();
  app = createTenchefApp({
    projectDir: options.projectDir,
    webDir: options.webDir,
    accent: options.accent,
    port: boundPort,
    token,
    onRequest: resetIdle
  });

  return {
    server,
    port: boundPort,
    url,
    token,
    close: () =>
      new Promise((resolve, reject) => {
        if (idleTimer) clearTimeout(idleTimer);
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

async function handleRequest(
  app: Hono,
  request: IncomingMessage,
  response: ServerResponse,
  port: number
): Promise<void> {
  try {
    const webRequest = toWebRequest(request, port);
    const webResponse = await app.fetch(webRequest);
    response.statusCode = webResponse.status;
    webResponse.headers.forEach((value, key) => {
      response.setHeader(key, value);
    });
    const body = await webResponse.arrayBuffer();
    response.end(Buffer.from(body));
  } catch (error) {
    response.statusCode = 500;
    response.end(error instanceof Error ? error.message : "Internal server error");
  }
}

function toWebRequest(request: IncomingMessage, port: number): Request {
  const host = request.headers.host || `127.0.0.1:${port}`;
  const url = `http://${host}${request.url || "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(", "));
    else if (value !== undefined) headers.set(key, value);
  }
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = Readable.toWeb(request) as ReadableStream;
    init.duplex = "half";
  }
  return new Request(url, init);
}

async function serveStatic(requestPath: string, webDir: string): Promise<Response> {
  const pathname = decodeURIComponent(requestPath.split("?")[0] || "/");
  const filePath = pathname === "/" ? path.join(webDir, "index.html") : path.resolve(webDir, `.${pathname}`);
  const root = path.resolve(webDir);
  const safePath = filePath.startsWith(root) ? filePath : path.join(root, "index.html");
  const finalPath = existsSync(safePath) ? safePath : path.join(root, "index.html");

  if (!existsSync(finalPath)) return new Response("Web app has not been built. Run npm run build.", { status: 500 });

  const content = await readFile(finalPath);
  const type = CONTENT_TYPES[path.extname(finalPath)] || "application/octet-stream";
  return new Response(content, { status: 200, headers: { "content-type": type } });
}
