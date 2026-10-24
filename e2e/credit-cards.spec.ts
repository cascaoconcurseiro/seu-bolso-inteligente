import { test, expect } from "./fixtures/auth";

test.describe("Core: Cartões de Crédito", () => {
  test("Deve carregar a gestão de cartões", async ({ authenticatedPage: page }) => {
    await page.goto("/cartoes");
    await expect(page.getByRole("heading", { level: 1, name: "Cartões" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Nenhum cartão cadastrado")).toBeVisible();
    await page.getByRole("button", { name: "Novo cartão", exact: true }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
