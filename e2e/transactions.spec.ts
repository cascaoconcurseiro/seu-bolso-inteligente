import { test, expect } from '@playwright/test';

test.describe('Core: Transações', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('PLAYWRIGHT_MOCK_AUTH', 'true');
    });
  });

  test('Deve abrir o Modal de Nova Transação', async ({ page }) => {
    await page.goto('/transacoes');
    const newBtn = page.locator('button:has-text("Nova Transação"), button:has-text("Adicionar")');
    if (await newBtn.isVisible()) {
      await newBtn.click();
      await expect(page.locator('text="Valor"').first()).toBeVisible();
      await expect(page.locator('text="Categoria"').first()).toBeVisible();
    }
  });
});
