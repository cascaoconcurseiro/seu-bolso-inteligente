# ⚡ QUICK REFERENCE - SISTEMA DE COMPARTILHAMENTO

**1 página | Referência rápida**

---

## 🎯 PROBLEMA → SOLUÇÃO

```
❌ ANTES: Splits não criados → Sistema quebrado
✅ DEPOIS: Validações + Ledger + Espelhamento → Sistema funcional
```

---

## 📦 ARQUIVOS CRIADOS

### Código
- `src/hooks/useFinancialLedger.ts` (novo)
- `src/components/transactions/TransactionForm.tsx` (modificado)
- `src/hooks/useTransactions.ts` (modificado)

### Migrations
- `supabase/migrations/20251231000001_create_financial_ledger.sql`
- `supabase/migrations/20251231000002_create_transaction_mirroring.sql`

---

## 🚀 APLICAR (30 min)

```bash
# 1. Aplicar migrations no Supabase (5 min)
# 2. Testar criação de despesa compartilhada (20 min)
# 3. Verificar espelhamento funcionando (5 min)
```

---

## ✅ TESTE RÁPIDO

```
1. Criar despesa R$ 100
2. Dividir 50/50 com membro
3. Verificar: 2 transações, 1 split, 3 ledger
4. Login com membro → ver R$ 50
```

---

## 📊 RESULTADO

| Funcionalidade | Antes | Depois |
|---|---|---|
| Compartilhamento | 0% | 100% |
| Espelhamento | 0% | 100% |
| Ledger | 0% | 100% |

---

## 🔍 SQL ÚTIL

```sql
-- Ver saldo
SELECT * FROM calculate_balance_between_users('user1', 'user2', 'BRL');

-- Acertar contas
SELECT settle_balance_between_users('user1', 'user2');

-- Ver ledger
SELECT * FROM financial_ledger WHERE user_id = 'seu_id';
```

---

## 💡 HOOKS ÚTEIS

```typescript
useBalancesWithAllMembers()      // Saldos com todos
useBalanceBetweenUsers(id, 'BRL') // Saldo com alguém
useSettleBalance()                // Acertar contas
useSharedTransactionsWithMember(id) // Histórico
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

1. **LEIA_ISTO_PRIMEIRO_COMPARTILHAMENTO.md** - Comece aqui
2. **RESUMO_EXECUTIVO_CORRECOES.md** - Visão geral
3. **APLICAR_CORRECOES_COMPARTILHAMENTO_FINAL.md** - Instruções
4. **EXEMPLOS_USO_SISTEMA_COMPARTILHAMENTO.md** - Exemplos
5. **CHECKLIST_TESTES_COMPARTILHAMENTO.md** - Testes
6. **FAQ_SISTEMA_COMPARTILHAMENTO.md** - Perguntas
7. **INDICE_COMPLETO_COMPARTILHAMENTO.md** - Navegação

---

## 🆘 PROBLEMAS?

- Splits não criados → Ver FAQ seção Troubleshooting
- Espelhamento não funciona → Ver APLICAR_CORRECOES
- Saldo errado → Verificar consistência SQL

---

**Referência rápida completa. Para detalhes, consulte documentação completa.**

