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

export interface NavigationGroup {
  label: string;
  items: NavItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Dia a dia",
    items: [
      { path: "/", label: "Início", icon: LayoutDashboard },
      { path: "/transacoes", label: "Transações", icon: ArrowLeftRight },
      { path: "/contas", label: "Contas", icon: Wallet },
      { path: "/cartoes", label: "Cartões", icon: CreditCard },
    ],
  },
  {
    label: "Planejamento",
    items: [
      { path: "/metas", label: "Metas e investimentos", icon: Target },
      { path: "/orcamentos", label: "Orçamentos", icon: PiggyBank },
      { path: "/viagens", label: "Viagens", icon: Plane },
    ],
  },
  {
    label: "Vida compartilhada",
    items: [
      { path: "/compartilhados", label: "Compartilhados", icon: Users },
      { path: "/familia", label: "Família", icon: UsersRound },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { path: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { path: "/simuladores", label: "Simuladores", icon: Calculator },
    ],
  },
];

const navigationByPath = new Map(
  navigationGroups.flatMap((group) => group.items).map((item) => [item.path, item])
);

export const navigationItems: NavItem[] = [
  "/",
  "/transacoes",
  "/contas",
  "/cartoes",
  "/compartilhados",
  "/relatorios",
  "/metas",
  "/orcamentos",
  "/viagens",
  "/familia",
  "/simuladores",
].map((path) => navigationByPath.get(path) as NavItem);

export const secondaryNavItems: NavItem[] = [];
