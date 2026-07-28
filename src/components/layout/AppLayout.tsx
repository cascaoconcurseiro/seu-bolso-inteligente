import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useGlobalRealtime } from "@/hooks/useGlobalRealtime";
import { useCategories, useCreateDefaultCategories } from "@/hooks/useCategories";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Settings, Moon, Sun, LogOut, Plus, Eye, EyeOff, Search } from "lucide-react";
import { navigationGroups } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationButton } from "./NotificationButton";
import { MonthSelector } from "./MonthSelector";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { MobileNav } from "./MobileNav";
import { VersionGuard } from "./VersionGuard";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { getRouteResourceId, getRouteTitle, isNavigationPathActive } from "@/utils/frontendFlows";

const GlobalSearch = lazy(() =>
  import("@/components/search/GlobalSearch").then((module) => ({ default: module.GlobalSearch }))
);
const TransactionModal = lazy(() =>
  import("@/components/modals/TransactionModal").then((module) => ({
    default: module.TransactionModal,
  }))
);

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { theme, setTheme, systemTheme } = useTheme();

  // Resolvemos o tema atual (se 'system', olhamos para systemTheme)
  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useUserProfile();
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();

  const { isPrivate, togglePrivacy } = usePrivacy();
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const routeTitle = getRouteTitle(location.pathname);
    document.title = routeTitle === "Pé de Meia" ? routeTitle : `${routeTitle} | Pé de Meia`;

    const animationFrame = window.requestAnimationFrame(() => {
      document.getElementById("main-content")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [location.pathname]);

  // Ativa a escuta de Realtime global para toda a aplicação
  useGlobalRealtime();

  // Injeção automática de categorias padrão para novos usuários
  const { data: categories, isSuccess: categoriesLoaded } = useCategories();
  const createDefaultCategories = useCreateDefaultCategories();

  useEffect(() => {
    if (
      categoriesLoaded &&
      categories &&
      categories.length < 10 &&
      !createDefaultCategories.isPending
    ) {
      createDefaultCategories.mutate({ force: false });
    }
  }, [categoriesLoaded, categories, createDefaultCategories]);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // Detectar contexto baseado na rota atual
  const handleNewTransaction = () => {
    // Extrair contexto da URL
    const context: Record<string, string> = {};

    // Se estiver em uma viagem específica
    const tripId = getRouteResourceId(location.pathname, "/viagens");
    if (tripId) context.tripId = tripId;

    // Se estiver em uma conta específica
    const accountId = getRouteResourceId(location.pathname, "/contas");
    if (accountId) context.accountId = accountId;

    setShowTransactionModal(true, context);
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <VersionGuard />
      {/* Skip-to-content — WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-foreground focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Pular para o conteúdo principal
      </a>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background safe-top">
        <div className="w-full px-4 md:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-3">
            <Link to="/" className="flex min-w-max flex-shrink-0 items-center">
              <span className="font-display font-bold text-sm md:text-base tracking-tight whitespace-nowrap block">
                pé de meia
              </span>
            </Link>

            <ErrorBoundary fallback={null}>
              <div className="ml-auto flex flex-shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSearch(true)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Buscar (Ctrl+K)"
                  title="Buscar (Ctrl+K)"
                >
                  <Search className="h-4 w-4" />
                </Button>
                <NotificationButton />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePrivacy}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={isPrivate ? "Mostrar valores" : "Ocultar valores"}
                >
                  {isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>

                <Link to="/configuracoes" className="hidden md:block">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Configurações"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>

                {/* User Menu - Hidden on mobile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild className="hidden md:flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full p-0"
                      aria-label="Menu do usuário"
                    >
                      <UserAvatar
                        name={profile?.full_name || user?.email || "User"}
                        avatarUrl={profile?.avatar_url}
                        colorId={profile?.avatar_color || "green"}
                        iconId={profile?.avatar_icon || "avatar_1"}
                        size="sm"
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center gap-2 p-2">
                      <div className="flex flex-col space-y-2 leading-none">
                        <p className="font-medium text-sm truncate">
                          {profile?.full_name ||
                            user?.user_metadata?.full_name ||
                            user?.email?.split("@")[0]}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ErrorBoundary>
          </div>

          <nav
            className="hidden md:flex flex-wrap items-start justify-center gap-x-5 gap-y-2 border-t border-border/60 py-2"
            aria-label="Navegação principal"
          >
            {navigationGroups.map((group, groupIndex) => {
              const groupLabelId = `navigation-group-${groupIndex}`;
              return (
                <div
                  key={group.label}
                  role="group"
                  aria-labelledby={groupLabelId}
                  className="space-y-1"
                >
                  <p id={groupLabelId} className="px-2 text-xs font-semibold text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {group.items.map((item) => {
                      const active = isNavigationPathActive(location.pathname, item.path);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {!["/cartoes", "/simuladores", "/configuracoes", "/familia", "/viagens"].includes(
          location.pathname
        ) &&
          !location.pathname.startsWith("/cartoes/") &&
          !location.pathname.startsWith("/viagens/") && (
            <div className="border-t border-border bg-background">
              <div className="w-full px-4 md:px-6 lg:px-8 py-1.5 md:py-2 flex items-center justify-between gap-4">
                <div className="flex-1 hidden md:block" />

                <div className="flex items-center gap-2 flex-1 md:flex-initial justify-center md:justify-center">
                  <MonthSelector />
                </div>

                <div className="hidden md:flex justify-end md:flex-1">
                  <Button size="default" onClick={handleNewTransaction} className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Nova transação</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 pb-32 md:pb-8" tabIndex={-1}>
        <div
          className={`mx-auto px-4 py-4 md:px-6 md:py-5 lg:px-8 ${
            location.pathname.startsWith("/viagens/") ? "max-w-[1600px]" : "max-w-7xl"
          }`}
        >
          <OnboardingGuard>{children}</OnboardingGuard>
        </div>
      </main>

      {/* Mobile Navigation Bar */}
      <MobileNav />

      {/* Global Transaction Modal */}
      {showTransactionModal && (
        <Suspense fallback={null}>
          <TransactionModal open={showTransactionModal} onOpenChange={setShowTransactionModal} />
        </Suspense>
      )}

      {showSearch && (
        <Suspense fallback={null}>
          <GlobalSearch open={showSearch} onOpenChange={setShowSearch} />
        </Suspense>
      )}
    </div>
  );
}
