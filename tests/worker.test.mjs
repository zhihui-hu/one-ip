import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../.worker-test/index.js";
import {
  publicIp,
  target,
  inputJson,
  upstream,
  HttpError,
} from "../worker/http.js";
import { mapConfig } from "../worker/map.js";
import {
  mockPingVerification,
  pingVerification,
  pingVerificationEnv,
} from "./ping-verification-fixture.mjs";

const env = {
  APP_ENV: "prod",
  ...pingVerificationEnv,
  ASSETS: { fetch: async () => new Response("SPA asset") },
  API_LIMITER: { limit: async () => ({ success: true }) },
  ACTION_LIMITER: { limit: async () => ({ success: true }) },
};
function request(path, init = {}) {
  return new Request(`https://tools.example.com${path}`, init);
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

test("public IP validation rejects private, fake-IP, expanded IPv6, mapped loopback and documentation ranges", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.1",
    "192.168.1.1",
    "100.127.0.1",
    "198.18.0.1",
    "169.254.1.1",
    "198.51.100.1",
    "203.0.113.1",
    "0:0:0:0:0:0:0:1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "fe80::1",
    "fd00::1",
    "2001:db8::1",
    "not-an-ip",
  ])
    assert.throws(() => publicIp(ip), HttpError, ip);
  for (const ip of ["1.1.1.1", "172.32.0.1", "8.8.8.8", "2606:4700:4700::1111"])
    assert.equal(publicIp(ip), ip);
  assert.equal(publicIp("::ffff:8.8.8.8"), "8.8.8.8");
});
test("target validation does not accept URLs, private hosts or ports", () => {
  for (const host of [
    "https://example.com",
    "example.com/path",
    "localhost",
    "foo.local",
    "foo.internal",
    "127.0.0.1",
    "a.com:80",
    "a.com@evil.com",
  ])
    assert.throws(() => target(host));
  assert.equal(target("Example.COM."), "example.com");
});
test("request JSON has a strict size limit and rejects invalid shapes", async () => {
  for (const body of ["null", "[]", "{invalid"])
    await assert.rejects(
      () =>
        inputJson(
          request("/api/ping/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          }),
        ),
      (e) => e.status === 400,
    );
  await assert.rejects(
    () =>
      inputJson(
        request("/api/ping/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: "x".repeat(5000) }),
        }),
      ),
    (e) => e.status === 413,
  );
});
test("backend source paths are never served", async () => {
  for (const path of ["/worker", "/worker/index.js", "/worker/services.json"])
    assert.equal((await worker.fetch(request(path), env)).status, 404);
  assert.equal(
    await (await worker.fetch(request("/claude/status.html"), env)).text(),
    "SPA asset",
  );
});
test("unknown APIs return JSON 404 instead of the SPA", async () => {
  const response = await worker.fetch(request("/api/not-found"), env);
  assert.equal(response.status, 404);
  assert.match(response.headers.get("Content-Type"), /application\/json/);
});
test("map config exposes only the selected public tile provider", async () => {
  assert.deepEqual(mapConfig({}), { provider: "osm" });
  assert.deepEqual(mapConfig({ TIANDITU_TOKEN: "  test-token  " }), {
    provider: "tianditu",
    token: "test-token",
  });
  const response = await worker.fetch(request("/api/map/config"), {
    ...env,
    TIANDITU_TOKEN: "test-token",
  });
  assert.deepEqual(await response.json(), {
    provider: "tianditu",
    token: "test-token",
  });
});
test("API method and origin checks", async () => {
  assert.equal(
    (await worker.fetch(request("/api/me", { method: "DELETE" }), env)).status,
    405,
  );
  assert.equal(
    (await worker.fetch(request("/api/ping/start"), env)).status,
    405,
  );
  assert.equal(
    (
      await worker.fetch(
        request("/api/me", { headers: { Origin: "https://other.example" } }),
        env,
      )
    ).status,
    403,
  );
});
test("rate limiting runs before upstream work", async () => {
  const response = await worker.fetch(request("/api/me"), {
    ...env,
    API_LIMITER: { limit: async () => ({ success: false }) },
  });
  assert.equal(response.status, 429);
});
test("local requests never manufacture a visitor IP", async () => {
  assert.equal((await worker.fetch(request("/api/me"), env)).status, 503);
  const response = await worker.fetch(
    request("/api/me", { headers: { "CF-Connecting-IP": "1.1.1.1" } }),
    { ...env, LOCAL_DEV: "true" },
  );
  assert.equal(response.status, 503);
});
test("visitor information uses this request only and is not cacheable", async () => {
  for (const ip of ["1.1.1.1", "8.8.8.8"]) {
    const req = request("/api/me", { headers: { "CF-Connecting-IP": ip } });
    Object.defineProperty(req, "cf", {
      value: { country: "US", city: "Test city", asn: 13335 },
    });
    const response = await worker.fetch(req, env);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal((await response.json()).ip, ip);
  }
});
test("removed legacy risk endpoint returns 404", async () => {
  assert.equal((await worker.fetch(request("/api/iprisk/1.1.1.1"), env)).status, 404);
});
test("removed DNS endpoints return 404 without querying upstream services", async () => {
  await withFetch(
    async () => {
      throw new Error("Unexpected upstream request");
    },
    async () => {
      const response = await worker.fetch(
        request("/api/dns/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }),
        env,
      );
      assert.equal(response.status, 404);
      assert.equal(
        (await worker.fetch(request("/api/dns/result/old-session"), env))
          .status,
        404,
      );
    },
  );
});
const partnerEnv = env;
const IPBOT_WHITELISTED = "https://ip.huzhihui.com";
const startPingRequest = (body) =>
  request("/api/ping/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test("Ping is verified here, then forwarded to ipbot as a whitelisted origin", async () => {
  let captured;
  await withFetch(
    mockPingVerification(async (url, init) => {
      assert.equal(url, "https://api.ipbot.net/api/ping/start");
      assert.equal(init.method, "POST");
      assert.equal(init.headers.Origin, IPBOT_WHITELISTED);
      captured = JSON.parse(init.body);
      if (captured.nodes?.[0] === "bad")
        return Response.json({ error: "无效的探测地区" }, { status: 400 });
      return Response.json({ id: "measurement-id-123" });
    }),
    async () => {
      const unverified = await worker.fetch(
        startPingRequest({ host: "example.com", nodes: ["JP:Tokyo"] }),
        partnerEnv,
      );
      assert.equal(unverified.status, 403);
      assert.equal(captured, undefined);
      const response = await worker.fetch(
        startPingRequest({
          host: "example.com",
          regions: ["AS", "EU"],
          perRegion: 3,
          verification: pingVerification,
        }),
        partnerEnv,
      );
      assert.equal(response.status, 200);
      assert.equal((await response.json()).id, "measurement-id-123");
      assert.deepEqual(captured, {
        host: "example.com",
        regions: ["AS", "EU"],
        perRegion: 3,
      });
      const invalid = await worker.fetch(
        startPingRequest({
          host: "example.com",
          nodes: ["bad"],
          verification: pingVerification,
        }),
        partnerEnv,
      );
      assert.equal(invalid.status, 400);
      assert.equal((await invalid.json()).error, "无效的探测地区");
    },
  );
});
test("Ping nodes and results come from ipbot; a refused origin is a 502", async () => {
  const urls = [];
  await withFetch(
    async (url, init) => {
      urls.push(url);
      assert.equal(init.headers.Origin, IPBOT_WHITELISTED);
      return url.endsWith("/ping/nodes")
        ? Response.json([{ id: "JP:Tokyo", cc: "jp", city: "Tokyo", name: "Tokyo" }])
        : Response.json({ id: "measurement-id-123", status: "finished" });
    },
    async () => {
      const nodes = await worker.fetch(request("/api/ping/nodes"), partnerEnv);
      assert.equal((await nodes.json())[0].id, "JP:Tokyo");
      const result = await worker.fetch(
        request("/api/ping/result/measurement-id-123"),
        partnerEnv,
      );
      assert.equal((await result.json()).status, "finished");
      const invalid = await worker.fetch(
        request("/api/ping/result/short"),
        partnerEnv,
      );
      assert.equal(invalid.status, 400);
    },
  );
  assert.deepEqual(urls, [
    "https://api.ipbot.net/api/ping/nodes",
    "https://api.ipbot.net/api/ping/result/measurement-id-123",
  ]);
  await withFetch(
    async (url, init) => {
      assert.equal(init.headers.Origin, "https://tools.huzhihui.com");
      return Response.json({ error: "页面会话已过期，请刷新页面" }, { status: 401 });
    },
    async () => {
      const response = await worker.fetch(
        request("/api/ping/result/measurement-id-456"),
        { ...env, IPBOT_ORIGIN: "https://tools.huzhihui.com" },
      );
      // Not whitelisted is an operator problem: no ipbot session message leaks.
      assert.equal(response.status, 502);
    },
  );
});
test("WHOIS and network lookups go to ipbot after local input checks", async () => {
  const urls = [];
  await withFetch(
    async (url, init) => {
      urls.push(url);
      assert.equal(init.headers.Origin, IPBOT_WHITELISTED);
      if (url.includes("/whois/lookup/"))
        return Response.json({
          source: "RDAP · 注册局实时数据",
          query: "AS15169",
          data: { handle: "AS15169" },
        });
      return Response.json({
        prefix: "8.8.8.0/24",
        asns: [{ asn: "15169" }],
        routeAvailable: true,
        ptrAvailable: true,
        validations: [],
        source: "RIPE RIS / RIPEstat",
      });
    },
    async () => {
      const whois = await worker.fetch(
        request("/api/whois/lookup/as15169"),
        partnerEnv,
      );
      assert.equal((await whois.json()).data.handle, "AS15169");
      const network = await worker.fetch(
        request("/api/ip/network/8.8.8.8"),
        partnerEnv,
      );
      assert.equal((await network.json()).prefix, "8.8.8.0/24");
      const path = await worker.fetch(
        request("/api/whois/lookup/example.com%2Fadmin"),
        partnerEnv,
      );
      assert.equal(path.status, 400);
    },
  );
  assert.deepEqual(urls, [
    "https://api.ipbot.net/api/whois/lookup/AS15169",
    "https://api.ipbot.net/api/ip/network/8.8.8.8",
  ]);
});
test("service status unwraps ipbot's detail and hides its failures", async () => {
  await withFetch(
    async (url) => {
      assert.equal(url, "https://api.ipbot.net/api/status/9");
      return Response.json({
        id: "9",
        status: {
          status: { indicator: "none", description: "All Systems Operational" },
          components: [],
          fetchedAt: "2026-11-20T00:00:00Z",
          source: "https://status.openai.com",
        },
        history: [],
      });
    },
    async () => {
      const response = await worker.fetch(request("/api/status/9"), partnerEnv);
      const data = await response.json();
      assert.equal(data.status.indicator, "none");
      assert.equal(data.source, "https://status.openai.com");
    },
  );
  await withFetch(
    async () => Response.json({ id: "4", error: "官方状态数据暂不可用" }),
    async () => {
      const response = await worker.fetch(request("/api/status/4"), partnerEnv);
      assert.equal(response.status, 502);
    },
  );
});
test("upstream errors do not expose response bodies or credentials", async () => {
  await withFetch(
    async () => new Response("sensitive upstream body", { status: 429 }),
    async () => {
      await assert.rejects(
        () => upstream("https://provider.example/private-test-value"),
        (e) =>
          e.status === 429 &&
          !e.message.includes("sensitive") &&
          !e.message.includes("private-test-value"),
      );
    },
  );
});
test("removed IP card endpoint returns 404", async () => {
  const response = await worker.fetch(request("/api/card.svg"), env);
  assert.equal(response.status, 404);
});

