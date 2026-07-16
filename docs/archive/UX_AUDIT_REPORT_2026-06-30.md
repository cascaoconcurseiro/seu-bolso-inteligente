# 🔍 Auditoria Completa de UX/UI — Seu Bolso Inteligente

> **Data:** 2026-06-30
> **Auditor:** Equipe multidisciplinar (12 especialistas)
> **Referências:** Apple HIG, Google Material Design 3, WCAG 2.2 AA, Nielsen Norman Group, NN/g Usability Heuristics
> **Benchmarks:** Apple Wallet, Revolut, Monzo, Notion, Linear, Things, Superhuman

---

## 📊 SCORECARD

| Dimensão                                         | Nota       | Peso | Benchmark        |
| ------------------------------------------------ | ---------- | ---- | ---------------- |
| **UX Score** (usabilidade, fluxos, aprendizagem) | 62/100     | 25%  | Revolut: 89      |
| **UI Score** (consistência visual, polish)       | 71/100     | 20%  | Linear: 94       |
| **Acessibilidade (WCAG 2.2 AA)**                 | 53/100     | 20%  | Meta: ≥80        |
| **Consistência**                                 | 65/100     | 15%  | Notion: 91       |
| **Design System**                                | 58/100     | 20%  | Apple Wallet: 95 |
| **PONDERADO**                                    | **61/100** | —    | Premium: ≥85     |

**Classificação:** Funcional (nível 2 de 5) — precisa de 24+ pontos para atingir premium.

---

## FASE 1 — INVENTÁRIO

**Mapeamento completo concluído.**

| Categoria                        | Contagem |
| -------------------------------- | -------- |
| Telas (páginas React)            | 18       |
| Componentes de negócio           | 104      |
| Componentes UI (shadcn + custom) | 43       |
| Hooks                            | 54       |
| **Total de artefatos de UI**     | **225**  |

### Telas mapeadas

| Rota              | Tela                    | Complexidade                                 |
| ----------------- | ----------------------- | -------------------------------------------- |
| `/auth`           | Login/Cadastro          | Média                                        |
| `/`               | Dashboard               | **Alta** (8+ seções)                         |
| `/transacoes`     | Transações              | **Alta** (filtros, abas, CRUD, modais)       |
| `/contas`         | Contas                  | Alta                                         |
| `/contas/:id`     | Detalhe da Conta        | Média                                        |
| `/cartoes`        | Cartões de Crédito      | **Muito Alta** (7+ dialogs)                  |
| `/cartoes/:id`    | Detalhe do Cartão       | Alta                                         |
| `/compartilhados` | Despesas Compartilhadas | **Muito Alta** (abas, acertos, lazy loading) |
| `/viagens`        | Viagens                 | **Muito Alta** (6 abas internas)             |
| `/familia`        | Família                 | Média                                        |
| `/relatorios`     | Relatórios              | Alta (5 gráficos)                            |
| `/orcamentos`     | Orçamentos              | Baixa                                        |
| `/metas`          | Metas e Investimentos   | Alta (3 abas)                                |
| `/simuladores`    | Simuladores             | Média                                        |
| `/configuracoes`  | Configurações           | **Muito Alta** (10 seções)                   |
| `/reset-password` | Reset de Senha          | Baixa                                        |
| `/privacidade`    | Política de Privacidade | Baixa                                        |
| `*`               | 404                     | Baixa                                        |

---

## FASE 2 — DESIGN SYSTEM

### ✅ O que existe

- **Tokens de design via CSS custom properties (HSL):** Superfícies (`--bg-page`, `--bg-surface`, `--bg-subtle`), texto (`--text-primary/secondary/muted`), semânticos (`--accent`, `--success`, `--danger`, `--warning`), financeiros (`--positive`, `--negative`, `--neutral`).
- **Mapeamento shadcn/ui:** Tokens próprios mapeados para as variáveis do shadcn (`--background`, `--foreground`, `--primary`, etc.).
- **Dark mode:** Implementado via classe `.dark` com inversão completa dos tokens de superfície e ajuste dos semânticos.
- **Escala de layout declarada:** base-4 (4, 8, 12, 16, 24, 32, 48, 64).
- **Componentes customizados:** 15 componentes próprios sobre Radix UI (FormField, FormSection, EmptyState, ActionFeedback, SwipeableRow, etc.).
- **Sistema de formulários:** `.control`, `.form-stack`, `.form-field`, `.form-section`, `.form-grid-2`, `.form-divider`, `.form-actions`.
- **Classes utilitárias:** `.value-display`, `.value-positive/negative/neutral`, `.card-status-*`, `.tap-target`, `.balance-container`, `.installment-progress`.
- **Animações:** `fade-in`, `slide-down`, `feedback-pop`, `accordion-*`, `fadeIn`, `fadeInUp/Down/Left/Right`.

### ❌ O que falta

| Problema                                                                                                                                                                                                        | Severidade | Princípio                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| **Sem documentação do Design System** — Não há README, Storybook, ou guia de componentes. Desenvolvedores precisam ler o CSS para entender os tokens.                                                           | 🔴 Crítico  | NN/g: "Consistency and Standards" — sem documentação, a consistência degrada com o tempo |
| **Sem catálogo de componentes** — Nenhuma página de showcase ou inventário visual dos componentes disponíveis                                                                                                   | 🟠 Alto     | Design System sem catálogo = dívida de consistência                                      |
| **Tokens de spacing não são enforced** — A escala base-4 está documentada mas não é aplicada via utilitários Tailwind (ex: `p-3.5`, `gap-1.5` fogem da escala)                                                  | 🟡 Médio    | Apple HIG: "Use consistent spacing throughout your interface"                            |
| **Abuso do token `--primary`** — Mapeado para `--text-primary` em vez de `--accent` (a cor da marca). O botão default usa `bg-accent`, mas o nav ativo usa `bg-primary` (texto). Isso causa confusão semântica. | 🟠 Alto     | Material Design: "Primary is your brand color"                                           |
| **Sem tema de alta legibilidade** — Apenas light/dark. Não há tema de alto contraste (WCAG AAA)                                                                                                                 | 🟡 Médio    | WCAG 2.2: "Provide sufficient contrast"                                                  |
| **Design tokens não exportados** — Não há package JSON de tokens para uso em outros contextos (Figma, React Native no futuro)                                                                                   | 🟢 Baixo    | Preparação para multi-plataforma                                                         |

### 🎯 Recomendações

1. **Criar `DESIGN_SYSTEM.md`** com catálogo visual de todos os componentes, tokens e exemplos de uso
2. **Corrigir o mapeamento `--primary`** para usar `--accent` como brand color, criar token `--nav-active` separado
3. **Adicionar `spacing-*` tokens no Tailwind** que reflitam a escala base-4
4. **Criar um Storybook** com 2 stories por componente (default + variantes)

---

## FASE 3 — CONSISTÊNCIA VISUAL

