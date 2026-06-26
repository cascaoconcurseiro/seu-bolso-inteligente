import { test, expect } from "./fixtures/auth";

test.describe("Core: Contas Correntes e Poupanças", () => {
  test("Deve abrir listagem de contas", async ({ authenticatedPage: page }) => {
    await page.goto("/contas");
    await expect(page.locator('h1:has-text("Contas")')).toBeVisible({ timeout: 10000 });
    const addBtn = page.locator('button:has-text("Nova Conta")');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await expect(page.locator('input[name="name"]')).toBeVisible();
    }
  });
});
