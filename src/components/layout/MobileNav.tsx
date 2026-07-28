import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Home,
  ArrowLeftRight,
  Plus,
  Grid3X3,
  X,
  BarChart2,
  Settings,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { navigationItems, secondaryNavItems } from "@/config/navigation";
import { getRouteResourceId, isNavigationPathActive } from "@/utils/frontendFlows";

// AUDITORIA 2026-05-10: Componente de Navegação Inferior para Mobile com BottomSheet.
// Foco em usabilidade com uma mão só e estética de app nativo.

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setShowTransactionModal } = useTransactionModal();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { theme, setTheme, systemTheme } = useTheme();
  const { signOut } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const tapAnimation = prefersReducedMotion ? undefined : { scale: 0.9 };

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const closeSheet = () => setIsSheetOpen(false);

  // Fecha o sheet caso a rota mude (pelo botão voltar do Android, por exemplo)
  useEffect(() => {
    closeSheet();
  }, [location.pathname]);

  // Padrão ARIA de diálogo: Escape fecha, Tab fica preso no sheet,
  // foco vai para o sheet ao abrir e volta ao botão "Mais" ao fechar
  useEffect(() => {
    if (!isSheetOpen) return;

    const sheet = sheetRef.current;
    sheet?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsSheetOpen(false);
        return;
      }
      if (event.key === "Tab" && sheet) {
        const focusables = sheet.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      menuButtonRef.current?.focus();
    };
  }, [isSheetOpen]);

  const navItems = [
    { label: "Início", icon: Home, path: "/" },
    { label: "Transações", icon: ArrowLeftRight, path: "/transacoes" },
    { label: "Nova", icon: Plus, isAction: true },
    { label: "Relatórios", icon: BarChart2, path: "/relatorios" },
    { label: "Mais", icon: Grid3X3, isMenu: true },
  ];

  const sheetItems = navigationItems;

  const isActive = (path: string) => isNavigationPathActive(location.pathname, path);

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
      {/* Overlay do Bottom Sheet */}
      {isSheetOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeSheet}
        />
      )}

      {/* Bottom Sheet Modal */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        aria-hidden={!isSheetOpen}
        tabIndex={-1}
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-background border-t border-border rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-out flex flex-col focus:outline-none",
          isSheetOpen ? "translate-y-0" : "translate-y-full pointer-events-none invisible"
        )}
        style={{ maxHeight: "85vh" }}
      >
        <button
          type="button"
          aria-label="Fechar menu"
          className="w-full flex justify-center py-3"
          onClick={closeSheet}
        >
          <div className="w-12 h-2 bg-muted rounded-full" />
        </button>

        <div className="px-6 pb-6 overflow-y-auto no-scrollbar flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-base">Explorar</h2>
            <button
              onClick={closeSheet}
              aria-label="Fechar menu"
              className="p-2 bg-muted/50 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-2 mb-6">
            {[...navigationItems, ...secondaryNavItems].map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    navigate(item.path);
                    closeSheet();
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200",
                    active
                      ? "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20"
                      : "bg-card text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <button
              onClick={() => {
                toggleTheme();
              }}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-card text-foreground hover:bg-muted transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span>{isDark ? "Tema Claro" : "Tema Escuro"}</span>
            </button>

            <button
              onClick={() => {
                navigate("/configuracoes");
                closeSheet();
              }}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-card text-foreground hover:bg-muted transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Configurações</span>
            </button>

            <button
              onClick={() => {
                closeSheet();
                handleSignOut();
              }}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors mt-2"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sair</span>
            </button>
          </div>

          <div className="h-safe-bottom pt-4" />
        </div>
      </div>

      {/* Barra de Navegação Inferior */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/60 safe-bottom transform-gpu">
        <div className="flex items-center justify-between h-16 max-w-md mx-auto px-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.isAction) {
              return (
                <motion.button
                  key="add-btn"
                  whileTap={tapAnimation}
                  aria-label="Nova transação"
                  onClick={handleNewTransaction}
                  className="flex flex-col items-center justify-center gap-1 min-w-[64px] transition-colors duration-200 py-1 rounded-xl text-primary"
                >
                  <div className="flex items-center justify-center rounded-xl w-7 h-7 bg-primary/15">
                    <Plus className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-medium">{item.label}</span>
                </motion.button>
              );
            }

            if (item.isMenu) {
              return (
                <motion.button
                  key="menu-btn"
                  ref={menuButtonRef}
                  whileTap={tapAnimation}
                  aria-expanded={isSheetOpen}
                  aria-haspopup="dialog"
                  aria-label="Abrir menu de navegação"
                  onClick={() => setIsSheetOpen(true)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-colors duration-200 py-1 rounded-xl",
                    isSheetOpen ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-xl transition-all duration-300",
                      isSheetOpen ? "bg-primary/15 w-12 h-7 -mb-0.5" : "w-7 h-7"
                    )}
                  >
                    <Icon
                      className={cn(
                        "transition-all duration-300",
                        isSheetOpen ? "w-5 h-5 scale-110" : "w-5 h-5"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium transition-all duration-200",
                      isSheetOpen ? "font-bold" : ""
                    )}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            }

            const active = isActive(item.path!);

            return (
              <motion.button
                key={item.path}
                whileTap={tapAnimation}
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(item.path!)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-colors duration-200 py-1 rounded-xl",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {/* Pill indicator */}
                <div
                  className={cn(
                    "flex items-center justify-center rounded-xl transition-all duration-300",
                    active ? "bg-primary/15 w-12 h-7 -mb-0.5" : "w-7 h-7"
                  )}
                >
                  <Icon
                    className={cn(
                      "transition-all duration-300",
                      active ? "w-5 h-5 scale-110" : "w-5 h-5"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-xs font-medium transition-all duration-200",
                    active ? "font-bold" : ""
                  )}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
        {/* Safe area for notch devices */}
        <div className="h-safe-bottom" />
      </nav>
    </>
  );
}
