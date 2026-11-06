import { build } from "esbuild";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { pathToFileURL } from "node:url";
import { pingVerificationEnv } from "./ping-verification-fixture.mjs";
import { memoryCache } from "../server/memory-cache.mjs";
import { rateKey, rateLimit } from "../worker/rate-limit.js";

let dir;
let server;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "one-ip-server-"));
  const assets = join(dir, "dist");
  await mkdir(join(assets, "assets"), { recursive: true });
  await writeFile(
    join(assets, "_headers"),
    "# comment\n/*\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n/assets/*\n  X-Scoped: yes\n",
  );
  await writeFile(
    join(assets, "index.html"),
    "<!doctype html><title>app</title>",
  );
  await writeFile(join(assets, "assets", "app.js"), "console.log(1)");
  await writeFile(join(dir, "secret.txt"), "secret");
  // The worker imports JSON without attributes; bundle it the way the image does.
  const outfile = join(dir, "app.mjs");
  await build({
    entryPoints: ["server/app.mjs"],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    external: ["node:*"],
    logLevel: "silent",
  });
  server = { assets, ...(await import(pathToFileURL(outfile).href)) };
});
after(() => rm(dir, { recursive: true, force: true }));

async function app(config = {}) {
  const warnings = [];
  const created = await server.createApp({
    assets: server.assets,
    config,
    log: { warn: (line) => warnings.push(line) },
  });
  return { ...created, warnings };
}
function call(
  handle,
  target,
  { method = "GET", headers = {}, body, peer = "203.0.114.9" } = {},
) {
  return handle({
    method,
    target,
    headers: new Headers({ Host: "ip.example.com", ...headers }),
    body: body === undefined ? undefined : new Blob([body]).stream(),
    peer,
  });
}
async function withFetch(fn, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fn;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}
const geoFetch = (seen) => async (url) => {
  const ip = decodeURIComponent(String(url).split("/").at(-1));
  seen.push(ip);
  return Response.json({ success: true, ip, country: "X" });
};

test("standalone server parses only global _headers rules and validates its configuration", async () => {
  assert.deepEqual(
    server.globalHeaders("/*\n  A: 1\n/x\n  B: 2\n\n# c\n/*\n  C: 3\n"),
    { A: "1", C: "3" },
  );
  for (const value of ["nope", "10.0.0.0/33", "::/129", "10.0.0.0/x"])
    assert.throws(() => server.trustedProxyList(value));
  assert.ok(
    server.trustedProxyList("10.0.0.0/8, ::1").check("10.1.2.3", "ipv4"),
  );
  assert.equal(server.publicOrigin(""), undefined);
  assert.equal(
    server.publicOrigin("https://IP.Example.com/"),
    "https://ip.example.com",
  );
  for (const value of [
    "ftp://x.com",
    "https://x.com/path",
    "https://u@x.com",
    "https://x.com/?q",
  ])
    assert.throws(() => server.publicOrigin(value));
});

