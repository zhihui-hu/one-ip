import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createRequire } from "node:module";
import ts from "typescript";
import { challengeConfig, verifyChallenge } from "../public/worker/challenges.js";
import { compareExits } from "../src/views/claude/api.ts";

const require = createRequire(import.meta.url);
test("optional non-interactive widget uses its own secret and hostname validation", async () => {
  const env = { TURNSTILE_NONINTERACTIVE_SITE_KEY: "public", TURNSTILE_NONINTERACTIVE_SECRET: "second-secret", TURNSTILE_NONINTERACTIVE_HOSTNAMES: "test.example" };
  assert.equal(challengeConfig({}, "test.example").length, 2);
  const configured = challengeConfig(env, "test.example").find(item => item.id === "turnstile-noninteractive");
  assert.equal(configured.configured, true);
  assert.ok(!JSON.stringify(configured).includes("second-secret"));
  assert.equal(challengeConfig(env, "other.example").find(item => item.id === configured.id).configured, false);
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
      assert.equal(init.body.get("secret"), "second-secret");
      return Response.json({ success: true, action: "browser_check", hostname: "test.example" });
    };
    assert.equal((await verifyChallenge({ provider: configured.id, token: "token" }, env, "test.example")).success, true);
    await assert.rejects(verifyChallenge({ provider: configured.id, token: "x".repeat(2049) }, env, "test.example"));
    globalThis.fetch = async () => Response.json({ success: true, action: "wrong", hostname: "test.example" });
    assert.equal((await verifyChallenge({ provider: configured.id, token: "token" }, env, "test.example")).success, false);
  } finally { globalThis.fetch = original; }
});

test("exit comparisons preserve unknown and normalize equivalent IPv6 addresses", () => {
  assert.equal(compareExits(undefined, "1.1.1.1"), "unknown");
  assert.equal(compareExits("1.1.1.1", "8.8.8.8"), "different");
  assert.equal(compareExits("2001:4860:4860::8888", "2001:4860:4860:0:0:0:0:8888"), "same");
});

test("configured challenge starts on mount, reports interaction, verifies token and cleans up", async () => {
  const source = readFileSync("src/views/browser/challenges.tsx", "utf8").replace("function Challenge(", "export function Challenge(");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const states = [];
  let effect, options, removed = false, request;
  const host = { append() {}, replaceChildren() {} };
  const api = { render(_host, opts) { options = opts; return "widget"; }, remove() { removed = true; } };
  globalThis.window = { turnstile: api };
  globalThis.document = {
    createElement: () => ({ style: {}, remove() {} }),
    head: { append(script) { queueMicrotask(() => script.onload()); } },
  };
  const exports = {};
  const mockRequire = name => {
    if (name === "react") return {
      useRef: () => ({ current: host }),
      useState(value) { const index = states.length; states.push(value); return [value, next => { states[index] = typeof next === "function" ? next(states[index]) : next; }]; },
      useEffect(callback) { effect = callback; },
    };
    if (name === "react/jsx-runtime") return require(name);
    if (name === "@/i18n") return { t: value => value };
    if (name === "@tanstack/react-query") return { useMutation: () => ({ mutateAsync: async input => { request = input; return { success: true, message: "verified" }; } }) };
    return new Proxy({}, { get: (_, key) => key });
  };
  let cleanup;
  try {
    new Function("require", "exports", output)(mockRequire, exports);
    exports.Challenge({ provider: { id: "turnstile", sitekey: "key", configured: true, name: "Turnstile" } });
    cleanup = effect();
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(options, "render must run without clicking a start button");
    assert.equal(options.retry, "never");
    options["before-interactive-callback"]();
    assert.ok(states.includes("需要交互"));
    await options.callback("token");
    assert.equal(request.token, "token");
    assert.equal(request.provider, "turnstile");
    assert.ok(states.includes("验证通过"));
    cleanup(); cleanup = undefined;
    assert.equal(request.signal.aborted, true);
    assert.equal(removed, true);
  } finally {
    cleanup?.();
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});
