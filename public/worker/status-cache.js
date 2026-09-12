export const STATUS_CACHE_TTL_SECONDS = 60;
export const STATUS_CACHE_CONTROL = `public, max-age=${STATUS_CACHE_TTL_SECONDS}, s-maxage=${STATUS_CACHE_TTL_SECONDS}`;

function statusCacheKey(request, service) {
  return new Request(
    new URL(`/api/status/${encodeURIComponent(service.id)}`, request.url),
    { method: "GET" },
  );
}

export function isValidStatusPayload(data, service) {
  if (!data || typeof data !== "object") return false;
  if (data.source !== service.url) return false;
  if (
    typeof data.fetchedAt !== "string" ||
    Number.isNaN(Date.parse(data.fetchedAt))
  )
    return false;
  const status = data.status;
  if (!status || typeof status !== "object") return false;
  if (
    typeof status.indicator !== "string" ||
    typeof status.description !== "string"
  )
    return false;
  if (data.incidents !== undefined && !Array.isArray(data.incidents))
    return false;
  if (data.components !== undefined && !Array.isArray(data.components))
    return false;
  return true;
}

export async function cachedStatus(request, service, load) {
  const cache = globalThis.caches?.default;
  const key = statusCacheKey(request, service);
  if (cache) {
    try {
      const cached = await cache.match(key);
      if (cached) {
        const data = await cached.clone().json();
        if (isValidStatusPayload(data, service))
          return { data, cacheable: true };
      }
    } catch {
      /* Ignore cache read errors and fall through to the upstream source. */
    }
  }

  const data = await load();
  const cacheable = isValidStatusPayload(data, service);
  if (cacheable && cache) {
    try {
      await cache.put(
        key,
        Response.json(data, {
          headers: { "Cache-Control": STATUS_CACHE_CONTROL },
        }),
      );
    } catch {
      /* Cache writes are best-effort; the status response still succeeds. */
    }
  }
  return { data, cacheable };
}
