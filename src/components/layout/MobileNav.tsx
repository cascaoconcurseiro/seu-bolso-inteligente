import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { navigationItems } from "@/config/navigation";
import { getRouteResourceId, isNavigationPathActive } from "@/utils/frontendFlows";
import { preloadNavigationRoute } from "@/utils/preloadNavigationRoute";

const mobileNavigationItems = [
  ...navigationItems,
  { path: "/configuracoes", label: "Configurações", icon: Settings },
];

// Navegação móvel com todos os destinos em uma faixa horizontal rolável.

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setShowTransactionModal } = useTransactionModal();
  const prefersReducedMotion = useReducedMotion();
  const tapAnimation = prefersReducedMotion ? undefined : { scale: 0.9 };
  const navScrollerRef = useRef<HTMLDivElement>(null);
  const [hasMoreDestinations, setHasMoreDestinations] = useState(false);

  useEffect(() => {
    const scroller = navScrollerRef.current;
    if (!scroller) return;

    const updateOverflowHint = () => {
      setHasMoreDestinations(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2);
    };

    updateOverflowHint();
    scroller.addEventListener("scroll", updateOverflowHint, { passive: true });
    const resizeObserver = new ResizeObserver(updateOverflowHint);
    resizeObserver.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateOverflowHint);
      resizeObserver.disconnect();
    };
  }, []);

  const isActive = (path: string) => isNavigationPathActive(location.pathname, path);

  const handleRouteIntent = (path: string) => {
    void preloadNavigationRoute(path)?.catch(() => undefined);
  };

  const handleNewTransaction = () => {
    const tripId = getRouteResourceId(location.pathname, "/viagens");
    const accountId = getRouteResourceId(location.pathname, "/contas");
    setShowTransactionModal(true, {
      ...(tripId ? { tripId } : {}),
      ...(accountId ? { accountId } : {}),
    });
  };

  return (
    <>
      {/* Barra móvel com todos os itens diretamente acessíveis */}
      <nav
        aria-label="Navegação móvel"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/60 safe-bottom transform-gpu"
      >
        <div className="relative">
          <div
            ref={navScrollerRef}
            className="flex h-16 items-center gap-1 overflow-x-auto overscroll-x-contain px-2 no-scrollbar"
            aria-describedby="mobile-navigation-scroll-hint"
          >
            {mobileNavigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <div key={item.path} className="flex shrink-0 items-center gap-1">
                  <motion.button
                    whileTap={tapAnimation}
                    title={item.label}
                    aria-current={active ? "page" : undefined}
                    onPointerDown={() => handleRouteIntent(item.path)}
                    onFocus={() => handleRouteIntent(item.path)}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "flex h-14 min-w-[76px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 transition-colors duration-200",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-10 items-center justify-center rounded-xl transition-colors duration-200",
                        active && "bg-primary/15"
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="whitespace-nowrap text-[11px] font-medium">{item.label}</span>
                  </motion.button>

                  {item.path === "/transacoes" && (
                    <motion.button
                      key="add-btn"
                      whileTap={tapAnimation}
                      aria-label="Nova transação"
                      onClick={handleNewTransaction}
                      className="flex h-14 min-w-[68px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-primary transition-colors duration-200"
                    >
                      <span className="flex h-7 w-10 items-center justify-center rounded-xl bg-primary/15">
                        <Plus className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="whitespace-nowrap text-[11px] font-medium">Nova</span>
                    </motion.button>
                  )}
                </div>
              );
            })}
          </div>
          <span id="mobile-navigation-scroll-hint" className="sr-only">
            Deslize horizontalmente para ver todos os itens do menu.
          </span>
          {hasMoreDestinations && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-0 h-16 w-7 bg-gradient-to-l from-background via-background/80 to-transparent"
            />
          )}
        </div>
        <div className="h-safe-bottom" />
      </nav>
    </>
  );
}
