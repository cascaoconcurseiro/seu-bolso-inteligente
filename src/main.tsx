import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/mobile.css";
import { initGlobalErrorLogger } from "./services/errorLogger";

initGlobalErrorLogger();

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
