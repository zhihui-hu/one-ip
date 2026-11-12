import assert from "node:assert/strict";
import { test } from "node:test";
import { activeSponsors, isSponsorActive } from "../src/lib/sponsors.ts";

const placement = {
  name: "Brand",
  href: "https://example.com/",
  startsAt: "2026-11-11",
  endsAt: "2026-12-10",
};
const at = (iso) => Date.parse(iso);

test("a placement runs from its first day to the end of its last day (UTC+8)", () => {
  assert.equal(
    isSponsorActive(placement, at("2026-11-10T23:59:59+08:00")),
    false,
  );
  assert.equal(
    isSponsorActive(placement, at("2026-11-11T00:00:00+08:00")),
    true,
  );
  assert.equal(
    isSponsorActive(placement, at("2026-12-10T23:59:59+08:00")),
    true,
  );
  assert.equal(
    isSponsorActive(placement, at("2026-12-11T00:00:00+08:00")),
    false,
  );
});

test("the dates are read in UTC+8 whatever the visitor's time zone", () => {
  // 2026-12-10 16:00 UTC is already 2026-12-11 00:00 in UTC+8.
  assert.equal(isSponsorActive(placement, at("2026-12-10T15:59:59Z")), true);
  assert.equal(isSponsorActive(placement, at("2026-12-10T16:00:00Z")), false);
});

test("start and end can be set to the second", () => {
  const timed = {
    ...placement,
    startsAt: "2026-11-11 15:30:00",
    endsAt: "2026-12-11 15:29:59",
  };
  assert.equal(isSponsorActive(timed, at("2026-11-11T15:29:59+08:00")), false);
  assert.equal(isSponsorActive(timed, at("2026-11-11T15:30:00+08:00")), true);
  assert.equal(isSponsorActive(timed, at("2026-12-11T15:29:59+08:00")), true);
  assert.equal(isSponsorActive(timed, at("2026-12-11T15:30:00+08:00")), false);
});

test("listed placements have dates that parse", async () => {
  const { sponsors } = await import("../src/lib/sponsors.ts");
  const format = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/;
  for (const { startsAt, endsAt } of sponsors) {
    if (startsAt) assert.match(startsAt, format);
    if (endsAt) assert.match(endsAt, format);
  }
});

test("a placement without dates always runs", () => {
  assert.equal(
    isSponsorActive({ name: "Open", href: "https://example.org/" }, 0),
    true,
  );
});

test("expired placements drop out and the rest keep their order", () => {
  const open = { name: "Open", href: "https://example.org/" };
  const items = [placement, open];
  assert.deepEqual(
    activeSponsors(at("2026-11-20T12:00:00+08:00"), items),
    items,
  );
  assert.deepEqual(activeSponsors(at("2026-12-11T00:00:00+08:00"), items), [
    open,
  ]);
});

test("every listed placement has an HTTPS link and its banner file", async () => {
  const { sponsors } = await import("../src/lib/sponsors.ts");
  const { existsSync } = await import("node:fs");
  for (const sponsor of sponsors) {
    assert.match(sponsor.href, /^https:\/\//);
    for (const image of [sponsor.image, sponsor.imageEn])
      if (image) assert.ok(existsSync(`public${image}`), image);
  }
});
