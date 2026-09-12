import { t } from "@/i18n";
import { normalizePublicIp } from "@/lib/diagnostics";
import { endpoint, trace } from "@/lib/network";
import type { Geo, RtcResult } from "@/lib/types";

const DEFAULT_STUN_ENDPOINTS = [
  "stun:stun.l.google.com:19302",
  "stun:stun.cloudflare.com:3478",
  "stun:stun.l.google.com:443",
  "stun:stun.cloudflare.com:443",
] as const;
const customStun = import.meta.env?.VITE_WEBRTC_STUN_URL;
export const STUN_ENDPOINTS = [
  ...DEFAULT_STUN_ENDPOINTS,
  ...(typeof customStun === "string" && customStun.startsWith("stun:")
    ? [customStun]
    : []),
];

export function isPublicCandidate(ip: string): boolean {
  return Boolean(normalizePublicIp(ip));
}

function parseCandidate(candidate: RTCIceCandidate, endpointUrl: string) {
  const fields = candidate.candidate.trim().split(/\s+/);
  const ip = candidate.address ?? fields[4];
  if (!ip || ip.endsWith(".local")) return null;
  const type = candidate.type ?? fields[7];
  if (!["host", "srflx", "prflx", "relay"].includes(type ?? "")) return null;
  const normalized = normalizePublicIp(ip);
  const canonicalIp = normalized?.ip ?? ip;
  const port = candidate.port ?? Number(fields[5]);
  const protocol = candidate.protocol ?? fields[2];
  const relatedAddress = candidate.relatedAddress ?? fields[9];
  return {
    ip: canonicalIp,
    candidateType: type as RtcResult["candidateType"],
    type:
      type === "srflx" || type === "prflx"
        ? t("公网 (STUN)")
        : type === "relay"
          ? t("中继 (TURN)")
          : t("本地"),
    public: Boolean(normalized),
    endpoint: endpointUrl,
    port: Number.isFinite(port) ? port : undefined,
    protocol,
    relatedAddress,
    raw: candidate.candidate,
  } satisfies RtcResult;
}

async function collectEndpoint(
  stunUrl: string,
  signal: AbortSignal,
): Promise<RtcResult[]> {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: stunUrl }] });
  const found = new Map<string, RtcResult>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    const gathered = new Promise<void>((resolve, reject) => {
      abort = () => {
        pc.close();
        reject(new DOMException(t("已取消"), "AbortError"));
      };
      signal.addEventListener("abort", abort, { once: true });
      timer = setTimeout(resolve, 3000);
      pc.onicecandidate = ({ candidate }) => {
        if (!candidate) return resolve();
        const parsed = parseCandidate(candidate, stunUrl);
        if (parsed)
          found.set(
            `${parsed.ip}|${parsed.candidateType}|${parsed.port}|${parsed.protocol}`,
            parsed,
          );
      };
    });
    pc.createDataChannel("ip-diagnostic");
    await Promise.all([
      gathered,
      (async () => {
        signal.throwIfAborted();
        await pc.setLocalDescription(await pc.createOffer());
      })(),
    ]);
    signal.throwIfAborted();
    return [...found.values()];
  } finally {
    clearTimeout(timer);
    if (abort) signal.removeEventListener("abort", abort);
    pc.onicecandidate = null;
    pc.close();
  }
}

export async function collectCandidates(
  signal: AbortSignal,
  stunUrls: readonly string[] = STUN_ENDPOINTS,
): Promise<RtcResult[]> {
  if (typeof RTCPeerConnection === "undefined")
    throw new Error(t("当前浏览器不支持 WebRTC，无法完成检测。"));
  const batches = await Promise.all(
    stunUrls.map((url) =>
      collectEndpoint(url, signal).catch((error) => {
        if (signal.aborted) throw error;
        return [];
      }),
    ),
  );
  return batches.flat();
}

export async function runWebRtc(_: void, signal: AbortSignal) {
  const probeId = crypto.randomUUID();
  const [baseline, candidates] = await Promise.all([
    endpoint<Geo>("/me", { signal }).catch(() =>
      trace("1.1.1.1", signal).catch(() => null),
    ),
    collectCandidates(signal),
  ]);
  const results = await Promise.all(
    candidates.map(async (row) => {
      if (!row.public) return row;
      try {
        return {
          ...row,
          geo: await endpoint<Geo>(`/geoip/${encodeURIComponent(row.ip)}`, {
            signal,
          }),
        };
      } catch {
        return row;
      }
    }),
  );
  signal.throwIfAborted();
  const publicResults = results.filter(
    (row) =>
      row.public &&
      (row.candidateType === "srflx" || row.candidateType === "prflx"),
  );
  const publicIps = new Set(publicResults.map((row) => row.ip));
  const byEndpoint = new Map<string, Set<string>>();
  for (const row of publicResults) {
    const set = byEndpoint.get(row.endpoint ?? "unknown") ?? new Set<string>();
    set.add(row.ip);
    byEndpoint.set(row.endpoint ?? "unknown", set);
  }
  const endpointSets = [...byEndpoint.values()].map((set) =>
    [...set].sort().join(","),
  );
  const splitTunnel = new Set(endpointSets).size > 1;
  const report = await endpoint<{ httpIp?: string }>("/webrtc/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      probeId,
      baselineIp: baseline?.ip,
      candidates: results
        .filter(
          ({ candidateType }) =>
            candidateType === "srflx" || candidateType === "prflx",
        )
        .map(({ ip, candidateType, endpoint, port, protocol }) => ({
          ip,
          type: candidateType,
          endpoint,
          port,
          protocol,
        })),
    }),
    signal,
  }).catch(() => undefined);
  const effectiveBaseline = report?.httpIp ?? baseline?.ip;
  const effectiveLeakIps = [...publicIps].filter(
    (ip) => ip !== effectiveBaseline,
  );
  const udpBlocked = Boolean(
    effectiveBaseline && candidates.length > 0 && publicResults.length === 0,
  );
  const different = effectiveLeakIps.length > 0;
  const verdict = !effectiveBaseline
    ? t("已采集到 UDP 出口，但 HTTP 基准获取失败，无法判断是否一致。")
    : splitTunnel
      ? t("UDP 与 HTTPS 走了不同出口，可能存在分流或 WebRTC 泄漏。")
      : different
        ? t("发现与 HTTP 出口不同的 UDP 地址，请检查代理和 VPN 分流规则。")
        : udpBlocked
          ? t("HTTPS 正常但未发现公网 STUN 地址，UDP 可能已被阻断。")
          : publicResults.length === 0
            ? t("未采集到公网候选地址，不能据此判定安全。")
            : t("本次采样的公网 UDP 出口与 HTTP 出口一致。");
  return {
    baseline: report?.httpIp ? { ...baseline, ip: report.httpIp } : baseline,
    results,
    verdict,
    different,
    leakIps: effectiveLeakIps,
    splitTunnel,
    udpBlocked,
    probeId,
  };
}
