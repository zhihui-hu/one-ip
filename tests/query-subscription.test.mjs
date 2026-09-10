import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver, skipToken } from "@tanstack/react-query";

test("cache-only progress subscriptions receive updates without starting a fetch", () => {
  const client = new QueryClient();
  const key = ["connectivity-progress", "https://example.com", 0];
  const observer = new QueryObserver(client, { queryKey: key, queryFn: skipToken, enabled: false });
  let latest;
  const stop = observer.subscribe(result => { latest = result; });
  client.setQueryData(key, {samples:[42], median:42});
  assert.equal(latest.data.median, 42);
  assert.equal(latest.fetchStatus, "idle");
  stop(); client.clear();
});
test("cache-only summary observers do not prevent an active observer from refreshing", async () => {
  const client = new QueryClient();
  const key = ["connectivity", "https://example.com", 0];
  let calls = 0;
  const summary = new QueryObserver(client, {queryKey:key, queryFn:skipToken, enabled:false});
  const stop = summary.subscribe(() => {});
  const active = new QueryObserver(client, {queryKey:key, queryFn:async () => ++calls, retry:false});
  await active.refetch();
  summary.setOptions({queryKey:key, queryFn:skipToken, enabled:false});
  await active.refetch();
  assert.equal(summary.getCurrentResult().data, 2);
  assert.equal(calls, 2);
  stop(); client.clear();
});

test("home reset restarts probes with a disabled summary observer attached", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const queryKey = ["connectivity", "https://example.com", 0];
  let calls = 0;
  const queryFn = async () => ({ samples: [++calls], median: calls });
  const active = new QueryObserver(client, { queryKey, queryFn });
  const stopActive = active.subscribe(() => {});
  await active.refetch();
  const summary = new QueryObserver(client, { queryKey, queryFn, enabled: false });
  const stopSummary = summary.subscribe(() => {});
  try {
    for (let i = 0; i < 3; i++) {
      summary.setOptions({ queryKey, queryFn, enabled: false });
      await client.cancelQueries({ queryKey });
      await client.resetQueries({ queryKey });
      assert.equal(summary.getCurrentResult().status, "success");
      assert.equal(summary.getCurrentResult().data.median, i + 2);
    }
  } finally { stopActive(); stopSummary(); client.clear(); }
});
