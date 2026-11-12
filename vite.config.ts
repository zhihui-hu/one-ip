import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";

const headers = {
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
};

export default defineConfig(({ mode }) => {
  // Local dev only: where site logos are fetched when this machine cannot reach
  // the icon providers itself, e.g. ICON_PROXY_ORIGIN=https://ip.example.com in
  // .env.local sends /api/icons to that deployment's Cloudflare-cached proxy.
  const iconProxyOrigin = loadEnv(mode, process.cwd(), "").ICON_PROXY_ORIGIN;

  // Evaluated by Vite at build time, not when a visitor opens the page.
  const buildTime = new Date().toISOString();

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "app-build-version",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "app-version.json",
            source: JSON.stringify({ build: buildTime }),
          });
        },
      },
    ],
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
        ...(iconProxyOrigin && {
          "/api/icons": { target: iconProxyOrigin, changeOrigin: true },
        }),
        "/api": {
          target: "http://127.0.0.1:8787",
          changeOrigin: false,
        },
      },
    },
    preview: { headers },
  };
});
