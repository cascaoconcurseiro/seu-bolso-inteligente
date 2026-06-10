import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useGlobalRealtime } from "@/hooks/useGlobalRealtime";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Users,
  Plane,
  BarChart3,
  Settings,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  UsersRound,
  Wallet,
  Plus,
  PiggyBank,
  Target,
  Eye,
  EyeOff,
} from "lucide-react";
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
import { QuickAddModal } from "@/components/modals/QuickAddModal";
import { DraggableQuickAddFAB } from "@/components/ui/DraggableQuickAddFAB";
import { MobileNav } from "./MobileNav";
import { VersionGuard } from "./VersionGuard";
import { usePrivacy } from "@/contexts/PrivacyContext";

const navigationItems = [
  { path: "/", label: "Início", icon: LayoutDashboard },
  { path: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { path: "/contas", label: "Contas", icon: Wallet },
  { path: "/cartoes", label: "Cartões", icon: CreditCard },
  { path: "/compartilhados", label: "Compartilhados", icon: Users },
  { path: "/viagens", label: "Viagens", icon: Plane },
  { path: "/familia", label: "Família", icon: UsersRound },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { path: "/orcamentos", label: "Orçamentos", icon: PiggyBank },
  { path: "/metas", label: "Metas & Inv.", icon: Target },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      // Persistência: lê do localStorage primeiro
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useUserProfile();
  const { showTransactionModal, setShowTransactionModal, showQuickAddModal, setShowQuickAddModal } = useTransactionModal();
  const { isPrivate, togglePrivacy } = usePrivacy();

  // Ativa a escuta de Realtime global para toda a aplicação
  useGlobalRealtime();

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle("dark", newIsDark);
    // Persistência: salva no localStorage
    localStorage.setItem("theme", newIsDark ? "dark" : "light");
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
    if (location.pathname.startsWith('/viagens/')) {
      const tripId = location.pathname.split('/viagens/')[1];
      if (tripId && tripId !== '') {
        context.tripId = tripId;
      }
    }
    
    // Se estiver em uma conta específica
    if (location.pathname.startsWith('/contas/')) {
      const accountId = location.pathname.split('/contas/')[1];
      if (accountId && accountId !== '') {
        context.accountId = accountId;
      }
    }
    
    setShowTransactionModal(true, context);
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <VersionGuard />
      {/* TopBar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-2 md:px-4 lg:px-6">
          <div className="flex h-14 md:h-16 items-center justify-between gap-1">
            {/* Logo Wordmark */}
            <Link to="/" className="flex items-center gap-1.5 flex-shrink-0 mr-3 lg:mr-6 min-w-max">
              <span className="font-display font-bold text-base md:text-lg tracking-tight whitespace-nowrap block">
                pé de meia
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-0.5 xl:gap-1 flex-1 justify-center">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-1.5 lg:px-2 lg:py-2 rounded-lg text-[10px] lg:text-xs xl:text-sm font-bold tracking-tight transition-all duration-200 whitespace-nowrap",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                    )}
                  >
                    <Icon className="h-3 w-3 lg:h-3.5 lg:w-3.5 flex-shrink-0 hidden lg:block" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 ml-auto md:ml-4">
              {/* Notifications */}
              <NotificationButton />

              {/* Privacy Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePrivacy}
                className="h-10 w-10 md:h-9 md:w-9 text-muted-foreground hover:text-foreground"
              >
                {isPrivate ? <EyeOff className="h-5 w-5 md:h-4 md:w-4" /> : <Eye className="h-5 w-5 md:h-4 md:w-4" />}
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-10 w-10 md:h-9 md:w-9 text-muted-foreground hover:text-foreground"
              >
                {isDark ? <Sun className="h-5 w-5 md:h-4 md:w-4" /> : <Moon className="h-5 w-5 md:h-4 md:w-4" />}
              </Button>

              {/* Settings - Hidden on mobile */}
              <Link to="/configuracoes" className="hidden md:block">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>

              {/* User Menu - Hidden on mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="hidden md:flex">
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full p-0"
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
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-sm truncate">{profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden h-10 w-10 text-muted-foreground hover:text-foreground"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border animate-slide-down">
            <nav className="max-w-7xl mx-auto px-3 py-4 space-y-1">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[44px]",
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              {/* Settings link in mobile menu */}
              <Link
                to="/configuracoes"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[44px] text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <Settings className="h-5 w-5" />
                <span className="font-medium">Configurações</span>
              </Link>
              {/* Logout in mobile menu */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[44px] text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Sair</span>
              </button>
            </nav>
          </div>
        )}

        {/* Month Selector - Below TopBar */}
        {/* Hide month selector on credit cards page (uses invoice cycle selector instead) */}
        {location.pathname !== '/cartoes' && (
          <div className="border-t border-border bg-background shadow-sm">
            <div className="max-w-7xl mx-auto px-3 md:px-6 lg:px-8 py-2 md:py-3 flex items-center justify-between gap-3">
              <div className="flex-1 hidden md:block" />
              
              <div className="flex items-center gap-2 flex-1 md:flex-initial justify-center md:justify-center">
                <MonthSelector />
              </div>

              <div className="hidden md:flex justify-end md:flex-1">
                <Button 
                  size="sm"
                  onClick={handleNewTransaction}
                  className="gap-2 h-10 md:h-9 px-4 md:px-6 shadow-md shadow-primary/20 transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nova transação</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Navigation Bar */}
      <MobileNav />

      {/* Global Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
      />

      <QuickAddModal 
        isOpen={showQuickAddModal} 
        onClose={() => setShowQuickAddModal(false)} 
      />

      <DraggableQuickAddFAB onClick={() => setShowQuickAddModal(true)} />
    </div>
  );
}
