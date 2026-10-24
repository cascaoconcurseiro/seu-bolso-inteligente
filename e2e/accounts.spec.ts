import { test, expect } from "./fixtures/auth";

test.describe("Core: Contas Correntes e Poupanças", () => {
  test("Deve abrir listagem de contas", async ({ authenticatedPage: page }) => {
    await page.goto("/contas");
    await expect(page.getByRole("heading", { level: 1, name: "Contas" })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Nova conta", exact: true }).click();
    await expect(page.getByLabel("Saldo inicial")).toBeVisible();
  });
});
