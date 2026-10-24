const routePreloaders: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/Dashboard"),
  "/transacoes": () => import("@/pages/Transactions"),
  "/contas": () => import("@/pages/Accounts"),
  "/cartoes": () => import("@/pages/CreditCards"),
  "/compartilhados": () => import("@/pages/SharedExpenses"),
  "/relatorios": () => import("@/pages/Reports"),
  "/metas": () => import("@/pages/GoalsAndInvestments"),
  "/orcamentos": () => import("@/pages/Budgets"),
  "/viagens": () => import("@/pages/Trips"),
  "/familia": () => import("@/pages/Family"),
  "/simuladores": () => import("@/pages/Calculators"),
  "/configuracoes": () => import("@/pages/Settings"),
};

export function preloadNavigationRoute(path: string): Promise<unknown> | undefined {
  return routePreloaders[path]?.();
}