test("standalone server serves assets, SPA fallback and hides deployment files", async () => {
  const { handle } = await app();
  const index = await call(handle, "/ip/1.1.1.1", {
    headers: { Accept: "text/html" },
  });
  assert.equal(index.status, 200);
  assert.match(await index.text(), /<title>app/);
  assert.equal(index.headers.get("X-Frame-Options"), "DENY");
  assert.equal(index.headers.get("X-Scoped"), null);
  const asset = await call(handle, "/assets/app.js");
  assert.equal(
    asset.headers.get("Cache-Control"),
    "public, max-age=31536000, immutable",
  );
  assert.equal(await asset.text(), "console.log(1)");
  for (const path of [
    "/assets/missing.js",
    "/_headers",
    "/worker/index.js",
    "/%2e%2e/secret.txt",
    "/.env",
  ])
    assert.equal((await call(handle, path)).status, 404, path);
  await assert.rejects(call(handle, "/%E0%A4%A"), URIError);
  const head = await call(handle, "/", { method: "HEAD" });
  assert.equal(head.body, null);
  assert.equal((await call(handle, "/healthz")).status, 200);
  const api = await call(handle, "/api/map/config");
  assert.equal(api.headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(api.headers.get("Cache-Control"), "no-store");
});

test("standalone server ignores spoofed client identity headers from untrusted peers", async () => {
  const { handle } = await app({ TRUST_CF_CONNECTING_IP: "true" });
  const seen = [];
  await withFetch(geoFetch(seen), async () => {
    const response = await call(handle, "/api/me", {
      peer: "::ffff:1.1.1.1",
      headers: { "CF-Connecting-IP": "8.8.8.8", "X-Forwarded-For": "9.9.9.9" },
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ip, "1.1.1.1");
  });
  assert.deepEqual(seen, ["1.1.1.1"]);
});

test("trusted proxies supply the rightmost forwarded address or, when enabled, CF-Connecting-IP", async () => {
  const headers = {
    "CF-Connecting-IP": "8.8.8.8",
    "X-Forwarded-For": "6.6.6.6, 9.9.9.9",
  };
  const seen = [];
  await withFetch(geoFetch(seen), async () => {
    const plain = await app({ TRUSTED_PROXIES: "10.0.0.0/8" });
    await call(plain.handle, "/api/me", { peer: "10.0.0.2", headers });
    const cf = await app({
      TRUSTED_PROXIES: "10.0.0.0/8",
      TRUST_CF_CONNECTING_IP: "true",
    });
    await call(cf.handle, "/api/me", { peer: "10.0.0.2", headers });
  });
  assert.deepEqual(seen, ["9.9.9.9", "8.8.8.8"]);

  const missing = await app({ TRUSTED_PROXIES: "10.0.0.2" });
  for (let i = 0; i < 2; i += 1)
    assert.equal(
      (await call(missing.handle, "/api/me", { peer: "10.0.0.2" })).status,
      503,
    );
  assert.equal(missing.warnings.length, 1);
  assert.match(missing.warnings[0], /proxy_missing_client_ip/);
});

test("HTTPS behind a proxy passes the same-origin check via forwarded proto or PUBLIC_ORIGIN", async () => {
  const post = (handle, extra = {}, peer) =>
    call(handle, "/api/ping/start", {
      method: "POST",
      peer,
      body: "{}",
      headers: {
        Origin: "https://ip.example.com",
        "Content-Type": "application/json",
        ...extra,
      },
    });
  const error = async (response) => (await response.json()).error;
  const direct = await app();
  assert.equal(
    await error(await post(direct.handle, { "X-Forwarded-Proto": "https" })),
    "仅支持同源调用",
  );
  const trusted = await app({ TRUSTED_PROXIES: "10.0.0.2" });
  assert.equal(
    await error(
      await post(trusted.handle, { "X-Forwarded-Proto": "https" }, "10.0.0.2"),
    ),
    "验证凭证无效，请重新验证",
  );
  const fixed = await app({ PUBLIC_ORIGIN: "https://ip.example.com" });
  assert.equal(
    await error(await post(fixed.handle)),
    "验证凭证无效，请重新验证",
  );
  assert.equal(
    await error(await post(fixed.handle, { Origin: "https://evil.example" })),
    "仅支持同源调用",
  );
  // Challenge hostnames follow the public origin, not the Host header.
  const configured = await app({
    ...pingVerificationEnv,
    PUBLIC_ORIGIN: "https://tools.example.com",
  });
  const challenges = await call(configured.handle, "/api/browser/challenges", {
    headers: { Host: "evil.example" },
  });
  assert.ok((await challenges.json()).some((item) => item.configured));
});

test("memory cache honours max-age, skips uncacheable responses and evicts oldest entries", async () => {
  let now = 0;
  const cache = memoryCache({ maxEntries: 2, now: () => now });
  const ok = (body, cacheControl = "public, max-age=10") =>
    new Response(body, { headers: { "Cache-Control": cacheControl } });
  await cache.put(new Request("https://x/a"), ok("a"));
  assert.equal(
    await (await cache.match(new Request("https://x/a"))).text(),
    "a",
  );
  await cache.put(new Request("https://x/n"), ok("n", "no-store"));
  assert.equal(await cache.match(new Request("https://x/n")), undefined);
  now = 10_000;
  assert.equal(await cache.match(new Request("https://x/a")), undefined);
  for (const key of ["b", "c", "d"])
    await cache.put(new Request(`https://x/${key}`), ok(key));
  assert.equal(await cache.match(new Request("https://x/b")), undefined);
  assert.equal(
    await (await cache.match(new Request("https://x/d"))).text(),
    "d",
  );
});

test("memory rate limiter counts IPv6 /64 as one client and evicts instead of rejecting everyone", async () => {
  assert.equal(rateKey("2001:db8:1:2:aaaa::1"), "2001:db8:1:2::/64");
  assert.equal(rateKey("2001:0db8::1"), "2001:db8:0:0::/64");
  assert.equal(rateKey("1.2.3.4"), "1.2.3.4");
  assert.equal(await rateLimit(undefined, "2001:db8:1:2::1", "t6", 1), true);
  assert.equal(
    await rateLimit(undefined, "2001:db8:1:2::ffff", "t6", 1),
    false,
  );
  for (let i = 0; i < 10_001; i += 1)
    await rateLimit(
      undefined,
      `10.${i >> 16}.${(i >> 8) & 255}.${i & 255}`,
      "fill",
      1,
    );
  assert.equal(await rateLimit(undefined, "1.1.1.1", "fill", 1), true);
  const keys = [];
  await rateLimit(
    { limit: async ({ key }) => (keys.push(key), { success: true }) },
    "2001:db8:9::1",
    "b",
    1,
  );
  assert.deepEqual(keys, ["2001:db8:9:0::/64"]);
});
