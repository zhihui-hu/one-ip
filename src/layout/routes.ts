import { t } from "@/i18n";

/**
 * Feature groups that own several pages. They are no longer rendered as
 * header links; every page is reached from the flat tool directory instead.
 */
export const navigationRoutes = [
  {
    path: "/leak",
    label: t("navigation.leakTest"),
    short: t("navigation.leakTestShort"),
  },
  {
    path: "/unlock",
    label: t("navigation.networkUnlock"),
    short: t("navigation.networkUnlockShort"),
  },
  {
    path: "/speedtest",
    label: t("navigation.speedtest"),
    short: t("navigation.speedtestShort"),
  },
] as const;
export type NavigationPath = (typeof navigationRoutes)[number]["path"];

export const browserChecks = [
  "environment",
  "fingerprint",
  "checks",
  "privacy",
] as const;

/** Pages inside each feature group (URL structure only, not rendered as tabs). */
export const pageTabs: Partial<
  Record<NavigationPath, readonly { path: string; label: string }[]>
> = {
  "/leak": [
    { path: "/leak/dns", label: t("navigation.dnsLeak") },
    { path: "/leak/webrtc", label: t("navigation.webrtcLeak") },
  ],
  "/unlock": [
    { path: "/unlock/sites", label: t("navigation.unlockSites") },
    { path: "/unlock/gpt", label: "ChatGPT" },
    { path: "/unlock/claude", label: "Claude" },
  ],
};

/** Other first-level pages. */
export const secondaryRoutes = [
  "/",
  "/ip",
  "/whois",
  "/ping",
  "/status",
  ...browserChecks.map((page) => `/browser/${page}`),
] as const;

/** Old paths that still resolve; `:ip` is carried over when present. */
export const legacyRoutes: Record<string, string> = {
  "/lookup": "/ip",
  "/lookup/ip": "/ip",
  "/lookup/ip/:ip": "/ip",
  "/lookup/whois": "/whois",
  "/query": "/ip",
  "/query/ip": "/ip",
  "/query/ip/:ip": "/ip",
  "/query/whois": "/whois",
  "/network": "/unlock/sites",
  "/network/ip": "/ip",
  "/network/ip/:ip": "/ip",
  "/network/whois": "/whois",
  "/network/connectivity": "/unlock/sites",
  "/network/link": "/unlock/sites",
  "/network/exits": "/unlock/sites",
  "/network/dns": "/leak/dns",
  "/network/speedtest": "/speedtest",
  "/connectivity": "/unlock/sites",
  "/link": "/unlock/sites",
  "/dns": "/leak/dns",
  "/network/ping": "/ping",
  "/webrtc": "/leak/webrtc",
  "/network/webrtc": "/leak/webrtc",
  "/browser/webrtc": "/leak/webrtc",
  "/browser/consistency": "/browser/checks",
  "/browser/automation": "/browser/checks",
  "/ai": "/unlock/gpt",
  "/ai/gpt": "/unlock/gpt",
  "/ai/claude": "/unlock/claude",
  "/gpt": "/unlock/gpt",
  "/claude": "/unlock/claude",
  "/ai/status": "/status",
  "/ai/status/openai": "/status?service=9",
  "/ai/status/claude": "/status?service=4",
  "/ai/gpt/status": "/status?service=9",
  "/ai/claude/status": "/status?service=4",
  "/status/openai": "/status?service=9",
  "/status/claude": "/status?service=4",
  "/gpt/status.html": "/status?service=9",
  "/claude/status.html": "/status?service=4",
};

/**
 * The header link that owns a path, "" for a known page outside the header,
 * or "not-found".
 */
export function activeNavigationRoute(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (/^\/ip\/[^/]+$/.test(path)) return "";
  const owner = navigationRoutes.find(
    (route) =>
      path === route.path ||
      pageTabs[route.path]?.some((tab) => tab.path === path),
  );
  if (owner) return owner.path;
  return (secondaryRoutes as readonly string[]).includes(path)
    ? ""
    : "not-found";
}
