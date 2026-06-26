import { test, expect } from "./fixtures/auth";

test.describe("Módulos: Família e Membros", () => {
  test("Deve listar membros da família", async ({ authenticatedPage: page }) => {
    await page.goto("/familia");
    await expect(page.locator('h1:has-text("Família")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Convidar")').first()).toBeVisible();
  });
});
