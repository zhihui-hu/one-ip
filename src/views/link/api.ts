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
  onProgress?.(summarize(samples));
  for (let i = 0; i < 8; i++) {
    signal?.throwIfAborted();
    samples.push(await probe(url, signal));
    signal?.throwIfAborted();
    onProgress?.(summarize(samples));
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