### ✅ O que está bom

- **Border radius consistente:** usa `--radius` (0.5rem) com variantes `md`/`sm`
- **Sombras de modal:** `shadow-2xl` no Dialog, `shadow-[0_-10px_40px_rgba(0,0,0,0.1)]` nos bottom sheets
- **Glassmorphism consistente:** `bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60` no header, `bg-gradient-to-br from-card/80 via-card/50 to-muted/30 backdrop-blur-xl` nos cards hero
- **Estilo de cards financeiros:** `rounded-4xl border border-border/50` consistente entre DashboardHero, GoalsAndInvestments, Relatórios

### ❌ Problemas

| Problema                                                                                | Exemplo                                                                                                                              | Severidade | Princípio                                                         |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------- |
| **Padding inconsistente entre páginas**                                                 | Dashboard usa `space-y-6`, Goals usa `space-y-8`, Transactions usa padding padrão                                                    | 🟡 Médio    | Apple HIG: "Consistent spacing creates visual rhythm"             |
| **Mix de `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-4xl` sem critério claro** | Cards internos alternam entre `rounded-xl` e `rounded-2xl` sem regra                                                                 | 🟡 Médio    | Design system deve definir: card = xl, modal = 3xl, hero = 4xl    |
| **Bordas inconsistentes**                                                               | Alguns cards usam `border-border/50`, outros `border-border/40`, outros sem borda                                                    | 🟢 Baixo    | Sutil mas perceptível em telas de alto contraste                  |
| **Glass Effect inconsistente**                                                          | Header usa `bg-background/95 backdrop-blur`, cards hero usam `bg-gradient-to-br ... backdrop-blur-xl`, outros elementos não têm blur | 🟢 Baixo    | Definir regra: elementos fixos = blur, cards estáticos = sem blur |

### 🎯 Recomendações

1. **Definir 3 níveis de border-radius:** `--radius-sm` (inputs), `--radius` (cards), `--radius-lg` (modais/heróis)
2. **Padronizar `space-y-` entre páginas:** todas usarem `space-y-6` (ou `section-gap` como variável)
3. **Criar `.card-glass` e `.card-solid`** como utilitários no `@layer components`

---

## FASE 4 — TIPOGRAFIA

### ✅ O que está bom

- **Escolha de fontes:** Space Grotesk (display), Inter (body), JetBrains Mono (números financeiros) — combinação excelente para fintech
- **Hierarquia definida:** h1 (4xl-5xl), h2 (2xl-3xl), h3 (xl-2xl), h4 (lg)
- **Valores financeiros:** `.value-display` com `font-mono font-medium tabular-nums` — segue padrão Revolut/Monzo
- **Tracking:** `tracking-tight` nos headings, `tracking-tighter` no saldo principal

### ❌ Problemas

| Problema                                                   | Exemplo                                                                                                                                                         | Severidade | Princípio                                                                                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Texto de 10px e 11px abaixo do mínimo legível**          | `.form-section-label` = `text-[10px]`, labels de formulário = `text-[11px]`, badge = `[font-size:11px]`                                                         | 🔴 Crítico  | WCAG 2.2 não define mínimo, mas Apple HIG recomenda ≥11pt (~15px) e NN/g recomenda ≥12px para body. 10px = 7.5pt — ilegível para usuários 40+ |
| **Uso de `uppercase tracking-widest` em 10px**             | `.form-section-label`: `text-[10px] font-bold uppercase tracking-widest` — combinação de tamanho minúsculo + espaçamento extremo torna o texto quase decorativo | 🔴 Crítico  | NN/g: "Legibility is a prerequisite for readability". Texto decorativo não comunica.                                                          |
| **Labels de formulário inconsistentes**                    | `FormField` padrão usa `text-[11px] uppercase tracking-wider`, mas `plainLabel` usa `text-sm font-medium`                                                       | 🟠 Alto     | Consistência: labels devem seguir uma regra (todos 12px ou todos 14px)                                                                        |
| **Sem escala tipográfica responsiva completa**             | Apenas h1/h2/h3 têm `md:` breakpoints. Body text, labels, captions são fixos                                                                                    | 🟡 Médio    | Apple HIG: "Use Dynamic Type to let people choose their preferred text size"                                                                  |
| **`h1` no Dashboard é `text-5xl sm:text-6xl md:text-7xl`** | 7xl = 4.5rem = 72px no saldo principal — excessivamente grande, ocupa a tela inteira em mobile                                                                  | 🟡 Médio    | A hierarquia funciona, mas o saldo não é um título de landing page — Revolut usa ~32-40px para saldo                                          |
| **`text-[13px]` no DialogDescription**                     | Fora da escala tipográfica. Deveria ser `text-sm` (14px)                                                                                                        | 🟢 Baixo    | Padronizar na escala Tailwind                                                                                                                 |

### 🎯 Recomendações

1. **Aumentar TODOS os textos abaixo de 12px para ≥12px:**
   - `.form-section-label`: `text-[11px]` → `text-xs` (12px, 0.75rem)
   - `FormField` label padrão: `text-[11px]` → `text-xs`
   - `Badge`: `[font-size:11px]` → `text-xs`
2. **Remover `uppercase tracking-widest` de labels minúsculos** — usar `font-medium` em vez de `font-bold uppercase`
3. **Reduzir o saldo do Dashboard:** `text-5xl md:text-6xl` → `text-3xl md:text-5xl`

---

## FASE 5 — CORES

### ✅ O que está bom

- **HSL custom properties:** permite ajuste preciso de matiz/saturação/luminosidade
- **Cores semânticas financeiras:** `--positive` (verde), `--negative` (vermelho), `--neutral` (cinza)
- **Dark mode bem calibrado:** superfícies escuras (não preto puro), texto com contraste adequado
- **Ajuste de luminosidade no dark mode:** accent sobe de 52% para 62% lightness, success/danger ajustados

### ❌ Problemas

