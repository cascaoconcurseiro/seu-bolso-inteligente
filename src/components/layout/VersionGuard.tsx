import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { logger } from '@/utils/logger';

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
        } else if (data.buildTimestamp > initialTimestampRef.current) {
          if (!updateAvailableRef.current) {
            updateAvailableRef.current = true;

            toast('Nova versão disponível!', {
              description: 'Acabamos de lançar novos recursos e correções. Atualize para continuar.',
              icon: <RefreshCw className="h-4 w-4 animate-spin text-primary" />,
              duration: Infinity,
              action: {
                label: '🚀 Atualizar Agora',
                onClick: async () => {
                  // Remove os service workers e limpa o cache local para forçar a nova versão
                  if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                      await registration.unregister();
                    }
                  }
                  if ('caches' in window) {
                    const keys = await caches.keys();
                    for (const key of keys) {
                      await caches.delete(key);
                    }
                  }
                  // Adiciona um timestamp na URL para quebrar o cache do navegador na raiz
                  window.location.href = window.location.pathname + '?v=' + Date.now();
                },
              },
            });
          }
          
          // Se houver Service Worker ativo do Vite PWA, forçar silenciosamente a checagem e atualização do service worker
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
              for (const registration of registrations) {
                registration.update().catch((err) => {
                  logger.warn("[VersionGuard] Falha silenciosa ao atualizar Service Worker:", err);
                });
              }
            });
          }
        }
      }
    } catch (error) {
      logger.warn("[VersionGuard] Falha silenciosa ao consultar version.json na rede:", error);
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

  // O recarregamento silencioso na troca de tela foi removido a pedido do usuário,
  // favorecendo o aviso explícito pelo toast acima.

  return null;
}
