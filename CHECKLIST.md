# CHECKLIST.md — Sprint Kanban: Seu Bolso Inteligente

> Kanban de tarefas em markdown. Atualizar a cada sessão.
> Última atualização: **2026-07-26 — Planejador de viagens centrado no mapa**

---

## Concluído - 26/07/2026 - Planejador de viagens

- [x] **[TRIP-PLAN-UX]** Viagem reorganizada em quatro áreas: `Resumo`, `Planejar`, `Gastos` e `Preparar`; cards financeiros aparecem somente no Resumo e o seletor de mês foi removido do contexto de Viagens.
- [x] **[TRIP-PLAN-MAP]** Planejar ganhou dia ativo, mapa central, pins numerados por dia, alternância `Dia atual | Todos os dias`, seleção lista↔pin, rota diária e métricas de distância/duração com fallback aproximado/offline.
- [x] **[TRIP-PLAN-ORDER]** Drag-and-drop com `dnd-kit`, teclado, mover para cima/baixo/outro dia, feedback `aria-live`, atualização otimista e rollback em erro ou conflito colaborativo.
- [x] **[TRIP-PLAN-DB]** `reorder_trip_itinerary_v1` aplicada em produção com lock pai+filhos, snapshot completo, versão otimista, posições únicas/contíguas, RLS por status/papel e guards contra update estrutural direto.
- [x] **[TRIP-PLAN-CATEGORY]** Migration pendente de categorias aplicada; produção aceita os 11 tipos usados pela busca e pelos pins.
- [x] **[TRIP-PLAN-A11Y]** Alvos mínimos de 44 px, labels associados, combobox/listbox semânticos, nomes acessíveis, alternativa ao arrastar, skip link e redução de movimento no foco do mapa.
- [x] **[TRIP-PLAN-VERIFY]** 249 testes aprovados, TypeScript sem erros, lint sem erros, build PWA verde; prova transacional da RPC com rollback confirmou stale version e invariantes financeiros.
- [ ] **[TRIP-PLAN-QA-AUTH]** Fazer QA visual autenticado em desktop e celular com dados reais; a inspeção automatizada local confirmou boot/login sem erro, mas não possuía sessão para entrar na viagem.
- [x] **[TRIP-PLAN-P1]** Biblioteca persistente de `Ideias/Lugares` (`trip_places`) aplicada e integrada: salvar para decidir depois, listar e agendar no dia sem duplicar o lugar.
- [x] **[TRIP-RESERVATIONS]** Reservas persistentes para voo, hospedagem, transportes, restaurante, evento e atividade, com confirmação e período; gastos continuam em `transactions`.
- [x] **[TRIP-FORM]** Formulário unificado de criação/edição com título separado do destino, notas, capa HTTPS, moeda, orçamento opcional, participantes, validação e preservação da digitação.
- [x] **[TRIP-RLS-HARDEN]** Policies de viagens, membros, checklist, lugares e reservas restritas a `authenticated`, permissões por papel/status, vínculos compostos por `trip_id` e campos de identidade protegidos.
- [x] **[VERCEL-REACT-PEER]** PR Dependabot incompatível React 19/React DOM 18 fechado; majors coordenados de React ignorados no Dependabot; `npm install --dry-run` e build de produção aprovados.

---

## Concluído - 16/07/2026 - Faxina de código morto (auditoria + limpeza)

