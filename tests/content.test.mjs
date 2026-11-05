import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import {
  activeNavigationRoute,
  activeTool,
  navigationRoutes,
  legacyRoutes,
  toolGroups,
} from "../src/layout/routes.ts";

const json = (path) => JSON.parse(readFileSync(path, "utf8"));

test("removed DNS and news routes have no page source or navigation entries", () => {
  for (const path of [
    "src/views/dns",
    "src/views/news",
    "src/views/claude/articles",
    "src/views/gpt/articles",
    "src/lib/article-paths.json",
    "worker/dns.js",
    "public/claude",
  ])
    assert.equal(existsSync(path), false, path);
  const app = readFileSync("src/App.tsx", "utf8");
  assert.doesNotMatch(app, /DnsPage|NewsPage|ArticlePage|articlePaths/);
  assert.ok(navigationRoutes.every((route) => !/dns|news/.test(route.value)));
});
test("animated navigation maps IP details and live status to their parent tools", () => {
  for (const route of navigationRoutes) {
    assert.equal(activeNavigationRoute(route.value), route.value);
    assert.equal(
      activeNavigationRoute(route.value.replace(/\/$/, "") || "/"),
      route.value,
    );
  }
  assert.equal(activeNavigationRoute("/lookup/ip/1.1.1.1"), "/lookup/");
  assert.equal(activeNavigationRoute("/ai/status/claude"), "/ai/");
  assert.equal(activeNavigationRoute("/ai/status/openai"), "/ai/");
  assert.equal(activeTool("/lookup/ip/1.1.1.1"), "/lookup/ip");
  assert.equal(activeTool("/ai/status/claude"), "/ai/status");
  for (const path of [
    "/dns/",
    "/news/",
    "/claude/news/old.html",
    "/claude/identity.html",
    "/missing",
    "/query/missing",
    "/network/ping/missing",
    "/ai/gpt/missing",
  ])
    assert.equal(activeNavigationRoute(path), "not-found");
});
test("site logos use HTTPS icon URLs rather than bundled files", () => {
  const sites = json("src/views/home/sites.json");
  const targets = json("src/views/link/targets.json");
  assert.ok(sites.length > 0);
  assert.ok(targets.length > 0);
  for (const item of [...sites, ...targets]) {
    const icon = new URL(item.icon);
    assert.equal(icon.protocol, "https:");
    if (item.slug === "douyin") {
      assert.equal(icon.href, "https://www.douyin.com/favicon.ico");
    } else {
      assert.equal(icon.hostname, "icons.duckduckgo.com");
      assert.match(icon.pathname, /^\/ip3\/[a-z\d.-]+\.ico$/i);
    }
  }
  assert.equal(existsSync("public/favicons"), false);
  const fallback = readFileSync("src/components/site-logo.tsx", "utf8");
  assert.match(fallback, /AvatarFallback/);
  assert.match(fallback, /no-referrer/);
});
test("connectivity streaming sites all have a readable egress entry", () => {
  const sites = json("src/views/home/sites.json");
  const targets = json("src/views/link/targets.json");
  const categories = readFileSync("src/views/home/site-categories.ts", "utf8");
  const groups = readFileSync("src/views/link/index.tsx", "utf8");
  const locales = ["zh-CN", "en"].map((locale) => ({
    ...json(`src/i18n/${locale}/common.json`),
    ...json(`src/i18n/${locale}/home.json`),
  }));
  const registrable = (host) =>
    host
      .split(".")
      .slice(/\.(co|ne)\.jp$/.test(host) ? -3 : -2)
      .join(".");

  for (const list of [sites, targets]) {
    const names = list.map((item) => item.name);
    assert.equal(new Set(names).size, names.length);
  }
  assert.match(categories, /\["media",/);
  assert.match(groups, /\["media",/);
  const members = targets.filter((target) => target.cc === "media");
  assert.ok(members.length >= 5);
  for (const target of members) {
    const site = sites.find((item) => item.name === target.name);
    assert.ok(site, target.name);
    assert.ok(site.extra?.includes("media"), target.name);
    assert.equal(site.method, "cftrace", target.name);
    assert.equal(site.probeUrl, target.url, target.name);
    if (site.traceDomain)
      assert.equal(
        registrable(site.traceDomain),
        registrable(site.domain),
        target.name,
      );
  }
  for (const item of [...sites, ...targets])
    for (const locale of locales)
      if (item.nameKey) assert.ok(locale[item.nameKey], item.nameKey);
});
test("production assets exclude deleted content and backend source", () => {
  assert.ok(existsSync("dist/index.html"));
  assert.ok(existsSync("dist/app-update-checker.worker.js"));
  for (const path of ["dist/worker", "dist/favicons", "dist/claude"])
    assert.equal(existsSync(path), false);
  assert.ok(
    readdirSync("dist/assets").every(
      (name) => !/^\d{8}[a-z]?\.html-|^news-/.test(name),
    ),
  );
});

test("tool routes select their grouped navigation", () => {
  for (const path of [
    "/network/connectivity/",
    "/network/cdn/",
    "/network/dns/",
    "/network/ping/",
  ])
    assert.equal(activeNavigationRoute(path), "/network/");
  assert.equal(activeNavigationRoute("/lookup/whois/"), "/lookup/");
  assert.equal(activeNavigationRoute("/ai/claude/"), "/ai/");
  assert.equal(navigationRoutes.length, 5);
});

test("all module links map to exactly one parent and legacy paths redirect to canonical destinations", () => {
  const paths = Object.values(toolGroups)
    .flat()
    .map((item) => item.path);
  assert.equal(new Set(paths).size, paths.length);
  for (const [group, routes] of Object.entries(toolGroups))
    for (const route of routes)
      assert.equal(activeNavigationRoute(route.path), `/${group}/`);
  for (const to of Object.values(legacyRoutes))
    assert.notEqual(activeNavigationRoute(to), "not-found", to);
  assert.equal(legacyRoutes["/network/webrtc"], "/browser/privacy");
  assert.equal(legacyRoutes["/ai/gpt/status"], "/ai/status/openai");
  // Pre-merge URLs keep working.
  assert.equal(legacyRoutes["/network/ip/:ip"], "/lookup/ip");
  assert.equal(legacyRoutes["/network/whois"], "/lookup/whois");
  assert.equal(legacyRoutes["/network/subdomains"], "/lookup/subdomains");
  assert.equal(legacyRoutes["/status"], "/ai/status");
  for (const from of Object.keys(legacyRoutes))
    assert.equal(
      activeNavigationRoute(from.replace(":ip", "1.1.1.1")),
      "not-found",
      from,
    );
});
