import { test, expect } from "./fixtures/auth";

test.describe("Módulos: Família e Membros", () => {
  test("Deve listar membros da família", async ({ authenticatedPage: page }) => {
    await page.goto("/familia");
    await expect(page.locator('h1:has-text("Família")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Convidar")').first()).toBeVisible();
  });

  test("Não revela se o e-mail informado já tem uma conta", async ({ authenticatedPage: page }) => {
    const profileLookups: string[] = [];
    const invitationPayloads: unknown[] = [];
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      "https://placeholder-please-configure-env-variables-in-vercel.supabase.co";
    page.on("request", (request) => {
      const url = request.url().toLowerCase();
      if (
        (url.includes("/rest/v1/profiles?") && url.includes("email")) ||
        url.includes("find_profile_for_family_link_v2")
      ) {
        profileLookups.push(request.url());
      }
    });
    await page.route(`${supabaseUrl}/rest/v1/families*`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "00000000-0000-0000-0000-000000000010",
              owner_id: "00000000-0000-0000-0000-000000000001",
              name: "Família de teste",
              deleted_at: null,
            },
          ]),
        });
        return;
      }
      await route.fallback();
    });
    await page.route(`${supabaseUrl}/rest/v1/family_invitations*`, async (route) => {
      if (route.request().method() === "POST") {
        invitationPayloads.push(route.request().postDataJSON());
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "00000000-0000-0000-0000-000000000020",
              from_user_id: "00000000-0000-0000-0000-000000000001",
              to_user_id: null,
              to_email: "alguem@example.com",
              family_id: "00000000-0000-0000-0000-000000000010",
              member_name: "Pessoa de teste",
              role: "editor",
              status: "pending",
            },
          ]),
        });
        return;
      }
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "[]",
        });
        return;
      }
      await route.fallback();
    });

    await page.goto("/familia");
    await page.getByRole("button", { name: "Convidar", exact: true }).first().click();
    const inviteDialog = page.getByRole("dialog", { name: "Convidar membro" });
    await expect(inviteDialog).toBeVisible();
    await inviteDialog.getByLabel(/email/i).fill("alguem@example.com");
    await inviteDialog.getByLabel(/nome/i).fill("Pessoa de teste");
    await expect(
      page.getByText(
        "Convide por e-mail. A pessoa encontrará o convite ao entrar no app com esse endereço."
      )
    ).toBeVisible();
    await page.getByRole("button", { name: "Enviar Convite" }).click();
    await expect.poll(() => invitationPayloads.length).toBe(1);

    expect(profileLookups).toEqual([]);
    expect(invitationPayloads).toEqual([
      expect.objectContaining({
        to_user_id: null,
        to_email: "alguem@example.com",
        family_id: "00000000-0000-0000-0000-000000000010",
      }),
    ]);
    await expect(page.getByText(/Usuário cadastrado:/)).toHaveCount(0);
  });

  test("Salva contato sem consultar ou vincular perfil por e-mail ou nome", async ({
    authenticatedPage: page,
  }) => {
    const profileLookups: string[] = [];
    const contactPayloads: unknown[] = [];
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      "https://placeholder-please-configure-env-variables-in-vercel.supabase.co";

    page.on("request", (request) => {
      const url = request.url().toLowerCase();
      if (
        url.includes("/rest/v1/profiles?") &&
        (url.includes("email") || url.includes("full_name"))
      ) {
        profileLookups.push(request.url());
      }
    });
    await page.route(`${supabaseUrl}/rest/v1/families*`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "00000000-0000-0000-0000-000000000010",
              owner_id: "00000000-0000-0000-0000-000000000001",
              name: "Família de teste",
              deleted_at: null,
            },
          ]),
        });
        return;
      }
      await route.fallback();
    });
    await page.route(`${supabaseUrl}/rest/v1/family_members*`, async (route) => {
      if (route.request().method() === "POST") {
        contactPayloads.push(route.request().postDataJSON());
        await route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
        return;
      }
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        return;
      }
      await route.fallback();
    });
    await page.route(`${supabaseUrl}/rest/v1/family_invitations*`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        return;
      }
      await route.fallback();
    });

    await page.goto("/familia");
    await page.getByRole("button", { name: "Convidar", exact: true }).first().click();
    const inviteDialog = page.getByRole("dialog", { name: "Convidar membro" });
    await inviteDialog.getByRole("button", { name: "Contato", exact: true }).click();
    const contactDialog = page.getByRole("dialog", { name: "Adicionar contato" });
    await contactDialog.getByLabel("Email").fill("francy.von@example.com");
    await contactDialog.getByLabel("Nome").fill("Francy de Teste");
    await contactDialog.getByRole("button", { name: "Salvar Contato" }).click();

    await expect.poll(() => contactPayloads.length).toBe(1);
    expect(profileLookups).toEqual([]);
    expect(contactPayloads).toEqual([
      expect.objectContaining({
        email: "francy.von@example.com",
        name: "Francy de Teste",
        user_id: null,
        linked_user_id: null,
        member_type: "contact",
      }),
    ]);
  });
});
