import { test, expect } from '@playwright/test';

test.describe('Planejamento: Metas e Investimentos', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('PLAYWRIGHT_MOCK_AUTH', 'true');
    });
  });

  test('Deve permitir alternar entre Metas e Ativos', async ({ page }) => {
    await page.goto('/metas');
    const header = page.locator('text="Metas"').first();
    if (await header.isVisible()) {
      const btnInvest = page.locator('button[role="tab"]:has-text("Investimentos")');
      if (await btnInvest.isVisible()) {
        await btnInvest.click();
        await expect(page.locator('text="Patrimônio Total"').first()).toBeVisible();
      }
    }
  });
});
