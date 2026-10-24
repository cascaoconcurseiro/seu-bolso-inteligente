import { test, expect } from "./fixtures/auth";

test.describe("Planejamento: Relatórios Consolidados", () => {
  test("Deve mostrar o estado sem dados e permitir abrir o período anual", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/relatorios");
    await expect(page.getByRole("heading", { level: 1, name: "Relatórios" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Nenhum dado neste período")).toBeVisible();
    await page.getByRole("button", { name: "Ver Ano Completo" }).click();
    await expect(page.getByText("Nenhum dado neste período")).toBeVisible();
  });
});
