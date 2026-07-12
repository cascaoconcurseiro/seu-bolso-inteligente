import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      host: "::",
      port: 8080,
      headers: {
        // Security headers
        "X-Frame-Options": "SAMEORIGIN",
        "X-Content-Type-Options": "nosniff",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      proxy: {
        "/api/ai": {
          target: "https://api.groq.com/openai/v1/chat/completions",
          changeOrigin: true,
          rewrite: () => "",
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              const key = env.VITE_GROQ_API_KEY;
              if (key) {
                proxyReq.setHeader("Authorization", `Bearer ${key}`);
              } else {
                console.warn(
                  "[Vite Proxy] Chave VITE_GROQ_API_KEY não encontrada no arquivo .env via loadEnv!"
                );
              }
            });
          },
        },
      },
    },
    plugins: [
      react(),
      sentryVitePlugin({
        org: process.env.SENTRY_ORG || "seu-bolso",
        project: process.env.SENTRY_PROJECT || "javascript-react",
        authToken: process.env.SENTRY_AUTH_TOKEN,
        telemetry: false,
        sourcemaps: {
          // Remove os .map do dist após upload ao Sentry para que não sejam
          // publicados no deploy (complementa build.sourcemap: "hidden")
          filesToDeleteAfterUpload: ["./dist/**/*.map"],
        },
      }),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        includeAssets: [
          "favicon.ico",
          "apple-touch-icon.png",
          "masked-icon.svg",
          "icon-192.png",
          "icon-512.png",
        ],
        manifest: {
          name: "Pé de Meia",
          short_name: "Pé de Meia",
          description: "Controle financeiro e viagens",
          theme_color: "#10b981",
          icons: [
            {
              src: "icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
        injectManifest: {
          maximumFileSizeToCacheInBytes: 2097152, // 2MB
          globPatterns: ["index.html", "manifest.webmanifest"],
          // Splash screens iOS são buscadas pelo SO no launch — não precachear
          globIgnores: ["splash/**"],
        },
      }),
    ].filter(Boolean),
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      minify: "esbuild",
      // "hidden": gera source maps para upload ao Sentry sem referenciá-los nos
      // bundles — evita expor o código-fonte publicamente em produção
      sourcemap: "hidden",
      chunkSizeWarningLimit: 950,
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
    },
  };
});
