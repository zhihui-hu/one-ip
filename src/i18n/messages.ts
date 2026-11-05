import enAi from "./en/ai.json" with { type: "json" };
import enApi from "./en/api.json" with { type: "json" };
import enBrowser from "./en/browser.json" with { type: "json" };
import enCommon from "./en/common.json" with { type: "json" };
import enHome from "./en/home.json" with { type: "json" };
import enIp from "./en/ip.json" with { type: "json" };
import enNetwork from "./en/network.json" with { type: "json" };
import enPolicy from "./en/policy.json" with { type: "json" };
import enStatus from "./en/status.json" with { type: "json" };
import enWhois from "./en/whois.json" with { type: "json" };
import zhAi from "./zh-CN/ai.json" with { type: "json" };
import zhApi from "./zh-CN/api.json" with { type: "json" };
import zhBrowser from "./zh-CN/browser.json" with { type: "json" };
import zhCommon from "./zh-CN/common.json" with { type: "json" };
import zhHome from "./zh-CN/home.json" with { type: "json" };
import zhIp from "./zh-CN/ip.json" with { type: "json" };
import zhNetwork from "./zh-CN/network.json" with { type: "json" };
import zhPolicy from "./zh-CN/policy.json" with { type: "json" };
import zhStatus from "./zh-CN/status.json" with { type: "json" };
import zhWhois from "./zh-CN/whois.json" with { type: "json" };

const zh = {
  ...zhCommon,
  ...zhBrowser,
  ...zhIp,
  ...zhNetwork,
  ...zhWhois,
  ...zhAi,
  ...zhStatus,
  ...zhHome,
  ...zhPolicy,
  ...zhApi,
};

export type MessageKey = keyof typeof zh;

export const messages: Record<"zh-CN" | "en", Record<MessageKey, string>> = {
  "zh-CN": zh,
  en: {
    ...enCommon,
    ...enBrowser,
    ...enIp,
    ...enNetwork,
    ...enWhois,
    ...enAi,
    ...enStatus,
    ...enHome,
    ...enPolicy,
    ...enApi,
  },
};
