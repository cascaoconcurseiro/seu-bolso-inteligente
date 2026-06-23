import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      host: "::",
      port: 8080,
      headers: {
        // Security headers
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      proxy: {
        '/api/ai': {
          target: 'https://api.groq.com/openai/v1/chat/completions',
          changeOrigin: true,
          rewrite: (path) => '',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const key = env.VITE_GROQ_API_KEY;
              if (key) {
                proxyReq.setHeader('Authorization', `Bearer ${key}`);
              } else {
                console.warn("[Vite Proxy] Chave VITE_GROQ_API_KEY não encontrada no arquivo .env via loadEnv!");
              }
            });
          }
        }
      }
    },
  plugins: [
    react(), 
    // Uncomment once you have configured Sentry
    // sentryVitePlugin({
    //   org: "seu-bolso",
    //   project: "javascript-react",
    //   authToken: process.env.SENTRY_AUTH_TOKEN,
    // }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Pé de Meia',
        short_name: 'Pé de Meia',
        description: 'Controle financeiro e viagens',
        theme_color: '#10b981',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 10485760, // 10MB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/vrrcagukyfnlhxuvnssp\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // <== 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 950,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendors React core
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'vendor-react';
          }
          // Tanstack Query
          if (id.includes('node_modules/@tanstack/')) {
            return 'vendor-query';
          }
          // Radix UI
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-ui';
          }
          // Recharts
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          // Supabase client
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }
          // Date utilities
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date';
          }
          // DOMPurify
          if (id.includes('node_modules/dompurify') || id.includes('node_modules/isomorphic-dompurify')) {
            return 'vendor-purify';
          }
          // html2canvas (heavy lib usada em Relatórios)
          if (id.includes('node_modules/html2canvas')) {
            return 'vendor-html2canvas';
          }
          // Sonner toasts
          if (id.includes('node_modules/sonner')) {
            return 'vendor-sonner';
          }
          // Export utilities (PDF e Excel) — chunks separados para evitar aviso de tamanho
          if (id.includes('node_modules/jspdf')) {
            return 'vendor-jspdf';
          }
          if (id.includes('node_modules/exceljs') || id.includes('node_modules/file-saver')) {
            return 'vendor-excel';
          }
          // Lucide icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // Pages (lazy chunks por rota)
          if (id.includes('/src/pages/Reports')) return 'page-reports';
          if (id.includes('/src/pages/SharedExpenses')) return 'page-shared';
          if (id.includes('/src/pages/Trips')) return 'page-trips';
          if (id.includes('/src/pages/GoalsAndInvestments')) return 'page-goals';
          if (id.includes('/src/pages/CreditCards')) return 'page-creditcards';
          if (id.includes('/src/pages/Settings')) return 'page-settings';
          // Services (notification e prediction em chunk próprio)
          if (id.includes('/src/services/notificationService') || id.includes('/src/services/notificationGenerator')) {
            return 'services-notifications';
          }
          if (id.includes('/src/services/categoryPrediction')) {
            return 'services-prediction';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}});
