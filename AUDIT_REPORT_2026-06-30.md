# AUDITORIA DE PRODUTO — Seu Bolso Inteligente
> **Data:** 2026-06-30 | **Versão:** 2.0 Completa
> **Escopo:** Produto completo — 20 fases de auditoria
> **Equipe simulada:** PM + PO + BA + SA + Financial Specialist + UX Researcher + QA Lead + Solution Architect + Software Auditor + SaaS Specialist

---

# FASE 1 — INVENTÁRIO FUNCIONAL

## 1.1 MÓDULOS DO SISTEMA

| # | Módulo | Página/Rota | Descrição |
|---|--------|-------------|-----------|
| M01 | **Autenticação** | `/auth`, `/reset-password` | Login/Registro via Email+Senha, Google OAuth, Reset de senha |
| M02 | **Dashboard** | `/` | Visão consolidada: saldo, receitas, despesas, faturas, contas a pagar, atividade recente |
| M03 | **Transações** | `/transacoes` | CRUD de receitas/despesas/transferências, filtros, busca, parcelamentos |
| M04 | **Contas** | `/contas`, `/contas/:id` | CRUD de contas bancárias (nacionais e internacionais), extrato, transferência |
| M05 | **Cartões de Crédito** | `/cartoes`, `/cartoes/:id` | CRUD de cartões, faturas, fechamento, pagamento, compartilhamento |
| M06 | **Gastos Compartilhados** | `/compartilhados` | Splits, liquidação, reversão, importação de parcelas compartilhadas |
| M07 | **Relatórios** | `/relatorios` | Resumo, distribuição por categoria, evolução mensal, tendências |
| M08 | **Metas Financeiras** | `/metas` | CRUD de metas, aportes, marcos, exportação PDF |
| M09 | **Investimentos** | `/metas` (aba Investimentos/IRPF) | CRUD de ativos B3, IRPF, sincronização de preços |
| M10 | **Orçamentos** | `/orcamentos` | CRUD de orçamentos mensais por categoria/global, progresso |
| M11 | **Viagens** | `/viagens` | CRUD de viagens, multi-moeda, participantes, despesas, exportação |
| M12 | **Família** | `/familia` | Membros, convites, papéis (admin/editor/viewer), contatos de despesa |
| M13 | **Simuladores** | `/simuladores` | Renda Fixa/Tesouro, Poder de Compra (IPCA) |
| M14 | **Configurações** | `/configuracoes` | Conta, Categorias, Pessoas, Preferências, Segurança, Notificações, Backup, Privacidade, Ajuda, AutoShare |
| M15 | **Busca Global** | Overlay (Ctrl+K) | Busca server-side em transações, contas, metas |
| M16 | **Notificações Push** | Service Worker | Lembretes de contas a pagar, alertas de metas (7 dias) |
| M17 | **Onboarding** | Overlay | Wizard de boas-vindas para novos usuários |
| M18 | **Relatório Mensal Email** | Edge Function | Envio automático de relatório mensal por email |

## 1.2 TELAS (PÁGINAS)

| Rota | Página | Tipo | Lazy Load |
|------|--------|------|-----------|
| `/auth` | Login/Registro | Pública | ❌ |
| `/reset-password` | Reset de Senha | Pública | ❌ |
| `/privacidade` | Política de Privacidade | Pública | ❌ |
| `/` | Dashboard | Protegida (PIN+Auth) | ✅ |
| `/transacoes` | Transações (Lançadas + Próximas) | Protegida | ✅ |
| `/contas` | Lista de Contas | Protegida | ✅ |
| `/contas/:id` | Detalhe da Conta (Extrato) | Protegida | ✅ |
| `/cartoes` | Lista de Cartões | Protegida | ✅ |
| `/cartoes/:id` | Detalhe do Cartão (Fatura) | Protegida | ✅ |
| `/compartilhados` | Gastos Compartilhados | Protegida | ✅ |
| `/relatorios` | Relatórios | Protegida | ✅ |
| `/metas` | Metas + Investimentos + IRPF | Protegida | ✅ |
| `/orcamentos` | Orçamentos | Protegida | ✅ |
| `/viagens` | Viagens | Protegida | ✅ |
| `/familia` | Família | Protegida | ✅ |
| `/simuladores` | Simuladores | Protegida | ✅ |
| `/configuracoes` | Configurações | Protegida | ✅ |
| `*` | 404 - Não Encontrado | Pública | ❌ |

**Total: 17 rotas** (14 protegidas + 3 públicas)

## 1.3 FLUXOS POR MÓDULO

### M01 — Autenticação
1. Registro com email/senha → Confirmação email → Login → PIN (opcional) → Dashboard
2. Login Google OAuth → PIN (opcional) → Dashboard
3. Reset de senha → Email com link → Nova senha → Login
4. Logout → Limpa cache QueryClient → Redireciona /auth
5. Sessão expirada → ProtectedRoute redireciona /auth

### M02 — Dashboard
1. Entra → Vê saudação personalizada + insight do mês
2. Vê saldo total (soma de contas ativas)
3. Vê receitas vs despesas do mês
4. Vê faturas de cartão pendentes
5. Vê contas a pagar (próximos 7 dias)
6. Vê transações recorrentes próximas
7. Vê atividade recente (últimas 5)
8. Vê alerta de saldo baixo
9. Acesso rápido: Nova Transação, Contas, Cartões, Relatórios
10. Pull-to-refresh (mobile)
11. Seleção de moeda (multi-moeda)
12. Visão de viagem ativa (TripDashboardView)
13. Alerta de convites pendentes (família, viagem, cartão)

### M03 — Transações
1. Lista transações do mês (aba "Lançadas")
2. Filtros: tipo (receita/despesa), categoria, conta, período, busca textual
3. Agrupamento por dia
4. Modal de criação/edição de transação (TransactionModal)
5. Modal de exclusão com opção de cascata (parcelas futuras)
6. Modal de detalhes da transação
7. Aba "Próximas" (transações agendadas/recorrentes)
8. Antecipação de parcelas
9. Importação OFX
10. Seleção de moeda (multi-moeda)
11. Editar transação programada (desconfirmar → editar)

### M04 — Contas
1. Lista contas ativas com saldo e tipo
2. Criar conta (nacional: banco brasileiro; internacional: banco global + moeda)
3. Editar conta (nome, banco, cor, incluir no saldo)
4. Arquivar/Desarquivar conta (SwipeableRow)
5. Seção de contas arquivadas
6. Extrato da conta (AccountDetail com AccountStatement)
7. Transferência entre contas
8. Saque (WithdrawalModal)
9. Resumo de saldo total
10. Exportação de extrato (PDF/CSV)

### M05 — Cartões de Crédito
1. Lista de cartões com fatura atual, limite, vencimento
2. Criar cartão (bandeira, banco, limite, fechamento, vencimento)
3. Visualizar detalhes do cartão (fatura detalhada)
4. Pagar fatura (total ou parcial) — gera transação
5. Importar faturas (multi-seleção de transações)
6. Simulador de parcelamento (InstallmentSimulator)
7. Compartilhar cartão com família
8. Arquivar cartão
9. Categorias do cartão (distribuição de gastos)

### M06 — Gastos Compartilhados
1. Lista de despesas compartilhadas (aba Regular)
2. Lista de despesas de viagem compartilhadas (aba Viagem)
3. Histórico de liquidações (aba Histórico)
4. Selecionar itens para liquidar
5. Liquidar split (settle_split RPC atômica)
6. Reverter liquidação (unsettle_with_reversal RPC + audit trail)
7. Confirmar recebimento/pagamento
8. Importar parcelas compartilhadas
9. Antecipar parcelas
10. Gráfico de balanço compartilhado
11. Resumo de totais
12. Exportação (CSV/PDF)

