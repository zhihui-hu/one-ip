import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
const source = readFileSync('public/app-update-checker.worker.js', 'utf8');
async function check(response, build) {
  let handler;
  let resolve;
  const result = new Promise(done => { resolve = done; });
  runInNewContext(source, { URL, AbortSignal, Date, Error, Set,
    fetch: async () => response,
    self: { addEventListener: (_, callback) => { handler = callback; }, postMessage: value => resolve(value) },
  });
  handler({ data: { type: 'check', url: 'https://example.com/app-version.json', build } });
  return result;
}
test('first check detects a newer deployed build without an HTTP validator baseline', async () => {
  assert.equal((await check(Response.json({ build: 'new' }), 'old')).type, 'changed');
  assert.equal((await check(Response.json({ build: 'same' }), 'same')).type, 'unchanged');
});
test('missing or invalid manifests cannot trigger false update notifications', async () => {
  assert.equal((await check(new Response('not found', {status:404}), 'old')).type, 'error');
  assert.equal((await check(Response.json({}), 'old')).type, 'error');
});
