import { t } from "@/i18n";
import { normalizeIp, sameIp } from "@/lib/ip-address";
import { endpoint, trace } from "@/lib/network";
import type { Geo, RtcResult } from "@/lib/types";

export function isPublicCandidate(ip: string) {
  const address = normalizeIp(ip);
  if (!address) return false;
  if (address.includes(":")) {
    const s = address;
    if (s.startsWith("::ffff:")) {
      const [high, low] = s
        .slice(7)
        .split(":")
        .map((part) => parseInt(part, 16));
      return isPublicCandidate(
        `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`,
      );
    }
    return (
      /^[\da-f:]+$/i.test(s) &&
      !["::", "::1"].includes(s) &&
      !/^(f[cd]|fe[89ab]|ff)/i.test(s)
    );
  }
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  )
    return false;
  const [a, b] = parts;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  );
}
export async function collectCandidates(
  signal: AbortSignal,
): Promise<RtcResult[]> {
  if (typeof RTCPeerConnection === "undefined")
    throw new Error(t("webrtc.browserDoesSupportWebrtcSoCheckCannotRun"));
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  });
  const found = new Map<string, RtcResult>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: () => void = () => {};
  try {
    const gathered = new Promise<void>((resolve, reject) => {
      abort = () => {
        pc.close();
        reject(new DOMException(t("common.cancelled"), "AbortError"));
      };
      signal.addEventListener("abort", abort, { once: true });
      timer = setTimeout(resolve, 7000);
      pc.onicecandidate = ({ candidate }) => {
        if (!candidate) {
          resolve();
          return;
        }
        const ip = candidate.address ?? candidate.candidate.split(" ")[4];
        if (!ip || ip.endsWith(".local")) return;
        const type = candidate.type ?? candidate.candidate.split(" ")[7];
        found.set(ip, {
          ip,
          type:
            type === "srflx"
              ? t("webrtc.publicStun")
              : type === "relay"
                ? t("webrtc.relayTurn")
                : t("webrtc.local"),
          public: isPublicCandidate(ip),
        });
      };
    });
    pc.createDataChannel("ip-diagnostic");
    // Keep offer errors attached to the same promise chain as abort events.
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
    signal.removeEventListener("abort", abort);
    pc.onicecandidate = null;
    pc.close();
  }
}
export async function runWebRtc(_: void, signal: AbortSignal) {
  const [baseline, candidates] = await Promise.all([
    trace("1.1.1.1", signal).catch(() => null),
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
  const different = results.some(
    (row) => row.public && baseline && !sameIp(row.ip, baseline.ip),
  );
  const verdict = !results.some((row) => row.public)
    ? t("webrtc.publicCandidateAddressCollectedBrowserRestrictionsUdpBlocking")
    : !baseline
      ? t("webrtc.udpEgressCollectedButHttpBaselineFailedCannot")
      : different
        ? t("webrtc.udpAddressDiffersHttpEgressCheckProxyRouting")
        : t("webrtc.theSampledPublicUdpEgressMatchesHttpEgress");
  return { baseline, results, verdict, different };
}
