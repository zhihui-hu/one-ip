import assert from "node:assert/strict";
import { test } from "node:test";
import { challengeConfig, verifyChallenge } from "../worker/challenges.js";
import { compareExits } from "../src/views/claude/api.ts";

test("optional non-interactive widget uses its own secret and hostname validation", async () => {
  const env = { TURNSTILE_NONINTERACTIVE_SITE_KEY: "public", TURNSTILE_NONINTERACTIVE_SECRET: "second-secret", TURNSTILE_NONINTERACTIVE_HOSTNAMES: "test.example" };
  assert.equal(challengeConfig({}, "test.example").length, 1);
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

