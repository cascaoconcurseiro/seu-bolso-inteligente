import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  ArrowLeftRight, 
  Plus, 
  Users, 
  Compass
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTransactionModal } from '@/hooks/useTransactionModal';

// AUDITORIA 2026-05-10: Componente de Navegação Inferior para Mobile
// Foco em usabilidade com uma mão só e estética de app nativo.

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setShowTransactionModal } = useTransactionModal();

  const navItems = [
    { label: 'Início', icon: Home, path: '/' },
    { label: 'Extrato', icon: ArrowLeftRight, path: '/transacoes' },
    { label: 'Add', icon: Plus, isAction: true }, // Botão central de ação
    { label: 'Grupos', icon: Users, path: '/compartilhados' },
    { label: 'Viagens', icon: Compass, path: '/viagens' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
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
  );
}

