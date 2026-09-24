// Node ESM loader: add `with { type: "json" }` to the worker's relative
// JSON imports so the same source runs on Cloudflare Workers (no attribute
// needed) and on Node 24 (attribute required). No worker source is modified.
export async function load(url, context, nextLoad) {
  if (url.includes("/public/worker/") && url.endsWith(".js")) {
    const result = await nextLoad(url, { ...context, format: "module" });
    let source = result.source;
    if (typeof source !== "string") {
      source = Buffer.from(source).toString("utf8");
    }
    const patched = source.replace(
      /from\s*(['"])(\.[^'"]*\.json)\1(?!\s*with)/g,
      'from $1$2$1 with { type: "json" }',
    );
    return { format: "module", source: patched, shortCircuit: true };
  }
  return nextLoad(url, context);
}
