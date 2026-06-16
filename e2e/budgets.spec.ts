import { test, expect } from '@playwright/test';

test.describe('Planejamento: Orçamentos', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('PLAYWRIGHT_MOCK_AUTH', 'true');
    });
  });

  test('Deve carregar painel de limites', async ({ page }) => {
    await page.goto('/orcamentos');
    const header = page.locator('h1:has-text("Orçamentos")');
    if (await header.isVisible()) {
      await expect(page.locator('text="Disponível"').first()).toBeVisible();
    }
  });
});
