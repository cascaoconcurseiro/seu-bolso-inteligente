import { test, expect } from "./fixtures/auth";

test.describe("Módulos: Viagens", () => {
  test("Deve exibir gestão de viagens", async ({ authenticatedPage: page }) => {
    await page.goto("/viagens");
    await expect(page.locator('h1:has-text("Viagens")')).toBeVisible({ timeout: 10000 });
    const newBtn = page.locator('button:has-text("Nova Viagem")');
    if (await newBtn.isVisible()) {
      await newBtn.click();
      await expect(page.locator('text="Destino"').first()).toBeVisible();
    }
  });
});
