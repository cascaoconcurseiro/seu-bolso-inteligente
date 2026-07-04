# Checklist — PWA iOS nativo + HIG no app inteiro

> Anotado em 04/07/2026 para execução. Contexto: deixar o PWA com cara de app
> nativo no iPhone (Human Interface Guidelines) sem perder a identidade da marca.
>
> **Estratégia acordada: híbrido** — ergonomia e estrutura do HIG (navegação,
> listas, sheets, feedback discreto) mantendo a identidade (verde da marca como
> tint, Space Grotesk em headings, Confetti em metas).

---

## ⚠️ Pré-requisito: bug em produção

- [ ] **Mergear o PR #57** — produção (meupedemeia.vercel.app) está crashando
      com `ReferenceError: SafeFinancialCalculator is not defined` na página de
      viagens (import ausente em TripSummaryTab/TripExpensesTab/TripShopping).
      A correção já está na branch `claude/team-project-evaluation-wsk16l`,
      junto com outros 19 ReferenceErrors do mesmo tipo. Enquanto não mergear,
      viagens continua quebrada em produção.
- [ ] Resolver billing do GitHub Actions (Settings → Billing) — todo CI falha
      em ~4s sem executar runner desde 02/07, inclusive no main.

---

## Fase 1 — PWA iOS: alto impacto

- [ ] **Splash screens** (`apple-touch-startup-image`): gerar com
      `pwa-asset-generator`, uma por resolução de device + variantes dark.
      Elimina o flash branco ao abrir da tela de início (maior denunciante de
      "não é nativo").
- [ ] **Status bar translúcida**: trocar
      `apple-mobile-web-app-status-bar-style` de `default` para
      `black-translucent` no index.html. As safe areas já existentes cuidam do
      conteúdo sob a Dynamic Island.
- [ ] **theme-color por tema**: dois meta tags com
      `media="(prefers-color-scheme: light/dark)"` para a barra acompanhar o
      dark mode.
- [ ] **Banner de instalação iOS**: detectar Safari fora de standalone
      (`!matchMedia('(display-mode: standalone)').matches` + userAgent iOS) e
      mostrar card "Compartilhar → Adicionar à Tela de Início". iOS não tem
      `beforeinstallprompt`.
- [ ] **Gesto de voltar (edge-swipe)**: drag da borda esquerda → pop da tela
      (Framer Motion) nas telas de detalhe (conta, cartão, viagem). PWA
      standalone não tem o swipe-back do Safari.

## Fase 2 — PWA iOS: refinamento

- [ ] **Tipografia do sistema no corpo**: `-apple-system, system-ui` para body
      (SF Pro no iPhone). Manter Space Grotesk em headings e JetBrains Mono nos
      valores. Corpo ~17px, captions 11–13px.
- [ ] **Tap feedback**: `-webkit-tap-highlight-color: transparent` +
      `touch-action: manipulation` global; `user-select: none` no chrome da UI
      (haptics via `navigator.vibrate` NÃO existem no iOS — compensar com
      micro-feedback visual; o `whileTap scale` já existe).
- [ ] **Overscroll**: `overscroll-behavior-y: none` no body; rubber-band só nas
      listas internas (não conflitar com PullToRefresh).
- [ ] **Ícone**: conferir que `apple-touch-icon` é 180×180 **sem transparência**
      (alpha vira fundo preto no iOS).

## Fase 3 — HIG no app inteiro: navegação e estrutura

- [ ] **Remover o FAB central** da tab bar (padrão Material/Android). Mover
      "Nova transação" para botão `+` no canto superior direito da navigation
      bar ou item comum da tab bar.
- [ ] **Large Titles colapsáveis** nas telas principais (Início, Extrato,
      Relatórios): título 34pt que encolhe para o centro da barra ao rolar.
- [ ] **Barras translúcidas**: header e tab bar com `backdrop-blur` + fundo
      semi-opaco (conteúdo passa por baixo).
- [ ] **Back button padrão iOS**: chevron `‹` + título da tela anterior.

## Fase 4 — HIG: listas e formulários

- [ ] **Inset grouped lists** no lugar de cartões com sombra: blocos agrupados
      com cantos arredondados, separadores hairline internos, chevron `›` em
      linhas navegáveis. Aplicar em Extrato, Contas, Configurações, Viagens.
- [ ] **Dark mode por cor de superfície** (não sombra) nas listas agrupadas.
- [ ] **Forms em grouped table**: label à esquerda, valor/controle à direita,
      células agrupadas (estilo Ajustes).
- [ ] **TransactionForm em wizard multi-step** dentro de sheet com detents
      (meia tela → tela cheia). A própria doc do design system já reconhece o
      form como sobrecarregado.
- [ ] **Action Sheets para ações destrutivas** ("Excluir transação" sobe de
      baixo com botão vermelho) em vez de dialog centralizado no mobile.
- [ ] **Long-press com menu contextual** nas linhas de transação
      (editar/dividir/excluir), complementando o SwipeableRow.

## Fase 5 — HIG: feedback e movimento

- [ ] **Aposentar o ActionFeedback de tela cheia** (onda de cor estilo Nubank é
      anti-HIG): substituir por checkmark sutil in-place + estado refletido na
      UI. Manter Confetti SÓ para meta atingida.
- [ ] **Reduzir toasts**: preferir a UI refletir o estado (item aparece na
      lista, saldo muda). Toast só quando não há superfície visível.
- [ ] **Podar animações decorativas**: das ~25 keyframes, manter as funcionais
      (transições de tela, sheets); remover staggers longos e glows.
- [ ] **View Transitions API** para push/pop entre rotas (Safari 18+,
      progressivo — quem não suporta só não anima).
- [ ] **Ícones**: alinhar `stroke-width` do lucide ao peso do texto adjacente.

## Não fazer / já está certo

- ✅ Bottom sheet com grabber, safe areas, alvos 44pt, `inputMode="decimal"`,
  dark mode com tokens, cores positive/negative, input nativo de mês.
- ❌ Manifest shortcuts (long-press no ícone): não suportado no iOS — não
  gastar esforço.
- ❌ Vibração/haptics reais: impossível em PWA iOS; não tentar polyfill.

---

## Backlog herdado da avaliação de equipe (pendências não-HIG)

- [ ] ~560 → 261 erros de tipo restantes (81 vars locais não usadas + mismatches
      estruturais antigos, sem impacto de runtime)
- [ ] Paginação cursor-based nas listagens + substituir `SELECT *`
- [ ] Migration base consolidada (dump do schema como migration zero)
- [ ] Deduplicação OFX server-side (unique constraint em
      `(user_id, account_id, external_id)`)
- [ ] Onboarding interativo passo-a-passo
- [ ] Resumo semanal (WEEKLY_SUMMARY já modelado, falta cron/edge function)
- [ ] Playwright no CI + coverage threshold
- [ ] Reduzir chunk page-shared (574 KB)
- [ ] Atualizar ~60 dependências desatualizadas
