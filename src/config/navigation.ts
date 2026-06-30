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
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

// Todos os itens visíveis diretamente na navegação principal
export const navigationItems: NavItem[] = [
  { path: "/", label: "Início", icon: LayoutDashboard },
  { path: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { path: "/contas", label: "Contas", icon: Wallet },
  { path: "/cartoes", label: "Cartões", icon: CreditCard },
  { path: "/compartilhados", label: "Compartilhado", icon: Users },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { path: "/metas", label: "Planejar", icon: Target },
  { path: "/orcamentos", label: "Orçamentos", icon: PiggyBank },
  { path: "/viagens", label: "Viagens", icon: Plane },
  { path: "/familia", label: "Família", icon: UsersRound },
  { path: "/simuladores", label: "Simuladores", icon: Calculator },
];

// Itens secundários (menu overflow, ajustes, etc.)
export const secondaryNavItems: NavItem[] = [];
