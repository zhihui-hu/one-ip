import { t } from "@/i18n";
import { compareContexts, comparePlatforms, type Check } from "./consistency";
import { environmentSnapshot, type BrowserNavigator } from "./environment";

export async function consistencyChecks(): Promise<Check[]> {
  const snapshot = environmentSnapshot();
  const checks: Check[] = [
    comparePlatforms(
      navigator.userAgent,
      navigator.platform,
      navigator.maxTouchPoints,
    ),
  ];
  const nav = navigator as BrowserNavigator;
  if (nav.userAgentData) {
    checks.push({
      ...comparePlatforms(
        nav.userAgent,
        nav.userAgentData.platform,
        nav.maxTouchPoints,
      ),
      name: t("UA / Client Hints 平台"),
    });
  } else
    checks.push({
      name: t("UA / Client Hints 平台"),
      status: "无法检测",
      detail: t("浏览器未提供 Client Hints。"),
    });
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.title = t("环境一致性检测");
  try {
    document.body.append(frame);
    const win = frame.contentWindow as (Window & typeof globalThis) | null;
    if (!win) throw new Error();
    checks.push(
      compareContexts(
        snapshot,
        {
          userAgent: win.navigator.userAgent,
          platform: win.navigator.platform,
          language: win.navigator.language,
          languages: Array.from(win.navigator.languages),
          hardwareConcurrency: win.navigator.hardwareConcurrency,
          timezone: win.Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        t("主页面 / iframe"),
      ),
    );
  } catch {
    checks.push({
      name: t("主页面 / iframe"),
      status: "无法检测",
      detail: t("浏览器限制了子页面读取。"),
    });
  } finally {
    frame.remove();
  }
  let worker: Worker | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    worker = new Worker(new URL("./context.worker.ts", import.meta.url), {
      type: "module",
    });
    const data = await new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        timeout = setTimeout(() => reject(new Error()), 5000);
        worker!.onmessage = (event) => resolve(event.data);
        worker!.onerror = () => reject(new Error());
        worker!.postMessage("read");
      },
    );
    checks.push(compareContexts(snapshot, data, t("主页面 / Worker")));
  } catch {
    checks.push({
      name: t("主页面 / Worker"),
      status: "无法检测",
      detail: t("Worker 未返回结果，可能被策略限制。"),
    });
  } finally {
    clearTimeout(timeout);
    worker?.terminate();
  }
  checks.push({
    name: t("首选语言"),
    status: !nav.languages.length
      ? "无法检测"
      : nav.language === nav.languages[0]
        ? "一致"
        : "存在差异",
    detail: `language: ${nav.language}；languages[0]: ${nav.languages[0] ?? t("未提供")}。`,
  });
  return checks;
}
export function automationChecks(): Check[] {
  return [
    {
      name: "WebDriver",
      status:
        typeof navigator.webdriver !== "boolean"
          ? "无法检测"
          : navigator.webdriver
            ? "检测到特征"
            : "未发现特征",
      detail: t("navigator.webdriver = {0}；该值可被浏览器或扩展改变。", [
        String(navigator.webdriver),
      ]),
    },
    {
      name: "Headless UA",
      status: /HeadlessChrome/i.test(navigator.userAgent)
        ? "检测到特征"
        : "未发现特征",
      detail: t("检查 User-Agent 中是否明确包含 HeadlessChrome。"),
    },
    {
      name: t("历史自动化全局标记"),
      status: ["_phantom", "callPhantom", "__nightmare"].some(
        (key) => key in window,
      )
        ? "检测到特征"
        : "未发现特征",
      detail: t(
        "仅检查 PhantomJS / Nightmare 常见标记，不能覆盖所有自动化工具。",
      ),
    },
  ];
}
export type FingerprintAlgorithm = "modern" | "legacy";

export async function fingerprint(algorithm: FingerprintAlgorithm = "modern") {
  if (algorithm === "legacy") {
    const { default: Fingerprint2 } = await import("fingerprintjs2");
    // The legacy collector recommends waiting before collecting fonts and audio.
    await new Promise((resolve) => setTimeout(resolve, 500));
    const components = await Fingerprint2.getPromise({});
    return {
      visitorId: Fingerprint2.x64hash128(
        components.map(({ value }) => value).join(""),
        31,
      ),
      version: Fingerprint2.VERSION,
      components: components.map(({ key, value }) => ({
        name: key,
        value: Fingerprint2.x64hash128(JSON.stringify(value) ?? "", 31),
        detail: JSON.stringify(value),
      })),
    };
  }
  const { load, hashComponents } = await import("@fingerprintjs/fingerprintjs");
  const result = await (await load({ monitoring: false })).get();
  const components = Object.entries(result.components).map(([name, value]) => ({
    name,
    value: "error" in value ? t("无法检测") : hashComponents({ [name]: value }),
    detail:
      "error" in value
        ? t("浏览器未提供或限制读取")
        : JSON.stringify(value.value),
  }));
  const element = document.createElement("span");
  element.textContent = "Browser diagnostics 字体 Aa 0123";
  element.style.cssText =
    "position:fixed;left:-10000px;top:0;font:17px Arial;visibility:hidden;white-space:nowrap";
  try {
    document.body.append(element);
    const rect = element.getBoundingClientRect();
    const value = { width: rect.width, height: rect.height };
    components.push({
      name: "ClientRects",
      value: hashComponents({ rect: { value, duration: 0 } }),
      detail: JSON.stringify(value),
    });
  } finally {
    element.remove();
  }
  return { visitorId: result.visitorId, version: result.version, components };
}
