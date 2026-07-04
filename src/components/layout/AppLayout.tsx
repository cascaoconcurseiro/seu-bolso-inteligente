import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useGlobalRealtime } from "@/hooks/useGlobalRealtime";
import { useCategories, useCreateDefaultCategories } from "@/hooks/useCategories";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Settings,
  Moon,
  Sun,
  LogOut,
  Plus,
  Eye,
  EyeOff,
  ChevronDown,
  Search,
  Grid3X3,
} from "lucide-react";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { navigationItems, secondaryNavItems } from "@/config/navigation";
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
import { TransactionModal } from "@/components/modals/TransactionModal";
import { MobileNav } from "./MobileNav";
import { VersionGuard } from "./VersionGuard";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
    const context: Record<string, any> = {};

    // Se estiver em uma viagem específica
    if (location.pathname.startsWith("/viagens/")) {
      const tripId = location.pathname.split("/viagens/")[1];
      if (tripId && tripId !== "") {
        context.tripId = tripId;
      }
    }

    // Se estiver em uma conta específica
    if (location.pathname.startsWith("/contas/")) {
      const accountId = location.pathname.split("/contas/")[1];
      if (accountId && accountId !== "") {
        context.accountId = accountId;
      }
    }

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
      {/* TopBar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background transform-gpu safe-top">
        <div className="w-full px-4 md:px-6 lg:px-8">
          <div className="flex h-12 items-center justify-between gap-2">
            {/* Logo Wordmark */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0 mr-1 lg:mr-6 min-w-max">
              <span className="font-display font-bold text-sm md:text-base tracking-tight whitespace-nowrap block">
                pé de meia
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav
              className="hidden md:flex items-center gap-0 flex-1 justify-center flex-wrap"
              aria-label="Navegação principal"
            >
              {navigationItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={item.label}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 whitespace-nowrap",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
              {secondaryNavItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 whitespace-nowrap",
                        "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                      )}
                      aria-label="Mais itens de navegação"
                    >
                      <Grid3X3 className="h-3.5 w-3.5 flex-shrink-0" />
                      Mais
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {secondaryNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        location.pathname === item.path ||
                        (item.path !== "/" && location.pathname.startsWith(item.path));
                      return (
                        <DropdownMenuItem key={item.path} asChild>
                          <Link
                            to={item.path}
                            className={cn(
                              "flex items-center gap-2 cursor-pointer",
                              isActive && "text-primary font-medium"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>

            {/* Right Section — isolado para não derrubar o header inteiro em caso de erro */}
            <ErrorBoundary fallback={null}>
              <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSearch(true)}
                  className="text-muted-foreground hover:text-foreground relative"
                  aria-label="Buscar (Ctrl+K)"
                  title="Buscar (Ctrl+K)"
                >
                  <Search className="h-4 w-4" />
                  <span className="absolute -bottom-0.5 right-0 text-[9px] font-mono text-muted-foreground/60 hidden md:inline">
                    Ctrl+K
                  </span>
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
        </div>

        {/* Month Selector - Below TopBar */}
        {/* Hide month selector on pages that don't use monthly context */}
        {!["/cartoes", "/simuladores", "/configuracoes", "/familia"].includes(location.pathname) &&
          !location.pathname.startsWith("/cartoes/") && (
            <div className="border-t border-border bg-background shadow-sm">
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
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-5">
          <OnboardingGuard>{children}</OnboardingGuard>
        </div>
      </main>

      {/* Mobile Navigation Bar */}
      <MobileNav />

      {/* Global Transaction Modal */}
      <TransactionModal open={showTransactionModal} onOpenChange={setShowTransactionModal} />

      <GlobalSearch open={showSearch} onOpenChange={setShowSearch} />
    </div>
  );
}
