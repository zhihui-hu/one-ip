import { HttpError, upstream } from "./http.js";

const providers = {
  turnstile: {
    prefix: "TURNSTILE",
    name: "Cloudflare Turnstile",
    url: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  },
  "turnstile-noninteractive": {
    prefix: "TURNSTILE_NONINTERACTIVE",
    name: "Cloudflare Turnstile · Non-interactive",
    url: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  },
  recaptcha: {
    prefix: "RECAPTCHA",
    name: "Google reCAPTCHA v3",
    url: "https://www.google.com/recaptcha/api/siteverify",
  },
};
function settings(env, id) {
  const provider = providers[id];
  if (!provider) throw new HttpError(400, "未知验证服务");
  const sitekey = String(env[`${provider.prefix}_SITE_KEY`] ?? "").trim();
  const secret = String(env[`${provider.prefix}_SECRET`] ?? "").trim();
  const hostnames = String(env[`${provider.prefix}_HOSTNAMES`] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  // Development hostnames must never authorize a production deployment.
  const safeHosts =
    env.LOCAL_DEV === "true"
      ? hostnames
      : hostnames.filter(
          (host) => !["localhost", "127.0.0.1", "[::1]", "::1"].includes(host),
        );
  return { ...provider, sitekey, secret, hostnames: safeHosts };
}
export function challengeConfig(env, hostname) {
  return Object.keys(providers)
    .filter(
      (id) =>
        id !== "turnstile-noninteractive" ||
        env.TURNSTILE_NONINTERACTIVE_SITE_KEY,
    )
    .map((id) => {
      const config = settings(env, id);
      const configured = Boolean(
        config.sitekey && config.secret && config.hostnames.includes(hostname),
      );
      return {
        id,
        name: config.name,
        configured,
        reason: configured
          ? undefined
          : !config.sitekey
            ? "当前运行环境缺少站点 Key。"
            : !config.secret
              ? "当前运行环境缺少服务端 Secret。"
              : "当前访问域名不在此环境的验证白名单中。",
        sitekey: configured ? config.sitekey : undefined,
      };
    });
}
export async function verifyChallenge(body, env, hostname) {
  if (!body || typeof body.provider !== "string")
    throw new HttpError(400, "请选择验证服务");
  const config = settings(env, body.provider);
  if (!config.sitekey || !config.secret || !config.hostnames.includes(hostname))
    throw new HttpError(503, "此验证服务尚未在当前站点配置");
  if (
    typeof body.token !== "string" ||
    !body.token.trim() ||
    body.token.length > (body.provider !== "recaptcha" ? 2048 : 8192)
  )
    throw new HttpError(400, "验证凭证无效，请重新验证");
  let result;
  try {
    result = await upstream(
      config.url,
      {
        method: "POST",
        body: new URLSearchParams({
          secret: config.secret,
          response: body.token,
        }),
      },
      32_000,
    );
  } catch {
    throw new HttpError(502, "验证服务暂时不可用，请稍后重试");
  }
  if (result?.success !== true)
    return { success: false, message: "验证未通过或凭证已过期，请重新验证。" };
  if (
    result.hostname !== hostname ||
    !config.hostnames.includes(result.hostname)
  )
    return { success: false, message: "验证站点不匹配，请重新验证。" };
  if (result.action !== "browser_check")
    return { success: false, message: "验证场景不匹配，请重新验证。" };
  if (body.provider === "recaptcha") {
    if (
      typeof result.score !== "number" ||
      !Number.isFinite(result.score) ||
      result.score < 0 ||
      result.score > 1
    )
      return { success: false, message: "验证评分无效，请重新验证。" };
    if (result.score < 0.5)
      return {
        success: false,
        score: result.score,
        message: "本次评分低于通过阈值。",
      };
  }
  return {
    ...(body.provider === "recaptcha" ? { score: result.score } : {}),
    success: true,
    message: "本站本次验证通过",
    verifiedAt: new Date().toISOString(),
  };
}
