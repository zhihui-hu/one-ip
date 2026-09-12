import { HttpError, upstream } from "./http.js";

const unavailable = () => new HttpError(502, "官方状态数据暂不可用");
const summary = (indicator, description, incidents) => ({
  status: { indicator, description },
  ...(incidents ? { incidents } : {}),
});

export function parseDmit(data) {
  const states = {
    operational: "none",
    degraded: "minor",
    partial_outage: "minor",
    major_outage: "major",
    maintenance: "maintenance",
    under_maintenance: "maintenance",
  };
  if (!states[data?.status] || !Array.isArray(data.services))
    throw unavailable();
  return {
    ...summary(states[data.status], data.status),
    components: data.services.map((service) => ({
      id: service.slug,
      name: `${service.group} / ${service.name}`,
      status:
        service.status === "degraded" ? "degraded_performance" : service.status,
    })),
  };
}

export function parseGoogleCloud(data) {
  if (
    !Array.isArray(data) ||
    data.some(
      (item) =>
        !item?.id || !item.begin || typeof item.external_desc !== "string",
    )
  )
    throw unavailable();
  const active = data.filter((item) => !item.end);
  return summary(
    active.some((item) => item.severity === "high")
      ? "major"
      : active.length
        ? "minor"
        : "none",
    active.length ? "存在服务故障" : "正常运行",
    active.map((item) => ({
      id: item.id,
      name: item.external_desc,
      status: item.most_recent_update?.status ?? "investigating",
      updated_at: item.modified ?? item.begin,
      shortlink: `https://status.cloud.google.com/incidents/${encodeURIComponent(item.id)}`,
    })),
  );
}

export function parseAws(data) {
  if (
    !Array.isArray(data) ||
    data.some(
      (item) =>
        !item?.arn || !["0", "1", "2", "3"].includes(String(item.status)),
    )
  )
    throw unavailable();
  const active = data.filter((item) => String(item.status) !== "0");
  return summary(
    active.some((item) => String(item.status) === "3")
      ? "major"
      : active.length
        ? "minor"
        : "none",
    active.length ? "存在服务故障" : "正常运行",
    active.map((item) => ({
      id: item.arn,
      name: `${item.service_name} (${item.region_name}) — ${item.summary}`,
      status: { 1: "Impacted", 2: "Degraded", 3: "Disrupted" }[item.status],
      updated_at: new Date(
        Math.max(
          Number(item.date),
          ...(item.event_log ?? []).map((update) => Number(update.timestamp)),
        ) * 1000,
      ).toISOString(),
      shortlink: "https://health.aws.amazon.com/health/status",
    })),
  );
}

export function parseBandwagon(html) {
  if (!html.includes("<title>BandwagonHost Status</title>"))
    throw unavailable();
  const label = html
    .match(/<span\s+class="summary\s+summary-[\w-]+"\s*>([^<]+)<\/span>/)?.[1]
    .trim();
  const description = html.match(/<h1>([^<]+)<\/h1>/)?.[1].trim();
  if (!label || !description) throw unavailable();
  if (label === "Operational" && description === "All systems operational")
    return summary(
      "none",
      description,
      /class="empty">No incidents in the last \d+ days\.<\/p>/.test(html)
        ? []
        : undefined,
    );
  if (/maintenance/i.test(label)) return summary("maintenance", description);
  if (/outage|disruption|degraded|incident/i.test(label))
    return summary("minor", description);
  throw unavailable();
}

const isoTime = (value) => {
  if (value == null || value === "") return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
};

export function parseAliyun(data) {
  if (data?.success !== true || data.code !== 200 || !Array.isArray(data.data))
    throw unavailable();
  if (
    data.data.some(
      (item) =>
        item?.id == null ||
        typeof item.title !== "string" ||
        !["ALARM", "NOTIFICATION", "NORMAL"].includes(item.eventType),
    )
  )
    throw unavailable();
  const active = data.data.filter(
    (item) => !item.endTime && item.eventType !== "NORMAL",
  );
  return summary(
    active.some((item) => item.eventType === "ALARM")
      ? "major"
      : active.length
        ? "minor"
        : "none",
    active.length ? "存在服务故障或提示" : "正常运行",
    active.map((item) => ({
      id: String(item.id),
      name: item.title,
      status: item.eventType,
      updated_at: isoTime(item.lastUpdateTime ?? item.startTime),
      shortlink: `https://status.aliyun.com/#/eventDetail?eventId=${encodeURIComponent(item.id)}`,
    })),
  );
}

