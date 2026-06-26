import { test, expect } from "./fixtures/auth";

test.describe("Módulos: Calculadoras Financeiras", () => {
  test("Deve alternar entre calculadoras", async ({ authenticatedPage: page }) => {
    await page.goto("/simuladores");
    await expect(page.locator('h1:has-text("Calculadoras")')).toBeVisible({ timeout: 10000 });
    const jurosBtn = page.locator('button[role="tab"]:has-text("Juros Compostos")');
    if (await jurosBtn.isVisible()) {
      await jurosBtn.click();
      await expect(page.locator('text="Aporte"').first()).toBeVisible();
    }
  });
});
