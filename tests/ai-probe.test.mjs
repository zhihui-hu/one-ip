import assert from "node:assert/strict";
import { test } from "node:test";
import { probeAiDomain } from "../src/views/ai/probe.ts";

test("Claude and Perplexity read and validate same-domain trace responses", async () => {
  const original = globalThis.fetch;
  try {
    for (const domain of ["claude.ai", "www.perplexity.ai"]) {
      globalThis.fetch = async (url, options) => {
        assert.equal(url, `https://${domain}/cdn-cgi/trace`);
        assert.equal(options.mode, "cors");
        return new Response("ip=1.1.1.1\ncolo=SIN\nloc=SG");
      };
      assert.equal((await probeAiDomain(domain)).status, "response");
    }
    globalThis.fetch = async () => new Response("<html>challenge</html>");
    assert.equal((await probeAiDomain("claude.ai")).status, "unknown");
    globalThis.fetch = async () => new Response("blocked", {status:403});
    assert.equal((await probeAiDomain("claude.ai")).status, "unknown");
  } finally { globalThis.fetch = original; }
});
test("Gemini probes its cross-origin robots resource instead of the missing icon", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => { assert.equal(url,"https://gemini.google.com/robots.txt"); assert.equal(options.mode,"no-cors"); return new Response(""); };
  try { assert.equal((await probeAiDomain("gemini.google.com")).status,"response"); }
  finally { globalThis.fetch = original; }
});
test("failed probes are skipped without retries and cancellation is preserved", async () => {
  const original = globalThis.fetch;
  let calls=0;
  globalThis.fetch = async () => { if (++calls === 1) throw new TypeError("network"); return new Response("ip=1.1.1.1\ncolo=SIN"); };
  try {
    assert.equal((await probeAiDomain("www.perplexity.ai")).status,"unknown"); assert.equal(calls,1);
    globalThis.fetch = async () => { throw new TypeError("blocked"); };
    const result = await probeAiDomain("www.perplexity.ai"); assert.equal(result.status,"unknown"); assert.equal(result.samples.length,1);
    const controller=new AbortController(); controller.abort(); await assert.rejects(probeAiDomain("gemini.google.com",controller.signal), {name:"AbortError"});
  } finally { globalThis.fetch = original; }
});
