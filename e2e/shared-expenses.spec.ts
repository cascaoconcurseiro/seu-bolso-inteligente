import { test, expect } from "./fixtures/auth";

test.describe("Módulos: Despesas Compartilhadas", () => {
  test("Deve carregar painel de Acertos (Settlements)", async ({ authenticatedPage: page }) => {
    await page.goto("/compartilhados");
    await expect(page.locator('h1:has-text("Despesas Compartilhadas")')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('text="Acertos"').first()).toBeVisible();
  });
});
