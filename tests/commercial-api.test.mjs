import assert from "node:assert/strict";
import { test } from "node:test";
import { getGeo } from "../src/views/home/api.ts";

test("location lookup uses the Rust API and preserves the reported source", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, "/api/geoip/1.1.1.1");
    return Response.json({
      ip: "1.1.1.1",
      country: "Australia",
      source: "ipwho.is",
    });
  };
  try {
    const result = await getGeo("1.1.1.1");
    assert.equal(result.source, "ipwho.is");
  } finally {
    globalThis.fetch = original;
  }
});
