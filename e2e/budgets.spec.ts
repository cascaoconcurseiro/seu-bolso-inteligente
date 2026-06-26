import { test, expect } from "./fixtures/auth";

test.describe("Planejamento: Orçamentos", () => {
  test("Deve carregar painel de limites", async ({ authenticatedPage: page }) => {
    await page.goto("/orcamentos");
    await expect(page.locator('h1:has-text("Orçamentos")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="Disponível"').first()).toBeVisible();
  });
});
