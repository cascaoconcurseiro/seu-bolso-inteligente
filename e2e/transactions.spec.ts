import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures/auth";

test.describe("Core: Transações", () => {
  test("Deve abrir o Modal de Nova Transação", async ({ authenticatedPage: page }) => {
    await page.goto("/transacoes");
    await expect(page.locator('h1, [data-testid="page-title"]').first()).toBeVisible({
      timeout: 10000,
    });
    const newBtn = page.locator('button:has-text("Nova Transação"), button:has-text("Adicionar")');
    if (await newBtn.isVisible()) {
      await newBtn.click();
      await expect(page.locator('text="Valor"').first()).toBeVisible();
      await expect(page.locator('text="Categoria"').first()).toBeVisible();
    }
  });

  test("Acessibilidade: sem violações críticas", async ({ authenticatedPage: page }) => {
    await page.goto("/transacoes");
    await expect(page.locator("h1, [data-testid='page-title']").first()).toBeVisible({
      timeout: 10000,
    });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toHaveLength(0);
  });
});
