import { getAiStatus } from "./ai-status.js";
import { challengeConfig, verifyChallenge } from "./challenges.js";
import { cfGeo, geoIp, secondaryGeo } from "./geo.js";
import { HttpError, inputJson, json, publicIp } from "./http.js";
import { siteIcon } from "./icons.js";
import { ipNetwork } from "./ip-network.js";
import { ipType } from "./ip-type.js";
import { startPing, pingResult, pingNodes } from "./ping.js";
import { normalizeStatus } from "./service-status.js";
import services from "./services.json";
import { lookupRegistration } from "./whois.js";

/** @type {ExportedHandler<Env>} */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/worker" || url.pathname.startsWith("/worker/"))
      return new Response("Not found", { status: 404 });
    if (!url.pathname.startsWith("/api/")) {
      if (env.LOCAL_DEV === "true") {
        url.hostname = "127.0.0.1";
        url.port = "5137";
        url.protocol = "http:";
        return fetch(new Request(url, request));
      }
      return env.ASSETS.fetch(request);
    }
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
      if (path === "/dns" || path.startsWith("/dns/"))
        throw new HttpError(404, "接口不存在");
      const isAction =
        path === "/ping/start" || path === "/browser/challenges/verify";
      if (
        (isAction && request.method !== "POST") ||
        (!isAction && request.method !== "GET")
      )
        throw new HttpError(405, "不支持此请求方法");
      if (path === "/browser/challenges")
        return json(challengeConfig(env, url.hostname));
      if (path.startsWith("/icons/"))
        return await siteIcon(decodeURIComponent(path.slice(7)));
      if (path === "/browser/challenges/verify")
        return json(
          await verifyChallenge(await inputJson(request), env, url.hostname),
        );
      if (path === "/me") {
        const data = cfGeo(request);
        if (!data.ip || key === "local" || env.LOCAL_DEV === "true")
          throw new HttpError(
            503,
            "本地环境没有真实访客 IP，请部署 Worker 后检测；不会使用示例 IP。",
          );
        return json(data);
      }
      if (path.startsWith("/ip-type/"))
        return await ipType(decodeURIComponent(path.slice(9)), url.origin);
      if (path.startsWith("/geoip/"))
        return json(await geoIp(publicIp(decodeURIComponent(path.slice(7)))));
      if (path.startsWith("/ip/network/"))
        return json(
          await ipNetwork(publicIp(decodeURIComponent(path.slice(12)))),
        );
      if (path.startsWith("/ip/lookup/")) {
        const ip = publicIp(decodeURIComponent(path.slice(11)));
        const [primary, secondary, registration] = await Promise.allSettled([
          geoIp(ip),
          secondaryGeo(ip),
          lookupRegistration(ip),
        ]);
        const sources = [primary, secondary].flatMap((r) =>
          r.status === "fulfilled" ? [r.value] : [],
        );
        return json({
          geo: sources[0] ?? { ip },
          sources,
          rdap:
            registration.status === "fulfilled"
              ? registration.value.data
              : undefined,
        });
      }
      if (path.startsWith("/whois/lookup/"))
        return json(
          await lookupRegistration(decodeURIComponent(path.slice(14))),
        );
      if (path === "/ping/nodes") return json(await pingNodes());
      if (path === "/ping/start")
        return json(await startPing(await inputJson(request)));
      if (path.startsWith("/ping/result/"))
        return json(await pingResult(path.slice(13)));
      if (path.startsWith("/status/")) {
        const service = services.find((s) => s.id === path.slice(8));
        if (!service) throw new HttpError(404, "未知服务");
        if (!service.url)
          throw new HttpError(
            503,
            "该服务未提供已接入的公开状态接口，请查看官方状态页",
          );
        const data = await getAiStatus(service);
        return json({
          ...normalizeStatus(data),
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