### M07 — Relatórios
1. Visão Mensal vs Anual
2. Resumo financeiro (receitas, despesas, saldo)
3. Distribuição por categoria (gráfico)
4. Evolução mensal (gráfico de barras/linha)
5. Tendência por categoria (CategoryTrend)
6. Balanço compartilhado (SharedBalanceChart)
7. Busca/filtro de transações no relatório
8. Editar transação a partir do relatório
9. Exportação de relatório

### M08 — Metas Financeiras
1. Lista de metas com progresso
2. Criar meta (nome, valor-alvo, prazo, categoria)
3. Editar meta
4. Excluir meta
5. Aportar em meta (GoalContributeDialog com gráfico de evolução)
6. Marcos de progresso (GoalMilestonesPanel)
7. Exportar PDF da meta
8. Swipe para ações rápidas (SwipeableRow)

### M09 — Investimentos
1. Lista de ativos
2. Adicionar ativo (B3 ou manual)
3. Editar ativo
4. Excluir ativo
5. Histórico de transações do ativo
6. Sincronizar preços (B3 tickers)
7. Resumo da carteira (InvestmentSummarySection)
8. Painel IRPF (InvestmentIRPanel)
9. Exportação IRPF (PDF/Excel)
10. Exportação portfólio (PDF/CSV)

### M10 — Orçamentos
1. Lista de orçamentos com progresso visual
2. Criar orçamento (categoria ou global, valor, moeda)
3. Editar orçamento
4. Excluir orçamento
5. Progresso calculado via RPC otimizada

### M11 — Viagens
1. Lista de viagens (ativas e arquivadas)
2. Criar viagem (nome, destino, datas, orçamento, moeda)
3. Editar viagem
4. Excluir viagem
5. Arquivar/Desarquivar viagem
6. Visão detalhada com tabs: Resumo, Despesas, CheckList, Itinerário, Compras, Câmbio
7. Adicionar participantes (familiares + guest sem conta)
8. Remover participantes
9. Convites de viagem (PendingTripInvitationsAlert)
10. Compras de câmbio (ExchangePurchaseDialog)
11. Resumo de câmbio (ExchangeSummaryCard)
12. Sugestões IA para viagem (AITripSuggestions)
13. Exportação (PDF/Excel)

### M12 — Família
1. Visualizar grupo familiar
2. Convidar membro (email)
3. Aceitar/Recusar convite
4. Cancelar convite
5. Alterar papel do membro (admin/editor/viewer)
6. Remover membro
7. Converter membro ↔ contato de despesa
8. Adicionar contato de despesa direto (sem convite)
9. Ativar/desativar contato nos formulários
10. Papéis: admin (dono), editor, viewer

### M13 — Simuladores
1. Simulador de Renda Fixa (CDB, Tesouro, etc.)
2. Simulador de Poder de Compra (IPCA)
3. Dados do Banco Central (bcbService)

### M14 — Configurações
1. **Conta:** avatar, nome, email, excluir conta
2. **Categorias:** criar/editar/excluir categorias e subcategorias
3. **Pessoas:** gerenciar membros da família
4. **Preferências:** notificações push toggle
5. **Segurança:** PIN (set/change/clear via RPC com bcrypt), senha
6. **Notificações:** preferências de canais
7. **Backup:** exportar/importar dados
8. **Privacidade:** gerenciar dados
9. **Ajuda:** recursos de suporte
10. **AutoShare:** regras de compartilhamento automático
11. **Admin Reset:** painel admin (is_admin JWT-based)
12. **Aparência:** tema (claro/escuro/sistema)

### M15 — Busca Global
1. Atalho Ctrl+K
2. Busca server-side em transações (RPC search_transactions)
3. Cache-first, fallback server com debounce 400ms
4. Navegação para resultado

### M16 — Notificações Push
1. Registro de subscription (VAPID)
2. Lembretes de contas a pagar (pg_cron job send-bill-reminders-daily)
3. Alertas de metas (prazo em 7 dias)
4. Toggle ativar/desativar notificações
5. Edge Function send-bill-reminders (AES-128-GCM)
6. Service Worker customizado (sw.ts)

### M17 — Onboarding
1. Wizard de boas-vindas (WelcomeOnboarding)
2. Guarda que impede acesso até completar
3. Criação automática de categorias padrão

### M18 — Relatório Mensal Email
1. Edge Function send-monthly-report
2. pg_cron job send-monthly-report-job
3. RESEND_API_KEY configurada
4. Domínio pendente de verificação no Resend

## 1.4 SEPARAÇÃO POR USUÁRIO

| Perfil | Acessos |
|--------|---------|
| **Usuário não autenticado** | /auth, /reset-password, /privacidade |
| **Usuário autenticado (dono)** | Todos os módulos, gerencia família, configurações admin |
| **Membro família (admin)** | Acesso total ao grupo familiar |
| **Membro família (editor)** | Criar/editar transações, visualizar |
| **Membro família (viewer)** | Apenas visualização |
| **Convidado de viagem (guest)** | Participa de viagem sem ter conta no sistema |
| **Contato de despesa** | Aparece em splits sem ser membro da família |

## 1.5 PERMISSÕES (RLS)

- Todas as tabelas com RLS ativo
- RPCs críticas com `SECURITY DEFINER` + verificação `auth.uid()`
- `is_admin()` via JWT claims (não mais senha hardcoded)
- Cartão compartilhado: políticas SELECT para convidados aceitos
- `error_logs`: restrito (admin + próprio usuário)

---

# FASE 2 — MAPEAMENTO DOS FLUXOS

## 2.1 FLUXO PRINCIPAL (Jornada Típica)

```
Registro (Email/Google)
  ↓
Onboarding (Wizard boas-vindas)
  ↓
Criação de categorias padrão (automático)
  ↓
Dashboard (vazio)
  ↓
Criar Conta (banco/carteira)
  ↓
Criar Categoria personalizada
  ↓
Criar primeira Transação (receita ou despesa)
  ↓
Dashboard com dados
  ↓
Criar Orçamento
  ↓
Criar Meta financeira
  ↓
Criar Cartão de Crédito
  ↓
Importar faturas
  ↓
Pagar fatura
  ↓
Convidar família
  ↓
Compartilhar despesas
  ↓
Liquidar splits
  ↓
Criar Viagem
  ↓
Ver Relatórios
  ↓
Exportar dados
  ↓
Configurar notificações
```

## 2.2 FLUXO DE TRANSAÇÃO COMPARTILHADA

```
Usuário cria transação com split
  ↓
RPC create_transaction_with_splits (atômico)
  ↓
Split aparece para o outro membro
  ↓
Membro visualiza em "Compartilhado"
  ↓
Membro seleciona split → Liquida
  ↓
RPC settle_split (atômico: marca settled + cria INCOME + atualiza saldo)
  ↓
Split move para histórico
  ↓
[Se necessário] Reverter liquidação
  ↓
RPC unsettle_with_reversal (audit trail imutável)
```

## 2.3 FLUXO DE CARTÃO DE CRÉDITO

```
Criar Cartão (bandeira, banco, limite, fechamento, vencimento)
  ↓
Transações associadas ao cartão
  ↓
Fatura agrupada por competence_date (YYYY-MM-01)
  ↓
Visualizar fatura detalhada
  ↓
[Opcional] Importar transações para fatura
  ↓
Pagar fatura (total ou parcial)
  ↓
Gera transação de pagamento
  ↓
Saldo do cartão atualizado
```

## 2.4 FLUXO DE PARCELAMENTO

```
Criar transação parcelada
  ↓
RPC create_installment_series (atômico)
  ↓
N transações criadas (uma por mês)
  ↓
Visualizar na aba "Próximas"
  ↓
[Opcional] Antecipar parcelas
  ↓
[Opcional] Excluir (cascata: só esta ou esta + futuras)
```

