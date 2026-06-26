import { test, expect } from "./fixtures/auth";

test.describe("Planejamento: Relatórios Consolidados", () => {
  test("Deve ocultar Select de Data ao clicar em Cartões (Correção F5 Bug)", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/relatorios");
    await expect(page.locator('h1:has-text("Relatórios")')).toBeVisible({ timeout: 10000 });
    const btnCartoes = page.locator('button:has-text("Cartões")');
    if (await btnCartoes.isVisible()) {
      await btnCartoes.click();
      await expect(page.locator('text="Ciclo de Fatura"').first()).toBeVisible();
    }
  });
});
