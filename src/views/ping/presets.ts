import type { PingNode } from "./api";

export function selectPingPresets(
  nodes: PingNode[],
  scope: string,
  fullCoverage: boolean,
) {
  const compareNodes = (a: (typeof nodes)[number], b: (typeof nodes)[number]) =>
    Number(Boolean(b.preferredAsn)) - Number(Boolean(a.preferredAsn)) ||
    (b.preferredProbes ?? b.probes ?? 0) -
      (a.preferredProbes ?? a.probes ?? 0) ||
    a.id.localeCompare(b.id);
  const chinaNodes = nodes
    .filter((node) => node.cc === "cn")
    .sort(compareNodes)
    .slice(0, 2);
  const representatives = new Map<string, (typeof nodes)[number]>();
  for (const node of nodes) {
    const current = representatives.get(node.cc);
    if (!current || compareNodes(node, current) < 0)
      representatives.set(node.cc, node);
  }
  const availableNodes = [...representatives.values()].filter(
    (node) => scope === "world" || node.continent === scope,
  );
  const presetNodes = fullCoverage
    ? availableNodes
    : [
        ...chinaNodes,
        ...["AS", "EU", "NA", "SA", "AF", "OC"]
          .map((id) => ({ id }))
          .flatMap((region) =>
            availableNodes
              .filter(
                (node) => node.cc !== "cn" && node.continent === region.id,
              )
              .sort(compareNodes)
              .slice(0, scope === "world" ? 2 : 5),
          ),
      ];
  return { chinaNodes, availableNodes, presetNodes };
}
