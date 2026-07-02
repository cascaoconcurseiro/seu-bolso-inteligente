# CLAUDE_HANDOFF.md — Seu Bolso Inteligente

> Atualizado em: 2026-07-02 | Branch: `main` (pós-merge de `claude/database-verification-checklist-en590c`) | Deploy: meupedemeia.vercel.app
> Última ação: merge das DUAS sessões paralelas na main — reorganização SSOT/RLS (sessão A, 01/07) + fix de exclusão de transações e hardening (sessão B, 02/07). Push pra main dispara o deploy que corrige o erro 403 ao excluir.

## Sobre permissão de banco (decisão do usuário)
Usuário optou por NÃO editar `.claude/settings.json`. Fluxo combinado: antes de qualquer operação destrutiva (DROP/DELETE em massa/ALTER que muda comportamento), nomear a operação especificamente na conversa antes de rodar. Leituras e DML reversível (teste pontual) podem seguir sem re-perguntar a cada chamada, desde que eu explique o que vou fazer.

## O que foi feito nesta sessão

1. Auditoria ao vivo via Supabase MCP (não confiar em docs — ver lição abaixo) encontrou drift real entre `CHECKLIST.md` e o banco de produção.
2. Plano de reorganização em fases apresentado e aprovado pelo usuário.
3. Devil's advocate + pre-mortem no plano da Fase 1 — pegou 2 erros reais antes de rodar: (a) as "13 funções de balance" não eram todas redundantes (a maioria calcula saldo entre pessoas, não de conta — dropar teria quebrado despesa compartilhada e viagens); (b) trigger sem `WHEN` recalcularia saldo em toda edição, até de descrição.
4. **Migration `20260702084014_fix_ssot_balance_update_trigger_and_ledger_cleanup` aplicada em produção** — ver detalhes em CHECKLIST.md seção "✅ CONCLUÍDO — Fase 1 SSOT". Verificada ao vivo uma vez (trigger existe, ledger sumiu, 3 funções órfãs sumiram).
5. Migration replicada localmente em `supabase/migrations/` (estava só no remoto).

## FASE 1 — 100% CONCLUÍDA E VERIFICADA
- Trigger de UPDATE pro saldo: criado, testado end-to-end (insert/edit/delete de transação de teste), confirma saldo certo em cada passo
- `financial_ledger` removida de vez (tabela + trigger + função)
- 3 funções de saldo órfãs removidas
- Achado extra: conta "Nubank - Conta Corrente" tinha saldo desatualizado em ~R$1.919,48 (drift antigo do bug SSOT-01) — corrigido; conferi TODAS as outras contas ativas, nenhuma outra divergente

## FASE 2 — 100% CONCLUÍDA
- Views `security_invoker=true` aplicado e verificado (RLS de transactions/family_members já cobre compartilhamento)
- `admin_users` verificado como intencional, sem mudança
- SEC-13: token rotacionado, `CRON_SECRET` setado nas Edge Functions via CLI, Vault + cron jobs atualizados (aplicado fora de migration versionada de propósito, contém segredo)

## FASE 3 — CONCLUÍDA (com 2 decisões documentadas de não-ação)
- [x] 2 índices de FK faltando criados, 5 duplicados removidos
- [x] 31 policies RLS otimizadas pra `(select auth.uid())` — advisor confirma 0 `auth_rls_initplan` restante
- [x] 110 → 26 policies duplicadas: 11 removidas (duplicata/subconjunto provado) + `settlement_reversals` reestruturada. Verificado com RLS simulada. 26 restantes deixadas de propósito (atores diferentes, ex: dono vs convidado — juntar errado vaza/bloqueia acesso).
- [x] 71 índices não usados — avaliado e decidido NÃO dropar (24 são de constraint, os outros 47 têm custo de manter desprezível numa app de baixo tráfego onde "0 scans" não prova "nunca necessário")

## FASE 4 — CONCLUÍDA
- [x] 15 scripts soltos removidos da raiz (nenhum referenciado em package.json/CI, mudanças de schema já aplicadas em produção)

## FASE 5 — CONCLUÍDA
- [x] `accounts_select_v2` e `transactions_unified_select` corrigidas pra filtrar `deleted_at IS NULL`. Verificado: `is_archived` (contas arquivadas) é campo separado, não afetado. Testado com dado descartável: soft-delete some da visão, contas ativas continuam todas visíveis.

