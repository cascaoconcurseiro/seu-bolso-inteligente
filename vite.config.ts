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
          rewrite: (path) => "",
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
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
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
        injectManifestConfig: {
          maximumFileSizeToCacheInBytes: 2097152, // 2MB
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
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
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Vendors React core
            if (
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/react-router-dom/")
            ) {
              return "vendor-react";
            }
            // Tanstack Query
            if (id.includes("node_modules/@tanstack/")) {
              return "vendor-query";
            }
            // Radix UI
            if (id.includes("node_modules/@radix-ui/")) {
              return "vendor-ui";
            }
            // Recharts
            if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
              return "vendor-charts";
            }
            // Supabase client
            if (id.includes("node_modules/@supabase/")) {
              return "vendor-supabase";
            }
            // Date utilities
            if (id.includes("node_modules/date-fns")) {
              return "vendor-date";
            }
            // DOMPurify
            if (
              id.includes("node_modules/dompurify") ||
              id.includes("node_modules/isomorphic-dompurify")
            ) {
              return "vendor-purify";
            }
            // html2canvas (heavy lib usada em Relatórios)
            if (id.includes("node_modules/html2canvas")) {
              return "vendor-html2canvas";
            }
            // Sonner toasts
            if (id.includes("node_modules/sonner")) {
              return "vendor-sonner";
            }
            // Export utilities (PDF e Excel) — chunks separados para evitar aviso de tamanho
            if (id.includes("node_modules/jspdf")) {
              return "vendor-jspdf";
            }
            if (id.includes("node_modules/exceljs") || id.includes("node_modules/file-saver")) {
              return "vendor-excel";
            }
            // Lucide icons
            if (id.includes("node_modules/lucide-react")) {
              return "vendor-icons";
            }
            // NOTA (04/07/2026): tentativa de extrair components/{transactions,
            // shared,trips} em feature-chunks gerou chunks circulares (imports
            // cruzados pages<->components, risco de TDZ em runtime). Reduzir o
            // page-shared (574 KB) exige antes desacoplar esses imports.
            // Pages (lazy chunks por rota)
            if (id.includes("/src/pages/Reports")) return "page-reports";
            if (id.includes("/src/pages/SharedExpenses")) return "page-shared";
            if (id.includes("/src/pages/Trips")) return "page-trips";
            if (id.includes("/src/pages/GoalsAndInvestments")) return "page-goals";
            if (id.includes("/src/pages/CreditCards")) return "page-creditcards";
            if (id.includes("/src/pages/Settings")) return "page-settings";
            // Services (notification e prediction em chunk próprio)
            if (
              id.includes("/src/services/notificationService") ||
              id.includes("/src/services/notificationGenerator")
            ) {
              return "services-notifications";
            }
            if (id.includes("/src/services/categoryPrediction")) {
              return "services-prediction";
            }
          },
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
    },
  };
});