## 2.5 FLUXO DE META FINANCEIRA

```
Criar meta (valor-alvo, prazo)
  ↓
Definir marcos de progresso
  ↓
Realizar aportes
  ↓
Gráfico de evolução (useGoalHistory)
  ↓
Notificação push 7 dias antes do prazo
  ↓
Meta concluída
  ↓
Exportar PDF
```

## 2.6 FLUXO DE VIAGEM

```
Criar viagem (destino, datas, orçamento, moeda)
  ↓
Adicionar participantes (família + guest)
  ↓
Enviar convites
  ↓
Registrar despesas da viagem
  ↓
Registrar compras de câmbio
  ↓
Visualizar balanço por participante
  ↓
Check-list de itens
  ↓
Itinerário
  ↓
Exportar viagem (PDF/Excel)
  ↓
Arquivar viagem
```

## 2.7 FLUXO DE CONFIGURAÇÃO

```
Acessar /configuracoes
  ↓
Sidebar com 11 seções
  ↓
Conta → editar perfil, avatar, excluir conta
  ↓
Categorias → gerenciar categorias
  ↓
Pessoas → gerenciar família
  ↓
Preferências → toggle notificações
  ↓
Segurança → PIN (bcrypt via RPC), senha
  ↓
Notificações → preferências de canais
  ↓
Backup → exportar/importar
  ↓
Privacidade → gerenciar dados
  ↓
Ajuda → suporte
  ↓
AutoShare → regras automáticas
```

---

# FASE 3 — REGRAS DE NEGÓCIO

## 3.1 REGRAS FINANCEIRAS CORE

### R01 — Saldo de Conta (SSOT)
- **Entrada:** Transação (INSERT/UPDATE/DELETE) na tabela `transactions`
- **Saída:** `accounts.balance` atualizado
- **Regra:** Trigger PostgreSQL recalcula saldo. Nunca atualizar `accounts.balance` diretamente.
- **Pré-condição:** Transação com `account_id` válido e `deleted_at IS NULL`
- **Pós-condição:** `balance = SUM(income) - SUM(expense)` para a conta
- **Exceção:** Transações soft-deletadas não afetam saldo
- **Validação:** ✅ Implementado via trigger `recalculate_account_balance`

### R02 — Competence Date
- **Entrada:** Qualquer transação
- **Saída:** Agrupamento contábil mensal
- **Regra:** `competence_date = YYYY-MM-01` (primeiro dia do mês)
- **Validação:** CHECK constraint `competence_date = date_trunc('month', competence_date)`
- **Impacto:** Faturas, relatórios, orçamentos

### R03 — Cálculos Financeiros
- **Entrada:** Qualquer operação matemática com dinheiro
- **Saída:** Valor preciso
- **Regra:** Decimal.js ou inteiros em centavos. Nunca float.
- **Validação:** ✅ SafeFinancialCalculator usa Decimal.js
- **⚠️ Problema:** SafeFinancialCalculator.add()/subtract() retornam `number`, perdendo precisão. Pendente de refactor.

### R04 — Soft Delete
- **Entrada:** Qualquer exclusão de dado financeiro
- **Saída:** `deleted_at = NOW()`, dado preservado
- **Regra:** Nunca DELETE físico em tabelas financeiras
- **Validação:** ✅ Implementado em accounts, transactions, categories, credit_cards, goals, trips, assets, family_members
- **Exceção:** `settlement_reversals` é IMUTÁVEL (nem soft delete). `error_logs` também imutável.

### R05 — Atomicidade
- **Entrada:** Operação multi-tabela
- **Saída:** Todas as mudanças ou nenhuma
- **Regra:** RPCs com BEGIN/COMMIT/ROLLBACK
- **Validação:** ✅ settle_split, unsettle_with_reversal, create_transaction_with_splits, create_installment_series

## 3.2 REGRAS POR MÓDULO

### Cartões de Crédito
| Regra | Descrição | Status |
|-------|-----------|--------|
| CC-01 | `closing_day` e `due_day` são inteiros (dia do mês) | ✅ |
| CC-02 | Fatura agrupada por `competence_date` (YYYY-MM-01) | ✅ |
| CC-03 | `PayInvoiceDialog` gera transação de pagamento | ✅ |
| CC-04 | Limite do cartão é informativo (não bloqueia transações) | ⚠️ Sem validação de estouro |

### Gastos Compartilhados
| Regra | Descrição | Status |
|-------|-----------|--------|
| SH-01 | Split só pode ser liquidado uma vez (idempotente) | ✅ |
| SH-02 | Liquidar split cria transação INCOME para o credor | ✅ |
| SH-03 | Reverter liquidação cria registro imutável em `settlement_reversals` | ✅ |
| SH-04 | Split liquidado via RPC atômica com FOR UPDATE | ✅ |
| SH-05 | Validação de ownership (auth.uid) na RPC | ✅ |
| SH-06 | `p_amount` deve ser > 0 e igual ao `split.amount` | ✅ |
| SH-07 | Suporte a multi-conta na liquidação | ✅ |

### Orçamentos
| Regra | Descrição | Status |
|-------|-----------|--------|
| BD-01 | Orçamento pode ser por categoria ou global | ✅ |
| BD-02 | Progresso = gasto real / valor orçado | ✅ |
| BD-03 | Cálculo otimizado via RPC `optimize_budgets_progress` | ✅ |
| BD-04 | Rollover atômico entre meses | ✅ |

### Metas
| Regra | Descrição | Status |
|-------|-----------|--------|
| GL-01 | Meta tem valor-alvo e prazo | ✅ |
| GL-02 | Aporte incrementa `current_amount` | ✅ |
| GL-03 | Marcos de progresso com alerta 7 dias antes | ✅ |
| GL-04 | Meta concluída quando `current_amount >= target_amount` | ✅ |

### Viagens
| Regra | Descrição | Status |
|-------|-----------|--------|
| TR-01 | Suporte multi-moeda (orçamento em qualquer moeda) | ✅ |
| TR-02 | Participante guest (sem conta no sistema) | ✅ |
| TR-03 | Convite de viagem pendente até aceitar/recusar | ✅ |
| TR-04 | Câmbio registrado separadamente (ExchangePurchaseDialog) | ✅ |

---

# FASE 4 — FUNCIONALIDADES INCOMPLETAS

## 4.1 CRÍTICAS

| ID | Problema | Local | Impacto |
|----|----------|-------|---------|
| INC-01 | **Relatório mensal por email não funciona em produção** — domínio Resend não verificado | `supabase/functions/send-monthly-report/` | 🔴 Usuários não recebem emails. Funcionalidade inteira inacessível. |
| INC-02 | **SafeFinancialCalculator retorna `number` em vez de `Decimal`** — perda de precisão | `src/services/SafeFinancialCalculator.ts` | 🔴 Todos os cálculos que usam `.add()`, `.subtract()` perdem precisão decimal |

## 4.2 ALTAS

| ID | Problema | Local | Impacto |
|----|----------|-------|---------|
| INC-03 | **PDF export bloqueia UI** — jsPDF na main thread | `src/utils/tripExport.ts`, `src/utils/investmentExport.ts` | 🟠 UI congela em relatórios grandes |
| INC-04 | **Cache IndexedDB sem criptografia** — dados financeiros expostos | `localforage` config em `App.tsx` | 🟠 Dispositivos compartilhados expõem dados |
| INC-05 | **OAuth redirect em Vercel Previews quebrado** — URLs dinâmicas não cadastradas | Supabase Auth config | 🟠 Login Google falha em previews |
| INC-06 | **Limite do cartão não validado** — não bloqueia estouro | `CreditCardDetailView.tsx` | 🟠 Usuário pode gastar além do limite sem alerta |

