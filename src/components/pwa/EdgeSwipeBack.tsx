import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Rotas raiz (tab bar): sem "voltar" a partir delas
const ROOT_PATHS = new Set([
  "/",
  "/transacoes",
  "/relatorios",
  "/contas",
  "/cartoes",
  "/compartilhados",
  "/viagens",
  "/familia",
  "/orcamentos",
  "/metas",
  "/simuladores",
  "/configuracoes",
]);

const EDGE_WIDTH = 24; // zona de ativação na borda esquerda (px)
const TRIGGER_DISTANCE = 70; // arrasto mínimo para disparar o voltar (px)

/**
 * PWA standalone no iOS não tem o swipe-back do Safari; este listener
 * reproduz o gesto do UINavigationController nas telas de detalhe
 * (ex.: /contas/:id). No Android o gesto de voltar do sistema intercepta a
 * borda antes de chegar aqui, então não há conflito. Não renderiza nada.
 */
export function EdgeSwipeBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const isDetailRoute = !ROOT_PATHS.has(location.pathname);

  useEffect(() => {
    if (!isDetailRoute) return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      start.current = t.clientX <= EDGE_WIDTH ? { x: t.clientX, y: t.clientY } : null;
      fired.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!start.current || fired.current) return;
      const t = e.touches[0];
      const dx = t.clientX - start.current.x;
      const dy = Math.abs(t.clientY - start.current.y);
      // Horizontal dominante e distância suficiente
      if (dx > TRIGGER_DISTANCE && dx > dy * 2) {
        fired.current = true;
        navigate(-1);
      }
    };

    const onTouchEnd = () => {
      start.current = null;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDetailRoute, navigate]);

  return null;
}
