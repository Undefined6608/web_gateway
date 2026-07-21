import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = normalizeBasePath(env.APP_BASE_PATH || "/system-gateway/");
  const basePrefix = base.slice(0, -1);
  const proxyTarget = env.API_PROXY_TARGET || "http://127.0.0.1:8001";

  const proxy = {
    target: proxyTarget,
    changeOrigin: true,
    rewrite: (path: string) => path.startsWith(basePrefix) ? path.slice(basePrefix.length) || "/" : path,
  };

  return {
    base,
    plugins: [react(), tailwindcss()],
    server: {
      host: env.DEV_HOST || "0.0.0.0",
      port: Number(env.DEV_PORT || 8089),
      proxy: {
        [`${basePrefix}/api`]: proxy,
        [`${basePrefix}/health`]: proxy,
      },
    },
  };
});

function normalizeBasePath(value: string) {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}
