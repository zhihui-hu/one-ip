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
export async function verifyChallenge(
  body,
  env,
  hostname,
  action = "browser_check",
  remoteIp,
) {
  if (!body || typeof body.provider !== "string")
    throw new HttpError(400, "请选择验证服务");
  const config = settings(env, body.provider);
  if (!config.sitekey || !config.secret || !config.hostnames.includes(hostname))
    throw new HttpError(503, "此验证服务尚未在当前站点配置");
  if (
    typeof body.token !== "string" ||
    !body.token.trim() ||
    body.token.length > 2048
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
          ...(remoteIp ? { remoteip: remoteIp } : {}),
        }),
      },
      32_000,
    );
  } catch {
    throw new HttpError(502, "验证服务暂时不可用，请稍后重试");
  }
  if (result?.success !== true) {
    const errors = Array.isArray(result?.["error-codes"])
      ? result["error-codes"]
      : [];
    if (errors.includes("invalid-input-secret"))
      throw new HttpError(
        503,
        "验证服务的私密密钥（Secret）无效，请站点管理员检查配置，注意区分字母 O 和数字 0。",
      );
    if (errors.includes("missing-input-secret"))
      throw new HttpError(503, "当前运行环境缺少服务端 Secret。");
    return { success: false, message: "验证未通过或凭证已过期，请重新验证。" };
  }
  if (
    result.hostname !== hostname ||
    !config.hostnames.includes(result.hostname)
  )
    return { success: false, message: "验证站点不匹配，请重新验证。" };
  if (result.action !== action)
    return { success: false, message: "验证场景不匹配，请重新验证。" };
  return {
    success: true,
    message: "本站本次验证通过",
    verifiedAt: new Date().toISOString(),
  };
}
