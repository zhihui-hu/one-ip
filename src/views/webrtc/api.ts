import { t } from "@/i18n";
import { detectHttpEgress, egressAddresses } from "@/lib/http-egress";
import { normalizeIp, sameIp } from "@/lib/ip-address";
import { endpoint } from "@/lib/network";
import type { Geo, RtcCandidateKind, RtcResult } from "@/lib/types";

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
export interface ParsedCandidate {
  protocol: string;
  address: string;
  port: number;
  kind: RtcCandidateKind;
  relatedAddress?: string;
}
const candidateKinds = new Set<string>(["host", "srflx", "prflx", "relay"]);
/** Parse an SDP ICE candidate line (RFC 8839, with or without "a="). */
export function parseCandidate(line: string): ParsedCandidate | null {
  const parts = line
    .replace(/^a=/, "")
    .replace(/^candidate:/, "")
    .trim()
    .split(/\s+/);
  if (parts.length < 8 || parts[6] !== "typ" || !candidateKinds.has(parts[7]))
    return null;
  const raddr = parts.indexOf("raddr", 8);
  return {
    protocol: parts[2].toLowerCase(),
    address: parts[4],
    port: Number(parts[5]),
    kind: parts[7] as RtcCandidateKind,
    ...(raddr > 0 && parts[raddr + 1]
      ? { relatedAddress: parts[raddr + 1] }
      : {}),
  };
}

const kindLabel = (kind: RtcCandidateKind) =>
  kind === "srflx"
    ? t("webrtc.publicStun")
    : kind === "relay"
      ? t("webrtc.relayTurn")
      : kind === "prflx"
        ? t("webrtc.peerReflexive")
        : t("webrtc.hostCandidate");

/** A concrete private/local address (not mDNS, not the 0.0.0.0 placeholder). */
const exposedLocal = (ip: string | undefined) => {
  const address = normalizeIp(ip);
  return address &&
    !["0.0.0.0", "::"].includes(address) &&
    !isPublicCandidate(address)
    ? address
    : null;
};

export interface CandidateCollection {
  candidates: RtcResult[];
  mdns: number;
  localExposed: string[];
}

export function collectFromCandidates(lines: string[]): CandidateCollection {
  const found = new Map<string, RtcResult>();
  const mdns = new Set<string>();
  const local = new Set<string>();
  for (const line of lines) {
    const parsed = parseCandidate(line);
    if (!parsed) continue;
    if (parsed.address.toLowerCase().endsWith(".local")) {
      mdns.add(parsed.address.toLowerCase());
      continue;
    }
    const related = exposedLocal(parsed.relatedAddress);
    if (related) local.add(related);
    const ip = normalizeIp(parsed.address);
    if (!ip) continue;
    const isPublic = isPublicCandidate(ip);
    if (!isPublic && parsed.kind === "host") local.add(ip);
    const key = `${parsed.kind}|${ip}`;
    const existing = found.get(key);
    if (existing) {
      if (!existing.protocols?.includes(parsed.protocol))
        existing.protocols = [...(existing.protocols ?? []), parsed.protocol];
      continue;
    }
    found.set(key, {
      ip,
      type: kindLabel(parsed.kind),
      kind: parsed.kind,
      family: ip.includes(":") ? 6 : 4,
      protocols: [parsed.protocol],
      public: isPublic,
    });
  }
  return {
    candidates: [...found.values()],
    mdns: mdns.size,
    localExposed: [...local],
  };
}

async function collectCandidates(
  signal: AbortSignal,
): Promise<CandidateCollection> {
  if (typeof RTCPeerConnection === "undefined")
    throw new Error(t("webrtc.browserDoesSupportWebrtcSoCheckCannotRun"));
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ],
    iceCandidatePoolSize: 1,
  });
  const lines: string[] = [];
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
        if (!candidate) resolve();
        else if (candidate.candidate) lines.push(candidate.candidate);
      };
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === "complete") resolve();
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
    // Some browsers only list late candidates in the final SDP.
    for (const line of pc.localDescription?.sdp.split(/\r?\n/) ?? [])
      if (line.startsWith("a=candidate:")) lines.push(line);
    return collectFromCandidates(lines);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    pc.onicecandidate = null;
    pc.onicegatheringstatechange = null;
    pc.close();
  }
}

export type WebRtcLevel = "safe" | "leak" | "warning" | "unknown";
export function assessWebRtc(
  candidates: RtcResult[],
  egressIps: string[],
  localExposed: string[],
) {
  const results = candidates.map((row): RtcResult => ({
    ...row,
    status: !row.public
      ? "local"
      : !egressIps.length
        ? "unverified"
        : egressIps.some((ip) => sameIp(ip, row.ip))
          ? "match"
          : "leak",
  }));
  const leaking = results.filter((row) => row.status === "leak");
  const anyPublic = results.some((row) => row.public);
  const level: WebRtcLevel = leaking.length
    ? "leak"
    : localExposed.length
      ? "warning"
      : !anyPublic || !egressIps.length
        ? "unknown"
        : "safe";
  return { results, leaking, level };
}

export async function runWebRtc(_: void, signal: AbortSignal) {
  const [egress, collection] = await Promise.all([
    detectHttpEgress(signal),
    collectCandidates(signal),
  ]);
  const egressIps = egressAddresses(egress).map((geo) => geo.ip);
  const assessed = assessWebRtc(
    collection.candidates,
    egressIps,
    collection.localExposed,
  );
  const results = await Promise.all(
    assessed.results.map(async (row) => {
      if (!row.public) return row;
      const known = egressAddresses(egress).find((geo) =>
        sameIp(geo.ip, row.ip),
      );
      if (known?.country_code) return { ...row, geo: known };
      try {
        return {
          ...row,
          geo: await endpoint<Geo>(`/geoip/${encodeURIComponent(row.ip)}`, {
            signal,
          }),
        };
      } catch {
        signal.throwIfAborted();
        return row;
      }
    }),
  );
  signal.throwIfAborted();
  const { leaking, level } = assessed;
  const different = leaking.length > 0;
  const anyPublic = results.some((row) => row.public);
  const local = collection.localExposed;
  const verdict = different
    ? [
        t("webrtc.verdictLeak", [
          leaking.length,
          leaking.map((row) => row.ip).join(", "),
        ]),
        ...(leaking.some((row) => row.family === 6) && !egress.ipv6
          ? [t("webrtc.ipv6LeakHint")]
          : []),
      ].join(" ")
    : !anyPublic
      ? local.length
        ? t("webrtc.verdictLocalOnly", [local.length, local.join(", ")])
        : t(
            "webrtc.publicCandidateAddressCollectedBrowserRestrictionsUdpBlocking",
          )
      : !egressIps.length
        ? t("webrtc.udpEgressCollectedButHttpBaselineFailedCannot")
        : local.length
          ? t("webrtc.verdictLocalExposed", [local.length, local.join(", ")])
          : t("webrtc.theSampledPublicUdpEgressMatchesHttpEgress");
  return {
    baseline: egress.ipv4 ?? egress.ipv6,
    egress,
    results,
    verdict,
    different,
    level,
    mdns: collection.mdns,
    localExposed: local,
  };
}
