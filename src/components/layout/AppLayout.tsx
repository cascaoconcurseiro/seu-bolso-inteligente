import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
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
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle("dark", newIsDark);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // Detectar contexto baseado na rota atual
  const handleNewTransaction = () => {
    // Extrair contexto da URL
    const context: any = {};
    
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
      {/* TopBar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-3 md:px-6 lg:px-8">
          <div className="flex h-14 md:h-16 items-center justify-between">
            {/* Logo Wordmark */}
            <Link to="/" className="flex items-center gap-2">
              <span className="font-display font-bold text-lg md:text-xl tracking-tight">
                pé de meia
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-1 md:gap-2">
              {/* Notifications */}
              <NotificationButton />

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
                      size="sm"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-sm truncate">{user?.email}</p>
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
          <div className="border-t border-border bg-background">
            <div className="max-w-7xl mx-auto px-3 md:px-6 lg:px-8 py-2 md:py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex-1 w-full sm:w-auto" />
              <MonthSelector />
              <div className="flex-1 w-full sm:w-auto flex justify-end">
                <Button 
                  size="sm"
                  onClick={handleNewTransaction}
                  className="w-full sm:w-auto gap-2 h-11 md:h-9"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nova transação</span>
                  <span className="sm:hidden">Nova</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
          {children}
        </div>
      </main>

      {/* Global Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
      />
    </div>
  );
}
