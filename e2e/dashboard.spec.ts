import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures/auth";

test.describe("Core: Dashboard", () => {
  test("Deve carregar a estrutura do Dashboard", async ({ authenticatedPage: page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "O palco está montado" })).toBeVisible(
      { timeout: 15000 }
    );
  });

  test("Acessibilidade: sem violações críticas", async ({ authenticatedPage: page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "O palco está montado" })).toBeVisible(
      { timeout: 15000 }
    );
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"]) // charts/custom theme may flag contrast — separate audit
      .analyze();
    expect(results.violations).toHaveLength(0);
  });
});