## 4.3 MÉDIAS

| ID | Problema | Local | Impacto |
|----|----------|-------|---------|
| INC-07 | **`useCreateTransaction` com 600+ linhas** — difícil manutenção | `src/hooks/transactions/useCreateTransaction.ts` | 🟡 Risco de bugs, difícil testar |
| INC-08 | **Acessibilidade incompleta** — `aria-label` e `focus:ring` faltando em cards | GoalCard, AccountCard, etc. | 🟡 Usuários de leitores de tela prejudicados |
| INC-09 | **Sem alternativas textuais para gráficos Recharts** | Report components | 🟡 Leitores de tela não leem gráficos |
| INC-10 | **`financial_ledger` tabela órfã com 252 rows** — não usada no app | `supabase` | 🟡 Dados ocupando espaço sem função |

## 4.4 BAIXAS

| ID | Problema | Local | Impacto |
|----|----------|-------|---------|
| INC-11 | **Simuladores apenas 2 tipos** — poucos para categoria "Inteligência Financeira" | `/simuladores` | 🔵 Poderia ter mais simuladores (juros compostos, aposentadoria, etc.) |
| INC-12 | **Exportação sem Web Worker** — promessa pendente | `ARC-05` no CHECKLIST | 🔵 Bloqueio de UI em exports grandes |

---

# FASE 5 — FUNCIONALIDADES ÓRFÃS

## 5.1 TELAS INACESSÍVEIS

Nenhuma tela completamente inacessível detectada. Todas as 17 rotas estão vinculadas à navegação ou acessíveis via URL direta.

## 5.2 COMPONENTES SEM USO

| ID | Componente | Motivo |
|----|-----------|--------|
| ORF-01 | `src/components/ui/confetti.tsx` | Importado, mas confetti só aparece em raras ocasiões. Verificar se é usado. |
| ORF-02 | `src/components/reports/` alguns componentes | Verificar se `CashFlowProjection` é realmente usado na página Reports |

## 5.3 APIS/TABELAS SEM USO

| ID | Item | Evidência |
|----|------|-----------|
| ORF-03 | **`financial_ledger`** — 252 rows, sem uso no código frontend | `AUD-07` no CHECKLIST — pendente de migração e drop |
| ORF-04 | **`error_reports`** — já droppado (era duplicado de `error_logs`) | ✅ Resolvido |
| ORF-05 | Tabela `goal_milestones` sem políticas RLS ativas inicialmente | ✅ Corrigido em AUD-06 |

## 5.4 RECURSOS ABANDONADOS

| ID | Recurso | Situação |
|----|---------|----------|
| ORF-06 | **Modo Casal** no Dashboard | Removido (estado, memo, imports, botão). Funcionalidade descartada. |

---

# FASE 6 — FUNCIONALIDADES DUPLICADAS

| ID | Duplicidade | Detalhes |
|----|-------------|----------|
| DUP-01 | **`error_reports` vs `error_logs`** — duas tabelas para mesma função | ✅ Resolvido: `error_reports` droppado |
| DUP-02 | **`settle_split` vs `settle_multiple_splits`** — duas RPCs para liquidar | ✅ Consolidado via migrations (B-18) |
| DUP-03 | **Gráfico de balanço compartilhado aparece em Relatórios e Compartilhado** | `SharedBalanceChart` usado em ambas páginas. Aceitável: contextos diferentes. |
| DUP-04 | **Formatação de moeda** — `moneyUtils.format()` e `formatCurrency()` local | Diversos componentes têm sua própria `formatCurrency`. Deveria usar `moneyUtils` centralizado. |

---

# FASE 7 — CONSISTÊNCIA FUNCIONAL

## 7.1 MESMA AÇÃO, MESMO RESULTADO?

| Ação | Consistente? | Evidência |
|------|-------------|-----------|
| Criar transação | ⚠️ Parcial | Transação simples usa insert direto. Transação com split usa RPC atômica. Parcelamento usa RPC atômica. Resultado final correto mas caminhos diferentes. |
| Excluir transação | ✅ Sim | Soft delete com `deleted_at`. Opção de cascata para parcelas futuras. |
| Liquidar split | ✅ Sim | Sempre via `settle_split` RPC atômica |
| Formatar moeda | ❌ Não | `moneyUtils.format()` vs `formatCurrency()` local vs `Intl.NumberFormat` inline |

## 7.2 REGRAS IGUAIS EM TODAS AS TELAS?

| Regra | Consistente? |
|-------|-------------|
| Soft delete | ✅ Sim — todas tabelas financeiras |
| Datas com date-fns | ✅ Sim — `parseISO()`, `format()`, nunca `new Date()` |
| Cálculos com Decimal.js | ❌ Parcial — SafeFinancialCalculator retorna number |
| Formatação de moeda | ❌ Parcial — múltiplas implementações |

## 7.3 CÁLCULOS CONSISTENTES?

| Cálculo | Consistente? |
|---------|-------------|
| Saldo de conta | ✅ Trigger PostgreSQL SSOT |
| Progresso de meta | ✅ `current_amount / target_amount` |
| Progresso de orçamento | ✅ RPC otimizada |
| Fatura de cartão | ✅ Agrupamento por `competence_date` |

## 7.4 FILTROS COM MESMO COMPORTAMENTO?

| Filtro | Consistente? |
|--------|-------------|
| Período (mês) | ✅ MonthContext global |
| Categoria | ✅ Mesmo seletor (CategorySelector) |
| Conta | ✅ Mesmo padrão |
| Moeda | ⚠️ Cada página implementa seu próprio seletor de moeda |

---

# FASE 8 — CASOS EXTREMOS

| Cenário | Comportamento Esperado | Realidade |
|---------|----------------------|-----------|
| **Sem dados** | Dashboard mostra EmptyState | ✅ EmptyState em todas as páginas |
| **Milhares de transações** | Paginação/filtro eficiente | ⚠️ `useTransactions` sem paginação server-side. `search_transactions` RPC resolve parcialmente. |
| **Valores zerados** | Transação com amount=0 rejeitada | ✅ CHECK constraint `amount > 0` |
| **Valores negativos** | Não permitido para despesas/receitas | ✅ CHECK constraint |
| **Valores extremos** (R$ 999 trilhões) | Aceito (DECIMAL no Postgres suporta) | ✅ Sem validação de teto |
| **Datas futuras** | Transações agendadas (próximas) | ✅ Aba "Próximas" + suporte a transações futuras |
| **Datas muito antigas** | Permitido (histórico) | ✅ Sem restrição |
| **Múltiplas moedas simultâneas** | Conversão necessária | ⚠️ Dashboard mostra totais por moeda, sem conversão automática. Usuário precisa selecionar moeda manualmente. |
| **Mudança de fuso horário** | Datas consistentes | ✅ date-fns + `YYYY-MM-01` para competência |
| **Nome muito longo** (categoria/conta) | Truncado com ellipsis | ⚠️ Verificar — possível overflow em cards |
| **Concorrência** (2 usuários mesma família) | Realtime via Supabase | ✅ `useGlobalRealtime` |
| **Fatura de cartão sem transações** | Valor zero | ✅ Suportado |
| **Split sem valor** (0%) | Rejeitado | ✅ CHECK constraint percentage 0-100 |

---

# FASE 9 — CASOS DE ERRO

