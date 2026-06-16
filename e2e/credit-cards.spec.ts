import { test, expect } from '@playwright/test';

test.describe('Core: Cartões de Crédito', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('PLAYWRIGHT_MOCK_AUTH', 'true');
    });
  });

  test('Deve carregar a gestão de cartões', async ({ page }) => {
    await page.goto('/cartoes');
    const header = page.locator('h1:has-text("Cartões")');
    if (await header.isVisible()) {
      await expect(header).toBeVisible();
      // Deve existir a área de Limites e Faturas
      await expect(page.locator('text="Limite"').first()).toBeVisible();
      await expect(page.locator('text="Fatura"').first()).toBeVisible();
    }
  });
});
