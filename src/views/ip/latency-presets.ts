import type { PingNode } from "../ping/api";

export const latencyCountries = [
  "us",
  "de",
  "gb",
  "fr",
  "jp",
  "ca",
  "cn",
  "kr",
] as const;
export function selectLatencyNodes(nodes: PingNode[]) {
  return latencyCountries.map((cc) => ({
    cc,
    node: nodes
      .filter((node) => node.cc === cc && node.preferredAsn)
      .sort(
        (a, b) =>
          (b.preferredProbes ?? 0) - (a.preferredProbes ?? 0) ||
          a.id.localeCompare(b.id),
      )[0],
  }));
}
