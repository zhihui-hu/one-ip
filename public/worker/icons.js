import { HttpError, target } from "./http.js";

export async function siteIcon(host) {
  const domain = target(host);
  const url =
    domain === "weixin.qq.com"
      ? "https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico"
      : `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
    cf: {
      cacheEverything: true,
      cacheTtlByStatus: { "200-299": 604800, "400-599": -1 },
    },
  });
  const type = response.headers.get("Content-Type")?.split(";")[0].trim();
  if (
    !response.ok ||
    ![
      "image/x-icon",
      "image/vnd.microsoft.icon",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ].includes(type)
  ) {
    await response.body?.cancel();
    throw new HttpError(502, "图标暂不可用");
  }
  return new Response(response.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
