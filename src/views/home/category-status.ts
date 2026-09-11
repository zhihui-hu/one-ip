export function categoryStatusClass(
  rows: {
    visible: boolean;
    pending: boolean;
    geoPending: boolean;
    geo?: { ip?: string };
  }[],
) {
  if (
    !rows.length ||
    rows.some((row) => !row.visible || row.pending || row.geoPending)
  )
    return "text-muted-foreground hover:text-muted-foreground";
  const success = rows.filter((row) => row.geo?.ip).length;
  if (success === rows.length)
    return "text-emerald-700 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-400";
  if (success > 0)
    return "text-amber-700 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-400";
  return "text-destructive hover:text-destructive";
}
