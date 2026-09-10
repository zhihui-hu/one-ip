import assert from "node:assert/strict";
import { test } from "node:test";
import { ipScoreColor } from "../src/lib/ip-score.ts";

test("IP score colors use the same boundaries and never treat missing scores as zero", () => {
  for (const score of [0, 44]) assert.equal(ipScoreColor(score), "var(--danger)");
  for (const score of [45, 74]) assert.equal(ipScoreColor(score), "var(--warning)");
  for (const score of [75, 100]) assert.equal(ipScoreColor(score), "var(--success)");
  for (const score of [undefined, null, NaN, Infinity, -1, 101])
    assert.equal(ipScoreColor(score), "var(--muted-foreground)");
});
