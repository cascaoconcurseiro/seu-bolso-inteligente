import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
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
  Calculator,
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
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";

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
  { path: "/simuladores", label: "Simuladores", icon: Calculator },
];

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
  const { showTransactionModal, setShowTransactionModal, showQuickAddModal, setShowQuickAddModal } = useTransactionModal();
  const { isPrivate, togglePrivacy } = usePrivacy();

  // Ativa a escuta de Realtime global para toda a aplicação
  useGlobalRealtime();

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
          <div className="flex h-14 md:h-16 items-center justify-between gap-2 md:gap-4">
            {/* Logo Wordmark */}
            <Link to="/" className="flex items-center gap-1.5 flex-shrink-0 mr-1 lg:mr-6 min-w-max">
              <span className="font-display font-bold text-sm md:text-lg tracking-tight whitespace-nowrap block">
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
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 ml-auto">
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

            </div>
          </div>
        </div>



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
      <main className="flex-1 pb-32 md:pb-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
          <OnboardingGuard>
            {children}
          </OnboardingGuard>
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
