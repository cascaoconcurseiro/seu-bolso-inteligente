import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/mobile.css";
import { initGlobalErrorLogger } from "./services/errorLogger";

initGlobalErrorLogger();

// Recuperação automática de deploy: quando um chunk dinâmico falha ao carregar
// (um novo deploy trocou os hashes e o index.html em memória aponta para assets
// que não existem mais no servidor), a única cura é recarregar para buscar o
// index.html atual. A guarda por sessão evita loop de reload em falha persistente
// (ex.: offline real), recarregando no máximo uma vez a cada 10s.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const KEY = "chunk-reload-ts";
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
});

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

createRoot(document.getElementById("root")!).render(<App />);

// Observabilidade não deve competir com a primeira pintura em celulares.
// O ErrorBoundary interno continua protegendo a árvore enquanto o SDK carrega.
if (SENTRY_DSN) {
  const initializeSentry = async () => {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn: SENTRY_DSN,
      integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
      tracesSampleRate: import.meta.env.PROD ? 0.2 : 0,
      tracePropagationTargets: [
        "localhost",
        /^https:\/\/meupedemeia\.vercel\.app/,
        /^https:\/\/vrrcagukyfnlhxuvnssp\.supabase\.co/,
      ],
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE,
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => void initializeSentry(), { timeout: 3000 });
  } else {
    globalThis.setTimeout(() => void initializeSentry(), 1500);
  }
}
