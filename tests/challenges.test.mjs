import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../.worker-test/index.js";
import {
  challengeConfig,
  verifyChallenge,
} from "../public/worker/challenges.js";

const hostname = "tools.example.com";
const env = {
  APP_ENV: "prod",
  TURNSTILE_SITE_KEY: "public-sitekey",
  TURNSTILE_SECRET: "private-test-secret",
  TURNSTILE_HOSTNAMES: hostname,
  RECAPTCHA_SITE_KEY: "public-google",
  RECAPTCHA_SECRET: "private-google",
  RECAPTCHA_HOSTNAMES: hostname,
};
async function withFetch(value, run) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.method, "POST");
    assert.ok(options.body instanceof URLSearchParams);
    return Response.json(value);
  };
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}
test("config never exposes secrets and disables missing or mismatched host configuration", () => {
  assert.equal(
    challengeConfig({}, hostname).every((item) => !item.configured),
    true,
  );
  assert.equal(
    challengeConfig(env, "other.example.com").every((item) => !item.configured),
    true,
  );
  assert.equal(
    JSON.stringify(challengeConfig(env, hostname)).includes("private"),
    false,
  );
  assert.equal(
    challengeConfig(
      { ...env, TURNSTILE_HOSTNAMES: "localhost" },
      "localhost",
    )[0].configured,
    false,
  );
  assert.equal(
    challengeConfig(
      { ...env, APP_ENV: "dev", TURNSTILE_HOSTNAMES: "localhost" },
      "localhost",
    )[0].configured,
    true,
  );
});
test("verification rejects invalid inputs before contacting providers", async () => {
  for (const body of [
    null,
    {},
    { provider: "unknown" },
    { provider: "turnstile", token: "" },
    { provider: "turnstile", token: "x".repeat(2049) },
  ])
    await assert.rejects(
      verifyChallenge(body, env, hostname),
      (error) => error.status === 400,
    );
  await assert.rejects(
    verifyChallenge({ provider: "turnstile", token: "token" }, {}, hostname),
    (error) => error.status === 503,
  );
});
test("verification requires provider success, exact hostname and Turnstile action", async () => {
  for (const result of [
    { success: false },
    { success: "true", hostname, action: "browser_check" },
    { success: true, hostname: "other.example.com", action: "browser_check" },
    { success: true, hostname, action: "signup" },
  ]) {
    await withFetch(result, async () =>
      assert.equal(
        (
          await verifyChallenge(
            { provider: "turnstile", token: "token" },
            env,
            hostname,
          )
        ).success,
        false,
      ),
    );
  }
  await withFetch(
    { success: true, hostname, action: "browser_check" },
    async () =>
      assert.equal(
        (
          await verifyChallenge(
            { provider: "turnstile", token: "token" },
            env,
            hostname,
          )
        ).success,
        true,
      ),
  );
  await withFetch({ success: true, hostname }, async () =>
    assert.equal(
      (
        await verifyChallenge(
          { provider: "recaptcha", token: "token" },
          env,
          hostname,
        )
      ).success,
      true,
    ),
  );
  await withFetch(
    { success: false, "error-codes": ["timeout-or-duplicate"] },
    async () =>
      assert.equal(
        (
          await verifyChallenge(
            { provider: "recaptcha", token: "token" },
            env,
            hostname,
          )
        ).success,
        false,
      ),
  );
});
test("provider outage fails closed without exposing the upstream error", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("secret upstream detail");
  };
  try {
    await assert.rejects(
      verifyChallenge({ provider: "turnstile", token: "token" }, env, hostname),
      (error) => error.status === 502 && !error.message.includes("secret"),
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("Worker exposes config read-only and enforces origin and POST on verification", async () => {
  const url = `https://${hostname}/api/browser/challenges`;
  assert.equal((await worker.fetch(new Request(url), env)).status, 200);
  assert.equal(
    (await worker.fetch(new Request(`${url}/verify`), env)).status,
    405,
  );
  assert.equal(
    (await worker.fetch(new Request(url, { method: "POST" }), env)).status,
    405,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request(`${url}/verify`, {
          method: "POST",
          headers: { Origin: "https://other.example.com" },
        }),
        env,
      )
    ).status,
    403,
  );
});


test("missing configuration keeps providers visible with actionable reasons", () => {
  assert.equal(challengeConfig({}, hostname).length, 2);
  assert.ok(challengeConfig({}, hostname).every((item) => !item.configured && item.reason.includes("Key")));
  assert.deepEqual(challengeConfig({ ...env, TURNSTILE_SITE_KEY: "  " }, hostname).map((item) => item.id), ["turnstile", "recaptcha"]);
  assert.deepEqual(challengeConfig({ ...env, RECAPTCHA_SITE_KEY: "" }, hostname).map((item) => item.id), ["turnstile", "recaptcha"]);
  const invalid = challengeConfig({ ...env, TURNSTILE_SECRET: "" }, hostname);
  assert.equal(invalid.length, 2);
  assert.equal(invalid[0].configured, false);
  assert.equal(invalid[0].sitekey, undefined);
});
