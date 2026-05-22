import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function VersionGuard() {
  const location = useLocation();
  const initialTimestampRef = useRef<number | null>(null);
  const updateAvailableRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);

  const checkVersion = async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      // Usar query string dinâmica para forçar a busca na rede, ignorando o cache local do navegador/CDN
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      });

      if (!response.ok) {
        isCheckingRef.current = false;
        return;
      }

      const data = await response.json();
      
      if (data && typeof data.buildTimestamp === "number") {
        if (initialTimestampRef.current === null) {
          // Salva o timestamp de build correspondente à versão carregada inicialmente
          initialTimestampRef.current = data.buildTimestamp;
          console.log("[VersionGuard] Monitoramento ativo. Versão inicial do app:", data.version, "Build:", data.buildTimestamp);
        } else if (data.buildTimestamp > initialTimestampRef.current) {
          console.log("[VersionGuard] Nova versão detectada no servidor! Nova compilada em:", data.buildTimestamp);
          updateAvailableRef.current = true;
          
          // Se houver Service Worker ativo do Vite PWA, forçar silenciosamente a checagem e atualização do service worker
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
              for (const registration of registrations) {
                registration.update().catch((err) => {
                  console.warn("[VersionGuard] Falha silenciosa ao atualizar Service Worker:", err);
                });
              }
            });
          }
        }
      }
    } catch (error) {
      console.warn("[VersionGuard] Falha silenciosa ao consultar version.json na rede:", error);
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    // Primeira execução assíncrona após montagem do layout
    checkVersion();

    // Polling regular a cada 5 minutos
    const intervalId = setInterval(checkVersion, 5 * 60 * 1000);

    // Checagem imediata quando o usuário volta de outra aba ou foca a aplicação
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Janela de oportunidade ideal: Quando o usuário muda de página (rota)
  // Se houver uma atualização pendente, recarrega a página de forma silenciosa e limpa
  useEffect(() => {
    if (updateAvailableRef.current) {
      console.log("[VersionGuard] Nova versão disponível. Efetuando recarregamento silencioso do app na troca de tela...");
      
      // Pequeno delay para garantir que a navegação do router não conflite com o reload
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }, [location.pathname]);

  return null;
}
