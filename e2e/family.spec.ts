import { test, expect } from "./fixtures/auth";

test.describe("Módulos: Família e Membros", () => {
  test("Deve listar membros da família", async ({ authenticatedPage: page }) => {
    await page.goto("/familia");
    await expect(page.locator('h1:has-text("Família")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Convidar")').first()).toBeVisible();
  });

  test("Não revela se o e-mail informado já tem uma conta", async ({ authenticatedPage: page }) => {
    const profileLookups: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("find_profile_for_family_link_v2")) {
        profileLookups.push(request.url());
      }
    });

    await page.goto("/familia");
    await page.getByRole("button", { name: "Convidar", exact: true }).first().click();
    await page.getByLabel("Email").fill("alguem@example.com");
    await expect(page.getByText("A pessoa poderá aceitar ao entrar no app com este e-mail.")).toBeVisible();
    await page.waitForTimeout(1700);

    expect(profileLookups).toEqual([]);
    await expect(page.getByText(/Usuário cadastrado:/)).toHaveCount(0);
  });
});
