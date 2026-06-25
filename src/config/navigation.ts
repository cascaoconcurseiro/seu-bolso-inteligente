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

export const navigationItems = [
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
