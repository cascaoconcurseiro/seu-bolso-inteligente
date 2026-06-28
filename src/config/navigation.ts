import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Users,
  Plane,
  BarChart3,
  UsersRound,
  Wallet,
  PiggyBank,
  Target,
  Calculator,
  Settings,
  MoreHorizontal,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

// 7 itens principais + submenu "Mais" (Miller's Law: máximo 7±2)
export const navigationItems: NavItem[] = [
  { path: "/", label: "Início", icon: LayoutDashboard },
  { path: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { path: "/cartoes", label: "Cartões", icon: CreditCard },
  { path: "/compartilhados", label: "Compartilhado", icon: Users },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { path: "/metas", label: "Planejar", icon: Target },
  { path: "/configuracoes", label: "Ajustes", icon: Settings },
];

// Itens que aparecem no submenu "Mais" (acessíveis mas não no nav principal)
export const secondaryNavItems = [
  { path: "/contas", label: "Contas", icon: Wallet },
  { path: "/viagens", label: "Viagens", icon: Plane },
  { path: "/familia", label: "Família", icon: UsersRound },
  { path: "/orcamentos", label: "Orçamentos", icon: PiggyBank },
  { path: "/simuladores", label: "Simuladores", icon: Calculator },
];
