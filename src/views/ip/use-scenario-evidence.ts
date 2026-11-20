import { useEffect, useRef, useState } from "react";
import { HttpRequestError } from "@/lib/network";
import { runPing } from "@/views/ping/api";
import {
  AIM_VERSION,
  EVIDENCE_TTL,
  sameIp,
  summarizeHttp,
  type Evidence,
} from "./scenario-evidence";
import { measurePlatform, measureQuality } from "./scenario-probes";
import type { ScenarioTarget } from "./scenario-targets";

const cache = new Map<string, Evidence>();
export function useScenarioEvidence(ip: string) {
  const prefix = `${ip}|`;
  const [records, setRecords] = useState<Record<string, Evidence>>(() =>
    Object.fromEntries(
      [...cache]
        .filter(
          ([key, value]) =>
            key.startsWith(prefix) && value.expiresAt > Date.now(),
        )
        .map(([key, value]) => [key.slice(prefix.length), value]),
    ),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 5000);
    const invalidate = () => {
      controller.current?.abort();
      cache.clear();
      setRecords({});
      setBusy(null);
    };
    const connection = (navigator as Navigator & { connection?: EventTarget })
      .connection;
    window.addEventListener("online", invalidate);
    connection?.addEventListener("change", invalidate);
    return () => {
      clearInterval(tick);
      controller.current?.abort();
      controller.current = null;
      window.removeEventListener("online", invalidate);
      connection?.removeEventListener("change", invalidate);
    };
  }, [ip]);
  const cancel = () => {
    controller.current?.abort();
    if (busy)
      setRecords((previous) =>
        previous[busy]
          ? { ...previous, [busy]: { ...previous[busy], state: "cancelled" } }
          : previous,
      );
    setBusy(null);
  };
  const run = async (key: string, target?: ScenarioTarget) => {
    if (controller.current && !controller.current.signal.aborted)
      controller.current.abort();
    const control = new AbortController();
    controller.current = control;
    const startedAt = Date.now();
    const initial: Evidence = {
      kind:
        key === "quality" ? "quality" : key === "https" ? "inbound" : "http",
      queriedIp: ip,
      target: target?.url ?? (key === "quality" ? "speed.cloudflare.com" : ip),
      source:
        key === "https"
          ? "ipbot"
          : key === "quality"
            ? AIM_VERSION
            : "Browser Fetch",
      direction: key === "https" ? "probe-inbound" : "browser-outbound",
      protocol: "HTTPS",
      addressFamily: ip.includes(":") ? "IPv6" : "IPv4",
      startedAt,
      checkedAt: startedAt,
      expiresAt: startedAt + EVIDENCE_TTL,
      state: "running",
      samples: [],
    };
    const update = (value: Evidence) => {
      if (!control.signal.aborted)
        setRecords((previous) => ({ ...previous, [key]: value }));
    };
    setBusy(key);
    update(initial);
    try {
      let result: Evidence;
      if (key === "quality")
        result = await measureQuality(ip, control.signal, update);
      else if (key === "https") {
        const measured = await runPing(
          {
            host: ip,
            protocol: "https",
            regions: ["AS", "EU", "NA"],
            perRegion: 1,
          },
          control.signal,
        );
        const samples = measured.results.map(({ result }) => ({
          elapsedMs: result.timings?.total ?? 0,
          status: result.statusCode,
          outcome:
            result.statusCode === 429
              ? ("rate-limited" as const)
              : result.statusCode &&
                  result.statusCode >= 200 &&
                  result.statusCode < 400
                ? ("readable" as const)
                : result.statusCode && result.statusCode >= 400
                  ? ("refused" as const)
                  : ("unknown" as const),
        }));
        const mismatch =
          !sameIp(measured.target, ip) ||
          measured.results.some(
            (row) =>
              row.result.resolvedAddress &&
              !sameIp(row.result.resolvedAddress, ip),
          );
        const checkedAt = measured.reusedAt ?? Date.now();
        result = {
          ...initial,
          samples,
          checkedAt,
          expiresAt: checkedAt + EVIDENCE_TTL,
          state: mismatch ? "mismatch" : summarizeHttp(samples),
        };
      } else
        result = await measurePlatform(ip, target!, control.signal, update);
      control.signal.throwIfAborted();
      update(result);
      if (cache.size >= 50) cache.delete(cache.keys().next().value!);
      cache.set(prefix + key, result);
    } catch (error) {
      if (!control.signal.aborted)
        update({
          ...initial,
          checkedAt: Date.now(),
          state:
            error instanceof HttpRequestError && error.status === 429
              ? "rate-limited"
              : "unverifiable",
        });
    } finally {
      if (controller.current === control) {
        setBusy(null);
        controller.current = null;
      }
    }
  };
  return { records, busy, now, run, cancel };
}
