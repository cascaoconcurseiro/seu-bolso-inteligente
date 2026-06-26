import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures/auth";

test.describe("Configurações do Sistema", () => {
  test("Deve carregar Preferências de Usuário", async ({ authenticatedPage: page }) => {
    await page.goto("/configuracoes");
    await expect(page.locator('h1:has-text("Configurações")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="Notificações"').first()).toBeVisible();
  });

  test("Acessibilidade: sem violações críticas", async ({ authenticatedPage: page }) => {
    await page.goto("/configuracoes");
    await expect(page.locator('h1:has-text("Configurações")')).toBeVisible({ timeout: 10000 });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toHaveLength(0);
  });
});
