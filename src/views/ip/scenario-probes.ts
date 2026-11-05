import { parseTrace, request } from "@/lib/network";
import {
  AIM_VERSION,
  ACCESS_VERSION,
  canonicalIp,
  EVIDENCE_TTL,
  sameIp,
  summarizeHttp,
  type Evidence,
  type HttpSample,
} from "./scenario-evidence.ts";
import type { ScenarioTarget } from "./scenario-targets";

function base(ip: string, target: string, kind: Evidence["kind"]): Evidence {
  const now = Date.now();
  return {
    kind,
    queriedIp: ip,
    target,
    source: kind === "quality" ? AIM_VERSION : "Browser Fetch",
    direction: "browser-outbound",
    protocol: "HTTPS",
    addressFamily: ip.includes(":") ? "IPv6" : "IPv4",
    startedAt: now,
    checkedAt: now,
    expiresAt: now + EVIDENCE_TTL,
    state: "running",
    samples: [],
  };
}
async function egress(
  origin: string,
  signal: AbortSignal,
): Promise<string | undefined> {
  try {
    const response = await request<Response>(
      `${origin}/cdn-cgi/trace`,
      {
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]),
      },
      "raw",
    );
    if (!response.ok || new URL(response.url).origin !== origin) return;
    return parseTrace(await response.text()).ip;
  } catch {
    signal.throwIfAborted();
    return;
  }
}
export const ACCESS_BUDGET_MS = 20_000;
const ACCESS_REQUEST_MS = 1500;

// A shared queue gives every target its first sample before repeating fast targets.
export async function measurePlatforms(
  ip: string,
  targets: ScenarioTarget[],
  signal: AbortSignal,
  progress: (target: ScenarioTarget, value: Evidence) => void,
): Promise<Record<string, Evidence>> {
  signal.throwIfAborted();
  const deadline = AbortSignal.timeout(ACCESS_BUDGET_MS);
  const batchSignal = AbortSignal.any([signal, deadline]);
  const unique = [
    ...new Map(targets.map((target) => [target.url, target])).values(),
  ];
  const jobs = unique.map((target) => ({
    target,
    mode: (target.trace || target.readable ? "cors" : "no-cors") as RequestMode,
    failures: 0,
    result: {
      ...base(ip, target.url, "http"),
      addressFamily: "unknown",
      ruleVersion: ACCESS_VERSION,
    } as Evidence,
  }));
  const queue = [...jobs];
  const publish = (job: (typeof jobs)[number]) => {
    job.result.checkedAt = Date.now();
    job.result.expiresAt = job.result.checkedAt + EVIDENCE_TTL;
    progress(job.target, { ...job.result, samples: [...job.result.samples] });
  };
  jobs.forEach(publish);
  await Promise.all(
    Array.from({ length: Math.min(8, jobs.length) }, async () => {
      while (queue.length && !batchSignal.aborted) {
        const job = queue.shift()!;
        const start = performance.now();
        const requestSignal = AbortSignal.any([
          batchSignal,
          AbortSignal.timeout(ACCESS_REQUEST_MS),
        ]);
        let sample: HttpSample;
        try {
          const response = await request<Response>(
            job.target.url,
            {
              mode: job.mode,
              credentials: "omit",
              cache: "no-store",
              signal: requestSignal,
            },
            "raw",
          );
          const elapsedMs = Math.round(performance.now() - start);
          sample = {
            elapsedMs,
            ...(response.type !== "opaque" ? { status: response.status } : {}),
            outcome:
              response.type === "opaque"
                ? "opaque"
                : response.status === 429
                  ? "rate-limited"
                  : response.ok
                    ? "readable"
                    : "refused",
          };
          if (
            job.target.trace &&
            response.ok &&
            response.type !== "opaque" &&
            new URL(response.url).origin === new URL(job.target.url).origin
          ) {
            const trace = await response.text();
            const exit = trace.match(/^ip=(.+)$/m)?.[1]?.trim();
            if (canonicalIp(exit)) {
              sample.observedIp = exit;
              if (!job.result.egressBefore) job.result.egressBefore = exit;
              else {
                if (!sameIp(job.result.egressBefore, exit))
                  job.result.routeChanged = true;
                job.result.egressAfter = exit;
              }
              job.result.addressFamily = exit!.includes(":") ? "IPv6" : "IPv4";
            }
          } else {
            await response.body?.cancel();
          }
        } catch {
          if (batchSignal.aborted) break;
          sample = {
            elapsedMs: Math.round(performance.now() - start),
            outcome: "unknown",
            error: requestSignal.aborted ? "timeout" : "network",
          };
          // Discover a browser restriction once, never double every request.
          if (job.mode === "cors" && !requestSignal.aborted)
            job.mode = "no-cors";
        }
        if (batchSignal.aborted) break;
        job.result.samples.push(sample);
        job.failures = sample.outcome === "unknown" ? job.failures + 1 : 0;
        const finished =
          job.result.samples.length >= 8 ||
          job.failures >= 2 ||
          sample.outcome === "rate-limited" ||
          sample.outcome === "refused";
        job.result.state = finished
          ? summarizeHttp(job.result.samples)
          : "running";
        if (sample.outcome === "refused") job.result.state = "failed";
        publish(job);
        if (!finished) queue.push(job);
      }
    }),
  );
  signal.throwIfAborted();
  for (const job of jobs) {
    if (job.result.state === "running") {
      job.result.state = summarizeHttp(job.result.samples);
      job.result.incomplete = true;
      publish(job);
    }
  }
  return Object.fromEntries(jobs.map((job) => [job.target.url, job.result]));
}

