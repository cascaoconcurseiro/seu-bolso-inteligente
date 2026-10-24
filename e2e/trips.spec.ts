import { test, expect } from "./fixtures/auth";

test.describe("Módulos: Viagens", () => {
  test("Deve exibir gestão de viagens", async ({ authenticatedPage: page }) => {
    await page.goto("/viagens");
    await expect(page.getByRole("heading", { level: 1, name: "Viagens" })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Nova Viagem", exact: true }).first().click();
    await expect(page.getByRole("dialog", { name: "Planeje uma nova viagem" })).toBeVisible();
    await expect(page.getByLabel("Destino")).toBeVisible();
  });
});
