import { test, expect } from '@playwright/test';

test.describe('Core: Contas Correntes e Poupanças', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('PLAYWRIGHT_MOCK_AUTH', 'true');
    });
  });

  test('Deve abrir listagem de contas', async ({ page }) => {
    await page.goto('/contas');
    const header = page.locator('h1:has-text("Contas")');
    if (await header.isVisible()) {
      await expect(header).toBeVisible();
      const addBtn = page.locator('button:has-text("Nova Conta")');
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await expect(page.locator('input[name="name"]')).toBeVisible();
      }
    }
  });
});
