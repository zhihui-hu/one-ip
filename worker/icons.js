import { HttpError, target } from "./http.js";

const IMAGE_TYPES = new Set([
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
/** Whole lookup budget, fallback included. */
const TIMEOUT_MS = 4000;
/** A slow primary provider gets this head start before the fallback is tried. */
const FALLBACK_DELAY_MS = 800;
/** Domains no provider had a logo for are not retried during this window. */
const MISS_TTL_MS = 300_000;
const MAX_MISSES = 500;
const misses = new Map();

// Fixed providers only: the proxy never fetches a caller-chosen URL.
function providers(domain) {
  return domain === "weixin.qq.com"
    ? ["https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico"]
    : [
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=64`,
      ];
}

async function load(url, signal) {
  const response = await fetch(url, {
    redirect: "manual",
    signal,
    cf: {
      cacheEverything: true,
      cacheTtlByStatus: { "200-299": 604800, "400-599": -1 },
    },
  });
  const type = response.headers.get("Content-Type")?.split(";")[0].trim();
  if (!response.ok || !IMAGE_TYPES.has(type)) {
    await response.body?.cancel();
    throw new Error("not an icon");
  }
  return { body: response.body, type };
}

function unavailable() {
  return new HttpError(502, "图标暂不可用");
}

export async function siteIcon(host) {
  const domain = target(host);
  if (misses.get(domain) > Date.now()) throw unavailable();
  const deadline = AbortSignal.timeout(TIMEOUT_MS);
  const attempts = [];
  for (const url of providers(domain)) {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, deadline]);
    const previous = attempts.at(-1)?.icon;
    // Start as soon as the previous provider fails, or after its head start;
    // never when it already succeeded.
    const ready = previous
      ? Promise.race([
          previous.then(
            () => Promise.reject(new Error("not needed")),
            () => {},
          ),
          new Promise((resolve) => setTimeout(resolve, FALLBACK_DELAY_MS)),
        ])
      : Promise.resolve();
    attempts.push({ controller, icon: ready.then(() => load(url, signal)) });
  }
  let winner;
  try {
    winner = await Promise.any(
      attempts.map(({ icon }, index) =>
        icon.then((value) => ({ value, index })),
      ),
    );
  } catch {
    if (misses.size >= MAX_MISSES) misses.clear();
    misses.set(domain, Date.now() + MISS_TTL_MS);
    throw unavailable();
  }
  attempts.forEach(({ controller, icon }, index) => {
    if (index === winner.index) return;
    icon.then(({ body }) => body?.cancel()).catch(() => {});
    controller.abort();
  });
  misses.delete(domain);
  return new Response(winner.value.body, {
    headers: {
      "Content-Type": winner.value.type,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
