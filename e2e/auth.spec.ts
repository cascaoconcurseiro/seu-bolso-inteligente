import { test, expect } from '@playwright/test';

test.describe('Autenticação e Perfis', () => {
  test('Deve carregar a tela de Login', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('text="Entrar"').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
  
  test('Deve alternar para o formulário de Cadastro', async ({ page }) => {
    await page.goto('/auth');
    const registerTab = page.locator('button[role="tab"]:has-text("Cadastro")');
    if (await registerTab.isVisible()) {
      await registerTab.click();
      await expect(page.locator('text="Criar Conta"').first()).toBeVisible();
    }
  });
});
