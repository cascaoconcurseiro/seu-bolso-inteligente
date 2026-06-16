# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Autenticação e Perfis >> Deve carregar a tela de Login
- Location: e2e\auth.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text="Entrar"').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text="Entrar"').first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - img "Logo Pé de Meia" [ref=e3]
  - generic [ref=e4]: pé de meia
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Autenticação e Perfis', () => {
  4  |   test('Deve carregar a tela de Login', async ({ page }) => {
  5  |     await page.goto('/auth');
> 6  |     await expect(page.locator('text="Entrar"').first()).toBeVisible();
     |                                                         ^ Error: expect(locator).toBeVisible() failed
  7  |     await expect(page.locator('input[type="email"]')).toBeVisible();
  8  |     await expect(page.locator('input[type="password"]')).toBeVisible();
  9  |   });
  10 |   
  11 |   test('Deve alternar para o formulário de Cadastro', async ({ page }) => {
  12 |     await page.goto('/auth');
  13 |     const registerTab = page.locator('button[role="tab"]:has-text("Cadastro")');
  14 |     if (await registerTab.isVisible()) {
  15 |       await registerTab.click();
  16 |       await expect(page.locator('text="Criar Conta"').first()).toBeVisible();
  17 |     }
  18 |   });
  19 | });
  20 | 
```