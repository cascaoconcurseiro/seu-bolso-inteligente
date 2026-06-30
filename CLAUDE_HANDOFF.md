# CLAUDE_HANDOFF.md — Pé de Meia

> Atualizado em: 2026-06-30 | Branch: `main` | Deploy: meupedemeia.vercel.app

---

## Auditoria de Qualidade de Código 2026-06-30 — 21 Fases

**Relatorio completo:** `AUDIT_REPORT_2026-06-30.md`
**Overall Score:** 54/100 🔴 D
**6 críticos | 10 altos | 8 medios | 7 baixos | ~80 any types**

### Top 6 Criticos

| # | Problema | Arquivo |
|:--|:--|:--|
| CQ-01 | `CreateTransactionInput` com propriedade duplicada (`splits` + `transaction_splits`) | `hooks/transactions/types.ts:74,83` |
| CQ-02 | `console.error` direto | `CategorySettings.tsx:57` |
| CQ-03 | Testes `rpcWithRetry` desabilitados (`.skip`) | `utils/rpcWithRetry.test.ts` |
| CQ-04 | `useCreateAccount` sem atomicidade | `hooks/useAccounts.ts` |
| CQ-05 | `contributeToGoal` sem atomicidade | `hooks/useGoals.ts` |
| CQ-06 | `deleteGoal` usa `LIKE '%meta%'` fragil | `hooks/useGoals.ts` |

### Scores

| Dimensao | Nota |
|:--|:--|
| Clean Code | 62/100 |
| TypeScript | 58/100 |
| SOLID | 45/100 |
| Testabilidade | 40/100 |
| Testes | 35/100 |
| Seguranca | 72/100 |
| Performance | 68/100 |
| Manutenibilidade | 55/100 |

### Proximo Passo Imediato
1. CRIT-01: Remover `transaction_splits` duplicado
2. CRIT-02: `console.error` → `logger.error`
3. CRIT-03: Reescrever mocks e reativar testes `rpcWithRetry`

### Roadmap: Ver `AUDIT_REPORT_2026-06-30.md` e `CHECKLIST.md`

---

## Auditorias Anteriores
- UX/UI: `UX_AUDIT_REPORT_2026-06-30.md` (61/100)
- Infraestrutura: ver CHECKLIST.md (8/20 fixes aplicados)
- Seguranca: 18 fixes aplicados
- Produto: `AUDIT_REPORT_PRODUTO_2026-06-30.md` (7.3/10)