| Cenário | Tratamento | Status |
|---------|-----------|--------|
| **Internet indisponível** | Cache IndexedDB (React Query persist) | ✅ Dados offline por 24h |
| **Banco indisponível** (Supabase down) | Erro tratado, UI de erro | ✅ ErrorBoundary + mensagens toast |
| **API Supabase timeout** | rpcWithRetry: 3 tentativas, backoff exponencial | ✅ |
| **Permissão negada (RLS)** | Erro 403 tratado | ✅ |
| **Sessão expirada** | ProtectedRoute redireciona para /auth | ✅ |
| **Token inválido** | Supabase Auth trata automaticamente | ✅ |
| **Arquivo inválido (OFX)** | Validação no OFXImportModal | ✅ |
| **Arquivo inválido (importação)** | Validação de schema | ✅ |
| **Erro 500 no servidor** | Toast de erro + log | ✅ ErrorBoundary captura |
| **Push notification falha** | Edge Function remove subscription 404/410 | ✅ |
| **Rate limit** | Debounce 400ms no GlobalSearch | ✅ |

---

# FASE 10 — JORNADAS

## 10.1 Jornada: Novo Usuário (Dia 0)

```
1. Acessa meupedemeia.vercel.app
2. Vê tela de login → clica "Criar conta"
3. Registra com email/senha (ou Google OAuth)
4. Confirma email (se aplicável)
5. Faz login → vê Onboarding Wizard
6. Wizard: define nome, avatar, preferências
7. Categorias padrão criadas automaticamente
8. Dashboard vazio com CTA "Adicionar primeira conta"
9. Cria conta (ex: "Itaú - Conta Corrente")
10. Dashboard ainda vazio → CTA "Adicionar primeira transação"
11. Cria transação de receita (salário)
12. Dashboard começa a ter dados
```

**Problemas encontrados:**
- ⚠️ Onboarding não oferece criar conta bancária como parte do fluxo — usuário precisa descobrir sozinho
- ⚠️ Sem dica/tooltip de "próximo passo" após cada ação

## 10.2 Jornada: Usuário Intermediário (Dia 30)

```
1. Login com PIN (já configurado)
2. Dashboard mostra saúde financeira do mês
3. Verifica contas a pagar (próximos 7 dias)
4. Cria transações do dia a dia
5. Verifica progresso dos orçamentos
6. Acompanha meta financeira
7. Visualiza relatório mensal
```

**Problemas encontrados:**
- ⚠️ Alertas de orçamento estourado não existem (apenas barra visual)
- ⚠️ Sem comparação "mês atual vs mês anterior" no dashboard

## 10.3 Jornada: Usuário Avançado (Dia 90+)

```
1. Gerencia múltiplas contas e moedas
2. Família com splits e liquidações
3. Viagens com múltiplos participantes
4. Cartões de crédito com importação de fatura
5. Investimentos com sincronização B3
6. Exportações IRPF
7. Relatórios avançados
```

**Problemas encontrados:**
- ⚠️ Sem consolidação multi-moeda automática
- ⚠️ Sem projeção de fluxo de caixa futuro

## 10.4 Jornada: Administrador (Família)

```
1. Cria grupo familiar
2. Convida cônjuge (admin)
3. Convida filho (viewer)
4. Adiciona contatos de despesa (não família)
5. Gerencia permissões
```

**Problemas encontrados:**
- ⚠️ RLS cross-family para cartão compartilhado pendente (RLS-01)

## 10.5 Jornada: Usuário Convidado (Guest)

```
1. Recebe convite de viagem por email
2. Não precisa criar conta
3. Participa da viagem como guest
4. Vê despesas da viagem
```

**Problemas encontrados:**
- ⚠️ Guest não tem acesso ao sistema — só aparece nos cálculos de viagem. Não recebe notificações.

---

# FASE 11 — REGRAS FINANCEIRAS (AUDITORIA)

## 11.1 Receitas e Despesas

| Aspecto | Status |
|---------|--------|
| Tipo (INCOME/EXPENSE) | ✅ |
| Categorização | ✅ Hierárquica (pai/filho) |
| Data de competência | ✅ YYYY-MM-01 |
| Multi-moeda | ✅ |
| Soft delete | ✅ |

## 11.2 Transferências

| Aspecto | Status |
|---------|--------|
| Entre contas mesma moeda | ✅ TransferModal |
| Entre contas moedas diferentes | ⚠️ Sem conversão automática |
| Atomicidade | ⚠️ Duas operações — risco sem RPC atômica |

## 11.3 Parcelamentos

| Aspecto | Status |
|---------|--------|
| Criação série de parcelas | ✅ RPC atômica `create_installment_series` |
| Antecipação | ✅ `AdvanceInstallmentsDialog` |
| Exclusão cascata | ✅ Opção "esta + futuras" |
| Splits em parcelas | ✅ Suportado na RPC |

## 11.4 Cartões

| Aspecto | Status |
|---------|--------|
| Fechamento e vencimento | ✅ `closing_day` / `due_day` |
| Fatura por competência | ✅ |
| Pagamento (total/parcial) | ✅ |
| Limite | ⚠️ Não validado |
| Compartilhamento | ✅ (RLS pendente cross-family) |

## 11.5 Faturas

| Aspecto | Status |
|---------|--------|
| Agrupamento correto | ✅ |
| Importação multi-seleção | ✅ |
| Visualização detalhada | ✅ |

## 11.6 Investimentos

| Aspecto | Status |
|---------|--------|
| Ativos B3 | ✅ |
| Sincronização de preços | ✅ Edge Function sync-b3-tickers |
| IRPF | ✅ Exportação PDF/Excel |
| Histórico de transações | ✅ |

## 11.7 Metas

| Aspecto | Status |
|---------|--------|
| Progresso | ✅ |
| Marcos | ✅ goal_milestones |
| Alertas 7 dias | ✅ pg_cron |
| Exportação PDF | ✅ |

## 11.8 Patrimônio

| Aspecto | Status |
|---------|--------|
| Visão consolidada | ⚠️ Dashboard mostra saldo de contas. Não inclui investimentos no cálculo. |
| Evolução patrimonial | ✅ `useWealthEvolution` |

## 11.9 Fluxo de Caixa

| Aspecto | Status |
|---------|--------|
| Projeção futura | ❌ Inexistente. Só existe `UpcomingTransactions`. |
| Dashboard fluxo | ❌ Não mostra projeção |
| Relatório fluxo | ⚠️ `CashFlowProjection` componente existe, verificar se ativo |

## 11.10 Orçamentos

| Aspecto | Status |
|---------|--------|
| Por categoria | ✅ |
| Global | ✅ |
| Alertas de estouro | ❌ Sem notificação/alertas |
| Comparação mês a mês | ❌ Sem histórico |

## 11.11 Alertas e Notificações

| Aspecto | Status |
|---------|--------|
| Contas a pagar (7 dias) | ✅ Push notification |
| Metas (7 dias) | ✅ Push notification |
| Orçamento estourado | ❌ Não existe |
| Saldo baixo | ✅ Dashboard alert (visual apenas) |
| Fatura próxima vencer | ❌ Não existe |
| Limite cartão próximo | ❌ Não existe |

---

# FASE 12 — USABILIDADE

## 12.1 Facilidade de Encontrar

| Funcionalidade | Fácil? | Nota |
|---------------|--------|------|
| Dashboard | ✅ | Rota `/` |
| Transações | ✅ | Menu principal |
| Criar transação | ✅ | Botão "+" flutuante + atalho |
| Gastos compartilhados | ⚠️ | Menu "Compartilhado" — nome pode confundir com "Compartilhar app" |
| Orçamentos | ⚠️ | Sem destaque no menu (ícone PiggyBank) |
| Simuladores | ⚠️ | Último item do menu, pode passar despercebido |
| Configurações | ✅ | Ícone engrenagem padrão |
| Busca global | ❌ | Não óbvio. Precisa conhecer Ctrl+K. |

## 12.2 Intuitividade

