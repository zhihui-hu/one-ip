import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import {
  activeNavigationRoute,
  navigationRoutes,
  legacyRoutes,
  pageTabs,
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
  assert.ok(navigationRoutes.every((route) => !/dns|news/.test(route.path)));
});
test("header navigation maps IP details and tabbed pages to their owner", () => {
  for (const route of navigationRoutes) {
    assert.equal(activeNavigationRoute(route.path), route.path);
    assert.equal(activeNavigationRoute(`${route.path}/`), route.path);
  }
  assert.equal(activeNavigationRoute("/ip/1.1.1.1"), "");
  assert.equal(activeNavigationRoute("/leak/webrtc"), "/leak");
  assert.equal(activeNavigationRoute("/unlock/claude/"), "/unlock");
  // Reachable pages outside the header highlight no link.
  for (const path of ["/", "/ip", "/whois", "/ping", "/status", "/browser/checks"])
    assert.equal(activeNavigationRoute(path), "", path);
  for (const path of [
    "/dns/",
    "/news/",
    "/claude/news/old.html",
    "/claude/identity.html",
    "/missing",
    "/query/missing",
    "/ping/missing",
    "/ai/gpt/missing",
    "/leak/missing",
    "/browser/challenges",
    "/ai/grok",
  ])
    assert.equal(activeNavigationRoute(path), "not-found", path);
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

test("routes are at most two levels deep and removed tools are gone", () => {
  assert.deepEqual(
    navigationRoutes.map((route) => route.path),
    ["/leak", "/unlock", "/speedtest"],
  );
  const tabs = Object.values(pageTabs).flat();
  for (const path of [
    ...navigationRoutes.map((route) => route.path),
    ...tabs.map((tab) => tab.path),
  ])
    assert.ok(path.split("/").filter(Boolean).length <= 2, path);
  for (const path of [
    "src/views/subdomains",
    "src/views/cdn",
    "src/views/browser/challenges.tsx",
    "src/views/ai/index.tsx",
    "worker/subdomains.js",
  ])
    assert.equal(existsSync(path), false, path);
});

test("tabs map to one owner and legacy paths redirect to live pages", () => {
  const paths = Object.values(pageTabs)
    .flat()
    .map((tab) => tab.path);
  assert.equal(new Set(paths).size, paths.length);
  for (const [owner, tabs] of Object.entries(pageTabs))
    for (const tab of tabs)
      assert.equal(activeNavigationRoute(tab.path), owner);
  for (const to of Object.values(legacyRoutes))
    assert.notEqual(activeNavigationRoute(to.split("?")[0]), "not-found", to);
  assert.equal(legacyRoutes["/network/webrtc"], "/leak/webrtc");
  assert.equal(legacyRoutes["/network/dns"], "/leak/dns");
  assert.equal(legacyRoutes["/ai/claude"], "/unlock/claude");
  assert.equal(legacyRoutes["/ai/gpt/status"], "/status?service=9");
  assert.equal(legacyRoutes["/lookup/ip/:ip"], "/ip");
  assert.equal(legacyRoutes["/network/connectivity"], "/unlock/sites");
  assert.equal(legacyRoutes["/browser/automation"], "/browser/checks");
  for (const from of Object.keys(legacyRoutes))
    assert.equal(
      activeNavigationRoute(from.replace(":ip", "1.1.1.1")),
      "not-found",
      from,
    );
});
