import { test, expect } from "./fixtures/auth";

test.describe("Planejamento: Metas e Investimentos", () => {
  test("Deve permitir alternar entre Metas e Ativos", async ({ authenticatedPage: page }) => {
    await page.goto("/metas");
    await expect(page.locator('text="Metas"').first()).toBeVisible({ timeout: 10000 });
    const btnInvest = page.locator('button[role="tab"]:has-text("Investimentos")');
    if (await btnInvest.isVisible()) {
      await btnInvest.click();
      await expect(page.locator('text="Patrimônio Total"').first()).toBeVisible();
    }
  });
});