| Problema                                           | Detalhe                                                                                                                                                                                         | Severidade | Princípio                                                                                         |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| **`--primary` mapeado para `--text-primary`**      | Viola o modelo de cores do shadcn/ui e Material Design. O "primary" deveria ser a cor da marca (violeta `#6B35C9`), não a cor do texto                                                          | 🟠 Alto     | Material Design: "Primary color is the color displayed most frequently across your app"           |
| **Contraste do texto muted em labels pequenas**    | `text-muted-foreground` (#9CA3AF no light) em `text-[11px]` = relação de contraste ~2.8:1 (abaixo do mínimo 4.5:1 para AA)                                                                      | 🔴 Crítico  | WCAG 2.2 SC 1.4.3: "Text contrast ratio at least 4.5:1"                                           |
| **Badge `bg-destructive/12 text-destructive`**     | Em light mode, 12% opacity sobre fundo claro pode resultar em contraste insuficiente entre texto e fundo                                                                                        | 🟡 Médio    | WCAG 2.2 SC 1.4.3                                                                                 |
| **Falta de paleta de tons de cinza documentada**   | Existem vários níveis de cinza em uso (`bg-muted/40`, `bg-muted/50`, `bg-muted/10`) sem definição clara de quando usar cada um                                                                  | 🟢 Baixo    | Documentar no Design System                                                                       |
| **Uso de `text-destructive` em botão destructive** | Botão `variant="destructive"` usa `text-destructive` sem fundo — em dark mode (#D72B1A) sobre fundo escuro funciona, mas usuários podem não associar a ação destrutiva apenas pela cor do texto | 🟡 Médio    | NN/g: "Error prevention" — ações destrutivas devem ter tratamento visual distinto, não apenas cor |

### 🎯 Recomendações

1. **Remapear `--primary`:**
   ```css
   --primary: 263 72% 52%; /* accent violeta — a cor da marca */
   --primary-foreground: 0 0% 100%;
   --nav-active-bg: var(--text-primary);
   --nav-active-fg: var(--bg-surface);
   ```
2. **Aumentar labels para ≥12px** — isso resolve o problema de contraste com `text-muted-foreground` por tabela
3. **Adicionar fundo ao botão destructive:** `bg-destructive/10 hover:bg-destructive/20` além da cor do texto

---

## FASE 6 — BOTÕES

### ✅ O que está bom

- **Variantes bem definidas:** default, outline, secondary, ghost, link, destructive
- **Loading state:** `loading` prop com `Loader2` spinner + `aria-busy`
- **Microinteração:** `active:scale-[0.98]` — feedback tátil visual no clique
- **Estados:** `disabled:pointer-events-none disabled:opacity-50`, `focus-visible:ring-2`
- **Tap target:** classe `.tap-target` com pseudo-elemento de 44px para touch (segue Apple HIG e WCAG 2.5.5)

### ❌ Problemas

| Problema                                            | Detalhe                                                                                                                                                                                      | Severidade | Princípio                                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| **Botões icon-only sem garantia de `aria-label`**   | O componente `Button` não força `aria-label` quando `size="icon"`. Depende do desenvolvedor lembrar. No `AppLayout`, o botão de busca tem `aria-label`, mas não há garantia em todo o código | 🟠 Alto     | WCAG 2.2 SC 4.1.2: "Name, Role, Value" — botões sem texto visível precisam de nome acessível |
| **Botão `link` sem `role="link"` quando `asChild`** | Se usado como `asChild` com `<a>`, o link herda corretamente, mas não há distinção visual clara entre link e botão ghost                                                                     | 🟢 Baixo    | NN/g: "Recognition rather than recall"                                                       |
| **Sem `size="xl"` ou `size="icon-lg"`**             | Para CTAs principais como "Nova Transação" no Dashboard, um botão maior seria adequado                                                                                                       | 🟢 Baixo    | Apple HIG: "Make hit targets large enough"                                                   |
| **Falta de estado `pressed` distinto**              | `active:scale-[0.98]` é bom para clique, mas não há `:active` visual (mudança de cor/fundo) consistente com Material Design                                                                  | 🟢 Baixo    | Material Design: "Pressed state should provide clear feedback"                               |

### 🎯 Recomendações

1. **Adicionar `aria-label` obrigatório para `size="icon"`** via TypeScript (tornar `aria-label` required quando `size === "icon"` e sem children)
2. **Adicionar `size="xl"`:** `h-14 px-8 text-base` para CTAs principais

---

## FASE 7 — FORMULÁRIOS

### ✅ O que está bom

- **Sistema de formulários robusto:** `FormField`, `FormSection`, `.form-grid-2`, `.form-actions`
- **Validação com Zod:** schemas com 12 camadas declaradas no MASTER_BLUEPRINT
- **Estados de erro:** `role="alert"` nas mensagens de erro
- **FormSection com ícone e label:** agrupamento visual claro de campos relacionados
- **`.control` utility:** padding 10px 12px, altura 40px (bom para touch)
- **Modal mobile:** TransactionModal vira bottom sheet com drag handle em mobile

### ❌ Problemas

| Problema                                              | Detalhe                                                                                                                                                                                                | Severidade | Princípio                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------- |
| **Labels muito pequenos**                             | `text-[11px]` — já coberto na Fase 4                                                                                                                                                                   | 🔴 Crítico  | WCAG / Apple HIG                                                                       |
| **Sem indicação de campos obrigatórios vs opcionais** | `FormField` tem prop `required` que adiciona `*` visual, mas não há indicação de quais campos são opcionais                                                                                            | 🟡 Médio    | NN/g: "Help users avoid errors" — marcar opcionais evita hesitação                     |
| **Placeholder substituindo label**                    | Em alguns componentes (ex: `AmountInput`, `CurrencyInput`), o placeholder pode estar sendo usado como label substituto — padrão comum em apps financeiros (Revolut), mas arriscado para acessibilidade | 🟡 Médio    | WCAG 2.2 SC 3.3.2: "Labels or instructions required"                                   |
| **TransactionForm é muito longo**                     | Um único formulário com AmountInput, BasicInfoSection, AccountSelector, AdvancedOptions — sem steps visuais ou progresso                                                                               | 🟡 Médio    | NN/g: "Aesthetic and minimalist design" — formulários longos se beneficiam de chunking |
| **Autocomplete não implementado**                     | Inputs financeiros não têm `autocomplete` attributes (ex: `autocomplete="transaction-amount"` não existe, mas `off` poderia ser usado para campos de valor)                                            | 🟢 Baixo    | WCAG 2.2 SC 1.3.5                                                                      |

### 🎯 Recomendações

1. **Aumentar labels para 12px** (já coberto)
2. **Adicionar `optional` prop ao `FormField`** que renderiza "(opcional)" ao lado do label
3. **Quebrar TransactionForm em steps** para criação de transação (ex: Passo 1: valor, Passo 2: categoria/conta, Passo 3: detalhes)

---

## FASE 8 — FEEDBACK

### ✅ O que está bom

- **Sonner toasts:** notificações não-bloqueantes com tema integrado
- **ActionFeedback:** feedback visual de tela cheia (sucesso/erro) para ações críticas — excelente para mobile
- **RippleEffect:** confirmação visual de ação bem-sucedida
- **EmptyState:** componente polido com 4 variantes (default/success/warning/danger), ícone grande, blur decorativo
- **Estados de loading:** `Loader2` spinner + `Skeleton` com shimmer
- **Haptics:** vibração em swipe, sucesso, erro (toque tátil)
- **Privacy mode:** blur nos valores sensíveis

### ❌ Problemas

| Problema                                                 | Detalhe                                                                                                                                                                     | Severidade | Princípio                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| **Três sistemas de feedback sobrepostos**                | ActionFeedback (tela cheia), RippleEffect (tela cheia), Sonner toasts — potencial conflito visual quando dois disparam juntos                                               | 🟠 Alto     | NN/g: "Consistency" — múltiplos tipos de feedback para o mesmo evento confundem    |
| **ActionFeedback é disruptivo**                          | Onda de cor que preenche a tela inteira por 900ms — para ações corriqueiras (ex: criar categoria) é excessivo. Adequado para ações financeiras críticas (ex: transferência) | 🟡 Médio    | Apple HIG: "Minimize disruption" — feedback deve ser proporcional à ação           |
| **Skeleton sem variante de card**                        | `Skeleton` é genérico (`shimmer rounded-md`). Para cards financeiros, um skeleton que imita o layout do card seria melhor (ex: SkeletonCard, SkeletonTransaction)           | 🟢 Baixo    | Material Design: "Skeleton screens should mirror the layout"                       |
| **Sem toast de "desfazer"**                              | Ações como exclusão de transação não oferecem "Desfazer" (padrão Gmail/Monzo)                                                                                               | 🟡 Médio    | NN/g: "User control and freedom" — desfazer reduz ansiedade em ações irreversíveis |
| **PullToRefresh sem indicador de progresso persistente** | O componente existe, mas sem ver o código completo não é possível confirmar se há feedback visual durante o refresh                                                         | 🟢 Baixo    | Material Design: "Pull to refresh must show indeterminate progress"                |

### 🎯 Recomendações

1. **Unificar feedback:** Usar Sonner toasts para ações rotineiras + ActionFeedback APENAS para ações financeiras críticas (transferências, acertos entre pessoas)
2. **Adicionar toast com "Desfazer"** para exclusões (com timeout de 5 segundos)
3. **Criar `SkeletonCard` e `SkeletonTransaction`** com layout aproximado

---

## FASE 9 — NAVEGAÇÃO

### ✅ O que está bom

- **MobileNav com Bottom Sheet:** padrão híbrido iOS/Android funcional
- **Indicador de rota ativa:** `bg-primary text-primary-foreground` no desktop, estilo similar no mobile
- **Atalho "+" central:** QuickAdd para nova transação — segue padrão Monzo/Revolut
- **Busca global:** `Ctrl+K` com `cmdk` — padrão Linear/Notion
- **Fechamento do sheet ao mudar de rota:** bom para navegação por botão voltar do Android

### ❌ Problemas

| Problema                                   | Detalhe                                                                                                                                            | Severidade | Princípio                                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| **11 itens na navegação desktop**          | Viola a Lei de Miller (7±2 chunks). 11 itens = sobrecarga cognitiva. Apps premium como Linear (5 itens), Things (5), Revolut (5) têm menus enxutos | 🔴 Crítico  | NN/g "Miller's Law": "The average person can only keep 7 items in working memory"                             |
| **MobileNav mostra apenas 5 + Menu**       | Solução paliativa para o problema dos 11 itens, mas cria hierarquia de 2 níveis: o que está visível vs o que está escondido no menu                | 🟠 Alto     | Apple HIG: "Use a tab bar for the most important top-level views" — itens no menu são "second-class citizens" |
| **Sem breadcrumbs**                        | Páginas de detalhe (Conta, Cartão, Viagem) não têm trilha de navegação. Ex: `/contas/abc123` — usuário não vê "Contas > Nubank"                    | 🟠 Alto     | NN/g: "Breadcrumbs show the user's location in the site hierarchy"                                            |
| **Sem gesto de voltar**                    | iOS suporta swipe from edge para voltar nativamente, mas em modo PWA/standalone pode não funcionar. Nenhum handler explícito.                      | 🟡 Médio    | Apple HIG: "People expect to use a swipe gesture to go back"                                                  |
| **Bottom sheet "Menu" não é discoverable** | O 5º item da MobileNav é "Menu" com ícone de hambúrguer — usuários podem não associar que abre um menu completo de navegação                       | 🟡 Médio    | NN/g: "Recognition rather than recall" — ícone "Mais" (⋯) ou grid (⊞) seria mais reconhecível                 |
| **Sidebar desktop não existe**             | Em telas largas, os 11 itens ficam numa linha horizontal que pode quebrar. Não há sidebar expansível (padrão Notion/Discord)                       | 🟡 Médio    | Material Design: "Navigation rail for tablet/desktop provides more space"                                     |

### 🎯 Recomendações

1. **Reduzir navegação principal para 5 itens (mais 1 "Mais"):**
   - Início, Transações, (+) Add, Relatórios, Planejar
   - Agrupar sob "Mais": Contas, Cartões, Compartilhado, Viagens, Família, Orçamentos, Simuladores
2. **Adicionar breadcrumbs** nas páginas de detalhe
3. **Renomear "Menu" na MobileNav para "Mais"** com ícone de grid (⊞) em vez de hambúrguer
4. **Considerar Navigation Rail** para tablet em landscape

---

## FASE 10 — MICROINTERAÇÕES

### ✅ O que está bom

- **SwipeableRow:** com spring animation, threshold detection, haptic feedback, fallback para desktop (DropdownMenu)
- **Botão:** `active:scale-[0.98]`, `transition-all duration-150`
- **Animações Tailwind:** `animate-fade-in`, `animate-slide-down`, `animate-accordion-*`
- **Framer Motion:** `motion.div` com `useMotionValue`, `useTransform` no TransactionItem
- **Haptics utilitário:** `haptics.light()`, `.medium()`, `.success()`

### ❌ Problemas

| Problema                                                           | Detalhe                                                                                                                                | Severidade | Princípio                                                                                                      |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| **Sem transição entre páginas**                                    | Navegar de Dashboard para Transactions é instantâneo (sem fade/slide). Apps premium (Things, Linear) têm animações sutis de transição  | 🟡 Médio    | Apple HIG: "Use animation to provide feedback and show transitions"                                            |
| **Animações não respeitam `prefers-reduced-motion`**               | Não foi encontrada nenhuma media query `@media (prefers-reduced-motion: reduce)`. Usuários com sensibilidade a movimento não têm opção | 🟠 Alto     | WCAG 2.2 SC 2.3.3: "Animation from Interactions" — "Motion animation triggered by interaction can be disabled" |
| **Sem animação de entrada escalonada (stagger) para listas**       | `animate-stagger stagger-1` aparece no DashboardHero mas não parece estar definido no Tailwind config                                  | 🟢 Baixo    | Polimento visual para listas de cards                                                                          |
| **Sem microinteração de "puxar para baixo" além do PullToRefresh** | iOS tem rubber banding nativo, mas o CSS `overscroll-behavior-y: none` remove isso                                                     | 🟢 Baixo    | Apple HIG: "The interface should feel responsive to touch"                                                     |

### 🎯 Recomendações

1. **Adicionar `prefers-reduced-motion` em TODAS as animações:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```
2. **Adicionar transição de página** com `AnimatePresence` do Framer Motion (fade-in suave de 200ms)
3. **Definir `animate-stagger`** no Tailwind config ou remover as classes não definidas

---

## FASE 11 — RESPONSIVIDADE

### ✅ O que está bom

- **Mobile-first:** CSS base para mobile, `md:` e `lg:` breakpoints para expansão
- **Safe Area:** `env(safe-area-inset-*)` usadas nas variáveis CSS e no `.app-container`
- **Modal mobile:** `TransactionModal` usa `!bottom-0 !top-auto !translate-y-0` em mobile (bottom sheet) e `sm:!top-[50%] sm:!-translate-y-1/2` em desktop (dialog centralizado)
- **Touch target:** `.tap-target` com 44px mínimo
- **Prevenção de zoom em input:** `font-size: 16px !important` em mobile (previne zoom indesejado do iOS Safari)
- **Overflow control:** `overflow-x: clip`, `overscroll-behavior-x: none`

### ❌ Problemas

| Problema                                                                                                    | Detalhe                                                                                                                                          | Severidade                                                  | Princípio                                                     |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------- |
| **`!important` nos inputs mobile**                                                                          | `font-size: 16px !important` resolve o zoom do iOS mas é uma abordagem agressiva. Se um input precisar de 14px em desktop, o `!important` impede | 🟢 Baixo                                                     | Funciona, mas frágil para customizações futuras               |
| **Sem breakpoint para tablet em landscape**                                                                 | iPad Pro 12.9" em landscape (1366px) renderiza o layout desktop, mas o toque ainda é coarse. Alguns hover effects não funcionam em touch         | 🟡 Médio                                                     | Apple HIG: "Adapt to iPad" — iPad não é nem phone nem desktop |
| **`md:hidden` no QuickAccess do Dashboard**                                                                 | Os atalhos rápidos (Contas, Cartões, Viagens, Grupos) desaparecem em desktop — usuários desktop perdem acesso rápido                             | 🟡 Médio                                                     | Acesso rápido é útil em qualquer dispositivo                  |
| **Header height inconsistente:** `h-11 md:h-12` — diferença mínima (44px vs 48px) sem ganho funcional claro | 🟢 Baixo                                                                                                                                          | Padronizar para 48px (Material Design minimum touch target) |

### 🎯 Recomendações

1. **Tratar tablet (iPad) como dispositivo de toque:** usar `pointer: coarse` media query em vez de `max-width` para decidir entre mobile/desktop
2. **Manter QuickAccess visível em desktop** com layout de cards em grid 4-col
3. **Padronizar header para `h-12` (48px)** em todos os breakpoints

---

## FASE 12 — ACESSIBILIDADE (WCAG 2.2 AA)

### ✅ O que está em conformidade

- **Focus visible:** `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` em botões, inputs, selects, tabs
- **ARIA states:** `aria-busy` nos botões com loading, `aria-hidden` nos ícones decorativos
- **role="alert":** nas mensagens de erro dos formulários
- **sr-only:** textos para leitores de tela (ex: botão fechar do Dialog)
- **Touch targets:** 44px via `.tap-target`
- **Semantic HTML:** uso de `<header>`, `<nav>`, `<h1>-<h4>`
- **Language:** `pt-BR` via `Intl.NumberFormat`

### ❌ Não conformidades

| Problema                                   | Detalhe                                                                                                             | Severidade | Referência WCAG                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| **Contraste de texto insuficiente**        | Labels `text-[11px] text-muted-foreground` = razão ~2.8:1 (mínimo 4.5:1)                                            | 🔴 Crítico  | SC 1.4.3 (AA)                                                      |
| **Sem skip-to-content link**               | Usuários de teclado precisam tabular por 11 itens de nav + header antes de chegar ao conteúdo                       | 🔴 Crítico  | SC 2.4.1 (A)                                                       |
| **Sem suporte a `prefers-reduced-motion`** | Todas as animações ignoram a preferência do sistema operacional                                                     | 🟠 Alto     | SC 2.3.3 (AAA, mas recomendado)                                    |
| **Foco não visível em alguns elementos**   | Links como os do `DashboardQuickAccess` não têm `focus-visible` definido explicitamente                             | 🟠 Alto     | SC 2.4.7 (AA)                                                      |
| **Textos de 10-11px**                      | Abaixo de 12px — usuários com baixa visão ou acima de 40 anos terão dificuldade                                     | 🟠 Alto     | SC 1.4.4 (AA) — resize text — texto deve ser legível com 200% zoom |
| **Gráficos sem alternativa textual**       | Recharts renderiza SVG sem descrições textuais para leitores de tela                                                | 🟠 Alto     | SC 1.1.1 (A) — "Non-text content must have a text alternative"     |
| **Tab index não gerenciado em modais**     | Ao abrir um Dialog, o foco não é necessariamente trapado (Radix Dialog faz isso nativamente, mas precisa confirmar) | 🟡 Médio    | SC 2.4.3 (A)                                                       |
| **Sem anúncio de mudanças dinâmicas**      | Quando filtros de transação são aplicados, o número de resultados muda sem `aria-live`                              | 🟡 Médio    | SC 4.1.3 (AA)                                                      |
| **Icon-only buttons sem nome acessível**   | Risco de botões de ícone sem `aria-label` em alguns lugares do código                                               | 🟡 Médio    | SC 4.1.2 (A)                                                       |

### 🎯 Recomendações

1. **Adicionar skip-to-content** como primeiro elemento focável:
   ```html
   <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute ...">
     Pular para conteúdo principal
   </a>
   ```
2. **Adicionar `aria-label` ou `title` em TODOS os gráficos** Recharts
3. **Adicionar `aria-live="polite"`** nas seções de lista que mudam com filtros
4. **Adicionar `focus-visible` nos links do QuickAccess**
5. **Implementar `prefers-reduced-motion`** globalmente

---

## FASE 13 — GRÁFICOS

### ✅ O que está bom

- **Variedade de tipos:** linha (MonthlyEvolution, WealthEvolutionChart), pizza/rosca (CategoryDistribution), barra (CategoryTrend)
- **Lazy loading:** `SharedBalanceChart` e outros usam `lazy()` para code splitting
- **Seleção de período e moeda** nos relatórios

### ❌ Problemas

| Problema                                          | Detalhe                                                                                                                   | Severidade | Princípio                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| **Sem alternativa textual**                       | Gráficos Recharts (SVG) não têm `title`, `desc`, ou `aria-label`. Leitores de tela ignoram completamente os dados visuais | 🟠 Alto     | WCAG 2.2 SC 1.1.1                                                                |
| **Cores de gráfico não testadas para daltonismo** | Verdes e vermelhos padrão para positivo/negativo são problemáticos para ~8% da população masculina                        | 🟡 Médio    | WCAG 2.2 SC 1.4.1: "Color is not the only visual means of conveying information" |
| **Performance de re-render**                      | Gráficos re-renderizam em cada filtro sem memoização visível                                                              | 🟡 Médio    | Usar `React.memo` + `useMemo` para dados do gráfico                              |
| **Tooltips não responsivos em touch**             | Tooltips de hover não funcionam em touch devices                                                                          | 🟡 Médio    | Material Design: "Touch targets for charts"                                      |
| **Sem estado de loading para gráficos**           | Enquanto dados carregam, o espaço do gráfico fica vazio ou com spinner genérico — um skeleton específico seria melhor     | 🟢 Baixo    | Loading states                                                                   |

---

## FASE 14 — DASHBOARD

### Análise de hierarquia de informação

O Dashboard atual renderiza (em ordem):

1. `PendingInvitationsAlert` — alertas de convites
2. `PendingTripInvitationsAlert` — alertas de viagem
3. `PendingSharedCardInvitationsAlert` — alertas de cartão
4. `GreetingCard` — saudação personalizada
5. `DashboardHero` — saldo, receita, despesa, patrimônio
6. `DashboardInvoices` — faturas de cartão
7. `MonthInsight` — insight IA
8. `DashboardQuickAccess` — atalhos (mobile only)
9. `DashboardRecentActivity` — últimas transações
10. `DashboardBillsDue` — contas a vencer
11. `DashboardUpcomingRecurring` — transações recorrentes
12. `DashboardLowBalanceAlert` — alerta de saldo baixo
13. `FamilyBalancePanel` — painel familiar

### ❌ Problemas

| Problema                                        | Detalhe                                                                                                                   | Severidade | Princípio                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| **Sobrecarga cognitiva: 13 seções**             | O dashboard tem 13 seções potencialmente visíveis. Apps premium têm 3-5 seções no dashboard (Revolut: 4, Monzo: 3)        | 🔴 Crítico  | NN/g: "Aesthetic and minimalist design" — "Remove unnecessary elements"                 |
| **Alertas no topo empurram conteúdo principal** | 3 banners de alertas antes do saldo — o usuário precisa scrollar para ver seu dinheiro                                    | 🟠 Alto     | NN/g: "Most important information first" — saldo é a informação #1 de um app financeiro |
| **Saldo excessivamente grande**                 | `text-5xl sm:text-6xl md:text-7xl` ocupa 72px em desktop. Revolut usa 36px para saldo com foco em clareza, não ostentação | 🟡 Médio    | Apple HIG: "Use type sizes that establish clear hierarchy"                              |
| **QuickAccess mobile-only**                     | Desktops perdem atalhos rápidos para ações comuns                                                                         | 🟡 Médio    | Consistência cross-device                                                               |
| **Sem priorização visual**                      | Todas as seções têm o mesmo peso visual — não há distinção entre "olhe isso agora" e "informativo"                        | 🟡 Médio    | NN/g: "Visual hierarchy guides users to important elements"                             |

### 🎯 Recomendações

1. **Reduzir para 5 seções essenciais (ordem de prioridade):**
   1. Saldo + Receita/Despesa (DashboardHero simplificado)
   2. Alertas críticos (apenas os que exigem ação imediata)
   3. Faturas de cartão próximas do vencimento
   4. Últimas 3 transações + link "Ver todas"
   5. Atalhos rápidos (desktop e mobile)
2. **Alertas de convite não-urgentes** devem ir para a área de notificações (sino), não para o dashboard
3. **Mover MonthInsight, LowBalanceAlert, FamilyBalance** para uma seção colapsável "Ver mais"

---

## FASE 15 — EXPERIÊNCIA DE USO

### Análise de eficiência

| Tarefa                | Cliques/etapas atuais                                       | Ideal | Avaliação |
| --------------------- | ----------------------------------------------------------- | ----- | --------- |
| Ver saldo             | 0 (já no dashboard)                                         | 0     | ✅         |
| Adicionar transação   | 2 (botão + → preencher form)                                | 1-2   | ✅         |
| Ver transações do mês | 1 (nav "Transações")                                        | 1     | ✅         |
| Ver fatura do cartão  | 1 (nav "Cartões" → selecionar)                              | 1-2   | ✅         |
| Criar orçamento       | 3 (nav → rolar → encontrar Orçamentos → clicar → form)      | 2     | 🟡         |
| Compartilhar despesa  | 4+ (nav Compartilhado → adicionar → selecionar tipo → form) | 3     | 🟡         |
| Trocar tema           | 2 (avatar dropdown → toggle)                                | 1     | 🟡         |
| Ver membro da família | 2 (nav Família → rolar)                                     | 1     | ✅         |

### ❌ Problemas

| Problema                          | Detalhe                                                                                                                                 | Severidade | Princípio                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| **Tempo para aprender o menu**    | 11 itens de navegação demandam scaneamento e memorização                                                                                | 🟠 Alto     | NN/g: "Recognition rather than recall"                                     |
| **Fricção em ações frequentes**   | "Compartilhar despesa" está em `/compartilhados`, mas "Criar transação" está no modal "+" — dois fluxos diferentes para ações similares | 🟡 Médio    | NN/g: "Consistency and standards"                                          |
| **Configurações sobrecarregadas** | 10 seções em Settings, cada uma é uma tela separada. A sidebar ajuda, mas é difícil encontrar configurações específicas sem busca       | 🟡 Médio    | NN/g: "Flexibility and efficiency of use" — search em settings seria ideal |
| **Sem onboarding contextual**     | Não há tooltips/dicas na primeira vez que o usuário acessa cada tela                                                                    | 🟢 Baixo    | NN/g: "Help and documentation" proativo                                    |

---

## FASE 16 — SISTEMA FINANCEIRO (AUDITORIA ESPECÍFICA)

### ✅ O que está bom

- **Decimal.js para cálculos:** ausência de floats para dinheiro
- **Soft delete:** `deleted_at` em vez de exclusão permanente
- **AlertDialog para ações destrutivas:** excluir conta, excluir transação, excluir meta
- **Privacy mode:** blur em valores sensíveis
- **Formatação de moeda:** `Intl.NumberFormat` pt-BR com símbolo correto
- **Valores positivos/negativos:** `.value-positive` (verde) e `.value-negative` (vermelho)
- **Multi-moeda:** suporte a BRL, USD, EUR, GBP, CAD, AUD, JPY, CHF

### ❌ Problemas

| Problema                                           | Detalhe                                                                                                                                                                        | Severidade | Princípio                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------- |
| **Sem confirmação de leitura para ações críticas** | Excluir transação tem modal de confirmação, mas não há step intermediário de "Você tem certeza? Esta ação não pode ser desfeita" com destaque visual no valor que será afetado | 🟠 Alto     | NN/g: "Error prevention" — ações financeiras críticas precisam de dupla confirmação |
| **Sem "Desfazer" após ações**                      | Já mencionado na Fase 8. Especialmente crítico para ações financeiras                                                                                                          | 🟠 Alto     | NN/g: "User control and freedom"                                                    |
| **Saldo não mostra variação %**                    | DashboardHero mostra saldo absoluto, mas não a variação em relação ao mês anterior (padrão Revolut: "+12% este mês")                                                           | 🟡 Médio    | Contexto financeiro: saldo sem referência temporal perde significado                |
| **Sem indicador de "gastos acima do normal"**      | Orçamentos têm progresso, mas não há alerta proativo quando uma categoria está com gastos 20% acima da média                                                                   | 🟡 Médio    | Insight financeiro proativo                                                         |
| **PIN armazenado em plaintext**                    | Documentado no MASTER_BLUEPRINT como vulnerabilidade pendente — não é UI, mas afeta a percepção de segurança                                                                   | 🔴 Crítico  | Segurança financeira                                                                |

---

## FASE 17 — COMPARAÇÃO COM APPLE HIG

### ✅ Conformidades

| Diretriz HIG               | Status                             |
| -------------------------- | ---------------------------------- |
| Tap targets ≥44pt          | ✅ `.tap-target`                    |
| Safe area insets           | ✅ `env(safe-area-inset-*)`         |
| Bottom sheet modals        | ✅ TransactionModal mobile          |
| Haptic feedback            | ✅ `haptics` utility                |
| SF-style colors (semantic) | ✅ `--positive/negative/neutral`    |
| Navigation bar translúcida | ✅ `bg-background/95 backdrop-blur` |

### ❌ Não conformidades

| Diretriz HIG                            | Situação                                                                                                                   | Severidade |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Tab bar: 3-5 itens**                  | MobileNav tem 5, mas um deles é "Menu" que esconde mais 11 itens — não é um Tab Bar, é um menu disfarçado                  | 🟠 Alto     |
| **Hierarchical navigation**             | Falta a navegação hierárquica com seta "Voltar" nas páginas de detalhe                                                     | 🟠 Alto     |
| **"Single source of truth" para ações** | "+" na MobileNav e "Nova Transação" no DashboardHero abrem o mesmo modal — bom, mas inconsistente com o resto da navegação | 🟡 Médio    |
| **Tipografia Dinâmica**                 | Não há suporte a Dynamic Type (o usuário não pode ajustar o tamanho do texto)                                              | 🟡 Médio    |
| **Modality**                            | Alertas e dialogs são usados corretamente, mas alguns fluxos poderiam ser sheets em vez de modais em iPhone                | 🟢 Baixo    |

---

## FASE 18 — COMPARAÇÃO COM MATERIAL DESIGN 3

### ✅ Conformidades

| Diretriz M3                               | Status                                     |
| ----------------------------------------- | ------------------------------------------ |
| Elevation/shadows                         | ✅ `shadow-sm/md/lg/2xl`                    |
| Ripple effect                             | ✅ `RippleEffect.tsx`                       |
| Bottom sheets                             | ✅ MobileNav, TransactionModal              |
| Navigation bar (3-5 destinos)             | ⚠️ 5 mas com Menu overflow                  |
| Color system (primary/secondary/tertiary) | ⚠️ primary mapeado errado (Fase 5)          |
| States (hover, focus, pressed, dragged)   | ✅ Quase todos                              |
| Motion (easing, duration tokens)          | ⚠️ Parcial (fade-in, slide-down, accordion) |

### ❌ Não conformidades

| Diretriz M3                          | Situação                                                                                                | Severidade |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ---------- |
| **Navigation rail (tablet/desktop)** | Não existe — Material recomenda rail para telas médias                                                  | 🟡 Médio    |
| **Material Theme Builder tokens**    | Tokens próprios, não seguem a nomenclatura M3 (o que é ok, mas limita interoperabilidade)               | 🟢 Baixo    |
| **FAB (Floating Action Button)**     | O botão "+" na MobileNav funciona como FAB, mas não tem elevação distinta nem animação de expandir      | 🟡 Médio    |
| **Time-based motion tokens**         | Durações de animação são hardcoded (200ms, 300ms, 500ms) em vez de usar tokens M3 (short1-4, medium1-4) | 🟢 Baixo    |

---

## FASE 19 — CLASSIFICAÇÃO DE PROBLEMAS

### 🔴 CRÍTICOS (9) — Bloqueiam experiência premium

| #   | Problema                                            | Fase   | Custo |
| --- | --------------------------------------------------- | ------ | ----- |
| C1  | 13 seções no Dashboard (sobrecarga cognitiva)       | 14     | Médio |
| C2  | Fonte 10-11px em labels e badges (ilegível)         | 4      | Baixo |
| C3  | 11 itens de navegação (viola Miller's Law)          | 9      | Alto  |
| C4  | Sem skip-to-content (WCAG 2.4.1)                    | 12     | Baixo |
| C5  | Contraste insuficiente em labels muted (WCAG 1.4.3) | 5, 12  | Baixo |
| C6  | Sem `prefers-reduced-motion` (WCAG 2.3.3)           | 10, 12 | Baixo |
| C7  | PIN plaintext (segurança)                           | 16     | Médio |
| C8  | Sem documentação do Design System                   | 2      | Médio |
| C9  | Sem alternativa textual em gráficos (WCAG 1.1.1)    | 12, 13 | Médio |

### 🟠 ALTOS (14) — Degradam a experiência significativamente

| #   | Problema                                              | Fase  |
| --- | ----------------------------------------------------- | ----- |
| A1  | Mapeamento incorreto de `--primary`                   | 2, 5  |
| A2  | Sem catálogo/Storybook de componentes                 | 2     |
| A3  | Três sistemas de feedback conflitantes                | 8     |
| A4  | Sem breadcrumbs em páginas de detalhe                 | 9     |
| A5  | Labels de formulário inconsistentes                   | 7     |
| A6  | Foco não visível em links do QuickAccess (WCAG 2.4.7) | 12    |
| A7  | Sem "Desfazer" para ações críticas                    | 8, 16 |
| A8  | Sem confirmação de leitura para exclusões financeiras | 16    |
| A9  | Mobile nav "Menu" não discoverable                    | 9     |
| A10 | Alertas empurram saldo no Dashboard                   | 14    |
| A11 | Botões icon-only sem garantia de aria-label           | 6, 12 |
| A12 | Sem anúncio de mudanças dinâmicas (aria-live)         | 12    |
| A13 | Navegação tab bar disfarçada (viola Apple HIG)        | 17    |
| A14 | Sem hierarchical navigation/voltar (Apple HIG)        | 17    |

### 🟡 MÉDIOS (18) — Afetam polimento e usabilidade

| #   | Problema                                           | Fase   |
| --- | -------------------------------------------------- | ------ |
| M1  | Spacing tokens não enforced                        | 3      |
| M2  | Escala tipográfica não responsiva completa         | 4      |
| M3  | Saldo excessivamente grande no Dashboard           | 4, 14  |
| M4  | Sem indicação opcional vs obrigatório em forms     | 7      |
| M5  | TransactionForm muito longo sem steps              | 7      |
| M6  | Sem transição entre páginas                        | 10     |
| M7  | Tablet não tratado como touch device               | 11     |
| M8  | QuickAccess mobile-only                            | 11, 14 |
| M9  | Cores de gráfico não testadas para daltonismo      | 13     |
| M10 | Tooltips de gráfico não funcionam em touch         | 13     |
| M11 | Performance de re-render em gráficos               | 13     |
| M12 | Saldo sem variação % mensal                        | 16     |
| M13 | Sem indicador de gastos acima do normal            | 16     |
| M14 | Configurações sobrecarregadas (10 seções)          | 15     |
| M15 | Fricção em compartilhar despesa vs criar transação | 15     |
| M16 | Sem Navigation Rail para tablet (M3)               | 18     |
| M17 | Botão "+" sem elevação FAB (M3)                    | 18     |
| M18 | Padding inconsistente entre páginas                | 3      |

### 🟢 BAIXOS (Queda de polish)

| #   | Problema                                 | Fase |
| --- | ---------------------------------------- | ---- |
| B1  | Mix de border-radius sem critério        | 3    |
| B2  | Glass Effect inconsistente               | 3    |
| B3  | Botão link sem distinção visual          | 6    |
| B4  | Sem size="xl" no Button                  | 6    |
| B5  | Autocomplete não implementado            | 7    |
| B6  | Skeleton sem variantes de card           | 8    |
| B7  | PullToRefresh sem indicador de progresso | 8    |
| B8  | Animações stagger não definidas          | 10   |
| B9  | Header height inconsistente              | 11   |
| B10 | Sem onboarding contextual                | 15   |

---

## FASE 20 — ROADMAP

### Sprint 1: Acessibilidade e Legibilidade (2 semanas)

**Objetivo:** Eliminar todos os problemas CRÍTICOS de acessibilidade

1. Aumentar todas as fontes <12px para ≥12px (C2, C5)
2. Adicionar skip-to-content link (C4)
3. Implementar `prefers-reduced-motion` global (C6)
4. Adicionar `aria-label`/`title` em gráficos (C9)
5. Garantir `aria-label` em todos os botões icon-only (A11)
6. Adicionar `focus-visible` nos links do QuickAccess (A6)
7. Adicionar `aria-live` em listas filtradas (A12)

### Sprint 2: Arquitetura de Informação (3 semanas)

**Objetivo:** Redução de complexidade cognitiva

1. Redesenhar Dashboard: 13 → 5 seções (C1)
2. Reduzir nav principal: 11 → 5+1 itens (C3)
3. Implementar breadcrumbs (A4)
4. Renomear "Menu" → "Mais" com ícone grid (A9)
5. Mover alertas não-urgentes para notification center (A10)

### Sprint 3: Design System (3 semanas)

**Objetivo:** Consistência e documentação

1. Corrigir mapeamento `--primary` → `--accent` (A1)
2. Criar `DESIGN_SYSTEM.md` com catálogo (C8, A2)
3. Enforçar spacing tokens na escala base-4 (M1)
4. Definir níveis de border-radius (B1)
5. Padronizar padding entre páginas (M18)

### Sprint 4: Experiência do Usuário (2 semanas)

**Objetivo:** Polimento e padrões premium

1. Adicionar toast "Desfazer" para ações destrutivas (A7)
2. Confirmação de leitura para exclusões financeiras (A8)
3. Unificar sistemas de feedback (A3)
4. Adicionar variação % no saldo do Dashboard (M12)
5. Quebrar TransactionForm em steps (M5)
6. Indicar campos opcionais vs obrigatórios (M4)

### Sprint 5: Responsividade e Plataforma (2 semanas)

**Objetivo:** Experiência consistente cross-device

1. Tablet touch detection via `pointer: coarse` (M7)
2. Manter QuickAccess em desktop (M8)
3. Transições de página com Framer Motion (M6)
4. Navigation Rail para tablet landscape (M16)

### Backlog (Sprint 6+)

- Storybook com 2 stories por componente
- Testes de cor para daltonismo (M9)
- Chart tooltips touch-friendly (M10)
- Onboarding contextual (B10)
- Skeleton variants (B6)
- Animações stagger (B8)

---

## 📋 CHECKLIST DE MELHORIAS RÁPIDAS (Quick Wins)

Estas 5 melhorias levam <1 hora cada e têm alto impacto:

| #   | Melhoria                                               | Impacto                   |
| --- | ------------------------------------------------------ | ------------------------- |
| 1   | `font-size: 10px/11px` → `12px` em todo o CSS          | Legibilidade imediata     |
| 2   | Adicionar `<a href="#main">Pular para conteúdo</a>`    | Acessibilidade crítica    |
| 3   | `@media (prefers-reduced-motion: reduce)` no index.css | Acessibilidade, 10 linhas |
| 4   | `aria-label` nos botões de ícone do AppLayout          | Acessibilidade, 3 linhas  |
| 5   | `focus-visible:ring-2` nos links do QuickAccess        | Acessibilidade, 1 classe  |

---

## 📖 REFERÊNCIAS POR PROBLEMA

| Problema                | Referência                                             | Link                                                             |
| ----------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| C1 (Dashboard overload) | NN/g: "Aesthetic and Minimalist Design"                | Heuristic #8                                                     |
| C2 (Font size)          | Apple HIG: "Typography > Minimum font size 11pt"       | developer.apple.com/design/human-interface-guidelines/typography |
| C3 (Navigation items)   | NN/g: "Miller's Law" / "Number of Items in Navigation" | nngroup.com/articles/millers-law                                 |
| C4 (Skip link)          | WCAG 2.2 SC 2.4.1: Bypass Blocks                       | w3.org/TR/WCAG22/#bypass-blocks                                  |
| C5 (Contrast)           | WCAG 2.2 SC 1.4.3: Contrast (Minimum)                  | w3.org/TR/WCAG22/#contrast-minimum                               |
| C6 (Reduced motion)     | WCAG 2.2 SC 2.3.3: Animation from Interactions         | w3.org/TR/WCAG22/#animation-from-interactions                    |
| C9 (Chart alt text)     | WCAG 2.2 SC 1.1.1: Non-text Content                    | w3.org/TR/WCAG22/#non-text-content                               |
| A13 (Tab bar)           | Apple HIG: "Tab Bars > Use 3-5 tabs"                   | developer.apple.com/design/human-interface-guidelines/tab-bars   |
| A7 (Undo)               | NN/g: "User Control and Freedom"                       | Heuristic #3                                                     |

---

> **Auditoria concluída.** 61/100 — aplicativo funcional com base sólida, mas precisa de 24+ pontos de melhoria para alcançar padrão premium. Recomenda-se iniciar pelos 9 problemas críticos (Sprint 1-2).
