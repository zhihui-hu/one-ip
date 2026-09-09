import { t } from "@/i18n";
import { endpoint } from "@/lib/network";

export interface PingResponse {
  reusedAt?: number;
  id: string;
  status: string;
  target: string;
  results: {
    probe: { country: string; city: string; network: string };
    result: {
      status: string;
      stats?: { min: number; avg: number; max: number; loss: number };
      rawOutput?: string;
    };
  }[];
}
export type PingInput = {
  host: string;
  preferred?: boolean;
  nodes?: string[];
  regions?: string[];
  perRegion?: number;
};

async function runBatch(
  input: PingInput,
  signal: AbortSignal,
  onProgress?: (data: PingResponse) => void,
) {
  const created = await endpoint<{ id: string }>("/ping/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  for (let i = 0; i < 12; i++) {
    signal.throwIfAborted();
    const data = await endpoint<PingResponse>(
      `/ping/result/${encodeURIComponent(created.id)}`,
      { signal },
    );
    signal.throwIfAborted();
    onProgress?.(data);
    if (data.status === "finished") return data;
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException(t("已停止"), "AbortError"));
      };
      const timer = setTimeout(
        () => {
          signal.removeEventListener("abort", abort);
          resolve();
        },
        Math.min(2000 + i * 500, 5000),
      );
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
  throw new Error(t("部分节点尚未完成，可查看已返回结果或重新测试。"));
}

export interface PingNode {
  id: string;
  cc: string;
  city: string;
  name: string;
  probes?: number;
  continent?: string;
  preferredAsn?: number;
  preferredNetwork?: string;
  preferredProbes?: number;
}
export const getPingNodes = (signal: AbortSignal) =>
  endpoint<PingNode[]>("/ping/nodes", { signal });

const recentMeasurements = new Map<
  string,
  { time: number; data: PingResponse }
>();
const reuseWindow = 60_000;

export async function runPing(
  input: PingInput,
  signal: AbortSignal,
  onProgress?: (data: PingResponse) => void,
) {
  signal.throwIfAborted();
  const cacheKey = JSON.stringify({
    host: input.host.trim().toLowerCase(),
    nodes: input.nodes ? [...new Set(input.nodes)].sort() : undefined,
    regions: input.regions ? [...new Set(input.regions)].sort() : undefined,
    perRegion: input.perRegion,
    preferred: input.preferred === true,
  });
  const now = Date.now();
  for (const [key, entry] of recentMeasurements) {
    if (now - entry.time >= reuseWindow) recentMeasurements.delete(key);
  }
  const cached = recentMeasurements.get(cacheKey);
  if (cached) {
    const data = { ...cached.data, reusedAt: cached.time };
    onProgress?.(data);
    return data;
  }
  const batches: PingInput[] = input.nodes
    ? Array.from({ length: Math.ceil(input.nodes.length / 50) }, (_, i) => ({
        host: input.host,
        preferred: input.preferred,
        nodes: input.nodes!.slice(i * 50, i * 50 + 50),
      }))
    : [input];
  if (!batches.length) throw new Error(t("请选择至少一个地区"));
  let collected: PingResponse["results"] = [];
  let final: PingResponse | undefined;
  for (let index = 0; index < batches.length; index++) {
    signal.throwIfAborted();
    final = await runBatch(batches[index], signal, (data) =>
      onProgress?.({
        ...data,
        status: index === batches.length - 1 ? data.status : "in-progress",
        results: [...collected, ...data.results],
      }),
    );
    collected = [...collected, ...final.results];
  }
  const result = { ...final!, results: collected };
  if (result.status === "finished") {
    if (recentMeasurements.size >= 20)
      recentMeasurements.delete(recentMeasurements.keys().next().value!);
    recentMeasurements.set(cacheKey, { time: Date.now(), data: result });
  }
  return result;
}
