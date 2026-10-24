import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures/auth";

test.describe("Core: Transações", () => {
  test("Deve abrir o Modal de Nova Transação", async ({ authenticatedPage: page }) => {
    await page.goto("/transacoes");
    await expect(page.locator('h1, [data-testid="page-title"]').first()).toBeVisible({
      timeout: 10000,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("navigation", { name: "Navegação móvel" })
      .getByRole("button", { name: "Nova transação" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Nova Transação" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Nenhuma conta encontrada" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Criar Conta" })).toBeVisible();
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
