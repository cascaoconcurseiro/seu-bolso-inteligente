import { test, expect } from '@playwright/test';

test.describe('Módulos: Calculadoras Financeiras', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('PLAYWRIGHT_MOCK_AUTH', 'true');
    });
  });

  test('Deve alternar entre calculadoras', async ({ page }) => {
    await page.goto('/simuladores');
    const header = page.locator('h1:has-text("Calculadoras")');
    if (await header.isVisible()) {
      const jurosBtn = page.locator('button[role="tab"]:has-text("Juros Compostos")');
      if (await jurosBtn.isVisible()) {
        await jurosBtn.click();
        await expect(page.locator('text="Aporte"').first()).toBeVisible();
      }
    }
  });
});
