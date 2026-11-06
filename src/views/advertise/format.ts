/** Counts like the Cloudflare dashboard: 1,220 → 1.22k, 1,451,590 → 1.45M. */
export function formatCount(value: number) {
  const rounded = Math.round(value);
  if (Math.abs(rounded) < 1000) return String(rounded);
  const units = ["k", "M", "B"];
  let scaled = value / 1000;
  let unit = 0;
  // Move up a unit instead of showing "1000k".
  while (
    Math.abs(Number(scaled.toFixed(2))) >= 1000 &&
    unit < units.length - 1
  ) {
    scaled /= 1000;
    unit++;
  }
  return `${Number(scaled.toFixed(2))}${units[unit]}`;
}

/** Data sizes to three significant digits: 341 MB, 2.65 GB, 7.40 GB. */
export function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 999.5 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  const digits = unit === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export const formatPercent = (value: number) => `${Math.round(value)}%`;

/** Snapshot time shown under the charts, in Beijing time. */
export const updatedLabel = (iso: string) =>
  `${new Date(Date.parse(iso) + 8 * 3_600_000)
    .toISOString()
    .slice(5, 16)
    .replace("T", " ")} (UTC+8)`;
