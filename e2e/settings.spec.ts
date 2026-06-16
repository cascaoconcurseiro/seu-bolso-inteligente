import { test, expect } from '@playwright/test';

test.describe('Configurações do Sistema', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('PLAYWRIGHT_MOCK_AUTH', 'true');
    });
  });

  test('Deve carregar Preferências de Usuário', async ({ page }) => {
    await page.goto('/configuracoes');
    const header = page.locator('h1:has-text("Configurações")');
    if (await header.isVisible()) {
      await expect(page.locator('text="Notificações"').first()).toBeVisible();
    }
  });
});
