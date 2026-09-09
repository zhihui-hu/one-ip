// Keep pinned upstream sources intact; optional Worker comparisons belong to
// the standalone collector adapter, which does not collect Worker data.
export function adaptNavigator(source) {
  const fields = ["platform", "userAgent", "deviceMemory", "hardwareConcurrency", "language", "languages"];
  for (const field of fields) {
    const comparison = new RegExp(`if \\((${field} !==? workerScope\\.${field})\\)`, "g");
    let matches = 0;
    source = source.replace(comparison, (_, expression) => {
      matches++;
      return `if (workerScope && ${expression})`;
    });
    if (matches !== 1) throw new Error(`Unexpected upstream navigator comparison: ${field}`);
  }
  return source;
}
