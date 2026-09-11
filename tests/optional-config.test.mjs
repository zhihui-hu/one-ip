import assert from "node:assert/strict";
import { test } from "node:test";
import { challengeConfig } from "../public/worker/challenges.js";
import { visibleTools } from "../src/layout/routes.ts";

test("zero configuration hides verification but keeps ordinary tools", () => {
  assert.ok(challengeConfig({}, "sample.workers.dev").every(p => !p.configured));
  assert.ok(!visibleTools("browser", false).some(t => t.path.endsWith("/challenges")));
  assert.ok(visibleTools("browser", false).some(t => t.path.endsWith("/fingerprint")));
});
test("matching configured provider exposes verification; incomplete or wrong host does not", () => {
  const settings = { TURNSTILE_SITE_KEY: "public", TURNSTILE_SECRET: "secret", TURNSTILE_HOSTNAMES: "sample.workers.dev" };
  for (const [env, host, expected] of [
    [settings, "sample.workers.dev", true],
    [{ ...settings, TURNSTILE_SECRET: "" }, "sample.workers.dev", false],
    [settings, "other.workers.dev", false],
  ]) {
    const available = challengeConfig(env, host).some(p => p.configured);
    assert.equal(visibleTools("browser", available).some(t => t.path.endsWith("/challenges")), expected);
  }
});
