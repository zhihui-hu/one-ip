import { boundedJson, HttpError, upstream } from "./http.js";

const unavailable = () => new HttpError(502, "官方状态数据暂不可用");

async function pageText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw unavailable();
  return response.text();
}

export function parseDeepSeek(html) {
  // Read serialized data only; never execute scripts from the status page.
  for (const match of html.matchAll(
    /self\.__next_f\.push\((\[.*?\])\)<\/script>/g,
  )) {
    const chunk = JSON.parse(match[1])[1];
    if (typeof chunk !== "string" || !chunk.includes('"initialData"')) continue;
    for (const line of chunk.split("\n")) {
      const start = line.indexOf(":[");
      if (start < 0) continue;
      const props = JSON.parse(line.slice(start + 1))[3];
      const data = props?.initialData;
      if (
        !Array.isArray(data?.page?.components) ||
        !Array.isArray(data.active_changes)
      )
        continue;
      const active = data.active_changes.filter(
        (item) =>
          !["resolved", "completed", "cancelled", "scheduled"].includes(
            item.status,
          ),
      );
      const incidents = active.map((item) => ({
        id: String(item.change_id),
        name: item.title,
        status: item.status,
        updated_at: item.updated_at_seconds
          ? new Date(item.updated_at_seconds * 1000).toISOString()
          : undefined,
        shortlink: `https://status.deepseek.com/incidents/${item.change_id}`,
      }));
      return {
        status: {
          indicator: active.some((item) => item.type === "incident")
            ? "minor"
            : active.length
              ? "maintenance"
              : "none",
          description: active.length ? "存在服务故障或维护" : "正常运行",
        },
        incidents,
      };
    }
  }
  throw unavailable();
}

export function parseGemini(data) {
  const rows = data?.[0]?.[0];
  if (!Array.isArray(rows)) throw unavailable();
  const incidents = [];
  for (const row of rows) {
    if (
      !Array.isArray(row) ||
      typeof row[0] !== "string" ||
      !Array.isArray(row[3]) ||
      !row[3].length
    )
      throw unavailable();
    const updates = [...row[3]].sort(
      (a, b) => Number(b[2]?.[0]) - Number(a[2]?.[0]),
    );
    const latest = updates[0];
    if (
      ![1, 2, 3, 4, 5].includes(latest[0]) ||
      !Number.isFinite(Number(latest[2]?.[0]))
    )
      throw unavailable();
    if (latest[0] === 4) continue;
    incidents.push({
      id: row[0],
      name: row[1],
      status: latest[0] === 1 ? "investigating" : "monitoring",
      updated_at: new Date(Number(latest[2][0]) * 1000).toISOString(),
      shortlink: "https://aistudio.google.com/status",
    });
  }
  return {
    status: {
      indicator: incidents.length ? "minor" : "none",
      description: incidents.length ? "存在服务故障" : "正常运行",
    },
    incidents,
  };
}

export async function getAiStatus(service) {
  if (service.id === "32") {
    let html;
    try {
      html = await pageText(service.url);
    } catch {
      throw new HttpError(
        502,
        "DeepSeek 官方状态页连接失败，请稍后重试或查看官方页面。",
      );
    }
    try {
      return parseDeepSeek(html);
    } catch {
      throw new HttpError(
        502,
        "DeepSeek 官方状态数据解析失败，请查看官方页面。",
      );
    }
  }
  if (service.id === "31") {
    const html = await pageText(service.page);
    // Public application identifiers shipped by AI Studio, not visitor credentials.
    const keys = [...new Set(html.match(/AIza[\w-]+/g) ?? [])];
    for (const key of keys) {
      const response = await fetch(service.url, {
        method: "POST",
        body: "[]",
        signal: AbortSignal.timeout(10_000),
        headers: {
          "Content-Type": "application/json+protobuf",
          "X-Goog-Api-Key": key,
          Referer: "https://aistudio.google.com/",
        },
      });
      if (!response.ok) {
        await response.body?.cancel();
        continue;
      }
      return parseGemini(await boundedJson(response));
    }
    throw unavailable();
  }
  return upstream(service.url);
}
