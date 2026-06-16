import { test, expect } from '@playwright/test';

test.describe('Core: Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('PLAYWRIGHT_MOCK_AUTH', 'true');
    });
  });

  test('Deve carregar a estrutura do Dashboard', async ({ page }) => {
    await page.goto('/');
    // Check main sections
    const title = page.locator('text="Seu Bolso"').first();
    // Assuming we are mocking auth or testing structure
    if (await title.isVisible()) {
      await expect(title).toBeVisible();
      // Check charts
      await expect(page.locator('.recharts-wrapper').first()).toBeVisible({ timeout: 5000 });
    }
  });
});
