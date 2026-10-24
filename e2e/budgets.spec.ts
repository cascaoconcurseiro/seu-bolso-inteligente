import { test, expect } from "./fixtures/auth";

test.describe("Planejamento: Orçamentos", () => {
  test("Deve carregar painel de limites", async ({ authenticatedPage: page }) => {
    await page.goto("/orcamentos");
    await expect(page.getByRole("heading", { level: 1, name: "Orçamentos" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Disponível Total", { exact: true })).toBeVisible();
  });
});
