import { expect, test } from "./fixtures/auth";

test("pré-carrega o destino ao focar um link da navegação desktop", async ({
  authenticatedPage: page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/transacoes");
  await expect(page.getByRole("heading", { level: 1, name: "Transações" })).toBeVisible({
    timeout: 15000,
  });
  const navigation = page.getByRole("navigation", { name: "Navegação principal" });
  await expect(navigation).toBeVisible();
  const navLayout = await navigation.evaluate((element) => {
    const style = getComputedStyle(element);
    const links = [...element.querySelectorAll("a")];
    const first = links[0]?.getBoundingClientRect();
    const last = links.at(-1)?.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return {
      flexWrap: style.flexWrap,
      overflowX: style.overflowX,
      justifyContent: style.justifyContent,
      centered:
        first && last ? Math.abs(first.left - rect.left - (rect.right - last.right)) < 3 : false,
    };
  });
  expect(navLayout.flexWrap).toBe("nowrap");
  expect(navLayout.overflowX).toBe("auto");
  expect(navLayout.justifyContent).toBe("center");
  expect(navLayout.centered).toBe(true);

  await page.setViewportSize({ width: 1280, height: 900 });
  const routeModuleRequest = page.waitForRequest(/\/pages\/Accounts\.tsx/);
  await page.getByRole("link", { name: "Contas", exact: true }).focus();
  await routeModuleRequest;
});

test("pré-carrega o destino ao iniciar o toque no menu móvel", async ({
  authenticatedPage: page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/transacoes");
  await expect(page.getByRole("heading", { level: 1, name: "Transações" })).toBeVisible({
    timeout: 15000,
  });

  const routeModuleRequest = page.waitForRequest(/\/pages\/Accounts\.tsx/);
  const destination = page
    .getByRole("navigation", { name: "Navegação móvel" })
    .getByRole("button", { name: "Contas", exact: true });
  await destination.dispatchEvent("pointerdown", { pointerType: "touch" });
  await routeModuleRequest;
  await expect(page).toHaveURL(/\/transacoes$/);
});

test("navegação do cabeçalho cabe em viewport intermediário e abre todos os destinos", async ({
  authenticatedPage: page,
}) => {
  test.skip(
    test.info().project.name === "Mobile Safari",
    "A navegação de desktop é validada nos motores desktop; este projeto mantém o viewport de iPhone."
  );
  test.setTimeout(90000);
  await page.setViewportSize({ width: 785, height: 900 });
  await page.goto("/transacoes");
  // Aguarda o conteúdo real da rota: um h1 genérico podia pertencer ao splash
  // enquanto a navegação ainda estava sendo montada.
  await expect(page.getByRole("heading", { level: 1, name: "Transações" })).toBeVisible({
    timeout: 15000,
  });

  const navigation = page.getByRole("navigation", { name: "Navegação principal" });
  const firstLinkIsReachable = await navigation
    .getByRole("link", { name: "Início" })
    .evaluate((link) => {
      const nav = link.closest("nav");
      if (!nav) return false;
      const linkRect = link.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      return linkRect.left >= navRect.left && linkRect.right <= navRect.right;
    });
  expect(firstLinkIsReachable).toBe(true);

  const primary = [
    { name: "Início", path: "/", title: "Início", heading: "O palco está montado" },
    { name: "Transações", path: "/transacoes", title: "Transações", heading: "Transações" },
    { name: "Contas", path: "/contas", title: "Contas", heading: "Contas" },
  ];
  for (const item of primary) {
    const link = page.getByRole("link", { name: item.name, exact: true });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${item.path.replaceAll("/", "\\/")}$`));
    await expect(page).toHaveTitle(`${item.title} | Pé de Meia`);
    await expect(page.getByRole("heading", { level: 1, name: item.heading })).toBeVisible({
      timeout: 15000,
    });
  }

  const secondary = [
    { name: "Cartões", path: "/cartoes", title: "Cartões", heading: "Cartões" },
    {
      name: "Compartilhados",
      path: "/compartilhados",
      title: "Compartilhados",
      heading: "Compartilhados",
    },
    { name: "Relatórios", path: "/relatorios", title: "Relatórios", heading: "Relatórios" },
    {
      name: "Metas e investimentos",
      path: "/metas",
      title: "Metas e investimentos",
      heading: "Metas e Investimentos",
    },
    { name: "Orçamentos", path: "/orcamentos", title: "Orçamentos", heading: "Orçamentos" },
    { name: "Viagens", path: "/viagens", title: "Viagens", heading: "Viagens" },
    { name: "Família", path: "/familia", title: "Família", heading: "Família" },
    {
      name: "Simuladores",
      path: "/simuladores",
      title: "Simuladores",
      heading: "Simuladores",
    },
  ];
  for (const item of secondary) {
    const link = page.getByRole("link", { name: item.name, exact: true });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${item.path.replaceAll("/", "\\/")}$`));
    await expect(page).toHaveTitle(`${item.title} | Pé de Meia`);
    await expect(page.getByRole("heading", { level: 1, name: item.heading })).toBeVisible({
      timeout: 15000,
    });
  }
});

