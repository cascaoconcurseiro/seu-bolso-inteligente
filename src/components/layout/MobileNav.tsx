import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  ArrowLeftRight, 
  Plus, 
  Menu,
  X,
  CreditCard,
  Users,
  Plane,
  BarChart3,
  Settings,
  LogOut,
  UsersRound,
  PiggyBank,
  Target,
  Calculator,
  Moon,
  Sun,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTransactionModal } from '@/hooks/useTransactionModal';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';

// AUDITORIA 2026-05-10: Componente de Navegação Inferior para Mobile com BottomSheet.
// Foco em usabilidade com uma mão só e estética de app nativo.

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setShowTransactionModal } = useTransactionModal();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { theme, setTheme, systemTheme } = useTheme();
  const { signOut } = useAuth();
  
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

  const navItems = [
    { label: 'Início', icon: Home, path: '/' },
    { label: 'Extrato', icon: ArrowLeftRight, path: '/transacoes' },
    { label: 'Add', icon: Plus, isAction: true },
    { label: 'Relatórios', icon: BarChart3, path: '/relatorios' },
    { label: 'Menu', icon: Menu, isMenu: true },
  ];

  const sheetItems = [
    { path: "/", label: "Início", icon: LayoutDashboard },
    { path: "/transacoes", label: "Transações", icon: ArrowLeftRight },
    { path: "/contas", label: "Contas", icon: PiggyBank }, // PiggyBank as Wallet alternative
    { path: "/cartoes", label: "Cartões", icon: CreditCard },
    { path: "/compartilhados", label: "Compartilhados", icon: Users },
    { path: "/viagens", label: "Viagens", icon: Plane },
    { path: "/familia", label: "Família", icon: UsersRound },
    { path: "/relatorios", label: "Relatórios", icon: BarChart3 },
    { path: "/orcamentos", label: "Orçamentos", icon: PiggyBank },
    { path: "/metas", label: "Metas & Inv.", icon: Target },
    { path: "/simuladores", label: "Simuladores", icon: Calculator },
  ];

  const isActive = (path: string) => location.pathname === path;

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
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-background border-t border-border rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-out flex flex-col",
          isSheetOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ maxHeight: '85vh' }}
      >
        <div className="w-full flex justify-center py-3" onClick={closeSheet}>
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>
        
        <div className="px-6 pb-6 overflow-y-auto no-scrollbar flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">Menu Principal</h2>
            <button onClick={closeSheet} className="p-2 bg-muted/50 rounded-full text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid gap-2 mb-6">
            {sheetItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
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
              )
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border">
        <div className="flex items-center justify-between h-16 max-w-md mx-auto px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            
            if (item.isAction) {
              return (
                <button
                  key="add-btn"
                  onClick={() => setShowTransactionModal(true)}
                  className="relative -top-5 w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform duration-200 hover:brightness-110"
                >
                  <Plus className="w-7 h-7" />
                </button>
              );
            }

            if (item.isMenu) {
              return (
                <button
                  key="menu-btn"
                  onClick={() => setIsSheetOpen(true)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-colors duration-200 py-1 rounded-xl",
                    isSheetOpen ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center rounded-xl transition-all duration-300",
                    isSheetOpen ? "bg-primary/15 w-12 h-7 -mb-0.5" : "w-7 h-7"
                  )}>
                    <Icon className={cn("transition-all duration-300", isSheetOpen ? "w-5 h-5 scale-110" : "w-5 h-5")} />
                  </div>
                  <span className={cn("text-[10px] font-medium transition-all duration-200", isSheetOpen ? "font-bold" : "")}>{item.label}</span>
                </button>
              );
            }

            const active = isActive(item.path!);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path!)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-colors duration-200 py-1 rounded-xl",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {/* Pill indicator */}
                <div className={cn(
                  "flex items-center justify-center rounded-xl transition-all duration-300",
                  active
                    ? "bg-primary/15 w-12 h-7 -mb-0.5"
                    : "w-7 h-7"
                )}>
                  <Icon className={cn(
                    "transition-all duration-300",
                    active ? "w-5 h-5 scale-110" : "w-5 h-5"
                  )} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium transition-all duration-200",
                  active ? "font-bold" : ""
                )}>{item.label}</span>
              </button>
            );
          })}
        </div>
        {/* Safe area for notch devices */}
        <div className="h-safe-bottom bg-background/95" />
      </nav>
    </>
  );
}
