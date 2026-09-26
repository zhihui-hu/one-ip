import { transformSync } from "esbuild";

export function compile(
  source,
  { format = "esm", loader = "ts", target = "es2022" } = {},
) {
  return transformSync(source, {
    format,
    loader,
    target,
    jsx: loader === "tsx" ? "automatic" : undefined,
    sourcemap: false,
  }).code;
}

export function moduleUrl(source, options) {
  return `data:text/javascript;base64,${Buffer.from(
    compile(source, options),
  ).toString("base64")}`;
}