test("icon proxy uses a fixed provider, caches images and strips upstream cookies", async () => {
  await withFetch(async (url, options) => {
    assert.equal(url, "https://icons.duckduckgo.com/ip3/github.com.ico");
    assert.equal(options.redirect, "manual");
    assert.equal(options.cf.cacheTtlByStatus["200-299"], 604800);
    return new Response(new Uint8Array([0, 0, 1, 0]), {
      headers: { "Content-Type": "image/x-icon", "Set-Cookie": "upstream=1" },
    });
  }, async () => {
    const response = await worker.fetch(request("/api/icons/github.com"), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "public, max-age=86400");
    assert.equal(response.headers.get("Set-Cookie"), null);
    assert.equal((await response.arrayBuffer()).byteLength, 4);
  });
});

test("icon proxy rejects arbitrary URLs and non-image responses", async () => {
  await withFetch(async () => { throw new Error("must not fetch"); }, async () => {
    assert.equal((await worker.fetch(request("/api/icons/https%3A%2F%2Fevil.com"), env)).status, 400);
  });
  await withFetch(async () => new Response("<html>error</html>", {
    headers: { "Content-Type": "text/html" },
  }), async () => {
    const response = await worker.fetch(request("/api/icons/github.com"), env);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  });
});

test("icon proxy rejects upstream redirects without forwarding Location", async () => {
  await withFetch(async () => new Response(null, {
    status: 302,
    headers: { Location: "https://example.com/icon.ico" },
  }), async () => {
    const response = await worker.fetch(request("/api/icons/github.com"), env);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("Location"), null);
    assert.deepEqual(await response.json(), { error: "图标暂不可用" });
  });
});

