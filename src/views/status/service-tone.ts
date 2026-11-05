type ServiceTone = "none" | "minor" | "maintenance" | "major" | "critical";

const serviceColorClass: Record<ServiceTone | "unknown", string> = {
  none: "[--service-color:var(--success)]",
  minor: "[--service-color:#d18b14]",
  maintenance: "[--service-color:#d18b14]",
  major: "[--service-color:var(--danger)]",
  critical: "[--service-color:var(--danger)]",
  unknown: "[--service-color:var(--subtle)]",
};

const serviceSurfaceClass: Record<ServiceTone | "unknown", string> = {
  none: "bg-card",
  minor: "bg-[color-mix(in_srgb,var(--card)_94%,#f0b429)]",
  maintenance: "bg-[color-mix(in_srgb,var(--card)_94%,#f0b429)]",
  major: "bg-[color-mix(in_srgb,var(--card)_94%,var(--danger))]",
  critical: "bg-[color-mix(in_srgb,var(--card)_94%,var(--danger))]",
  unknown: "bg-card",
};

const toTone = (indicator: string): ServiceTone | "unknown" =>
  indicator in serviceColorClass ? (indicator as ServiceTone) : "unknown";

/** Sets `--service-color` for the given status indicator. */
export const serviceColor = (indicator: string) =>
  serviceColorClass[toTone(indicator)];

/** Card-tinted background for the given status indicator. */
export const serviceSurface = (indicator: string) =>
  serviceSurfaceClass[toTone(indicator)];
