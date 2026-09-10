export function ipScoreColor(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score) || score < 0 || score > 100)
    return "var(--muted-foreground)";
  return score >= 75
    ? "var(--success)"
    : score >= 45
      ? "var(--warning)"
      : "var(--danger)";
}
