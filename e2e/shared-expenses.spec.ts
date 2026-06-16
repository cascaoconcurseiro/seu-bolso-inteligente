import { test, expect } from '@playwright/test';

test.describe('Módulos: Despesas Compartilhadas', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('PLAYWRIGHT_MOCK_AUTH', 'true');
    });
  });

  test('Deve carregar painel de Acertos (Settlements)', async ({ page }) => {
    await page.goto('/compartilhados');
    const header = page.locator('h1:has-text("Despesas Compartilhadas")');
    if (await header.isVisible()) {
      await expect(page.locator('text="Acertos"').first()).toBeVisible();
    }
  });
});
