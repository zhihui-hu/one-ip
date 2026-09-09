import { HttpError, target, upstream } from "./http.js";
import nodes from "./nodes.json";

function headers(env) {
  return {
    "Content-Type": "application/json",
    ...(env.GLOBALPING_TOKEN
      ? { Authorization: `Bearer ${env.GLOBALPING_TOKEN}` }
      : {}),
  };
}
export async function startPing(input, env) {
  const host = target(input.host);
  if (
    !Array.isArray(input.nodes) ||
    input.nodes.length < 1 ||
    input.nodes.length > 20
  )
    throw new HttpError(400, "请选择 1–20 个节点");
  const selected = [...new Set(input.nodes)].map((id) =>
    nodes.find((n) => n.id === id),
  );
  if (selected.some((n) => !n)) throw new HttpError(400, "无效的探测节点");
  // Actual probe availability is decided by Globalping, never fabricate fixed nodes.
  return upstream("https://api.globalping.io/v1/measurements", {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify({
      type: "ping",
      target: host,
      measurementOptions: { packets: 3 },
      locations: selected.map((n) => ({
        country: n.cc.toUpperCase(),
        city: n.city,
        limit: 1,
      })),
      limit: selected.length,
    }),
  });
}
export async function pingResult(id, env) {
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(id))
    throw new HttpError(400, "无效的测量 ID");
  return upstream(`https://api.globalping.io/v1/measurements/${id}`, {
    headers: headers(env),
  });
}
