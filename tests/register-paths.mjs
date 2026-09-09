import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Match Vite's source alias when running TypeScript modules in Node tests.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = resolve("src", specifier.slice(2));
      const file = [base + ".ts", base + ".tsx", base + "/index.ts", base].find(existsSync);
      if (file) return nextResolve(pathToFileURL(file).href, context);
    }
    return nextResolve(specifier, context);
  },
});
