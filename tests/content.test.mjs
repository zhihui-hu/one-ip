import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import {
  activeNavigationRoute,
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
    "public/worker/dns.js",
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
  assert.equal(activeNavigationRoute("/network/ip/1.1.1.1"), "/network/");
  assert.equal(activeNavigationRoute("/status/claude"), "/status/");
  assert.equal(activeNavigationRoute("/status/openai"), "/status/");
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
  assert.equal(activeNavigationRoute("/network/whois/"), "/network/");
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
  assert.equal(legacyRoutes["/ai/gpt/status"], "/status/openai");
});