- [x] **[CLEAN-SCRIPTS]** 25 scripts de debug de sessões passadas removidos de `scripts/` (81% da pasta) — nunca referenciados em `package.json`/CI.
- [x] **[CLEAN-TOAST-BUG]** Bug real corrigido: 8 telas (metas, orçamentos, ativos, câmbio de viagem, checklist/itinerário de viagem) chamavam `useToast()` do sistema antigo do shadcn, cujo `<Toaster/>` nunca foi montado em `App.tsx` desde a migração pro `sonner` — notificações de sucesso/erro nunca apareciam pro usuário. Todos os call-sites migrados pro `toast` do `sonner`; sistema antigo (`toast.tsx`, `toaster.tsx`, `use-toast.ts`) apagado.
- [x] **[CLEAN-EXPORTS]** Revisão manual, um por um, dos ~202 exports/tipos flagados como não usados (`knip`) — cada um cross-checado contra uso interno antes de apagar (vários eram falso-positivo: usados internamente no próprio arquivo, ex. `dateUtils.formatDateUTC`, `getBankLogo`→`BANK_LOGOS`). Achados reais de duplicação removidos: `supabaseHelpers.ts` (10 funções de um CRUD genérico nunca adotado), `errorHandling.ts` (10 funções de um error-handler nunca adotado), `notificationService.ts` (14 funções — o centro de notificações real usa `useNotifications.ts`, não este service), `queryConfig.ts` (6 configs de query nunca adotadas), `currencyFormatter.ts` (9 funções duplicadas — `getCurrencySymbol` real é a de `exchangeCalculations.ts`), 3 hooks de "adicionar/remover membro de viagem" duplicados (`useTrips.ts`/`useTripMembers.ts` vs. o fluxo real em `InviteMemberDialog.tsx`), 2 implementações duplicadas de "antecipar parcelas" (a de `useTransactionMutations.ts` morta, a real é `useAnticipateInstallments.ts`).
- [x] **[CLEAN-DEPS]** 3 dependências não usadas removidas do `package.json`: `@radix-ui/react-separator`, `@radix-ui/react-toast`, `sharp` (dev).
- [x] **[CLEAN-GIT]** `eslint-report.json`/`eslint-report-utf8.json` (8,1 MB commitados por engano) e `playwright-report/`/`test-results/` (já gitignorados mas ainda rastreados) removidos do git; padrão de lint-report adicionado ao `.gitignore`.
- [x] **[CLEAN-DOCS]** `CLAUDE_HANDOFF.md` (handoff paralelo parado em 02/07) e os 6 relatórios de auditoria pontual de 30/06 arquivados em `docs/archive/` — raiz do repo com só os 3 documentos vivos (`HANDOFF.md`, `MASTER_BLUEPRINT.md`, `CHECKLIST.md`).
- [x] **Resultado:** ~350 arquivos / ~81.500 linhas em `src/`+`scripts/` (era 390 arquivos / ~89.500 linhas) — redução de ~7.950 linhas de código morto confirmado, zero mudança de comportamento fora do fix do toast.
- [x] Verificação completa: `tsc --noEmit` (0 erros), `npm run lint` (0 erros), `format:check` (verde), `npm test -- --run` (239/239, igual ao baseline), `npm run build` + service worker PWA (verde), `test:secrets` (verde).

---

## Concluido - 16/07/2026 - Roteiro de viagem linkado com o mapa

- [x] **[TRIP-MAP-LINK]** Link do Google Maps colado agora extrai lat/lon automaticamente (`parseGoogleMapsUrl`), sem depender de geocodificação externa.
- [x] **[TRIP-MAP-CACHE]** `trips.latitude`/`longitude` (coluna nova) cacheiam a coordenada base da viagem — elimina re-geocodificação de `trip.destination` a cada carga.
- [x] **[TRIP-MAP-CATEGORY]** `trip_itinerary.category` (coluna nova) + chips de categoria no formulário filtram a busca de lugares e coloram o pin por tipo.
- [x] **[TRIP-MAP-SYNC]** Lista de atividades numerada igual aos pins do mapa; clicar num item foca/centraliza o pin correspondente.
- [ ] **[TRIP-MAP-QA]** QA visual manual pendente — não verificado em navegador real nesta sessão (sem credencial de login). Testar: pin aparece ao colar link do Maps, chips de categoria filtram busca, numeração lista↔mapa bate, clique foca o pin certo.

---

## 🔴 CRÍTICO — Achado nesta auditoria (15/07/2026)

