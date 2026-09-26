import assert from "node:assert/strict";
import { test } from "node:test";
import { request } from "../src/lib/http.ts";
import {
  getSession,
  getTurnstileConfig,
  login,
  logout,
  can,
} from "../src/views/login/api.ts";

test("commercial session treats only 401 as logged out and preserves backend error messages", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "请先登录 One IP" }), {
        status: 401,
      });
    assert.equal(await getSession(), null);
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "本地账户已停用" }), {
        status: 403,
      });
    await assert.rejects(
      getSession(),
      (error) => error.status === 403 && error.message === "本地账户已停用",
    );
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ user: { id: 1, permissions: ["users:read"] } }),
      );
    assert.deepEqual(await getSession(), {
      id: 1,
      permissions: ["users:read"],
    });
  } finally {
    globalThis.fetch = original;
  }
});
test("local login sends credentials to One IP and receives a session user", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "/api/auth/login");
      assert.equal(init.method, "POST");
      assert.equal(init.credentials, "same-origin");
      assert.deepEqual(JSON.parse(init.body), {
        username: "owner",
        password: "correct horse battery",
        turnstile_token: "verified-token",
      });
      return new Response(
        JSON.stringify({ user: { id: 1, permissions: ["*"] } }),
      );
    };
    assert.equal(
      (await login("owner", "correct horse battery", "verified-token")).user.id,
      1,
    );
    globalThis.fetch = async (url) => {
      assert.equal(url, "/api/auth/turnstile");
      return new Response(JSON.stringify({ sitekey: "public-site-key" }));
    };
    assert.equal((await getTurnstileConfig()).sitekey, "public-site-key");
  } finally {
    globalThis.fetch = original;
  }
});
test("logout accepts 204; writes use the shared same-origin JSON transport", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "/api/auth/logout");
      assert.equal(init.method, "POST");
      assert.equal(init.credentials, "same-origin");
      return new Response(null, { status: 204 });
    };
    assert.equal(await logout(), undefined);
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "/api/admin/roles");
      assert.equal(init.headers["Content-Type"], "application/json");
      assert.equal(init.body, '{"name":"Operator"}');
      return new Response('{"id":10}');
    };
    assert.deepEqual(
      await request("/api/admin/roles", {
        method: "POST",
        body: '{"name":"Operator"}',
      }),
      { id: 10 },
    );
    assert.equal(can({ permissions: ["*"] }, "roles:write"), true);
    assert.equal(can({ permissions: ["roles:read"] }, "roles:write"), false);
  } finally {
    globalThis.fetch = original;
  }
});

test('empty responses preserve the existing diagnostic headers/text modes', async () => {
  const { request: networkRequest } = await import('../src/lib/network.ts');
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(null, {status:204,headers:{'x-probe':'retained'}});
    assert.equal((await networkRequest('/probe',{},'headers')).get('x-probe'),'retained');
    assert.equal(await networkRequest('/probe',{},'text'),'');
  } finally {globalThis.fetch=original;}
});
