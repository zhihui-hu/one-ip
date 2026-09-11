import { probe } from "@/lib/network";

export { probe };
export interface ProbeResult {
  samples: number[];
  median: number | null;
}
export async function testConnectivity(
  url: string,
  signal?: AbortSignal,
  onProgress?: (result: ProbeResult) => void,
): Promise<ProbeResult> {
  const samples: number[] = [];
  let consecutiveFailures = 0;
  onProgress?.(summarize(samples));
  for (let i = 0; i < 8; i++) {
    signal?.throwIfAborted();
    const latency = await probe(url, signal);
    samples.push(latency);
    consecutiveFailures = latency < 0 ? consecutiveFailures + 1 : 0;
    signal?.throwIfAborted();
    onProgress?.(summarize(samples));
    if (consecutiveFailures >= 2) break;
  }
  return summarize(samples);
}

function summarize(samples: number[]): ProbeResult {
  const successful = samples.filter((ms) => ms >= 0).sort((a, b) => a - b);
  const middle = Math.floor(successful.length / 2);
  return {
    samples: [...samples],
    median: successful.length
      ? Math.round(
          successful.length % 2
            ? successful[middle]
            : (successful[middle - 1] + successful[middle]) / 2,
        )
      : null,
  };
}
