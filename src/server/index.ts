import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { Hono } from "hono";
import { bdRoutes } from "./routes/bd.js";
import { fsRoutes } from "./routes/fs.js";

export interface TenchefAppOptions {
  projectDir: string;
  webDir: string;
  accent: string;
  onRequest?: () => void;
}

export interface StartServerOptions extends TenchefAppOptions {
  port?: number;
  idleMs?: number;
}

export interface StartedServer {
  server: Server;
  port: number;
  url: string;
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

export function createTenchefApp(options: TenchefAppOptions): Hono {
  const app = new Hono();

  app.use("*", async (_context, next) => {
    options.onRequest?.();
    await next();
  });

  app.get("/config", (context) => context.json({ accent: options.accent }));
  app.route("/fs", fsRoutes(options.projectDir));
  app.route("/bd", bdRoutes(options.projectDir));

  app.get("*", async (context) => serveStatic(context.req.path, options.webDir));

  return app;
}

export async function startTenchefServer(options: StartServerOptions): Promise<StartedServer> {
  let server: Server | null = null;
  let idleTimer: NodeJS.Timeout | null = null;
  const idleMs = options.idleMs ?? 30 * 60 * 1000;
  const resetIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (idleMs > 0) {
      idleTimer = setTimeout(() => {
        server?.close();
      }, idleMs);
      idleTimer.unref();
    }
  };
  resetIdle();

  const app = createTenchefApp({ ...options, onRequest: resetIdle });
  server = createServer((request, response) => {
    void handleRequest(app, request, response, options.port || 0);
  });

  await new Promise<void>((resolve, reject) => {
    server?.once("error", reject);
    server?.listen(options.port ?? 0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not determine server port.");
  const url = `http://127.0.0.1:${address.port}`;

  return {
    server,
    port: address.port,
    url,
    close: () =>
      new Promise((resolve, reject) => {
        if (idleTimer) clearTimeout(idleTimer);
        server?.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

async function handleRequest(app: Hono, request: IncomingMessage, response: ServerResponse, port: number): Promise<void> {
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
