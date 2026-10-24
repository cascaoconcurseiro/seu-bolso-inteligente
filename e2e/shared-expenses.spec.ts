import { test, expect } from "./fixtures/auth";

test.describe("Módulos: Despesas Compartilhadas", () => {
  test("Deve carregar painel de Acertos (Settlements)", async ({ authenticatedPage: page }) => {
    await page.goto("/compartilhados");
    await expect(page.getByRole("heading", { level: 1, name: "Compartilhados" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("tab", { name: /Regular/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Viagens/ })).toBeVisible();
  });
});
