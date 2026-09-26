import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { compile } from "./compile.mjs";

const code = compile(readFileSync("src/webmcp.ts", "utf8"), {
  format: "cjs",
}).replace(
  /import\(("[^"\n]+")\)/g,
  "Promise.resolve().then(() => require($1))",
);

function tools() {
  const calls = [];
  const module = { exports: {} };
  const require = (name) => {
    if (name === "@/layout/routes")
      return {
        toolGroups: {
          network: [{ path: "/network/ip" }],
          browser: [{ path: "/browser/privacy" }],
          ai: [],
        },
      };
    if (name === "@/views/ai/platforms")
      return {
        aiPlatforms: [{ id: "gpt", name: "ChatGPT", domain: "chatgpt.com" }],
      };
    if (name === "@/views/cdn/providers")
      return {
        providers: [{ name: "Cloudflare", url: "https://example.com" }],
      };
    if (name === "@/views/home/sites.json")
      return [
        {
          name: "IP.SB",
          type: "international",
          method: "ip-json",
          url: "https://example.com",
          icon: "",
        },
      ];
    if (name === "@/views/link/targets.json")
      return [{ name: "GitHub", url: "https://github.com" }];
    if (name === "@/views/status/services.json")
      return [{ id: "9", name: "OpenAI" }];
    if (name === "@/views/ip/api")
      return {
        lookupIp: async (ip, signal) => {
          calls.push(["ip", ip, signal]);
          return { ip };
        },
      };
    if (name === "@/views/ping/api")
      return {
        runPing: async (input, signal) => {
          calls.push(["ping", input, signal]);
          return { target: input.host };
        },
      };
    if (name === "@/views/status/api")
      return {
        getStatus: async (id, signal) => {
          calls.push(["status", id, signal]);
          return { status: { indicator: "none" } };
        },
      };
    if (name === "@/lib/network")
      return {
        endpoint: async (path, options) => {
          calls.push(["endpoint", path, options.signal]);
          return { path };
        },
      };
    throw new Error(`Unexpected import: ${name}`);
  };
  new Function("require", "module", code)(require, module);
  const navigate = (path) => calls.push(["navigate", path]);
  const list = module.exports.createWebMcpTools(navigate);
  const find = (name) => list.find((tool) => tool.name === name);
  return { calls, list, find };
}

test("WebMCP registers unique, complete tool definitions and restricts navigation", () => {
  const { calls, list, find } = tools();
  assert.equal(new Set(list.map((tool) => tool.name)).size, list.length);
  assert.ok(list.length >= 15);
  for (const tool of list) {
    assert.ok(tool.description);
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(typeof tool.execute, "function");
  }
  assert.deepEqual(find("one_ip_open_page").execute({ path: "/network/ip" }), {
    page: "/network/ip",
  });
  assert.deepEqual(calls, [["navigate", "/network/ip"]]);
  assert.throws(
    () => find("one_ip_open_page").execute({ path: "https://example.com" }),
    /Unknown One IP page/,
  );
  assert.equal(calls.length, 1);
  assert.ok(
    find("one_ip_catalog").execute().pages.includes("/browser/privacy"),
  );
});

test("IP and Ping tools validate before requests and forward abort signals", async () => {
  const { calls, find } = tools();
  const signal = new AbortController().signal;
  const ip = find("one_ip_lookup_ip");
  await assert.rejects(
    ip.execute({ ip: "1.2.3.999" }, { signal }),
    /valid IPv4/,
  );
  await assert.rejects(
    ip.execute({ ip: "https://example.com" }, { signal }),
    /valid IPv6/,
  );
  assert.deepEqual(await ip.execute({ ip: "1.1.1.1" }, { signal }), {
    ip: "1.1.1.1",
  });
  assert.deepEqual(calls[0], ["ip", "1.1.1.1", signal]);

  const ping = find("one_ip_run_ping");
  await assert.rejects(
    ping.execute({ host: "https://example.com" }, { signal }),
    /host without/,
  );
  await assert.rejects(
    ping.execute({ host: "example.com", regions: ["bad"] }, { signal }),
    /Invalid regions/,
  );
  assert.deepEqual(await ping.execute({ host: "example.com" }, { signal }), {
    target: "example.com",
  });
  assert.deepEqual(calls[1], [
    "ping",
    {
      host: "example.com",
      protocol: "icmp",
      regions: ["AS", "EU", "NA"],
      perRegion: 2,
    },
    signal,
  ]);

  const aborted = new AbortController();
  aborted.abort();
  await assert.rejects(
    ip.execute({ ip: "1.1.1.1" }, { signal: aborted.signal }),
    { name: "AbortError" },
  );
  assert.equal(calls.length, 2);
});

test("service status selects a known service without constructing arbitrary backend paths", async () => {
  const { calls, find } = tools();
  const signal = new AbortController().signal;
  const status = find("one_ip_service_status");
  await assert.rejects(
    status.execute({ service: "../other" }, { signal }),
    /Unknown service/,
  );
  assert.deepEqual(await status.execute({ service: "openai" }, { signal }), {
    service: "OpenAI",
    status: { indicator: "none" },
  });
  assert.deepEqual(calls, [["status", "9", signal]]);
});
