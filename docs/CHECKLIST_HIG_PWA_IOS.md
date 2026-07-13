# Checklist — PWA iOS nativo + HIG no app inteiro

> Anotado em 04/07/2026 para execução. Contexto: deixar o PWA com cara de app
> nativo no iPhone (Human Interface Guidelines) sem perder a identidade da marca.
>
> **Estratégia acordada: híbrido** — ergonomia e estrutura do HIG (navegação,
> listas, sheets, feedback discreto) mantendo a identidade (verde da marca como
> tint, Space Grotesk em headings, Confetti em metas).

---

## ⚠️ Pré-requisito: bug em produção

- [x] **Mergear o PR #57** (mergeado em 04/07) — produção (meupedemeia.vercel.app) está crashando
      com `ReferenceError: SafeFinancialCalculator is not defined` na página de
      viagens (import ausente em TripSummaryTab/TripExpensesTab/TripShopping).
      A correção já está na branch `claude/team-project-evaluation-wsk16l`,
      junto com outros 19 ReferenceErrors do mesmo tipo. Enquanto não mergear,
      viagens continua quebrada em produção.
- [ ] Resolver billing do GitHub Actions (Settings → Billing) — todo CI falha
      em ~4s sem executar runner desde 02/07, inclusive no main.

---

## Fase 1 — PWA iOS: alto impacto

- [x] **Splash screens** (24 geradas via scripts/generate-splash.js, light+dark) (`apple-touch-startup-image`): gerar com
      `pwa-asset-generator`, uma por resolução de device + variantes dark.
      Elimina o flash branco ao abrir da tela de início (maior denunciante de
      "não é nativo").
- [x] **Status bar translúcida** (+ safe-top no header): trocar
      `apple-mobile-web-app-status-bar-style` de `default` para
      `black-translucent` no index.html. As safe areas já existentes cuidam do
      conteúdo sob a Dynamic Island.
- [x] **theme-color por tema**: dois meta tags com
      `media="(prefers-color-scheme: light/dark)"` para a barra acompanhar o
      dark mode.
- [x] **Banner de instalação iOS** (IOSInstallPrompt, dispensa de 30 dias): detectar Safari fora de standalone
      (`!matchMedia('(display-mode: standalone)').matches` + userAgent iOS) e
      mostrar card "Compartilhar → Adicionar à Tela de Início". iOS não tem
      `beforeinstallprompt`.
- [x] **Gesto de voltar (edge-swipe)** (EdgeSwipeBack, rotas de detalhe): drag da borda esquerda → pop da tela
      (Framer Motion) nas telas de detalhe (conta, cartão, viagem). PWA
      standalone não tem o swipe-back do Safari.

## Fase 2 — PWA iOS: refinamento

- [x] **Tipografia do sistema no corpo** (font-sans → -apple-system/system-ui; Inter fallback): `-apple-system, system-ui` para body
      (SF Pro no iPhone). Manter Space Grotesk em headings e JetBrains Mono nos
      valores. Corpo ~17px, captions 11–13px.
- [x] **Tap feedback** (tap-highlight transparent, touch-action manipulation, user-select none em botões/links): `-webkit-tap-highlight-color: transparent` +
      `touch-action: manipulation` global; `user-select: none` no chrome da UI
      (haptics via `navigator.vibrate` NÃO existem no iOS — compensar com
      micro-feedback visual; o `whileTap scale` já existe).
- [x] **Overscroll** (overscroll-behavior-y none no body): `overscroll-behavior-y: none` no body; rubber-band só nas
      listas internas (não conflitar com PullToRefresh).
- [x] **Ícone**: apple-touch-icon.png 180px sem alpha gerado (o icon-192 tinha transparência) — conferir que `apple-touch-icon` é 180×180 **sem transparência**
      (alpha vira fundo preto no iOS).

## Fase 3 — HIG no app inteiro: navegação e estrutura

- [x] **Remover o FAB central** (virou item comum 'Nova' da tab bar) da tab bar (padrão Material/Android). Mover
      "Nova transação" para botão `+` no canto superior direito da navigation
      bar ou item comum da tab bar.
- [ ] **Large Titles colapsáveis** — ADIADO para sessão com QA visual (retrofit por página) nas telas principais (Início, Extrato,
      Relatórios): título 34pt que encolhe para o centro da barra ao rolar.
- [x] **Barras translúcidas** (header e tab bar com backdrop-blur-xl + bg/80): header e tab bar com `backdrop-blur` + fundo
      semi-opaco (conteúdo passa por baixo).
- [ ] **Back button padrão iOS** — ADIADO junto com Large Titles: chevron `‹` + título da tela anterior.

## Fase 4 — HIG: listas e formulários