export async function measurePlatform(
  ip: string,
  target: ScenarioTarget,
  signal: AbortSignal,
  progress: (value: Evidence) => void,
): Promise<Evidence> {
  const result = await measurePlatforms(ip, [target], signal, (_, value) =>
    progress(value),
  );
  return result[target.url];
}

export async function measureQuality(
  ip: string,
  signal: AbortSignal,
  progress: (value: Evidence) => void,
): Promise<Evidence> {
  const evidence = base(ip, "speed.cloudflare.com", "quality");
  evidence.ruleVersion = AIM_VERSION;
  evidence.egressBefore = await egress("https://speed.cloudflare.com", signal);
  if (evidence.egressBefore && !sameIp(evidence.egressBefore, ip))
    return { ...evidence, state: "mismatch" };
  const { default: SpeedTest } = await import("@cloudflare/speedtest");
  signal.throwIfAborted();
  const turnUri = import.meta.env.VITE_SPEEDTEST_TURN_URI?.trim();
  const credentialsUrl =
    import.meta.env.VITE_SPEEDTEST_TURN_CREDENTIALS_URL?.trim();
  const turnConfigured = Boolean(turnUri && credentialsUrl);
  const engine = new SpeedTest({
    autoStart: false,
    logMeasurementApiUrl: null,
    logAimApiUrl: null,
    includeCredentials: false,
    ...(turnConfigured
      ? { turnServerUri: turnUri, turnServerCredsApiUrl: credentialsUrl }
      : {}),
    measurements: [
      { type: "latency", numPackets: 20 },
      ...(["download", "upload"] as const).flatMap((type) =>
        [100_000, 1_000_000, 10_000_000].map((bytes) => ({
          type,
          bytes,
          count: 3,
        })),
      ),
      ...(turnConfigured
        ? [
            {
              type: "packetLoss" as const,
              numPackets: 100,
              batchSize: 10,
              batchWaitTime: 10,
              responsesWaitTime: 3000,
              connectionTimeout: 5000,
            },
          ]
        : []),
    ],
    bandwidthAbortRequestDuration: 10_000,
  });
  evidence.protocol = turnConfigured ? "HTTPS + WebRTC/UDP" : "HTTPS";
  const snapshot = (): Evidence => {
    const result = engine.results;
    const packet = result.getPacketLossDetails();
    return {
      ...evidence,
      metrics: result.getSummary(),
      raw: {
        latency: [...result.getUnloadedLatencyPoints()],
        downLoaded: [...result.getDownLoadedLatencyPoints()],
        upLoaded: [...result.getUpLoadedLatencyPoints()],
        download: result.getDownloadBandwidthPoints().map((point) => point.bps),
        upload: result.getUploadBandwidthPoints().map((point) => point.bps),
        ...("numMessagesSent" in (packet ?? {})
          ? {
              packetsSent: (packet as { numMessagesSent: number })
                .numMessagesSent,
              packetsLost: (packet as { lostMessages: number[] }).lostMessages,
            }
          : {}),
      },
      aimScores: engine.isFinished ? result.getScores() : undefined,
    };
  };
  const measured = await new Promise<Evidence>((resolve, reject) => {
    let done = false;
    const settle = (value?: Evidence, error?: unknown) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      engine.onResultsChange = () => {};
      engine.onError = () => {};
      engine.pause();
      if (error) reject(error);
      else resolve(value!);
    };
    const abort = () =>
      settle(
        undefined,
        signal.reason ?? new DOMException("Aborted", "AbortError"),
      );
    const timer = setTimeout(
      () => settle({ ...snapshot(), state: "partial", incomplete: true }),
      120_000,
    );
    engine.onResultsChange = () => {
      if (!done) progress(snapshot());
    };
    engine.onError = () => {
      evidence.incomplete = true;
    };
    engine.onFinish = () => settle({ ...snapshot(), state: "complete" });
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    else engine.play();
  });
  measured.egressAfter = await egress("https://speed.cloudflare.com", signal);
  measured.checkedAt = Date.now();
  measured.expiresAt = measured.checkedAt + EVIDENCE_TTL;
  return measured;
}