## PLANO COMPLETO: TODAS AS 5 FASES CONCLUÍDAS (2026-07-01)

## ⚠️ COORDENAÇÃO COM OUTRA SESSÃO (2026-07-02)
Outra sessão (branch `claude/database-verification-checklist-en590c`) resolveu o BUG-01 (exclusão de transação) via RPC `soft_delete_transaction` + hardening (search_path, EXECUTE revogado de anon, app_pin dropada). Verificado ao vivo: sem conflito no banco com as migrations desta sessão. **Risco de conflito restante é só no git**: ambas as sessões editaram CHECKLIST.md e CLAUDE_HANDOFF.md — resolver manualmente no merge (manter as duas seções, são complementares). As pendências PERF-ADV da outra sessão (5 combos de policies) são as MESMAS 26 policies que esta sessão decidiu deixar — não trabalhar em dobro.

## PRÓXIMO PASSO CONCRETO (itens não bloqueantes, revisão futura)
- `transaction_splits`: entender a função `check_split_access()` antes de considerar consolidar suas policies com `Users can view own splits`
- `shared_credit_cards`, `transactions UPDATE`, `trip_invitations UPDATE`: policies de atores diferentes deixadas como estão — só mexer se algum dia houver motivo real além de performance
- Revisitar os 47 índices não usados só com telemetria real de produção (não antes)
- Nenhum bloqueio pendente. Falta só: usuário decidir se quer commit + push pra `main` das mudanças desta sessão (migrations novas + docs atualizados + 15 scripts removidos)

## Lição sobre docs desatualizados
O CHECKLIST anterior marcava `financial_ledger` como dropada (BAL-05) e o saldo como corrigido. Consulta direta ao Postgres mostrou que não era mais verdade: a tabela tinha sido recriada por uma migration posterior (`20260702120000`), e nunca existiu trigger de saldo para `UPDATE` em `transactions`. Migrations aplicadas via MCP/SQL direto podem divergir da pasta `supabase/migrations/` local e dos docs. Antes de confiar em "já foi corrigido", consultar o banco ao vivo (`list_migrations`, `pg_proc`, `information_schema.triggers`).

---

# SESSÃO B (02/07) — Fix exclusão de transações + hardening

## RESUMO

Bug "excluir transação não funciona" tinha DUAS causas, ambas corrigidas:

1. **No-op silencioso no frontend:** `useDeleteTransaction` fazia `UPDATE ... .eq("user_id", user.id)`.
   Para transações de outro membro da família (ou espelhos), 0 linhas eram afetadas
   sem erro — toast de sucesso, mas a transação voltava no refetch.
   → Substituído pela RPC `soft_delete_transaction` (validação server-side + erro explícito).
2. **RPCs SECURITY DEFINER vazando soft-deletadas (bypass de RLS):**
   `get_shared_invoice_data`, `get_monthly_financial_summary`,
   `get_shared_expense_summary_by_person`, `get_wealth_evolution`
   → todas agora filtram `deleted_at IS NULL` no servidor.

## Estado do banco (produção vrrcagukyfnlhxuvnssp)

- Saldos: 3 contas críticas revalidadas — armazenado == recalculado ✅
- Duplicatas: 2 removidas (0 transações cada); contas "Nubank" eram de usuários diferentes (não duplicatas)
- `profiles.app_pin` plaintext: dropada (só `app_pin_hash` bcrypt)
- Transações futuras: parcelas legítimas, nada a corrigir
- Hardening: search_path fixo em todas as funções; `anon` sem EXECUTE em nenhuma
  SECURITY DEFINER; funções de trigger não-chamáveis via REST
- Advisors de segurança pós-fix: restam apenas configs de dashboard (MFA,
  leaked password protection) + pg_trgm em public (baixo valor mover)

## Pendências (não-bloqueantes)

- BASELINE: migration baseline das 19 tabelas criadas via SQL Editor (requer Docker)
- ERROR_LOG: alinhar migration antiga com schema real
- PERF-ADV: consolidar políticas RLS permissivas múltiplas (5 combos) — fazer com calma
- AUTH-ADV: habilitar MFA extra + leaked password protection no dashboard Supabase
- Testes: 45 falhas pré-existentes neste branch (já corrigidas na main — sincronizar)

## Relatórios

- Auditoria 20 fases: `AUDIT_REPORT_COMPLETE.md`
- Kanban: `CHECKLIST.md` (seção 02/07/2026)
