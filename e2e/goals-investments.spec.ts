import { test, expect } from "./fixtures/auth";

test.describe("Planejamento: Metas e Investimentos", () => {
  test("Deve permitir alternar entre Metas e Ativos", async ({ authenticatedPage: page }) => {
    await page.goto("/metas");
    await expect(
      page.getByRole("heading", { level: 1, name: "Metas e Investimentos" })
    ).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Investimentos", exact: true }).click();
    await expect(page.getByText("Sua carteira está vazia")).toBeVisible();
  });
});