| Funcionalidade | Intuitiva? | Nota |
|---------------|-----------|------|
| Criar transação | ✅ | Modal com campos claros |
| Liquidar split | ⚠️ | Selecionar itens → Liquidar → Escolher conta. Fluxo com múltiplos passos. |
| Pagar fatura | ✅ | Botão "Pagar fatura" no detalhe do cartão |
| Importar OFX | ⚠️ | Escondido no dropdown. Usuário precisa saber o que é OFX. |
| Criar viagem | ✅ | Botão "Nova viagem" proeminente |
| Compartilhar cartão | ⚠️ | Função avançada, não óbvia |

## 12.3 Excesso de Passos

| Tarefa | Passos | Ideal |
|--------|--------|-------|
| Criar transação simples | 3 (abrir modal → preencher → salvar) | 2-3 ✅ |
| Liquidar split | 5+ (selecionar → abrir dialog → escolher conta → confirmar → toast) | ⚠️ |
| Pagar fatura | 3 (abrir cartão → clicar pagar → confirmar) | 2-3 ✅ |
| Convidar família | 4 (abrir família → convidar → email → enviar) | 3-4 ✅ |

## 12.4 Confusão/Redundância

| Problema | Impacto |
|----------|---------|
| "Compartilhado" (menu) vs "Compartilhar" (ação) | Usuário pode confundir |
| Múltiplas formas de formatar moeda | Inconsistência visual |
| Abas "Lançadas" vs "Próximas" nas Transações | Terminologia técnica. "Próximas" poderia ser "Agendadas". |

---

# FASE 13 — ESCALABILIDADE DO PRODUTO

## 13.1 Suporte a Novos Módulos

| Aspecto | Status |
|---------|--------|
| Arquitetura modular (páginas lazy) | ✅ |
| Componentes isolados | ✅ |
| Hooks reutilizáveis | ✅ |
| RPCs extensíveis | ✅ |

## 13.2 Multi-empresa

❌ **Não suportado.** O sistema é estritamente pessoal/familiar. Não há conceito de "organização" ou "workspace". Para B2B, seria necessário refatorar toda a camada de isolamento de dados.

## 13.3 Equipes (Além da Família)

⚠️ **Limitado a um grupo familiar.** Não suporta múltiplos grupos (ex: família + empresa + time de futebol). Conceito `member_type` (family/contact) é binário.

## 13.4 Assinaturas (Monetização)

❌ **Não implementado.** Sem stripe/payment integration. App é gratuito.

## 13.5 Integrações

| Integração | Status |
|-----------|--------|
| Open Banking Brasil | ❌ Inexistente |
| B3 (tickers) | ✅ Via Edge Function |
| Banco Central (BCB) | ✅ Via Edge Function |
| OFX | ✅ Importação manual |
| APIs públicas | ❌ Inexistente |

## 13.6 APIs Públicas

❌ **Não existe API pública.** Todas as operações são via Supabase client interno. Sem REST API documentada para terceiros.

---

# FASE 14 — ANÁLISE DE MERCADO

## 14.1 Comparativo com Concorrentes

| Funcionalidade | SBI | YNAB | Mobills | Organizze | Nubank | Inter |
|---------------|-----|------|---------|-----------|--------|-------|
| Controle de transações | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Orçamentos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Metas financeiras | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cartões de crédito | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gastos compartilhados | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Viagens multi-moeda | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Investimentos B3 | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| IRPF | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Multi-moeda | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Sincronização bancária | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Open Banking | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Relatórios avançados | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notificações push | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PIN local | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Web + Mobile PWA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| API aberta | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Integração banco automática | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Assinatura paga | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |

## 14.2 Funcionalidades Ausentes (vs Mercado)

| Funcionalidade | Concorrentes | Prioridade |
|---------------|-------------|-----------|
| **Sincronização bancária automática** | YNAB, Mobills, Nubank, Inter | 🔴 Crítica |
| **Open Banking** | YNAB, Nubank, Inter | 🔴 Crítica |
| **Importação automática de faturas** | Nubank, Inter | 🟠 Alta |
| **Reconciliação bancária** | YNAB, Mobills | 🟠 Alta |
| **Projeção de fluxo de caixa** | YNAB, Organizze | 🟡 Média |
| **Alertas inteligentes** (orçamento, limite) | YNAB, Mobills | 🟡 Média |
| **API pública / webhooks** | YNAB, Inter | 🔵 Baixa |
| **Suporte a múltiplas famílias** | Nenhum | 🔵 Baixa |

## 14.3 Diferenciais do SBI

| Diferencial | Único? |
|-------------|--------|
| Gastos compartilhados com liquidação atômica | ✅ Nenhum concorrente direto faz |
| Viagens multi-moeda com participantes guest | ✅ Único |
| Settlement com audit trail imutável | ✅ Único |
| IRPF integrado com B3 | ⚠️ Inter tem algo similar |
| PIN + bcrypt via RPC | ✅ Abordagem mais segura |
| Simuladores com dados BCB | ✅ Único entre apps de finanças |

---

# FASE 15 — MATRIZ DE COBERTURA

| Funcionalidade | Tela | Backend (RPC/Trigger) | Banco (Tabela) | API | Teste | Documentação | Status |
|---------------|------|----------------------|----------------|-----|-------|-------------|--------|
| Login/Registro | ✅ Auth.tsx | ✅ Supabase Auth | ✅ auth.users | ✅ | ✅ e2e | ✅ | Completo |
| PIN | ✅ PinWrapper | ✅ verify_pin RPC | ✅ profiles.app_pin_hash | ✅ | ❌ | ✅ | Completo |
| Dashboard | ✅ Dashboard.tsx | ✅ Triggers | ✅ Multi | ✅ | ❌ | ✅ | Completo |
| CRUD Transações | ✅ Transactions.tsx | ✅ RPCs atômicas | ✅ transactions | ✅ | ✅ unit/e2e | ✅ | Completo |
| Parcelamentos | ✅ TransactionForm | ✅ create_installment_series | ✅ transactions | ✅ | ❌ | ✅ | Completo |
| Antecipar parcelas | ✅ AdvanceInstallments | ✅ RPC | ✅ transactions | ✅ | ❌ | ✅ | Completo |
| CRUD Contas | ✅ Accounts.tsx | ✅ Trigger saldo | ✅ accounts | ✅ | ✅ e2e | ✅ | Completo |
| Transferência | ✅ TransferModal | ❌ Sem RPC atômica | ✅ transactions | ✅ | ❌ | ✅ | ⚠️ Sem atomicidade |
| Extrato | ✅ AccountDetail | ✅ | ✅ transactions | ✅ | ❌ | ✅ | Completo |
| CRUD Cartões | ✅ CreditCards.tsx | ✅ | ✅ credit_cards | ✅ | ✅ e2e | ✅ | Completo |
| Fatura | ✅ CreditCardDetailView | ✅ | ✅ credit_card_invoices | ✅ | ✅ e2e | ✅ | Completo |
| Pagar fatura | ✅ PayInvoiceDialog | ❌ Sem RPC atômica | ✅ transactions | ✅ | ✅ | ✅ | ⚠️ Sem atomicidade |
| Splits | ✅ SharedExpenses | ✅ create_transaction_with_splits | ✅ expense_splits | ✅ | ❌ | ✅ | Completo |
| Liquidar split | ✅ SharedSettleDialog | ✅ settle_split (atômico) | ✅ expense_splits | ✅ | ❌ | ✅ | Completo |
| Reverter liquid. | ✅ SettlementConfirmation | ✅ unsettle_with_reversal | ✅ settlement_reversals | ✅ | ❌ | ✅ | Completo |
| Relatórios | ✅ Reports.tsx | ✅ | ✅ Multi | ✅ | ✅ e2e | ✅ | Completo |
| CRUD Metas | ✅ GoalsAndInvestments | ✅ | ✅ goals | ✅ | ✅ e2e | ✅ | Completo |
| Marcos metas | ✅ GoalMilestonesPanel | ✅ pg_cron alerta 7d | ✅ goal_milestones | ✅ | ❌ | ✅ | Completo |
| CRUD Invest. | ✅ GoalsAndInvestments | ✅ sync-b3-tickers | ✅ assets | ✅ | ✅ e2e | ✅ | Completo |
| IRPF | ✅ InvestmentIRPanel | ✅ | ✅ assets | ✅ | ❌ | ✅ | Completo |
| CRUD Orçamentos | ✅ Budgets.tsx | ✅ optimize_budgets_progress | ✅ budgets | ✅ | ✅ e2e | ✅ | Completo |
| CRUD Viagens | ✅ Trips.tsx | ✅ | ✅ trips | ✅ | ✅ e2e | ✅ | Completo |
| Convidar viagem | ✅ AddParticipantDialog | ✅ | ✅ trip_members | ✅ | ❌ | ✅ | Completo |
| Câmbio viagem | ✅ ExchangePurchaseDialog | ✅ | ✅ trip_exchanges | ✅ | ❌ | ✅ | Completo |
| Check-list viagem | ✅ TripChecklist | ✅ | ✅ trip_checklist | ✅ | ❌ | ✅ | Completo |
| Sugestões IA viagem | ✅ AITripSuggestions | ✅ groq-proxy | ❌ | ✅ | ❌ | ✅ | Completo |
| Família | ✅ Family.tsx | ✅ | ✅ family_members | ✅ | ✅ e2e | ✅ | Completo |
| Convites família | ✅ InviteMemberDialog | ✅ | ✅ family_invitations | ✅ | ❌ | ✅ | Completo |
| Simuladores | ✅ Calculators.tsx | ✅ bcbService | ❌ | ✅ | ✅ e2e | ✅ | Completo |
| Busca global | ✅ GlobalSearch.tsx | ✅ search_transactions RPC | ✅ | ✅ | ❌ | ✅ | Completo |
| Push notifications | ✅ sw.ts | ✅ send-bill-reminders | ✅ push_subscriptions | ✅ | ❌ | ✅ | Completo |
| Relatório email | ❌ Não funcional | ✅ send-monthly-report | ❌ | ✅ | ❌ | ❌ | ⚠️ Domínio Resend |
| Exportação PDF | ✅ Multi | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ Main thread |
| OFX Import | ✅ OFXImportModal | ✅ | ✅ transactions | ✅ | ❌ | ✅ | Completo |
| Backup/Restore | ✅ BackupManager | ✅ | ✅ Multi | ✅ | ❌ | ✅ | Completo |
| Onboarding | ✅ WelcomeOnboarding | ✅ | ✅ | ✅ | ❌ | ✅ | Completo |

