import { endpoint } from "@/lib/network";

export interface PingResponse {
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
export async function runPing(
  input: { host: string; nodes: string[] },
  signal: AbortSignal,
) {
  const created = await endpoint<{ id: string }>("/ping/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  for (let i = 0; i < 30; i++) {
    signal.throwIfAborted();
    const data = await endpoint<PingResponse>(
      `/ping/result/${encodeURIComponent(created.id)}`,
      { signal },
    );
    if (data.status === "finished") return data;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error("全球探测仍未完成，请稍后重试；本次没有生成延迟结果。");
}
