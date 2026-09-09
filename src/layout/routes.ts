import { aiPlatforms } from "@/views/ai/platforms";

export const navigationRoutes = [
  { value: "/", label: "首页", short: "首页" },
  { value: "/network/", label: "网络检测", short: "网络" },
  { value: "/browser/", label: "浏览器检测", short: "浏览器" },
  { value: "/ai/", label: "AI 检测", short: "AI" },
  { value: "/status/", label: "服务状态", short: "状态" },
] as const;
export const toolGroups = {
  network: [
    { path: "/network/ip", label: "IP 信息" },
    { path: "/network/whois", label: "WHOIS" },
    { path: "/network/connectivity", label: "网站连通" },
    { path: "/network/ping", label: "全球 Ping" },
    { path: "/network/dns", label: "DNS 出口" },
    { path: "/network/cdn", label: "CDN 节点" },
  ],
  browser: [
    { path: "/browser/environment", label: "环境信息" },
    { path: "/browser/fingerprint", label: "指纹检测" },
    { path: "/browser/consistency", label: "环境一致性" },
    { path: "/browser/automation", label: "自动化特征" },
    { path: "/browser/privacy", label: "权限与隐私" },
    { path: "/browser/challenges", label: "验证体验" },
  ],
  ai: aiPlatforms.map((platform) => ({
    path: `/ai/${platform.id}`,
    label: platform.name,
  })),
} as const;
export const legacyRoutes: Record<string, string> = {
  "/query": "/network/ip",
  "/query/ip": "/network/ip",
  "/query/ip/:ip": "/network/ip",
  "/query/whois": "/network/whois",
  "/ip": "/network/ip",
  "/ip/:ip": "/network/ip",
  "/whois": "/network/whois",
  "/link": "/network/connectivity",
  "/network/link": "/network/connectivity",
  "/ping": "/network/ping",
  "/cdn": "/network/cdn",
  "/dns-exit": "/network/dns",
  "/network/dns-exit": "/network/dns",
  "/webrtc": "/browser/privacy",
  "/network/webrtc": "/browser/privacy",
  "/browser/webrtc": "/browser/privacy",
  "/gpt": "/ai/gpt",
  "/claude": "/ai/claude",
  "/gpt/status.html": "/status/openai",
  "/claude/status.html": "/status/claude",
  "/ai/gpt/status": "/status/openai",
  "/ai/claude/status": "/status/claude",
};
export function activeNavigationRoute(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return "/";
  for (const [group, routes] of Object.entries(toolGroups)) {
    if (path === `/${group}` || routes.some((route) => route.path === path))
      return `/${group}/`;
  }
  if (/^\/network\/ip\/[^/]+$/.test(path)) return "/network/";
  return /^\/status(?:\/(?:openai|claude))?$/.test(path)
    ? "/status/"
    : "not-found";
}