---

# FASE 16 — ROADMAP

## 16.1 Quick Wins (1-2 dias)

| ID | Melhoria | Esforço |
|----|----------|---------|
| QW-01 | Centralizar formatação de moeda (remover `formatCurrency` locais) | XS |
| QW-02 | Adicionar `aria-label` em cards interativos | XS |
| QW-03 | Adicionar `focus:ring` visível em elementos navegáveis | XS |
| QW-04 | Texto alternativo para gráficos Recharts | S |
| QW-05 | Verificar domínio Resend para liberar emails | XS (config) |
| QW-06 | Adicionar `wildcard` redirect URL no Supabase Auth | XS (config) |
| QW-07 | Tooltip "Ctrl+K para buscar" no header | XS |

## 16.2 Curto Prazo (1-2 semanas)

| ID | Melhoria | Esforço |
|----|----------|---------|
| CP-01 | Alertas de orçamento estourado (visual + push) | M |
| CP-02 | Validação de limite de cartão (alerta de estouro) | S |
| CP-03 | Projeção de fluxo de caixa (baseado em transações agendadas) | M |
| CP-04 | Comparação "mês atual vs mês anterior" no dashboard | S |
| CP-05 | RLS cross-family para cartão compartilhado | S |
| CP-06 | Drop tabela `financial_ledger` após migrar dados | XS |
| CP-07 | Refatorar SafeFinancialCalculator para retornar Decimal | M (quebra compatibilidade) |
| CP-08 | Quebrar `useCreateTransaction` (600 linhas) em hooks menores | M |
| CP-09 | Criptografia IndexedDB (dados financeiros) | M |

## 16.3 Médio Prazo (1-3 meses)

| ID | Melhoria | Esforço |
|----|----------|---------|
| MP-01 | Integração Open Banking (Brasil) | L |
| MP-02 | Sincronização bancária automática (plugável) | L |
| MP-03 | PDF export via Web Worker | M |
| MP-04 | APIs públicas documentadas (REST) | L |
| MP-05 | Monetização: planos de assinatura (Stripe) | L |
| MP-06 | Mais simuladores (juros compostos, aposentadoria, comparação invest.) | M |
| MP-07 | Suporte a múltiplas famílias/grupos | L |
| MP-08 | Mobile app nativo (React Native com código compartilhado) | XL |

## 16.4 Longo Prazo (3-12 meses)

| ID | Melhoria | Esforço |
|----|----------|---------|
| LP-01 | Multi-empresa / B2B | XL |
| LP-02 | Integração com exchanges cripto | L |
| LP-03 | IA avançada: insights preditivos, categorização automática | L |
| LP-04 | Marketplace de extensões/plugins | XL |
| LP-05 | White-label para instituições financeiras | XL |

---

# FASE 17 — PRIORIZAÇÃO

## 🔴 Críticos (Bloqueadores)

| ID | Problema | Impacto |
|----|----------|---------|
| PRI-01 | Relatório mensal por email não funciona (domínio Resend) | Funcionalidade prometida inoperante |
| PRI-02 | SafeFinancialCalculator perde precisão decimal | Risco financeiro real |
| PRI-03 | Ausência de sincronização bancária automática | Principal motivo de churn em apps do gênero |
| PRI-04 | Sem Open Banking | Brasil é mandatório para finanças pessoais |

## 🟠 Altos

| ID | Problema |
|----|----------|
| PRI-05 | PDF export bloqueia UI (main thread) |
| PRI-06 | Cache IndexedDB sem criptografia |
| PRI-07 | Limite do cartão não validado |
| PRI-08 | Sem alertas de orçamento estourado |
| PRI-09 | Sem projeção de fluxo de caixa |
| PRI-10 | Transferência entre contas sem atomicidade |

## 🟡 Médios

| ID | Problema |
|----|----------|
| PRI-11 | `useCreateTransaction` com 600+ linhas |
| PRI-12 | Acessibilidade incompleta |
| PRI-13 | `financial_ledger` órfã |
| PRI-14 | Sem comparação mês atual vs anterior |
| PRI-15 | Busca global não óbvia (Ctrl+K escondido) |

## 🔵 Baixos

| ID | Problema |
|----|----------|
| PRI-16 | Simuladores apenas 2 tipos |
| PRI-17 | Terminologia confusa ("Compartilhado", "Próximas") |
| PRI-18 | Onboarding não guia criação de conta bancária |

---

# FASE 18 — SCORES

