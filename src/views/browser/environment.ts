export interface BrowserNavigator extends Navigator {
  deviceMemory?: number;
  globalPrivacyControl?: boolean;
  userAgentData?: {
    platform: string;
    mobile: boolean;
    brands: { brand: string; version: string }[];
    getHighEntropyValues(hints: string[]): Promise<Record<string, unknown>>;
  };
}
export function environmentSnapshot() {
  const nav = navigator as BrowserNavigator;
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    language: nav.language,
    languages: Array.from(nav.languages),
    hardwareConcurrency: nav.hardwareConcurrency,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
export function environmentRows(): [string, string | number][] {
  const nav = navigator as BrowserNavigator;
  return [
    ["User-Agent", nav.userAgent],
    ["平台", nav.platform || "未提供"],
    ["语言", nav.languages.join(" · ")],
    ["时区", Intl.DateTimeFormat().resolvedOptions().timeZone],
    ["屏幕", `${screen.width} × ${screen.height}`],
    ["可用屏幕", `${screen.availWidth} × ${screen.availHeight}`],
    ["视口", `${innerWidth} × ${innerHeight}`],
    ["像素比", devicePixelRatio],
    ["色深", screen.colorDepth],
    ["逻辑处理器", nav.hardwareConcurrency ?? "未提供"],
    [
      "内存提示",
      nav.deviceMemory ? `${nav.deviceMemory} GB（近似）` : "未提供",
    ],
    ["触控点", nav.maxTouchPoints],
    ["Cookie", nav.cookieEnabled ? "已启用" : "未启用"],
    ["Client Hints 平台", nav.userAgentData?.platform ?? "不支持"],
    [
      "Client Hints 品牌",
      nav.userAgentData?.brands
        .map((item) => `${item.brand} ${item.version}`)
        .join(" · ") ?? "不支持",
    ],
  ];
}
