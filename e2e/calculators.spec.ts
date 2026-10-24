import { test, expect } from "./fixtures/auth";

test.describe("Módulos: Calculadoras Financeiras", () => {
  test("Deve alternar entre calculadoras", async ({ authenticatedPage: page }) => {
    await page.goto("/simuladores");
    await expect(page.getByRole("heading", { level: 1, name: "Simuladores" })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("tab", { name: "Poder de Compra (IPCA)" }).click();
    await expect(page.getByText("Parâmetros", { exact: true })).toBeVisible();
  });
});
