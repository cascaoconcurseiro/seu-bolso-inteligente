import { test, expect } from "./fixtures/auth";

test.describe("Core: Cartões de Crédito", () => {
  test("Deve carregar a gestão de cartões", async ({ authenticatedPage: page }) => {
    await page.goto("/cartoes");
    await expect(page.locator('h1:has-text("Cartões")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="Limite"').first()).toBeVisible();
    await expect(page.locator('text="Fatura"').first()).toBeVisible();
  });
});