- [✗] **Inset grouped lists** — DECISÃO DO TIME: não fazer. O manifesto de design (skill design-review) define cards com gradientes sutis como linguagem da marca; listas estilo Ajustes conflitam com a identidade no lugar de cartões com sombra: blocos agrupados
      com cantos arredondados, separadores hairline internos, chevron `›` em
      linhas navegáveis. Aplicar em Extrato, Contas, Configurações, Viagens.
- [ ] **Dark mode por cor de superfície** (não sombra) nas listas agrupadas.
- [✗] **Forms em grouped table** — mesma decisão acima (conflito com identidade): label à esquerda, valor/controle à direita,
      células agrupadas (estilo Ajustes).
- [ ] **TransactionForm em wizard multi-step** — ADIADO para sessão com QA visual (refactor do form mais crítico do app; não fazer às cegas) dentro de sheet com detents
      (meia tela → tela cheia). A própria doc do design system já reconhece o
      form como sobrecarregado.
- [x] **Action Sheets para ações destrutivas** (AlertDialogContent sobe de baixo no mobile, centralizado no desktop — 1 mudança cobre todas as confirmações) ("Excluir transação" sobe de
      baixo com botão vermelho) em vez de dialog centralizado no mobile.
- [x] **Long-press com menu contextual** (SwipeableRow: 500ms abre menu com as mesmas ações do swipe) nas linhas de transação
      (editar/dividir/excluir), complementando o SwipeableRow.

## Fase 5 — HIG: feedback e movimento

- [x] **ActionFeedback domado** (decisão do Design Director: wash de tela cheia de 900ms aposentado; check pop central de 480ms mantém a energia — manifesto veta transições >500ms) (onda de cor estilo Nubank é
      anti-HIG): substituir por checkmark sutil in-place + estado refletido na
      UI. Manter Confetti SÓ para meta atingida.
- [~] **Reduzir toasts** — manifesto pede toast com valor/descrição em sucesso; manter, revisar caso a caso em QA: preferir a UI refletir o estado (item aparece na
      lista, saldo muda). Toast só quando não há superfície visível.
- [~] **Podar animações decorativas** — manifesto já limita (stagger máx 6, máx 3 simultâneas); auditoria fina em QA visual: das ~25 keyframes, manter as funcionais
      (transições de tela, sheets); remover staggers longos e glows.
- [ ] **View Transitions API** — requer React Router v7 (v6 não integra startViewTransition); fica para o upgrade do router para push/pop entre rotas (Safari 18+,
      progressivo — quem não suporta só não anima).
- [~] **Ícones**: stroke padrão lucide (2) já harmoniza com semibold; ajuste fino em QA visual — alinhar `stroke-width` do lucide ao peso do texto adjacente.

## Não fazer / já está certo

- ✅ Bottom sheet com grabber, safe areas, alvos 44pt, `inputMode="decimal"`,
  dark mode com tokens, cores positive/negative, input nativo de mês.
- ❌ Manifest shortcuts (long-press no ícone): não suportado no iOS — não
  gastar esforço.
- ❌ Vibração/haptics reais: impossível em PWA iOS; não tentar polyfill.

---

## Backlog herdado da avaliação de equipe (pendências não-HIG)

- [x] Erros de tipo: 738 → ~155 (04/07). Unused locals/params agora são
      responsabilidade do ESLint (noUnusedLocals off no tsc); restam apenas
      mismatches estruturais antigos, sem impacto de runtime
- [ ] Paginação cursor-based nas listagens + substituir `SELECT *`
- [x] Migration base consolidada — baseline de cutover reproduzivel em `supabase/baseline/20260713_public_schema.sql` (36 tabelas, 164 funcoes, ACLs; SHA-256 estavel).
- [x] Deduplicação OFX server-side — migration
      `20260704010000_ofx_dedup_unique_external_id.sql` (índice único parcial +
      soft-delete de duplicatas antigas) + import tolera 23505 linha a linha.
      ✅ APLICADA em produção via MCP (04/07). Descoberta no processo: a
      coluna external_id NÃO EXISTIA em produção (drift schema/código — o
      import OFX estava quebrado); a migration também cria a coluna
- [ ] Onboarding interativo passo-a-passo
- [x] Resumo semanal — JÁ IMPLEMENTADO em notificationGenerator
      (generateWeeklySummaryNotification, roda quando weekly_summary_enabled);
      item estava desatualizado
- [x] Playwright no CI (job e2e chromium; requer VITE_SUPABASE_URL/ANON_KEY
      como vars/secrets do repo) + coverage threshold baseline (55/43/41/52)
- [ ] Reduzir chunk page-shared (574 KB) — tentado via manualChunks em
      04/07: gera chunks circulares (imports cruzados pages<->components).
      Pré-requisito: desacoplar imports de src/pages/* dentro de components/
- [~] Dependências: @supabase/supabase-js 2.110 e @sentry/react 10.63
      atualizados (04/07); restante fica com o Dependabot semanal