test("icon proxy falls back to a second fixed provider and remembers misses", async () => {
  const seen = [];
  await withFetch(async (url) => {
    seen.push(new URL(url).hostname);
    if (url.startsWith("https://icons.duckduckgo.com/")) throw new TypeError("unreachable");
    assert.equal(new URL(url).searchParams.get("url"), "https://fallback-icon.com");
    return new Response("icon", { headers: { "Content-Type": "image/png" } });
  }, async () => {
    const response = await worker.fetch(request("/api/icons/fallback-icon.com"), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/png");
  });
  assert.deepEqual(seen, ["icons.duckduckgo.com", "t3.gstatic.com"]);

  let calls = 0;
  await withFetch(async () => {
    calls += 1;
    return new Response(null, { status: 404 });
  }, async () => {
    assert.equal((await worker.fetch(request("/api/icons/missing-icon.com"), env)).status, 502);
    assert.equal((await worker.fetch(request("/api/icons/missing-icon.com"), env)).status, 502);
  });
  assert.equal(calls, 2);
});

test("WeChat icon uses its official resource because the icon provider returns 404", async () => {
  await withFetch(async (url) => {
    assert.equal(url, "https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico");
    return new Response("icon", { headers: { "Content-Type": "image/x-icon" } });
  }, async () => {
    assert.equal((await worker.fetch(request("/api/icons/weixin.qq.com"), env)).status, 200);
  });
});