function tencentData(data) {
  if (data?.Response?.Error || !data?.Response?.Data) throw unavailable();
  return data.Response.Data;
}

export function tencentRegions(data) {
  const areas = tencentData(data).AreaDetailList;
  if (
    !Array.isArray(areas) ||
    !areas.length ||
    areas.some((area) => !Array.isArray(area?.RegionList))
  )
    throw unavailable();
  const regions = areas.flatMap((area) => area.RegionList);
  if (
    !regions.length ||
    regions.some(
      (region) =>
        typeof region?.RegionId !== "string" ||
        typeof region.RegionName !== "string" ||
        typeof region.EventsIn !== "boolean",
    )
  )
    throw unavailable();
  return regions;
}

export function parseTencentProducts(data, region) {
  const categories = tencentData(data).CategoryList;
  if (
    !Array.isArray(categories) ||
    !categories.length ||
    categories.some((category) => !Array.isArray(category?.ProductList))
  )
    throw unavailable();
  const products = categories.flatMap((category) => category.ProductList);
  if (
    !products.length ||
    products.some(
      (product) =>
        !["NORMAL", "NOTIFY", "ABNORMAL"].includes(product?.CurrentStatus),
    )
  )
    throw unavailable();
  return products
    .filter((product) => product.CurrentStatus !== "NORMAL")
    .map((product) => ({
      id: `${region.RegionId}/${product.ProductId}`,
      name: `${region.RegionName} / ${product.ProductName}`,
      status: product.CurrentStatus,
      shortlink: `https://status.tencentcloud.com/?region=${encodeURIComponent(region.RegionId)}`,
    }));
}

export function parseTencentBanner(data) {
  const banner = tencentData(data);
  if (
    typeof banner.IsShow !== "boolean" ||
    !["NORMAL", "NOTIFY", "ABNORMAL"].includes(banner.Status)
  )
    throw unavailable();
  if (!banner.IsShow || banner.Status === "NORMAL") return [];
  if (banner.Id == null || typeof banner.Desc !== "string") throw unavailable();
  return [
    {
      id: `notice/${banner.Id}`,
      name: banner.Title || banner.Desc,
      status: banner.Status,
      shortlink: "https://status.tencentcloud.com/",
    },
  ];
}

const TENCENT_DETAIL_CONCURRENCY = 4;
const tencentDetailQueue = [];
let activeTencentDetails = 0;

function drainTencentDetails() {
  while (
    activeTencentDetails < TENCENT_DETAIL_CONCURRENCY &&
    tencentDetailQueue.length
  ) {
    const request = tencentDetailQueue.shift();
    activeTencentDetails += 1;
    Promise.resolve()
      .then(request.task)
      .then(request.resolve, request.reject)
      .finally(() => {
        activeTencentDetails -= 1;
        drainTencentDetails();
      });
  }
}

function withTencentDetailLimit(task) {
  return new Promise((resolve, reject) => {
    tencentDetailQueue.push({ task, resolve, reject });
    drainTencentDetails();
  });
}

async function tencentStatus(url) {
  const [regionData, bannerData] = await Promise.all([
    upstream(url),
    upstream(
      "https://status.tencentcloud.com/v1/api/status/DescribeHappening?BelongSite=1",
    ),
  ]);
  const regions = tencentRegions(regionData);
  const date = new Date().toISOString().slice(0, 10);
  const affected = regions.filter((region) => region.EventsIn);
  const details = await Promise.all(
    affected.map((region) =>
      withTencentDetailLimit(async () => {
        const query = new URLSearchParams({
          BelongSite: "1",
          RegionId: region.RegionId,
          NumOfDay: "1",
          EndDate: date,
        });
        return parseTencentProducts(
          await upstream(
            `https://status.tencentcloud.com/v1/api/status/DescribeProductEventForRegionInPeriod?${query}`,
          ),
          region,
        );
      }),
    ),
  );
  const incidents = [...parseTencentBanner(bannerData), ...details.flat()];
  return {
    ...summary(
      incidents.some((item) => item.status === "ABNORMAL")
        ? "major"
        : incidents.length
          ? "minor"
          : "none",
      incidents.length ? "存在服务故障或提示" : "正常运行",
      incidents,
    ),
    components: regions.map((region) => ({
      id: region.RegionId,
      name: region.RegionName,
      status: incidents.some((item) =>
        item.id.startsWith(`${region.RegionId}/`),
      )
        ? "degraded_performance"
        : "operational",
    })),
  };
}

