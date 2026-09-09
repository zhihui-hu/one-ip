import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";

function excludeBackendSource(): Plugin {
  let output = "";
  return {
    name: "exclude-backend-source",
    configResolved(config) {
      output = resolve(config.root, config.build.outDir, "worker");
    },
    async closeBundle() {
      await rm(output, { recursive: true, force: true });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (/^\/worker(?:\/|\?|$)/.test(req.url ?? "")) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        next();
      });
    },
  };
}

const headers = {
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
};

export default defineConfig(() => {
  // Evaluated by Vite at build time, not when a visitor opens the page.
  const buildTime = new Date().toISOString();

  return {
    plugins: [react(), tailwindcss(), excludeBackendSource()],
    optimizeDeps: {
      include: ["vaul", "@fingerprintjs/fingerprintjs"],
    },
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    define: {
      "import.meta.env.VITE_BUILD_TIME": JSON.stringify(buildTime),
    },
    server: {
      host: "127.0.0.1",
      port: 5137,
      hmr: { clientPort: 8787 },
      strictPort: true,
      open: false,
      headers,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8787",
          changeOrigin: false,
        },
      },
    },
    preview: { headers },
  };
});
