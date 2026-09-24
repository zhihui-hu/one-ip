// Docker runtime: serve `dist/` and forward `/api/*` (+ `/worker*` parity)
// to the existing Cloudflare Worker handler without forking business logic.
//
// Cloudflare-only bindings are intentionally absent here:
// - ASSETS: served by this file from `dist/` instead of `env.ASSETS`.
// - API_LIMITER / ACTION_LIMITER: undefined -> worker skips limiting.
//   Put rate limiting in your reverse proxy for Docker deployments.
// - request.cf / CF-Connecting-IP: derived from X-Forwarded-For / socket.
//   `/api/me` therefore degrades (no Cloudflare geo); prefer explicit `?ip=`.
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { register } from "node:module";
import { join, normalize, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

register("./server.loader.mjs", import.meta.url);
const { default: worker } = await import("./public/worker/index.js");

const root = fileURLToPath(new URL("./", import.meta.url));
const distDir = join(root, "dist");
const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = Number(process.env.PORT ?? 8787);

const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
  [".txt", "text/plain; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
]);

const SECURITY_HEADERS = {
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
};

function clientIp(req) {
  const forwarded = (req.headers["x-forwarded-for"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (forwarded.length > 0) return forwarded[0];
  const direct = req.headers["cf-connecting-ip"];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const socket = req.socket?.remoteAddress ?? "";
  return socket.startsWith("::ffff:") ? socket.slice(7) : socket;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === "GET" || req.method === "HEAD") {
      resolve(undefined);
      return;
    }
    const chunks = [];
    req.on("data", (c) => {
      chunks.push(c);
      if (chunks.reduce((n, b) => n + b.length, 0) > 4_096 * 1024) {
        reject(new Error("body too large"));
        req.destroy();
      }
    });
    req.on("end", () =>
      resolve(chunks.length > 0 ? Buffer.concat(chunks) : undefined),
    );
    req.on("error", reject);
  });
}

async function handleApi(req, res, start) {
  try {
    const proto =
      req.headers["x-forwarded-proto"]?.split(",")[0]?.trim() || "http";
    const host =
      req.headers["x-forwarded-host"] ||
      req.headers.host ||
      `127.0.0.1:${PORT}`;
    const url = `${proto}://${host}${req.url}`;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v === undefined) continue;
      if (k === "host" || k === "content-length" || k === "connection")
        continue;
      if (Array.isArray(v)) {
        for (const item of v) headers.append(k, item);
      } else {
        headers.set(k, v);
      }
    }
    const ip = clientIp(req);
    if (ip && !headers.has("cf-connecting-ip")) {
      headers.set("cf-connecting-ip", ip);
    }
    const body = await readBody(req);
    const request = new Request(url, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });
    // Never proxy to Vite in the Docker image; LOCAL_DEV would break prod.
    const env = { ...process.env, LOCAL_DEV: "" };
    const response = await worker.fetch(request, env);
    const outHeaders = {};
    response.headers.forEach((value, key) => {
      const name = key.toLowerCase();
      if (name === "content-length" || name === "connection") return;
      outHeaders[key] = value;
    });
    const buf = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, outHeaders);
    res.end(buf);
    console.log(
      `${req.method} ${new URL(url).pathname} -> ${response.status} (${Date.now() - start}ms)`,
    );
  } catch {
    console.error(JSON.stringify({ event: "docker_api_error" }));
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
    }
    res.end(JSON.stringify({ error: "查询暂时失败，请稍后重试" }));
  }
}

async function serveFile(res, filePath, ext, immutable = false) {
  const data = await readFile(filePath);
  res.writeHead(200, {
    "Content-Type": MIME.get(ext) ?? "application/octet-stream",
    ...SECURITY_HEADERS,
    "Cache-Control": immutable
      ? "public, max-age=31536000, immutable"
      : ext === ".html"
        ? "no-cache"
        : "public, max-age=3600",
  });
  res.end(data);
}

async function handleStatic(req, res) {
  const rawPath = (req.url ?? "/").split("?")[0].split("#")[0];
  let pathname;
  try {
    pathname = decodeURIComponent(rawPath);
  } catch {
    res.writeHead(400, SECURITY_HEADERS);
    res.end("Bad Request");
    return;
  }
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const rel = safe.replace(/^\//, "");
  const candidate = join(distDir, rel);

  if (!candidate.startsWith(distDir + sep) && candidate !== distDir) {
    res.writeHead(403, SECURITY_HEADERS);
    res.end("Forbidden");
    return;
  }
  try {
    const st = await stat(candidate);
    if (st.isFile()) {
      await serveFile(
        res,
        candidate,
        extname(candidate).toLowerCase(),
        candidate.includes(`${sep}assets${sep}`),
      );
      return;
    }
  } catch {
    // Fall through to SPA fallback below.
  }
  // SPA fallback: extensionless navigations serve index.html.
  const hasExt = extname(pathname) !== "";
  if (req.method === "GET" && !hasExt) {
    try {
      await serveFile(res, join(distDir, "index.html"), ".html");
      return;
    } catch {
      res.writeHead(500, SECURITY_HEADERS);
      res.end("Missing dist/index.html, run `pnpm build` first");
      return;
    }
  }
  res.writeHead(404, SECURITY_HEADERS);
  res.end("Not found");
}

const server = createServer((req, res) => {
  const start = Date.now();
  const path = (req.url ?? "/").split("?")[0];
  if (req.method === "GET" && path === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }
  if (
    path === "/api" ||
    path.startsWith("/api/") ||
    path.startsWith("/worker")
  ) {
    void handleApi(req, res, start);
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, SECURITY_HEADERS);
    res.end("Method Not Allowed");
    return;
  }
  void handleStatic(req, res).catch(() => {
    console.error(JSON.stringify({ event: "static_error" }));
    if (!res.headersSent) {
      res.writeHead(500, SECURITY_HEADERS);
    }
    res.end("Internal Error");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`one-ip docker server listening on http://${HOST}:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
