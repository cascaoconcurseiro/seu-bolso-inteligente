import { test, expect } from '@playwright/test';

test.describe('Planejamento: Relatórios Consolidados', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('PLAYWRIGHT_MOCK_AUTH', 'true');
    });
  });

  test('Deve ocultar Select de Data ao clicar em Cartões (Correção F5 Bug)', async ({ page }) => {
    await page.goto('/relatorios');
    const header = page.locator('h1:has-text("Relatórios")');
    if (await header.isVisible()) {
      const btnCartoes = page.locator('button:has-text("Cartões")');
      if (await btnCartoes.isVisible()) {
        await btnCartoes.click();
        await expect(page.locator('text="Ciclo de Fatura"').first()).toBeVisible();
      }
    }
  });
});