- [x] **[CI-FORMAT]** `npm run format:check` falhava (3 arquivos da feature de mapa de viagens `3cb451ba` nunca passaram pelo Prettier: `TripItinerary.tsx`, `TripRouteMap.tsx`, `overpassService.ts`). Confirmado como causa raiz do job "Lint & Type Check" falhando 100% desde 12/07. **Corrigido nesta sessão** (`prettier --write`); `tsc`/`lint`/`format:check` verdes localmente. **Pendente:** commit + push (aguardando autorização).
- [ ] **[CI-ROOT-CAUSE]** Causa raiz **confirmada** (16/07, texto literal do GitHub na página do run #150): **"The job was not started because your account is locked due to a billing issue."** — bloqueio de nível de conta pessoal do GitHub. Investigado e descartado: Actions permissions já em "Allow all actions" (não é config do repo); página de billing (`github.com/settings/billing`) não mostra cobrança recusada, cartão pendente ou banner de aviso — uso é $0,07 totalmente coberto pelo free tier, sem nada devendo. Ou seja, é um **flag interno do GitHub sem causa self-service visível**. **Ação exclusiva do usuário:** abrir chamado em `support.github.com` citando o erro exato e o link do run `.../actions/runs/29462019436`; não há nada configurável na UI que resolva isso. Explica os runs #120–#149 (12/07–16/07) e por que os fixes de código (Prettier, RPCs v2, etc.) nunca vão aparecer verdes em CI enquanto isso não for resolvido pelo suporte.
- [ ] **[CI-SECRETS]** Depois que o billing for resolvido e os jobs voltarem a rodar de verdade, ainda falta confirmar se os secrets `SUPABASE_DB_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` estão configurados em Settings → Secrets and variables → Actions — sem eles, `database-security` (faz `exit 1` explícito) e `e2e` falham por design, não por bug.
- [ ] **[LGPD-VERIFY]** `delete_user_account` **confirmado presente e com grants corretos em produção** (migration `20260713213214` aplicada, função `SECURITY DEFINER`, `search_path=''`, `authenticated`+`service_role`). O que falta é só a prova transacional final contra um usuário real (`scripts/verify-delete-user-account.sql`, BEGIN/ROLLBACK) — **não executada nesta sessão**: a query que eu montei para escolher um usuário de teste foi bloqueada pelo classificador de permissão automática por juntar `auth.users` com dados financeiros sem essa consulta ter sido nomeada explicitamente em escopo. Se quiser essa prova, autorize a consulta especificamente ou rode o script você mesmo via `psql`.

---

## Concluido - 13/07/2026 - API autenticada v2 e contrato de seguranca

- [x] **[API-V2]** 17 RPCs financeiras sem `p_user_id`, vinculadas a `auth.uid()`.
- [x] **[API-V2-FE]** Frontend migrado para v2; fallback compartilhado nao atomico removido.
- [x] **[RPC-GRANTS]** `EXECUTE` removido de `PUBLIC`/`anon`; grants futuros fechados por padrao.
- [x] **[RPC-LEGACY]** Assinaturas legadas e APIs quebradas retiradas de clientes autenticados.
- [x] **[DB-SEC-CI]** Teste vivo de 17 RPCs v2, 17 legadas e isolamento cross-user criado e aprovado.
- [x] **[PERF-ADV]** Policies duplicadas consolidadas sem alterar os atores permitidos; advisor zerado.
- [x] **[EXT-ADV]** `pg_trgm` movido de `public` para `extensions`.
- [x] **[ADMIN-RLS]** `admin_users` sem acesso direto e com policy de bloqueio explicita.
- [x] **[AUTH-MFA]** MFA TOTP habilitado e versionado; advisor de opcoes insuficientes zerado.
- [x] **[BASELINE]** Snapshot de cutover reproduzivel: 36 tabelas, 164 funcoes, 10 views e ACLs explicitas.
- [x] **[ERROR-LOG]** Schema reconciliado, senha historica removida e `updated_at`/RPCs corrigidos.
- [ ] **[AUTH-HIBP-PLAN]** Habilitar leaked-password protection ao migrar o Supabase para Pro; indisponivel no plano Free. Confirmado ainda pendente via advisor (`auth_leaked_password_protection`, 15/07).
- [x] **[IDEMPOTENCY-FIX]** `transactions.idempotency_key` corrigida de `uuid` para `text` (commit `3ae672ee`, migration `20260713212130`) — quebrava toda transacao compartilhada/parcelada com erro `42804`. Confirmado aplicado em producao via `list_migrations` (15/07).
- [x] **[RPC-V2-CALLSITES]** Dois call-sites do frontend ainda chamavam RPCs legadas revogadas (`get_current_shared_debts`, `get_trip_participant_balances`) e recebiam 403 silencioso — migrados para `_v2` em `FamilyBalancePanel.tsx` e `useTrips.ts` (commit `3ae672ee`). Confirmado: grep no codigo so encontra as versoes `_v2` chamadas hoje.
- [x] **[TYPECHECK]** Zerados os 124 erros globais (tsconfig.app.json) e removido `continue-on-error`: typecheck agora e bloqueante no CI.
- [x] **[LGPD-DELETE]** RPC `delete_user_account` reescrita para o schema atual e **aplicada em producao** (migration `20260713213214_reintroduce_delete_user_account_rpc`, confirmada ao vivo em 15/07 — funcao existe, `SECURITY DEFINER`, grants `authenticated`+`service_role`). Decisao adotada: expurgo fisico + SET NULL onde o usuario e so ator/criador de registro alheio. Ver `[LGPD-VERIFY]` acima para a prova transacional final pendente.

---

## ✅ CONCLUÍDO — Sessão 03/07/2026 (3 migrations)

### 🔴 Bugs de produção corrigidos
- [x] **[RPC-01]** PostgREST 404 resolvido por recarga/correcao do schema; `anon` nao precisa e nao deve receber `EXECUTE` para alimentar o cache.
- [x] **[RPC-02]** `create_installment_series` falhava com 42P01 — trigger órfã `trg_create_ledger_on_split` referenciava `financial_ledger` (dropada na Fase 1). Trigger + 3 funções órfãs removidas
- [x] **[SMOKE-01]** `create_account_with_balance` — TEXT→DATE incompatível com `search_path=''`
- [x] **[SMOKE-02]** `search_transactions` — return type `text` vs enum `transaction_type`
- [x] **[SMOKE-03]** `recalculate_all_balances` — coluna `deleted` inexistente (é `deleted_at`)
- [x] **[SMOKE-04]** `submit_error_report` — tabela `error_reports` inexistente (é `error_logs`)
- [x] **[SMOKE-05]** `set_pin` / `verify_pin` — `gen_salt()`/`crypt()` sem `extensions.` prefix
- [x] **[SMOKE-06]** `soft_delete_account` — transações deletadas após conta (trigger bloqueava)

### 🟢 Frontend
- [x] **[UI-01]** Trip split: SplitModal em vez de QuickSplit quando viagem selecionada
- [x] **[UI-02]** `tripFilteredMembers` filtra apenas participantes da viagem no SplitModal
- [x] **[DATA-01]** competence_date corrigida para transação "Cabelo" (jun, não jul)

### 🧪 Smoke test de integração (38 cenários)
- [x] Contas: criar, saldo inicial, soft delete, check dependencies, recalculate
- [x] Transações: criar, editar, soft delete (NONE/ALL), restore
- [x] Parcelas: create_installment_series (simples e compartilhada)
- [x] Compartilhadas: create_transaction_with_splits, família, splits
- [x] Transferências: transfer, withdraw
- [x] Cartão crédito: competence_date antes/depois closing day
- [x] Dashboard RPCs: 8 relatórios testados
- [x] Viagens, metas, PIN, error report, search
- [x] **Resultado: 38/38 PASS**

---

## ✅ CONCLUÍDO — Pós-merge 02/07/2026

- [x] **[MERGE-01]** Branch `claude/database-verification-checklist-en590c` mergeado na `main` e deployado — o fix de exclusão só existia no branch, e o deploy parte da main (por isso o erro 403 persistia pro usuário)
- [x] **[DEL-04]** RPC `soft_delete_transaction` tinha `DELETE FROM _sdt_targets;` sem WHERE — rejeitado pelo `pg-safeupdate` do Supabase (erro 400 "DELETE requires a WHERE clause" em runtime real). Corrigido com `TRUNCATE` (migration `20260702190451`). Testado ao vivo sob role authenticated: RPC retorna 1, transação soft-deletada.
- [x] **[OVERLOAD-02]** Versão antiga sobrecarregada `soft_delete_transaction(uuid)` (sem validação, retorno void) dropada — 1 nome, 1 conceito, sem risco de ambiguidade no PostgREST

---

## ✅ CONCLUÍDO — Sessão 02/07/2026 (5 migrations)

### 🔴 Bug de exclusão de transações — RESOLVIDO
- [x] **[DEL-01]** RPC `soft_delete_transaction` criada — validação server-side (permissão dono/criador/admin-editor, liquidação, acertos em splits, cascata NONE/NEXT/ALL, espelhos) e **erro explícito se 0 linhas** (antes: UPDATE com `.eq(user_id)` falhava em silêncio e a transação "voltava")
- [x] **[DEL-02]** 4 RPCs SECURITY DEFINER vazavam transações soft-deletadas (bypassavam RLS): `get_shared_invoice_data`, `get_monthly_financial_summary`, `get_shared_expense_summary_by_person`, `get_wealth_evolution` — filtro `deleted_at IS NULL` server-side
- [x] **[DEL-03]** Frontend `useDeleteTransaction` migrado para a RPC

### 🟠 Verificações e limpeza
- [x] **[BAL-06]** 3 contas revalidadas (Visa Platinium, Carrefour, Azul infinite): saldo armazenado = recalculado ✅ ("Nubank CC" não existe mais — eram contas de usuários diferentes, não duplicatas)
- [x] **[DUP-01]** 2 duplicatas reais soft-deletadas (Wise - Conta Global e Minha Carteira, ambas 0 transações/saldo 0)
- [x] **[PROF-01]** `profiles.app_pin` (plaintext) dropada; `set_pin`/`clear_pin` atualizadas
- [x] **[FUT-01]** 11 transações futuras auditadas: são parcelas legítimas (Hotel 12x, AirBNB 5x) — nada a corrigir
- [x] **[SEC-ADV]** Hardening por advisors: search_path fixado em todas as funções próprias, EXECUTE revogado de `anon`/`public` em todas as SECURITY DEFINER (28 expostas), triggers não-chamáveis via REST
- [x] **[TYP-02]** types.ts regenerado (soft_delete_transaction + app_pin removida)

### 📋 Advisors restantes (não-bloqueantes, decisão consciente de adiar)
- [x] **[PERF-ADV]** 5 conjuntos de policies consolidados em 13/07/2026; zero alerta `multiple_permissive_policies`.
- [x] **[AUTH-ADV]** MFA TOTP habilitado. HIBP exige plano Pro e permanece em `AUTH-HIBP-PLAN`.
- [x] **[EXT-ADV]** `pg_trgm` movido para `extensions` em 13/07/2026.

---

## ✅ CONCLUÍDO — Auditoria 01/07/2026 (7 migrations)

### 🔴 CRÍTICO — Corrigido
- [x] **[BAL-01]** `update_account_balance_on_insert()` recriada + trigger `trg_update_balance_insert`
- [x] **[BAL-02]** `update_account_balance_on_delete()` recriada + trigger `trg_update_balance_delete`
- [x] **[BAL-03]** Todos os saldos recalculados via `recalculate_account_balance()`
- [x] **[BAL-04]** `trigger_sync_account_balance` removido (double-counting com BAL-01)
- [x] **[BAL-05]** `financial_ledger` dropada com CASCADE

### 🟠 IMPORTANTE — Corrigido
- [x] **[CLEAN-01]** `calculate_account_balance()` no-param órfã dropada
- [x] **[CLEAN-02]** `is_family_member` → consolidado em `is_family_member_v2` (5 políticas RLS)
- [x] **[CLEAN-03]** `trigger_set_updated_at` → migrado para `update_updated_at_column`
- [x] **[CLEAN-04]** `reconciled_*` columns (3) dropadas + view transactions_ssot recriada
- [x] **[CLEAN-05]** `accounts.deleted` column dropada
- [x] **[CLEAN-06]** 6 funções órfãs dropadas (auditoria anterior)
- [x] **[CLEAN-07]** `cleanup_old_audit_logs()` dropada
- [x] **[CLEAN-08]** `handle_updated_at` dropada
- [x] **[IDX-01]** 4 índices novos + 4 órfãos do financial_ledger removidos + 1 duplicado
- [x] **[RLS-01]** `settlement_reversals` agora com RLS (SELECT, INSERT, ALL)
- [x] **[RLS-02]** 5 políticas RLS atualadas para `is_family_member_v2`
- [x] **[RLS-03]** 35 tabelas verificadas — todas com RLS ✅
- [x] **[TRIG-01]** `error_logs` trigger corrigido (`update_updated_at_column`)
- [x] **[TYP-01]** types.ts regenerado (x2, pós-drop de colunas)
- [x] **[CRON-01]** Cron jobs consolidados: 4 ativos, 1 redundante removido
- [x] **[OVERLOAD-01]** `get_admin_error_logs(text)` removido

---

## ✅ CONCLUÍDO — Fase 1 SSOT (2026-07-01, migration `20260702084014`)

- [x] **[SSOT-01]** Trigger `trg_update_balance_update` criado (AFTER UPDATE em `transactions`, com WHEN só nos campos que afetam saldo: amount/type/account_id/destination_account_id/deleted_at/date/payer_id). Chama `recalculate_account_balance()` para account_id e destination_account_id, antigo e novo. Editar transação agora recalcula saldo. Verificado ao vivo: trigger existe.
- [x] **[SSOT-02]** `financial_ledger` dropada de vez (tabela + trigger `trg_create_ledger_on_transaction` + função `create_ledger_entries_for_transaction`), na mesma transação de migration pra não quebrar insert de transação compartilhada no meio do caminho. Verificado ao vivo: tabela e trigger não existem mais.
- [x] **[SSOT-03 parcial]** Das 14 funções de "balance", só 3 eram realmente órfãs (sem trigger, sem RPC do frontend, sem cron job): `calculate_account_balance`, `recalculate_all_account_balances`, `sync_account_balance` — dropadas. Verificado ao vivo: as 3 não existem mais.
  - A classificacao original preservou `settle_partial_balance` apenas pelo conceito. A auditoria de 13/07/2026 confirmou que ela nao tem consumidor e aceita usuarios arbitrarios; acesso de `authenticated` foi revogado na migration `20260713100500_restrict_legacy_settlement_confirmation_rpcs.sql`.
  - `calculate_single_account_balance` foi confirmada como auxiliar interna de `recalculate_all_balances`; a execucao direta por `authenticated` foi revogada e o fluxo em lote foi preservado na migration `20260713102500_harden_account_dependency_rpcs.sql`.
  - Auditoria concluida em 13/07/2026: wrappers v2 protegem saldo de conta e viagem; APIs de balanceamento legadas/quebradas foram retiradas de `authenticated`; grants globais de `PUBLIC`/`anon` foram removidos.
  - Migration local criada em `supabase/migrations/20260702084014_fix_ssot_balance_update_trigger_and_ledger_cleanup.sql` (estava só no remoto, sem arquivo local)
  - ⚠️ Teste funcional end-to-end (criar/editar/deletar transação de teste e conferir saldo) ainda **não foi feito** — bloqueado pelo classificador de permissão do Claude Code no meio da sessão

## ✅ CONCLUÍDO — Verificação Fase 1 + achado extra (2026-07-01)

- [x] **[SSOT-04]** Teste funcional end-to-end: inseri transação de teste (R$0,01) em conta real, saldo mudou corretamente; deletei, saldo voltou certinho. Trigger de UPDATE/INSERT/DELETE confirmados funcionando em conjunto.
- [x] **[BAL-06]** Resolvido — comparação saldo armazenado vs soma real das transações rodada em TODAS as contas ativas: só "Nubank - Conta Corrente" estava divergente (armazenado -2.136,65 vs real -4.056,12, diferença de R$1.919,48 — travado desde antes da Fase 1 por causa do bug do SSOT-01). Corrigido como efeito colateral do teste funcional. Todas as outras contas batem.

## 🔴 CRÍTICO — Fazer Agora


## ✅ CONCLUÍDO — Fase 2 parcial (2026-07-01)

- [x] **[SEC-09]** `active_family_members` e `transactions_ssot` alteradas para `security_invoker=true` (migration `fix_security_definer_views_ssot_and_family`). Verificado: RLS de `transactions`/`family_members` já cobre compartilhamento familiar e de viagem — sem regressão de visibilidade.
- [x] **[SEC-10]** `admin_users` sem policy — verificado como intencional: `is_admin()` e `get_admin_users_detailed()` são `SECURITY DEFINER` de propriedade do `postgres` (dono da tabela, bypassa RLS); acesso direto via API continua corretamente bloqueado. Nenhuma mudança necessária.
- [x] **[SEC-13]** Token dos cron jobs rotacionado (gerado com `openssl rand -hex 32`), setado como `CRON_SECRET` nas Edge Functions via `supabase secrets set` (CLI), e gravado no Supabase Vault. `cron.job` de `send-bill-reminders-daily`/`send-monthly-report-monthly` agora busca do Vault em runtime — zero segredo em texto plano ou em migration versionada (aplicado via SQL direto, não `apply_migration`, de propósito).

## ✅ CONCLUÍDO — Fase 3a (2026-07-01)

- [x] **[PERF-05]** Índices criados para as 2 FKs sem cobertura: `admin_users.granted_by`, `settlement_reversals.payment_transaction_id`
- [x] **[PERF-04]** 5 índices/constraint duplicados removidos (confirmados idênticos antes): `family_members_type_idx`, `goal_milestones_goal_id_idx`, `idx_trip_exchange_trip_id`, `idx_trip_exchange_user_id`, constraint `trip_members_trip_id_user_id_key`
- [x] **[PERF-02]** 31 policies RLS reescritas de `auth.uid()` para `(select auth.uid())` (initplan) — gerado programaticamente a partir da lista exata do advisor, verificado zero duplicação de wrap. Advisor confirma: 0 `auth_rls_initplan` restante.

## ✅ CONCLUÍDO — Fase 3c (2026-07-01)

- [x] **[PERF-01]** 110 → 26 policies duplicadas resolvidas: 11 policies redundantes (duplicata exata ou subconjunto provado) removidas + `settlement_reversals` reestruturada (immutable policy dividida em UPDATE/DELETE só, sem sobrepor SELECT/INSERT). Verificado com RLS simulada (SET LOCAL request.jwt.claims): conta e transações continuam visíveis pro dono, settlement_reversals com exatamente 1 policy por comando.
  - 26 restantes são atores genuinamente diferentes (dono vs convidado, membro vs família) — **deixados de propósito**: `shared_credit_cards`, `transaction_splits` (usa função `check_split_access()` não auditada ainda), `transactions UPDATE`, `trip_invitations UPDATE`. Juntar errado vaza ou bloqueia acesso; ganho é só performance marginal.

## 🟢 Avaliado e descartado — não fazer

- **[PERF-03]** 71 índices "não usados": 24 são de PK/constraint única (nunca dropar, isso destrói integridade, não é otimização) + 47 são índices de performance com 0 scans. Numa app pessoal de baixo tráfego, 0 scans não prova "nunca necessário" (pode ser relatório mensal, cron raro). Custo de manter é desprezível; risco de dropar um índice que sustenta uma query rara é real. **Decisão: não mexer.** Revisitar só se algum dia houver telemetria de uso real de produção.

## ✅ RESOLVIDO — [BUG-01] Erro ao excluir transação (2026-07-02, por OUTRA sessão)

- [x] **[BUG-01]** Resolvido na sessão do branch `claude/database-verification-checklist-en590c` via RPC `soft_delete_transaction` (SECURITY DEFINER com validação server-side) + frontend migrado + 4 RPCs que vazavam soft-deletadas corrigidas. Verificado ao vivo por esta sessão: RPC existe em produção, sem conflito com as migrations desta sessão (policies com `deleted_at IS NULL` intactas).
  - Contexto desta sessão (histórico): as 2 policies de UPDATE foram revertidas pro `WITH CHECK` original antes do fix da outra sessão — estado consistente, a RPC bypassa RLS então a restrição `source_transaction_id IS NULL` não bloqueia mais exclusão.
  - Investigação via `session_replication_role` **cancelada** — obsoleta.
  - ⚠️ Nota: edição direta (`useUpdateTransaction`, `.update()` na linha ~126) ainda passa por RLS com `source_transaction_id IS NULL` — transações vinculadas (parcela/espelho) seguem não-editáveis diretamente. Aparenta ser design intencional (espelhos não devem ser editados); se algum dia "editar parcela" der erro de RLS, este é o lugar.

## ✅ CONCLUÍDO — Fase 5 (2026-07-01)

- [x] **[SEC-14]** `accounts_select_v2` e `transactions_unified_select` não filtravam `deleted_at IS NULL` — contas/transações soft-deletadas ficavam visíveis via RLS pro dono e pra família/viagem. Corrigido com `AND deleted_at IS NULL` nas duas policies. Confirmado que `is_archived` (contas arquivadas) é campo separado de `deleted_at` (lixeira) — arquivadas continuam 100% visíveis. Testado com transação de teste soft-deletada: sumiu da visão do dono; contas ativas: 12 visíveis via RLS (inclui família) vs 8 próprias, nada foi escondido indevidamente.

## ✅ CONCLUÍDO — Fase 4 (2026-07-01)

- [x] **[PROC-02]** 15 scripts soltos removidos da raiz do repo (`fix_budgets_progress_table.sql`, `run_in_supabase.sql`, `db_dump.sql` vazio, `audit_complete.py`, `audit_complete_clean.py`, `audit_schema.py`, `audit_v2.py`, `check_rpc.cjs`/`check_rpc2.cjs`/`check_rpc3.cjs`/`check_rpc4.cjs`, `check_schema.cjs`, `extract_export.py`, `refactor.py`, `update_duplicate.py`, `_tmp.cjs`). Confirmado antes: nenhum referenciado em `package.json`/CI, e as 2 mudanças de schema que os `.sql` continham já estão aplicadas em produção (`get_user_budgets_progress` foi substituída por versão mais nova, `b3_tickers_cache` e `transactions.asset_id` já existem). Recuperável via git se precisar.
---

## 🟠 ALTA PRIORIDADE — Esta Semana

- [x] **[BASELINE]** Baseline de cutover gerada sem Docker por introspeccao PostgreSQL e documentada em `supabase/baseline/`.
- [x] **[ERROR_LOG]** Migration historica reconciliada e correcao incremental aplicada em producao.

---

## 🟡 BACKLOG TÉCNICO

- [ ] **[ARC-05]** PDF export via Web Worker (frontend)
- [x] **[SEC-08]** Cache IndexedDB criptografado (AES-256-GCM via `encryptedStorage` no persister do TanStack Query em `PrivateAppShell`).
- [ ] **[FEAT-01]** Relatório mensal por email (Edge Function + Resend)
- [ ] **[CONC-01]** Teste de concorrência real (pgbench em staging)
- [x] **[AUD-07]** ~~financial_ledger dropado~~ ✅ DONE
- [x] **[AUD-08]** Auditoria 20 fases concluída → `AUDIT_REPORT_COMPLETE.md` ✅ DONE (2026-06-30)

---

## ✅ CONCLUÍDO

- [x] **[TASK-1.1]** Remover todos os `console.log` (apenas `logger.ts` permanece)
- [x] **[TASK-1.2]** Fixes de timezone com date-fns
- [x] **[TASK-1.3]** Validação de `payer_id`
- [x] **[FEAT-02]** Push notifications (VAPID + pg_cron)
- [x] **[FEAT-03]** Goal milestones + alertas 7 dias antes
- [x] **[FEAT-04]** SwipeableRow para mobile
- [x] **[FEAT-05]** Global search (Ctrl+K, cmdk)
- [x] **[FEAT-06]** `member_type` em `family_members` (família vs contatos)
- [x] **[FEAT-07]** Participantes guest em trips
- [x] **[FEAT-08]** Export PDF para metas
- [x] **[DOC-01]** Criar MASTER_BLUEPRINT.md
- [x] **[DOC-02]** Criar CHECKLIST.md
- [x] **[DOC-03]** Criar HANDOFF.md
- [x] **[AUD-01]** Auditoria técnica E2E completa (Passos 1-5)

---

## 🐛 BUG HUNT 2026-06-28 — Auditoria com 9 skills

### 🔴 CRÍTICOS (5) — Corrigidos
- [x] **[B-01]** `settle_split`: double-count no saldo (trigger + UPDATE manual)
- [x] **[B-02]** `settle_split`: race condition sem FOR UPDATE
- [x] **[B-03]** `settlement_reversals`: FK ON DELETE CASCADE → RESTRICT
- [x] **[B-04]** Senha hardcoded `909496` → `is_admin()` JWT-based
- [x] **[B-05]** `settle_split`: adicionada verificação de ownership (auth.uid)

### 🟠 ALTOS (8) — Corrigidos
- [x] **[B-06]** `unsettle_split`: DELETE físico → soft delete (deleted_at)
- [x] **[B-07]** CSP: removido `unsafe-eval` do vercel.json
- [x] **[B-08]** `settle_split`: CURRENT_DATE → parâmetro p_date
- [x] **[B-09]** `isReasonableDate`: dateUtils.parseDate() em vez de new Date()
- [x] **[B-22]** `settle_multiple_splits`: removido p_user_id arbitrário
- [x] **[B-11]** `settle_split`: validação de p_amount > 0 e = split.amount
- [x] **[B-12]** `settle_multiple`: validação cross-account
- [x] **[B-24]** `settlement_reversals`: FK RESTRICT (idem B-03)

### 🟡 MÉDIOS (12) — Corrigidos
- [x] **[B-10]** AuthContext: queryClient.clear() no signOut
- [x] **[B-14]** rpcWithRetry: risco documentado (limitação HTTP, idempotência server-side mitiga)
- [x] **[B-15]** recalculate_account_balance: = ANY(ARRAY(...)) em vez de LIMIT 1
- [x] **[B-16]** useCreateTransaction: inFlightRef reset no unmount
- [x] **[B-17]** useCreateTransaction: duplicidade check 15s + account_id null
- [x] **[B-25]** PrivacySettings: .limit(500) anti N+1
- [x] **[B-26]** groq-proxy: CORS para *.vercel.app
- [x] **[B-27]** send-bill-reminders: já remove subscriptions 404/410 ✅
- [x] **[B-28]** sw.ts: cache maxAge 7d → 1h

### 🔵 BAIXOS (4) — Corrigidos
- [x] **[B-18]** Inconsistência settle_split vs settle_multiple — resolvido via migrations
- [x] **[B-19]** isValidDate: new Date(year,month,0) — baixo risco, mantido
- [x] **[B-20]** error_logs: RLS restrito (is_admin + próprio usuário)
- [x] **[B-29]** Duplicado de B-15
- [x] **[B-30]** Duplicado de B-18