test("menu móvel mostra todos os destinos lado a lado sem botão Mais", async ({
  authenticatedPage: page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/transacoes");
  await expect(page.getByRole("heading", { level: 1, name: "Transações" })).toBeVisible({
    timeout: 15000,
  });

  const destinations = [
    { name: "Início", path: "/", title: "Início", heading: "O palco está montado" },
    { name: "Transações", path: "/transacoes", title: "Transações", heading: "Transações" },
    { name: "Contas", path: "/contas", title: "Contas", heading: "Contas" },
    { name: "Cartões", path: "/cartoes", title: "Cartões", heading: "Cartões" },
    {
      name: "Compartilhados",
      path: "/compartilhados",
      title: "Compartilhados",
      heading: "Compartilhados",
    },
    { name: "Relatórios", path: "/relatorios", title: "Relatórios", heading: "Relatórios" },
    {
      name: "Metas e investimentos",
      path: "/metas",
      title: "Metas e investimentos",
      heading: "Metas e Investimentos",
    },
    { name: "Orçamentos", path: "/orcamentos", title: "Orçamentos", heading: "Orçamentos" },
    { name: "Viagens", path: "/viagens", title: "Viagens", heading: "Viagens" },
    { name: "Família", path: "/familia", title: "Família", heading: "Família" },
    {
      name: "Simuladores",
      path: "/simuladores",
      title: "Simuladores",
      heading: "Simuladores",
    },
  ];
  const mobileNav = page.getByRole("navigation", { name: "Navegação móvel" });
  await expect(mobileNav).toBeVisible();
  await expect(mobileNav.getByRole("button", { name: "Mais", exact: true })).toHaveCount(0);
  const scroller = mobileNav.locator("div.overflow-x-auto");
  await expect(scroller).toHaveAttribute("aria-describedby", "mobile-navigation-scroll-hint");
  expect(
    await scroller.evaluate((element) => element.scrollWidth > element.clientWidth),
    "a faixa deve indicar que existem destinos fora da largura visível"
  ).toBe(true);

  for (const item of destinations) {
    const destination = mobileNav.getByRole("button", { name: item.name, exact: true });
    await expect(destination).toBeVisible();
    await destination.click();
    await expect(page).toHaveURL(new RegExp(`${item.path.replaceAll("/", "\\/")}$`));
    await expect(page).toHaveTitle(`${item.title} | Pé de Meia`);
    await expect(page.getByRole("heading", { level: 1, name: item.heading })).toBeVisible({
      timeout: 15000,
    });
  }

  await mobileNav.getByRole("button", { name: "Nova transação" }).click();
  await expect(page.getByRole("dialog", { name: "Nova Transação" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar" }).click();
  await expect(page.getByRole("dialog", { name: "Nova Transação" })).toBeHidden();
});
