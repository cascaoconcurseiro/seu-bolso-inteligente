import type { SettingsSection } from "@/components/settings/SettingsSidebar";

const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  "account",
  "preferences",
  "security",
  "categories",
  "people",
  "notifications",
  "backup",
  "admin",
  "help",
  "automations",
  "privacy",
];

const TRIP_ROUTE_BY_TAB: Record<string, string> = {
  summary: "resumo",
  itinerary: "planejar",
  community: "comunidade",
  expenses: "gastos",
  exchange: "cambio",
  checklist: "preparar",
  preparation: "preparar",
  bags: "malas",
  shopping: "compras",
  journal: "diario",
};

const TRIP_TAB_BY_ROUTE: Record<string, string> = {
  resumo: "summary",
  planejar: "itinerary",
  comunidade: "community",
  gastos: "expenses",
  cambio: "exchange",
  preparar: "checklist",
  malas: "bags",
  compras: "shopping",
  diario: "journal",
};

export function getTripRoute(tripId: string, tab: string): string {
  return `/viagens/${encodeURIComponent(tripId)}/${TRIP_ROUTE_BY_TAB[tab] ?? "resumo"}`;
}

export function getTripTabFromRoute(segment?: string): string {
  return segment ? (TRIP_TAB_BY_ROUTE[segment] ?? "summary") : "summary";
}

export function isValidTripRouteTab(segment?: string): boolean {
  return !segment || Object.hasOwn(TRIP_TAB_BY_ROUTE, segment);
}

export function getSettingsSection(value: string | null): SettingsSection {
  return SETTINGS_SECTIONS.includes(value as SettingsSection)
    ? (value as SettingsSection)
    : "account";
}

export function isNavigationPathActive(pathname: string, itemPath: string): boolean {
  if (itemPath === "/") return pathname === "/";
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

const ROUTE_TITLES: ReadonlyArray<readonly [path: string, title: string]> = [
  ["/configuracoes", "Configurações"],
  ["/compartilhados", "Compartilhados"],
  ["/transacoes", "Transações"],
  ["/relatorios", "Relatórios"],
  ["/orcamentos", "Orçamentos"],
  ["/simuladores", "Simuladores"],
  ["/investimentos", "Investimentos"],
  ["/viagens", "Viagens"],
  ["/familia", "Família"],
  ["/cartoes", "Cartões"],
  ["/contas", "Contas"],
  ["/metas", "Metas e investimentos"],
];

export function getRouteTitle(pathname: string): string {
  const normalizedPath = pathname.split(/[?#]/, 1)[0] || "/";
  if (normalizedPath === "/") return "Início";
  return (
    ROUTE_TITLES.find(([path]) => isNavigationPathActive(normalizedPath, path))?.[1] ??
    "Pé de Meia"
  );
}

export function getRouteResourceId(pathname: string, basePath: string): string | null {
  if (!isNavigationPathActive(pathname, basePath) || pathname === basePath) return null;
  const [resourceId] = pathname.slice(basePath.length + 1).split("/");
  return resourceId ? decodeURIComponent(resourceId) : null;
}

export function paginateItems<T>(items: readonly T[], visibleCount: number): T[] {
  return items.slice(0, Math.max(0, visibleCount));
}