| Dimensão | Score | Nota |
|----------|-------|------|
| **Produto (completude)** | 7.8/10 | Funcionalidades core sólidas. Faltam integrações bancárias e projeções. |
| **Regras de Negócio** | 8.5/10 | Sistema financeiro robusto. SSOT, atomicidade, soft delete, audit trail. |
| **Fluxos** | 7.5/10 | Fluxos principais bem definidos. Alguns com excesso de passos. |
| **Consistência** | 7.0/10 | Boa na maioria. Pecca na formatação de moeda e caminhos de transação. |
| **Escalabilidade Funcional** | 6.5/10 | Bem modularizado para crescer, mas sem API pública ou multi-tenant. |
| **Valor para o Usuário** | 8.0/10 | Controle financeiro completo. Diferenciais reais (compartilhado, viagens, IRPF). |
| **Segurança** | 7.5/10 | RLS forte, PIN com bcrypt. Falta criptografia IndexedDB e CSP completo. |
| **Experiência (UX)** | 7.0/10 | Visual premium. Acessibilidade e discoverability precisam melhorar. |
| **Cobertura de Testes** | 5.5/10 | E2E para páginas principais. Poucos testes unitários. Sem testes de RPC. |
| **Documentação** | 8.0/10 | MASTER_BLUEPRINT, CHECKLIST, HANDOFF, ARCHITECTURE. Boa cobertura. |

| **SCORE GERAL** | **7.3/10** | Produto funcional e robusto. Gap principal está em integrações externas e monetização. |

---

# FASE 19 — RELATÓRIO EXECUTIVO

## Problema #1: Sem sincronização bancária automática
- **Módulo:** Transações / Contas
- **Tela:** Todas
- **Impacto:** 🔴 CRÍTICO — Principal motivo de abandono em apps financeiros. Usuário precisa digitar tudo manualmente.
- **Usuários afetados:** 100% dos usuários
- **Correção:** Implementar Open Banking Brasil (fase 1) + conectores bancários (fase 2)
- **Complexidade:** L (Grande)

## Problema #2: SafeFinancialCalculator perde precisão
- **Módulo:** Serviços financeiros
- **Tela:** Não visível (cálculos internos)
- **Impacto:** 🔴 CRÍTICO — Erros de arredondamento podem acumular em operações encadeadas.
- **Usuários afetados:** Todos que usam `add()`/`subtract()` do serviço
- **Correção:** Refatorar métodos para retornar `Decimal` em vez de `number`
- **Complexidade:** M (quebra compatibilidade)

## Problema #3: Relatório mensal por email inoperante
- **Módulo:** Notificações / Email
- **Tela:** Configurações
- **Impacto:** 🟠 ALTO — Funcionalidade existe mas não entrega valor. Usuário espera receber e não recebe.
- **Usuários afetados:** Todos que ativaram notificações
- **Correção:** Verificar domínio no Resend ou usar `onboarding@resend.dev` como fallback
- **Complexidade:** XS (configuração)

## Problema #4: Sem projeção de fluxo de caixa
- **Módulo:** Dashboard / Relatórios
- **Tela:** Dashboard, Relatórios
- **Impacto:** 🟠 ALTO — Usuário não consegue prever saldo futuro. YNAB e concorrentes têm.
- **Usuários afetados:** Todos
- **Correção:** Criar projeção baseada em transações agendadas + média de gastos
- **Complexidade:** M

## Problema #5: Sem alertas de orçamento
- **Módulo:** Orçamentos
- **Tela:** Orçamentos, Dashboard
- **Impacto:** 🟡 MÉDIO — Orçamento sem alerta perde função principal (controlar gastos)
- **Usuários afetados:** Quem usa orçamentos
- **Correção:** Push notification + destaque visual quando atinge 80% e 100%
- **Complexidade:** S

---

# FASE 20 — VISÃO ESTRATÉGICA

## 20.1 O que falta para ser líder da categoria?

1. **Open Banking** — sem isso, o app é "manual" e perde para qualquer concorrente que sincroniza automaticamente
2. **Insights inteligentes** — não basta mostrar dados, precisa dizer o que fazer ("Seu gasto com restaurantes aumentou 40% este mês")
3. **Projeções financeiras** — "Com esse ritmo, seu saldo em dezembro será X"
4. **Monetização clara** — produto gratuito não é sustentável. Definir modelo freemium.

## 20.2 Funcionalidades que AGREGAM POUCO valor

- **Simulador de Poder de Compra (IPCA)** — curiosidade, não ação. Baixo engajamento.
- **AITripSuggestions** — sugestões de IA para viagem. Interessante mas não essencial.
- **Confetti** — animação cosmética. Zero valor financeiro.

## 20.3 Funcionalidades que AUMENTAM retenção

1. **Notificações push** (contas a pagar, metas) — traz o usuário de volta
2. **Relatório mensal por email** — mesmo sem abrir o app, o usuário vê valor
3. **Gastos compartilhados** — efeito rede: se um usa, o parceiro também precisa
4. **Metas financeiras** — progresso visível gera compromisso de longo prazo
5. **Onboarding guiado** — usuário que configura 3+ coisas na primeira sessão retém mais

## 20.4 Funcionalidades que DIFERENCIAM

1. **Gastos compartilhados com liquidação atômica** — único no mercado
2. **Viagens multi-moeda com guest** — nenhum concorrente faz
3. **Settlement com audit trail imutável** — apelo para casais/amigos que dividem contas
4. **IRPF integrado com B3** — valor real para investidores brasileiros
5. **PIN com bcrypt via RPC** — segurança superior à média

## 20.5 Funcionalidades que deveriam ser REMOVIDAS

Nenhuma funcionalidade é estritamente prejudicial. Porém:
- **Simuladores** poderiam ser consolidados em uma única experiência "Projeções Financeiras"
- **AITripSuggestions** poderia ser removida se custo do Groq for alto e uso for baixo

## 20.6 Funcionalidades que deveriam ser REDESENHADAS

1. **Busca Global** — deveria ser uma barra de busca visível no header, não apenas Ctrl+K
2. **Orçamentos** — deveriam ter alertas e comparação mensal
3. **Dashboard** — deveria ter projeção de saldo futuro
4. **Onboarding** — deveria guiar criação de conta bancária + primeira transação

## 20.7 Oportunidades de Inovação

1. **"Modo Casal 2.0"** — dashboard conjunto com métricas de saúde financeira do casal
2. **Gamificação de metas** — badges, streaks, desafios ("30 dias sem gastar com delivery")
3. **Split de conta em tempo real** — foto da conta → OCR → split automático entre amigos
4. **Previsão de gastos com IA** — "Baseado nos últimos 3 meses, você gastará R$ X em mercado este mês"
5. **Integração com WhatsApp** — "Mande uma foto do comprovante" → transação criada
6. **Cartão de crédito virtual compartilhado** — casal com limite consolidado e tracking individual

---

# APÊNDICE A — LEGENDA DE PRIORIDADES

| Símbolo | Significado |
|---------|-------------|
| 🔴 | Crítico — Bloqueador de lançamento ou risco financeiro |
| 🟠 | Alto — Impacto significativo na experiência ou retenção |
| 🟡 | Médio — Melhoria importante, não bloqueante |
| 🔵 | Baixo — Refinamento, nice-to-have |
| ✅ | Concluído/Correto |
| ⚠️ | Atenção — Funciona mas tem ressalva |
| ❌ | Inexistente/Quebrado |

# APÊNDICE B — MÉTRICAS DO SISTEMA

| Métrica | Valor |
|---------|-------|
| Total de páginas | 17 (14 protegidas + 3 públicas) |
| Total de componentes | 120+ |
| Total de hooks | 50+ |
| Total de serviços | 14 |
| Total de Edge Functions | 7 |
| Total de migrations | 154+ |
| Total de tabelas | 16 principais |
| Total de RPCs críticas | 5+ |
| Linhas de código (src/) | ~80,000+ |
| Cobertura E2E | 12 specs |
| Cobertura unitária | Limitada |

---

> **Auditoria concluída em 30/06/2026.**  
> **Próximo passo:** Implementar Quick Wins (Fase 16) e resolver problemas Críticos (Fase 17).  
> **Recomendação estratégica:** Priorizar Open Banking/Sincronização automática ANTES de qualquer feature nova. É o maior gap competitivo.
