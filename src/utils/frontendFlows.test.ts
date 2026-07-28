import { describe, expect, it } from "vitest";
import {
  getSettingsSection,
  getRouteResourceId,
  getRouteTitle,
  getTripRoute,
  getTripTabFromRoute,
  isNavigationPathActive,
  isValidTripRouteTab,
  paginateItems,
} from "./frontendFlows";

describe("frontend flow helpers", () => {
  it("builds stable deep links for every trip tab", () => {
    expect(getTripRoute("trip-1", "summary")).toBe("/viagens/trip-1/resumo");
    expect(getTripRoute("trip-1", "itinerary")).toBe("/viagens/trip-1/planejar");
    expect(getTripRoute("trip-1", "expenses")).toBe("/viagens/trip-1/gastos");
    expect(getTripRoute("trip-1", "checklist")).toBe("/viagens/trip-1/preparar");
  });

  it("maps public trip route segments to internal tab values", () => {
    expect(getTripTabFromRoute("planejar")).toBe("itinerary");
    expect(getTripTabFromRoute("gastos")).toBe("expenses");
    expect(getTripTabFromRoute("preparar")).toBe("checklist");
    expect(getTripTabFromRoute("desconhecida")).toBe("summary");
    expect(isValidTripRouteTab("planejar")).toBe(true);
    expect(isValidTripRouteTab("desconhecida")).toBe(false);
  });

  it("accepts every settings section and rejects unknown values", () => {
    expect(getSettingsSection("categories")).toBe("categories");
    expect(getSettingsSection("privacy")).toBe("privacy");
    expect(getSettingsSection("unknown")).toBe("account");
  });

  it("treats nested paths as active without matching similarly named routes", () => {
    expect(isNavigationPathActive("/viagens/abc/resumo", "/viagens")).toBe(true);
    expect(isNavigationPathActive("/contas/abc", "/contas")).toBe(true);
    expect(isNavigationPathActive("/contas-extra", "/contas")).toBe(false);
  });

  it("provides a stable page title for top-level and nested routes", () => {
    expect(getRouteTitle("/")).toBe("Início");
    expect(getRouteTitle("/viagens/trip-1/planejar")).toBe("Viagens");
    expect(getRouteTitle("/configuracoes?section=privacy")).toBe("Configurações");
    expect(getRouteTitle("/rota-inexistente")).toBe("Pé de Meia");
  });

  it("extracts only the resource id from nested detail routes", () => {
    expect(getRouteResourceId("/viagens/trip-1/planejar", "/viagens")).toBe("trip-1");
    expect(getRouteResourceId("/contas/account-1", "/contas")).toBe("account-1");
    expect(getRouteResourceId("/viagens", "/viagens")).toBeNull();
  });

  it("renders only the requested incremental page", () => {
    const items = Array.from({ length: 125 }, (_, index) => index);
    expect(paginateItems(items, 50)).toHaveLength(50);
    expect(paginateItems(items, 150)).toHaveLength(125);
  });
});
