import type { RangeKey } from "./types";

/** Defaults for the traffic cards on the advertising page. */
export const statsConfig = {
  /** Range selected when the page opens. */
  defaultRange: "last30d" as RangeKey,
  /** Unique visitors (deduplicated IPs) are hidden unless turned on here. */
  showUniqueVisitors: false,
  /** "Placements and pricing" section; hidden for now. */
  showSlotSection: false,
};
