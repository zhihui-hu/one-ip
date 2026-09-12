import {
  buildSourceRegistry,
  type SourceAddressFamily,
  type SourceDefinition,
  type SourceExecution,
  type SourceKind,
  type SourceMethod,
  type SourceTargetRegion,
} from "@/lib/diagnostic-source";
import {
  DIAGNOSTIC_PARSER_VERSION,
  DIAGNOSTIC_REGISTRY_VERSION,
} from "@/lib/query-keys";
import rawSites from "./sites.json" with { type: "json" };

export {
  buildSourceRegistry,
  type SourceAddressFamily,
  type SourceDefinition,
  type SourceExecution,
  type SourceKind,
  type SourceMethod,
  type SourceTargetRegion,
};

export const SOURCE_REGISTRY_VERSION = DIAGNOSTIC_REGISTRY_VERSION;
export const SOURCE_PARSER_VERSION = DIAGNOSTIC_PARSER_VERSION;
export const sourceRegistryVersion = SOURCE_REGISTRY_VERSION;
export const sourceParserVersion = SOURCE_PARSER_VERSION;

const definitions = buildSourceRegistry(rawSites);
const definitionsById = new Map(
  definitions.map((source) => [source.id, source] as const),
);

export const sourceRegistry: readonly SourceDefinition[] = definitions;

export function sourceById(id: string) {
  return definitionsById.get(id);
}
