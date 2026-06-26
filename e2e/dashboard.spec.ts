import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures/auth";

test.describe("Core: Dashboard", () => {
  test("Deve carregar a estrutura do Dashboard", async ({ authenticatedPage: page }) => {
    await page.goto("/");
    await expect(page.locator("text=Seu Bolso").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".recharts-wrapper").first()).toBeVisible({ timeout: 5000 });
  });

  test("Acessibilidade: sem violações críticas", async ({ authenticatedPage: page }) => {
    await page.goto("/");
    await expect(page.locator("text=Seu Bolso").first()).toBeVisible({ timeout: 10000 });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"]) // charts/custom theme may flag contrast — separate audit
      .analyze();
    expect(results.violations).toHaveLength(0);
  });
});
