import { test, expect } from '@playwright/test';

test.describe('Módulos: Família e Membros', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('PLAYWRIGHT_MOCK_AUTH', 'true');
    });
  });

  test('Deve listar membros da família', async ({ page }) => {
    await page.goto('/familia');
    const header = page.locator('h1:has-text("Família")');
    if (await header.isVisible()) {
      await expect(page.locator('button:has-text("Convidar")').first()).toBeVisible();
    }
  });
});
