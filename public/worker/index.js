import { startDns, dnsResult } from "./dns.js";
import { cfGeo, geoIp, secondaryGeo, riskIp } from "./geo.js";
import { HttpError, inputJson, json, publicIp, upstream } from "./http.js";
import { startPing, pingResult } from "./ping.js";
import services from "./services.json";
import { lookupRegistration } from "./whois.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/worker" || url.pathname.startsWith("/worker/"))
      return new Response("Not found", { status: 404 });
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      const origin = request.headers.get("Origin");
      if (origin && origin !== url.origin)
        throw new HttpError(403, "仅支持同源调用");
      if (!["GET", "POST"].includes(request.method))
        throw new HttpError(405, "不支持此请求方法");
      const key = request.headers.get("CF-Connecting-IP") ?? "local";
      const limiter =
        request.method === "POST" ? env.ACTION_LIMITER : env.API_LIMITER;
      if (limiter && !(await limiter.limit({ key })).success)
        throw new HttpError(429, "请求过于频繁，请一分钟后重试");
      const path = url.pathname.slice(4).replace(/\/$/, "");
      const isAction = path === "/ping/start" || path === "/dns/start";
      if (
        (isAction && request.method !== "POST") ||
        (!isAction && request.method !== "GET")
      )
        throw new HttpError(405, "不支持此请求方法");
      if (path === "/me") {
        const data = cfGeo(request);
        if (!data.ip || key === "local")
          throw new HttpError(
            503,
            "本地环境没有真实访客 IP，请部署 Worker 后检测；不会使用示例 IP。",
          );
        return json(data);
      }
      if (path.startsWith("/geoip/"))
        return json(await geoIp(publicIp(decodeURIComponent(path.slice(7)))));
      if (path.startsWith("/iprisk/"))
        return json(
          await riskIp(publicIp(decodeURIComponent(path.slice(8))), env),
        );
      if (path.startsWith("/ip/lookup/")) {
        const ip = publicIp(decodeURIComponent(path.slice(11)));
        const [primary, secondary, risk, registration] =
          await Promise.allSettled([
            geoIp(ip),
            secondaryGeo(ip),
            riskIp(ip, env),
            lookupRegistration(ip),
          ]);
        const sources = [primary, secondary].flatMap((r) =>
          r.status === "fulfilled" ? [r.value] : [],
        );
        const unavailable = [
          "端口扫描、VPN 溯源、关联域名及位置/ASN/企业历史尚未接入专业数据源",
        ];
        if (sources.length < 2) unavailable.push("部分归属地数据源查询失败");
        return json({
          geo: sources[0] ?? { ip },
          sources,
          risk:
            risk.status === "fulfilled"
              ? risk.value
              : { available: false, reason: "风险数据源暂不可用" },
          rdap:
            registration.status === "fulfilled"
              ? registration.value.data
              : undefined,
          unavailable,
        });
      }
      if (path.startsWith("/whois/lookup/"))
        return json(
          await lookupRegistration(decodeURIComponent(path.slice(14))),
        );
      if (path === "/ping/start")
        return json(await startPing(await inputJson(request), env));
      if (path.startsWith("/ping/result/"))
        return json(await pingResult(path.slice(13), env));
      if (path === "/dns/start")
        return json(await startDns(await inputJson(request), env));
      if (path.startsWith("/dns/result/"))
        return json(await dnsResult(path.slice(12), env));
      if (path.startsWith("/status/")) {
        const service = services.find((s) => s.id === path.slice(8));
        if (!service) throw new HttpError(404, "未知服务");
        if (!service.url)
          throw new HttpError(
            503,
            "该服务未提供已接入的公开状态接口，请查看官方状态页",
          );
        const data = await upstream(service.url);
        return json({
          ...data,
          fetchedAt: new Date().toISOString(),
          source: service.url,
        });
      }
      throw new HttpError(404, "接口不存在");
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status);
      if (error instanceof URIError)
        return json({ error: "URL 编码无效" }, 400);
      // Never log visitor IP, request URL, credentials, or upstream error bodies.
      console.error(
        JSON.stringify({ event: "api_error", type: error?.name ?? "Error" }),
      );
      return json({ error: "查询暂时失败，请稍后重试" }, 502);
    }
  },
};
