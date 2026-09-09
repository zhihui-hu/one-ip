/** Incidents and maintenance first, operational next, unconfirmed last. */
export function statusOrder(indicator?: string) {
  if (["minor", "major", "critical", "maintenance"].includes(indicator ?? ""))
    return 0;
  return indicator === "none" ? 1 : 2;
}
