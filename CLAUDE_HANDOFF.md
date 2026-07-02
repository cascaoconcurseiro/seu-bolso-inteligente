# CLAUDE_HANDOFF.md — Seu Bolso Inteligente

> Atualizado em: 2026-07-02 | Branch: `claude/database-verification-checklist-en590c` | Deploy: meupedemeia.vercel.app
> Última ação: Fix definitivo da exclusão de transações + hardening de segurança (5 migrations)

---

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