const plainText = (html) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(
      /&(?:nbsp|amp|lt|gt|quot|#39);/g,
      (entity) =>
        ({
          "&nbsp;": " ",
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&quot;": '"',
          "&#39;": "'",
        })[entity],
    )
    .replace(/\s+/g, " ")
    .trim();

export function parseAzure(html) {
  const table = html.match(
    /<table\b[^>]*data-zone-name="current-impact"[^>]*>([\s\S]*?)<\/table>/,
  )?.[1];
  if (!table) throw unavailable();
  const rows = [
    ...table.matchAll(
      /<tr\b[^>]*class="current-incident"[^>]*>([\s\S]*?)<\/tr>/g,
    ),
  ].map((match) => match[1]);
  if (!rows.length) throw unavailable();
  const active = rows.filter(
    (row) =>
      !(
        /class="bg-green"/.test(row) &&
        plainText(row).startsWith("There are currently no active events.")
      ),
  );
  if (active.some((row) => !plainText(row) || !/<td\b/.test(row)))
    throw unavailable();
  return summary(
    active.length ? "major" : "none",
    active.length ? "存在公开服务事件" : "未报告广泛影响的事件",
    active.map((row, index) => ({
      id: `azure-current-${index}`,
      name: plainText(row).slice(0, 500),
      status: "investigating",
      shortlink: "https://azure.status.microsoft/en-us/status/",
    })),
  );
}

// AWS serves UTF-16 JSON; BandwagonHost currently exposes a small HTML summary.
async function sourceText(url, maxBytes = 2_000_000) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    redirect: "manual",
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new HttpError(
      response.status === 429 ? 429 : 502,
      "官方状态数据暂不可用",
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw unavailable();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw unavailable();
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const encoding =
    bytes[0] === 0xfe && bytes[1] === 0xff
      ? "utf-16be"
      : bytes[0] === 0xff && bytes[1] === 0xfe
        ? "utf-16le"
        : "utf-8";
  return new TextDecoder(encoding).decode(bytes);
}

export function parseQwenStatus(catalog, current) {
  if (
    catalog?.success !== true ||
    !Array.isArray(catalog.data) ||
    !catalog.data.some((group) =>
      group.productList?.some((product) => product.productId === "sfm"),
    ) ||
    current?.success !== true ||
    !Array.isArray(current.data) ||
    current.data.length !== 1
  )
    throw unavailable();
  const { productStatus, eventDetails } = current.data[0] ?? {};
  if (
    !productStatus ||
    typeof productStatus !== "object" ||
    Array.isArray(productStatus) ||
    !eventDetails ||
    typeof eventDetails !== "object" ||
    Array.isArray(eventDetails)
  )
    throw unavailable();
  const refs = productStatus.sfm ?? [];
  if (!Array.isArray(refs)) throw unavailable();
  const events = refs.map((ref) => {
    const event = eventDetails[ref.eventId];
    if (!event) throw unavailable();
    return event;
  });
  const result = parseAliyun({ success: true, code: 200, data: events });
  return {
    ...result,
    components: [
      {
        id: "sfm",
        name: "大模型服务平台百炼",
        status:
          result.status.indicator === "none"
            ? "operational"
            : result.status.indicator === "major"
              ? "major_outage"
              : "degraded_performance",
      },
    ],
  };
}

export async function getCloudStatus(service) {
  if (service.id === "34") {
    const [catalog, current] = await Promise.all([
      upstream(
        "https://status.aliyun.com/api/status/listProductForAllTypeInRegion?regionId=non-regional",
      ),
      upstream(service.url),
    ]);
    return parseQwenStatus(catalog, current);
  }
  if (service.id === "aliyun") return parseAliyun(await upstream(service.url));
  if (service.id === "tencent-cloud") return tencentStatus(service.url);
  if (service.id === "azure")
    return parseAzure(await sourceText(service.url, 8_000_000));
  if (service.id === "dmit") return parseDmit(await upstream(service.url));
  if (service.id === "bandwagonhost")
    return parseBandwagon(await sourceText(service.url));
  if (service.id === "google-cloud")
    return parseGoogleCloud(await upstream(service.url));
  if (service.id === "aws")
    return parseAws(JSON.parse(await sourceText(service.url)));
  return upstream(service.url);
}
