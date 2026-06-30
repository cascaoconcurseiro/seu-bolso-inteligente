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

// Itens primários (visíveis — máximo 5+1, NN/g Miller's Law)
export const navigationItems: NavItem[] = [
  { path: "/", label: "Início", icon: LayoutDashboard },
  { path: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { path: "/metas", label: "Planejar", icon: Target },
  { path: "/configuracoes", label: "Ajustes", icon: Calculator },
];

// Itens secundários (menu "Mais")
export const secondaryNavItems: NavItem[] = [
  { path: "/contas", label: "Contas", icon: Wallet },
  { path: "/cartoes", label: "Cartões", icon: CreditCard },
  { path: "/compartilhados", label: "Compartilhado", icon: Users },
  { path: "/orcamentos", label: "Orçamentos", icon: PiggyBank },
  { path: "/viagens", label: "Viagens", icon: Plane },
  { path: "/familia", label: "Família", icon: UsersRound },
];
