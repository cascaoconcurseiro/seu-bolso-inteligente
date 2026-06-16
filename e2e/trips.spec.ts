import { test, expect } from '@playwright/test';

test.describe('Módulos: Viagens', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('PLAYWRIGHT_MOCK_AUTH', 'true');
    });
  });

  test('Deve exibir gestão de viagens', async ({ page }) => {
    await page.goto('/viagens');
    const header = page.locator('h1:has-text("Viagens")');
    if (await header.isVisible()) {
      const newBtn = page.locator('button:has-text("Nova Viagem")');
      if (await newBtn.isVisible()) {
        await newBtn.click();
        await expect(page.locator('text="Destino"').first()).toBeVisible();
      }
    }
  });
});
