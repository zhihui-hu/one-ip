import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../.worker-test/index.js";
import {
  publicIp,
  target,
  inputJson,
  upstream,
  HttpError,
} from "../public/worker/http.js";

const env = {
  APP_ENV: "prod",
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
test("unconfigured risk data remains unavailable, not safe or zero risk", async () => {
  const data = await (
    await worker.fetch(request("/api/iprisk/1.1.1.1"), env)
  ).json();
  assert.equal(data.available, false);
  assert.equal(data.fraud_score, undefined);
  assert.equal(data.vpn, undefined);
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
test("Ping validates candidates and requests actual ICMP probes", async () => {
  let captured;
  await withFetch(
    async (url, init) => {
      assert.equal(url, "https://api.globalping.io/v1/measurements");
      captured = JSON.parse(init.body);
      return Response.json({ id: "measurement-id-123" });
    },
    async () => {
      const response = await worker.fetch(
        request("/api/ping/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host: "example.com", nodes: ["n03", "n04"] }),
        }),
        env,
      );
      assert.equal(response.status, 200);
      assert.equal(captured.type, "ping");
      assert.equal(captured.limit, undefined);
      assert.equal(captured.locations.length, 2);
      assert.ok(captured.locations.every((location) => location.limit === 1));
      assert.equal(captured.measurementOptions.packets, 3);
      assert.equal(captured.locations[0].city, "Tokyo");
      const invalid = await worker.fetch(
        request("/api/ping/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: '{"host":"example.com","nodes":["bad"]}',
        }),
        env,
      );
      assert.equal(invalid.status, 400);
    },
  );
});
test("WHOIS uses RDAP and never turns a target into a free-form fetch URL", async () => {
  await withFetch(
    async (url) => {
      assert.equal(url, "https://rdap.org/autnum/15169");
      return Response.json({ handle: "AS15169" });
    },
    async () => {
      const response = await worker.fetch(
        request("/api/whois/lookup/AS15169"),
        env,
      );
      assert.equal((await response.json()).data.handle, "AS15169");
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

test("domain registration bypasses rdap.org using the IANA registry endpoint", async () => {
  const urls = [];
  await withFetch(async (url) => {
    urls.push(url);
    if (url === "https://data.iana.org/rdap/dns.json") return Response.json({ services: [[["com"], ["https://rdap.verisign.com/com/v1/"]]] });
    assert.equal(url, "https://rdap.verisign.com/com/v1/domain/qq.com");
    return Response.json({ ldhName: "QQ.COM" });
  }, async () => {
    const response = await worker.fetch(request("/api/whois/lookup/qq.com"), env);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.ldhName, "QQ.COM");
  });
  assert.equal(urls.length, 2);
});

test("unsupported domain suffix returns an explicit RDAP error", async () => {
  await withFetch(async (url) => {
    assert.equal(url, "https://data.iana.org/rdap/dns.json");
    return Response.json({ services: [] });
  }, async () => {
    const response = await worker.fetch(request("/api/whois/lookup/domain.zzz"), env);
    assert.equal(response.status, 422);
  });
});

test("Ping catalog lists all online cities and aggregates probe counts", async () => {
  await withFetch(async (url) => {
    assert.equal(url, "https://api.globalping.io/v1/probes");
    return Response.json([
      { location: { country: "JP", city: "Tokyo" } },
      { location: { country: "JP", city: "Tokyo" } },
      { location: { country: "NZ", city: "Auckland" } },
    ]);
  }, async () => {
    const response = await worker.fetch(request("/api/ping/nodes"), env);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.length, 2);
    assert.equal(data[0].id, "JP:Tokyo");
    assert.equal(data[0].probes, 2);
    assert.equal(data[1].id, "NZ:Auckland");
  });
});
test("Ping accepts only catalog locations for dynamic selection", async () => {
  await withFetch(async (url, init) => {
    if (url.endsWith("/probes")) return Response.json([{ location: { country: "NZ", city: "Auckland" } }]);
    const payload = JSON.parse(init.body);
    assert.deepEqual(payload.locations, [{ country: "NZ", city: "Auckland", limit: 1 }]);
    return Response.json({ id: "measurement-test" });
  }, async () => {
    const makeRequest = (id) => request("/api/ping/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host: "1.1.1.1", nodes: [id] }) });
    assert.equal((await worker.fetch(makeRequest("NZ:Auckland"), env)).status, 200);
    assert.equal((await worker.fetch(makeRequest("NZ:Unknown"), env)).status, 400);
  });
});


test("regional Ping requests spread probes across continents without conflicting limits", async () => {
  await withFetch(async (url, init) => {
    const body = JSON.parse(init.body);
    assert.deepEqual(body.locations, [ { continent: "AS", limit: 3 }, { continent: "EU", limit: 3 } ]);
    assert.equal(body.limit, undefined);
    assert.equal(body.inProgressUpdates, true);
    return Response.json({ id: "regional-test" });
  }, async () => {
    const response = await worker.fetch(request("/api/ping/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host: "1.1.1.1", regions: ["AS", "EU"], perRegion: 3 }) }), env);
    assert.equal(response.status, 200);
    const invalid = await worker.fetch(request("/api/ping/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host: "1.1.1.1", regions: ["AS", "EU"], perRegion: 30 }) }), env);
    assert.equal(invalid.status, 400);
  });
});

test("preferred Ping pins the online major provider ASN while custom mode keeps city selection", async () => {
  await withFetch(async (url, init) => {
    if (url.endsWith("/probes")) return Response.json([
      { location: { country: "US", city: "Seattle", asn: 123, network: "Small ISP" } },
      { location: { country: "US", city: "Seattle", asn: 16509, network: "Amazon.com, Inc." } },
    ]);
    const body = JSON.parse(init.body);
    assert.equal(body.locations[0].asn, 16509);
    assert.equal(body.locations[0].city, "Seattle");
    return Response.json({ id: "preferred-test" });
  }, async () => {
    const response = await worker.fetch(request("/api/ping/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host: "1.1.1.1", nodes: ["US:Seattle"], preferred: true }) }), env);
    assert.equal(response.status, 200);
  });
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

test("WeChat icon uses its official resource because the icon provider returns 404", async () => {
  await withFetch(async (url) => {
    assert.equal(url, "https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico");
    return new Response("icon", { headers: { "Content-Type": "image/x-icon" } });
  }, async () => {
    assert.equal((await worker.fetch(request("/api/icons/weixin.qq.com"), env)).status, 200);
  });
});
