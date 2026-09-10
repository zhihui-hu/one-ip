import type { Risk } from "@/lib/types";

export function reputation(risk: Risk) {
  const checks = [
    { key: "recent_abuse", weight: 50, value: risk.recent_abuse },
    { key: "bot_status", weight: 30, value: risk.bot_status },
    {
      key: "proxy",
      weight: 20,
      value:
        risk.tor === true || risk.proxy === true
          ? true
          : risk.tor === false && risk.proxy === false
            ? false
            : undefined,
    },
  ];
  const known = risk.available
    ? checks.filter((c) => typeof c.value === "boolean")
    : [];
  const coverage = known.reduce((sum, c) => sum + c.weight, 0);
  return {
    score:
      coverage === 100
        ? 100 - known.reduce((sum, c) => sum + (c.value ? c.weight : 0), 0)
        : null,
    coverage,
    checks,
  };
}
