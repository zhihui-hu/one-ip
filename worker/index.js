import { getAiStatus } from "./ai-status.js";
import { cachedJson } from "./cache.js";
import { challengeConfig, verifyChallenge } from "./challenges.js";
import { getCloudStatus } from "./cloud-status.js";
import { cfGeo, geoIp, secondaryGeo } from "./geo.js";
import { clientIp, HttpError, inputJson, json, publicIp } from "./http.js";
import { siteIcon } from "./icons.js";
import { ipNetwork } from "./ip-network.js";
import { ipType } from "./ip-type.js";
import { mapConfig } from "./map.js";
import { startPing, pingResult, pingNodes } from "./ping.js";
import { rateLimit } from "./rate-limit.js";
import { normalizeStatus } from "./service-status.js";
import services from "./services.json";
import { tlsFingerprint } from "./tls-fingerprint.js";
import { lookupRegistration, registrationTarget } from "./whois.js";

/** @type {ExportedHandler<Env>} */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/worker" || url.pathname.startsWith("/worker/"))
      return new Response("Not found", { status: 404 });
    if (url.pathname !== "/api" && !url.pathname.startsWith("/api/")) {
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
      const key = clientIp(request) ?? "local";
      const path = url.pathname.slice(4).replace(/\/$/, "");
      const limiter =
        request.method === "POST"
          ? env.ACTION_LIMITER
          : path.startsWith("/icons/")
            ? (env.ICON_LIMITER ?? env.API_LIMITER)
            : env.API_LIMITER;
      const bucket =
        request.method === "POST"
          ? "action"
          : path.startsWith("/icons/")
            ? "icon"
            : "api";
      if (
        !(await rateLimit(
          limiter,
          key,
          bucket,
          request.method === "POST" ? 5 : 180,
        ))
      )
        throw new HttpError(429, "请求过于频繁，请一分钟后重试");
      if (path === "/dns" || path.startsWith("/dns/"))
        throw new HttpError(404, "接口不存在");
      const isAction = path === "/ping/start";
      if (
        (isAction && request.method !== "POST") ||
        (!isAction && request.method !== "GET")
      )
        throw new HttpError(405, "不支持此请求方法");
      if (path === "/browser/tls-fingerprint")
        return json(tlsFingerprint(request));
      if (path === "/browser/challenges")
        return json(challengeConfig(env, url.hostname));
      if (path.startsWith("/icons/"))
        return await siteIcon(decodeURIComponent(path.slice(7)));
      if (path === "/map/config") return json(mapConfig(env));
      if (path === "/me") {
        const data = cfGeo(request);
        if (!data.ip || key === "local" || env.LOCAL_DEV === "true")
          throw new HttpError(
            503,
            "当前环境没有真实访客公网 IP，请检查部署的访客 IP 配置；不会使用示例 IP。",
          );
        try {
          publicIp(data.ip);
        } catch {
          throw new HttpError(
            503,
            "当前环境没有真实访客公网 IP，请检查部署的访客 IP 配置；不会使用示例 IP。",
          );
        }
        return json(
          request.clientIpSource
            ? await geoIp(data.ip).catch(() => data)
            : data,
        );
      }
      if (path.startsWith("/ip-type/"))
        return await ipType(decodeURIComponent(path.slice(9)), url.origin);
      if (path.startsWith("/geoip/")) {
        const ip = publicIp(decodeURIComponent(path.slice(7)));
        return await cachedJson(
          new URL(`/api/geoip/${encodeURIComponent(ip)}`, url.origin),
          3600,
          () => geoIp(ip),
        );
      }
      if (path.startsWith("/ip/network/")) {
        const ip = publicIp(decodeURIComponent(path.slice(12)));
        return await cachedJson(
          new URL(`/api/ip/network/${encodeURIComponent(ip)}`, url.origin),
          300,
          () => ipNetwork(ip),
          (data) =>
            data.routeAvailable &&
            data.ptrAvailable &&
            data.validations.every((item) => item.status !== "unavailable"),
        );
      }
      if (path.startsWith("/ip/lookup/")) {
        const ip = publicIp(decodeURIComponent(path.slice(11)));
        return await cachedJson(
          new URL(`/api/ip/lookup/${encodeURIComponent(ip)}`, url.origin),
          3600,
          async () => {
            const [primary, secondary, registration] = await Promise.allSettled(
              [geoIp(ip), secondaryGeo(ip), lookupRegistration(ip)],
            );
            const sources = [primary, secondary].flatMap((r) =>
              r.status === "fulfilled" ? [r.value] : [],
            );
            return {
              geo: sources[0] ?? { ip },
              sources,
              rdap:
                registration.status === "fulfilled"
                  ? registration.value.data
                  : undefined,
            };
          },
          (data) => data.sources.length === 2 && data.rdap !== undefined,
        );
      }
      if (path.startsWith("/whois/lookup/")) {
        const query = registrationTarget(decodeURIComponent(path.slice(14)));
        return await cachedJson(
          new URL(`/api/whois/lookup/${encodeURIComponent(query)}`, url.origin),
          3600,
          () => lookupRegistration(query),
        );
      }
      if (path === "/ping/nodes")
        return await cachedJson(
          new URL("/api/ping/nodes", url.origin),
          300,
          pingNodes,
          (data) => data.length > 0,
        );
      if (path === "/ping/start") {
        const input = await inputJson(request);
        if (
          !["turnstile", "turnstile-noninteractive"].includes(
            input.verification?.provider,
          )
        )
          throw new HttpError(403, "验证凭证无效，请重新验证");
        const verification = await verifyChallenge(
          input.verification,
          env,
          url.hostname,
          "ping_start",
          clientIp(request) ?? undefined,
        );
        if (!verification.success)
          throw new HttpError(403, verification.message);
        return json(await startPing(input));
      }
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
        return await cachedJson(
          new URL(`/api/status/${service.id}`, url.origin),
          60,
          async () => {
            const data = await (service.group === "VPS" ||
            [
              "aws",
              "google-cloud",
              "oracle-cloud",
              "34",
              "aliyun",
              "tencent-cloud",
              "azure",
            ].includes(service.id)
              ? getCloudStatus(service)
              : getAiStatus(service));
            return {
              ...normalizeStatus(data),
              fetchedAt: new Date().toISOString(),
              source: service.url,
            };
          },
          (data) => Boolean(data.status?.indicator),
        );
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
