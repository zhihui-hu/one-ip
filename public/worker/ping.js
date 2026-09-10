import { HttpError, target, upstream } from "./http.js";
import nodes from "./nodes.json";

export async function startPing(input) {
  const host = target(input.host);
  let locations;
  if (input.regions) {
    const allowed = ["AF", "AS", "EU", "NA", "OC", "SA"];
    if (
      !Array.isArray(input.regions) ||
      !input.regions.length ||
      input.regions.some((region) => !allowed.includes(region)) ||
      !Number.isInteger(input.perRegion) ||
      input.perRegion < 1 ||
      new Set(input.regions).size * input.perRegion > 50
    )
      throw new HttpError(400, "单批请选择有效地区及 1–50 个探针");
    locations = [...new Set(input.regions)].map((continent) => ({
      continent,
      limit: input.perRegion,
    }));
  } else {
    if (
      !Array.isArray(input.nodes) ||
      !input.nodes.length ||
      input.nodes.length > 50
    )
      throw new HttpError(400, "单批请选择 1–50 个地区");
    const catalog = input.nodes.some(
      (id) => typeof id === "string" && id.includes(":"),
    )
      ? await pingNodes()
      : nodes;
    const selected = [...new Set(input.nodes)].map((id) =>
      catalog.find((node) => node.id === id),
    );
    if (selected.some((node) => !node))
      throw new HttpError(400, "无效的探测地区");
    locations = selected.map((node) => ({
      country: node.cc.toUpperCase(),
      city: node.city,
      limit: 1,
      ...(input.preferred === true && node.preferredAsn
        ? { asn: node.preferredAsn }
        : {}),
    }));
  }
  // Actual probe availability is decided by Globalping, never fabricate fixed nodes.
  return upstream("https://api.globalping.io/v1/measurements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "ping",
      target: host,
      measurementOptions: { packets: 3 },
      locations,
      inProgressUpdates: true,
    }),
  });
}
export async function pingResult(id) {
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(id))
    throw new HttpError(400, "无效的测量 ID");
  return upstream(`https://api.globalping.io/v1/measurements/${id}`, {
    headers: { "Content-Type": "application/json" },
  });
}

export async function pingNodes() {
  const probes = await upstream(
    "https://api.globalping.io/v1/probes",
    {
      cf: { cacheTtl: 300, cacheEverything: true },
    },
    8_000_000,
  );
  const cities = new Map();
  const providers = new Map();
  const majorCloud =
    /amazon|google|microsoft|digitalocean|ovh|hetzner|akamai|linode|vultr|choopa|oracle|alibaba|aliyun|tencent|huawei/i;
  const chinaCarrier =
    /chinanet|china telecom|china unicom|china mobile|cmnet|china networks inter-exchange/i;
  for (const probe of probes) {
    const location = probe.location;
    if (!location?.country || !location.city) continue;
    const id = `${location.country}:${location.city}`;
    if (
      Number.isInteger(location.asn) &&
      typeof location.network === "string" &&
      (location.country === "CN" ? chinaCarrier : majorCloud).test(
        location.network,
      )
    ) {
      const key = `${id}:${location.asn}`;
      const provider = providers.get(key) ?? {
        cityId: id,
        asn: location.asn,
        network: location.network,
        count: 0,
      };
      provider.count++;
      providers.set(key, provider);
    }
    const existing = cities.get(id);
    if (existing) existing.probes++;
    else
      cities.set(id, {
        id,
        cc: location.country.toLowerCase(),
        continent: location.continent,
        city: location.city,
        name: location.country,
        probes: 1,
      });
  }
  for (const provider of providers.values()) {
    const city = cities.get(provider.cityId);
    if (
      !city.preferredAsn ||
      provider.count > city.preferredProbes ||
      (provider.count === city.preferredProbes &&
        provider.asn < city.preferredAsn)
    ) {
      city.preferredAsn = provider.asn;
      city.preferredNetwork = provider.network;
      city.preferredProbes = provider.count;
    }
  }
  return [...cities.values()].sort(
    (a, b) => a.cc.localeCompare(b.cc) || a.city.localeCompare(b.city),
  );
}
