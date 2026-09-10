import { boundedJson } from "./http.js";

async function ripe(name, params) {
  const response = await fetch(
    `https://stat.ripe.net/data/${name}/data.json?${new URLSearchParams(params)}`,
    {
      signal: AbortSignal.timeout(4000),
      cf: { cacheTtl: 300, cacheEverything: true },
    },
  );
  if (!response.ok) throw new Error("RIPE unavailable");
  const result = await boundedJson(response);
  if (result.status !== "ok" || !result.data)
    throw new Error("RIPE unavailable");
  return result.data;
}
export async function ipNetwork(ip) {
  const [network, reverse] = await Promise.allSettled([
    ripe("network-info", { resource: ip }),
    ripe("reverse-dns-ip", { resource: ip }),
  ]);
  const route = network.status === "fulfilled" ? network.value : undefined;
  const dns = reverse.status === "fulfilled" ? reverse.value : undefined;
  const asns = Array.isArray(route?.asns) ? route.asns.map(String) : [];
  const validations = route?.prefix
    ? await Promise.all(
        asns.map(async (asn) => {
          try {
            const data = await ripe("rpki-validation", {
              resource: asn,
              prefix: route.prefix,
            });
            return { asn, status: data.status, description: data.description };
          } catch {
            return { asn, status: "unavailable" };
          }
        }),
      )
    : [];
  return {
    prefix: route?.prefix,
    asns,
    ptr: Array.isArray(dns?.result)
      ? dns.result.join(" / ")
      : dns?.result || undefined,
    routeAvailable: Boolean(route),
    ptrAvailable: Boolean(dns && !dns.error),
    validations,
    source: "RIPE RIS / RIPEstat",
    checkedAt: new Date().toISOString(),
  };
}
