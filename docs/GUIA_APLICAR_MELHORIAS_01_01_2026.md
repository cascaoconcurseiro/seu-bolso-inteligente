# 🚀 GUIA DE APLICAÇÃO DAS MELHORIAS

**Data:** 01/01/2026  
**Versão:** 1.0  
**Autor:** Sistema Kiro AI

---

## 📋 RESUMO

Este guia detalha como aplicar as 6 migrations críticas criadas após a auditoria completa de integridade financeira.

## 🎯 MIGRATIONS CRIADAS

1. **20260101000001_add_soft_delete.sql** - Soft Delete
2. **20260101000002_add_audit_log.sql** - Sistema de Auditoria
3. **20260101000003_add_test_suite.sql** - Suite de Testes
4. **20260101000004_add_partial_settlement.sql** - Acerto Parcial
5. **20260101000005_migrate_settlement_fields.sql** - Migração de Campos
6. **20260101000006_add_performance_indexes.sql** - Índices de Performance

---

## ⚠️ PRÉ-REQUISITOS

### 1. Backup Completo
```bash
# Fazer backup do banco de dados
supabase db dump -f backup_pre_melhorias_$(date +%Y%m%d_%H%M%S).sql

# Ou via pg_dump
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

### 2. Ambiente de Teste
- ✅ Testar PRIMEIRO em ambiente de desenvolvimento
- ✅ Validar todas as funcionalidades
- ✅ Executar suite de testes
- ✅ Só então aplicar em produção

### 3. Janela de Manutenção
- ⏰ Tempo estimado: 10-15 minutos
- 👥 Notificar usuários sobre manutenção
- 🔒 Considerar modo de manutenção

---

## 📝 PASSO A PASSO

### FASE 1: Soft Delete (5 min)

#### 1.1 Aplicar Migration
```bash
supabase migration up --file 20260101000001_add_soft_delete.sql
```

#### 1.2 Verificar
```sql
-- Verificar se colunas foram criadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('deleted_at', 'deleted_by');

-- Deve retornar 2 linhas
```

#### 1.3 Testar
```sql
-- Criar transação de teste
INSERT INTO transactions (user_id, amount, description, date, type)
VALUES (auth.uid(), 100, 'Test', CURRENT_DATE, 'EXPENSE')
RETURNING id;

-- Soft delete
SELECT soft_delete_transaction('id-da-transacao');

-- Verificar que deleted_at está preenchido
SELECT deleted_at FROM transactions WHERE id = 'id-da-transacao';

-- Restaurar
SELECT restore_transaction('id-da-transacao');
```

### FASE 2: Audit Log (3 min)

#### 2.1 Aplicar Migration
```bash
supabase migration up --file 20260101000002_add_audit_log.sql
```

#### 2.2 Verificar
```sql
-- Verificar se tabela foi criada
SELECT COUNT(*) FROM audit_log;

-- Deve retornar 0 (tabela vazia)
```

#### 2.3 Testar
```sql
-- Criar transação (deve gerar audit log)
INSERT INTO transactions (user_id, amount, description, date, type)
VALUES (auth.uid(), 100, 'Test Audit', CURRENT_DATE, 'EXPENSE')
RETURNING id;

-- Verificar audit log
SELECT * FROM audit_log 
WHERE table_name = 'transactions' 
ORDER BY changed_at DESC 
LIMIT 5;

-- Deve mostrar registro INSERT
```

### FASE 3: Suite de Testes (2 min)

#### 3.1 Aplicar Migration
```bash
supabase migration up --file 20260101000003_add_test_suite.sql
```

#### 3.2 Executar Testes
```sql
-- Executar todos os testes
SELECT * FROM tests.run_all_tests();

-- Resultado esperado:
-- test_cascade_delete_transaction | PASSED | NULL
-- test_calculate_account_balance  | PASSED | NULL
-- test_transaction_mirroring      | PASSED | NULL
-- test_soft_delete                | PASSED | NULL
-- test_audit_log                  | PASSED | NULL
```

#### 3.3 Verificar Logs
```
-- Deve mostrar:
✓ Split created
✓ Split deleted via CASCADE
✅ TEST PASSED: CASCADE DELETE
✓ Balance calculation correct
✅ TEST PASSED: CALCULATE BALANCE
...
```

### FASE 4: Acerto Parcial (2 min)

#### 4.1 Aplicar Migration
```bash
supabase migration up --file 20260101000004_add_partial_settlement.sql
```

#### 4.2 Verificar
```sql
-- Verificar se funções foram criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%partial%';

-- Deve retornar:
-- settle_partial_balance
-- get_pending_splits_for_settlement
-- suggest_payment_plan
```

#### 4.3 Testar
```sql
-- Buscar splits pendentes
SELECT * FROM get_pending_splits_for_settlement(
  'debtor-user-id',
  'creditor-user-id',
  'BRL'
);

-- Simular plano de pagamento
SELECT * FROM suggest_payment_plan(
  'debtor-user-id',
  'creditor-user-id',
  500.00, -- R$ 500/mês
  'BRL'
);
```

### FASE 5: Migração de Campos (2 min)

#### 5.1 Aplicar Migration
```bash
supabase migration up --file 20260101000005_migrate_settlement_fields.sql
```

#### 5.2 Verificar
```sql
-- Verificar se dados foram migrados
SELECT 
  COUNT(*) AS total,
  COUNT(CASE WHEN settled_by_debtor THEN 1 END) AS debtor_settled,
  COUNT(CASE WHEN settled_by_creditor THEN 1 END) AS creditor_settled
FROM transaction_splits
WHERE is_settled = TRUE;

-- debtor_settled e creditor_settled devem ser iguais a total
```

#### 5.3 Testar
```sql
-- Testar marcação por devedor
SELECT mark_as_paid_by_debtor('split-id');

-- Testar marcação por credor
SELECT mark_as_received_by_creditor('split-id');

-- Verificar status
SELECT * FROM transaction_splits_with_settlement
WHERE id = 'split-id';
```

### FASE 6: Índices de Performance (1 min)

#### 6.1 Aplicar Migration
```bash
supabase migration up --file 20260101000006_add_performance_indexes.sql
```

#### 6.2 Verificar
```sql
-- Contar índices criados
SELECT COUNT(*) 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';

-- Deve retornar 40+ índices
```

#### 6.3 Testar Performance
```sql
-- Query que deve usar índice
EXPLAIN ANALYZE
SELECT * FROM transactions
WHERE user_id = auth.uid()
  AND is_shared = TRUE
  AND deleted_at IS NULL
ORDER BY date DESC
LIMIT 20;

-- Deve mostrar "Index Scan" ao invés de "Seq Scan"
```

---

## ✅ VALIDAÇÃO FINAL

### 1. Executar Todos os Testes
```sql
SELECT * FROM tests.run_all_tests();
```

**Resultado Esperado:** Todos os testes PASSED

### 2. Verificar Integridade
```sql
-- Transações órfãs
SELECT COUNT(*) FROM transactions 
WHERE user_id NOT IN (SELECT id FROM profiles);
-- Deve retornar 0

-- Splits órfãos
SELECT COUNT(*) FROM transaction_splits 
WHERE transaction_id NOT IN (SELECT id FROM transactions);
-- Deve retornar 0

-- Espelhos órfãos
SELECT COUNT(*) FROM transactions 
WHERE source_transaction_id IS NOT NULL 
AND source_transaction_id NOT IN (
  SELECT id FROM transactions WHERE source_transaction_id IS NULL
);
-- Deve retornar 0
```

### 3. Verificar Performance
```sql
-- Queries lentas (deve estar vazio ou com tempos baixos)
SELECT query, mean_exec_time 
FROM pg_stat_statements 
WHERE mean_exec_time > 1000 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### 4. Verificar Audit Log
```sql
-- Deve ter registros das migrations
SELECT COUNT(*) FROM audit_log;
-- Deve retornar > 0
```

---

## 🔄 ROLLBACK (Se Necessário)

### Opção 1: Rollback Completo
```bash
# Restaurar backup
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

### Opção 2: Rollback Parcial
```sql
-- Remover soft delete
ALTER TABLE transactions DROP COLUMN deleted_at;
ALTER TABLE transactions DROP COLUMN deleted_by;

-- Remover audit log
DROP TABLE audit_log CASCADE;

-- Remover testes
DROP SCHEMA tests CASCADE;

-- Remover funções de acerto parcial
DROP FUNCTION settle_partial_balance CASCADE;
DROP FUNCTION get_pending_splits_for_settlement CASCADE;
DROP FUNCTION suggest_payment_plan CASCADE;
```

---

## 📊 MONITORAMENTO PÓS-APLICAÇÃO

### Primeiras 24 Horas

#### 1. Monitorar Erros
```sql
-- Verificar audit log para erros
SELECT * FROM audit_log 
WHERE action = 'ERROR' 
ORDER BY changed_at DESC;
```

#### 2. Monitorar Performance
```sql
-- Queries mais lentas
SELECT query, calls, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 20;
```

#### 3. Monitorar Uso de Índices
```sql
-- Índices não utilizados
SELECT schemaname, tablename, indexname 
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
AND schemaname = 'public';
```

### Primeira Semana

#### 1. Executar Testes Diariamente
```sql
SELECT * FROM tests.run_all_tests();
```

#### 2. Verificar Tamanho do Audit Log
```sql
SELECT 
  pg_size_pretty(pg_total_relation_size('audit_log')) AS size,
  COUNT(*) AS records
FROM audit_log;
```

#### 3. Verificar Soft Deletes
```sql
-- Registros soft-deleted
SELECT 
  table_name,
  COUNT(*) AS deleted_count
FROM (
  SELECT 'transactions' AS table_name, COUNT(*) 
  FROM transactions WHERE deleted_at IS NOT NULL
  UNION ALL
  SELECT 'accounts', COUNT(*) 
  FROM accounts WHERE deleted_at IS NOT NULL
) sub
GROUP BY table_name;
```

---

## 🎓 TREINAMENTO DA EQUIPE

### Novos Conceitos

#### 1. Soft Delete
```typescript
// ANTES (hard delete)
await supabase.from('transactions').delete().eq('id', txId);

// DEPOIS (soft delete)
await supabase.rpc('soft_delete_transaction', { p_transaction_id: txId });

// Restaurar
await supabase.rpc('restore_transaction', { p_transaction_id: txId });
```

#### 2. Acerto Parcial
```typescript
// Acertar parcialmente R$ 500
const { data } = await supabase.rpc('settle_partial_balance', {
  p_user1_id: debtorId,
  p_user2_id: creditorId,
  p_amount: 500,
  p_currency: 'BRL'
});

console.log(`Acertados: ${data.splits_settled} splits`);
console.log(`Valor: R$ ${data.amount_settled}`);
console.log(`Restante: R$ ${data.remaining_balance}`);
```

#### 3. Marcação Separada de Settlement
```typescript
// Devedor marca como pago
await supabase.rpc('mark_as_paid_by_debtor', {
  p_split_id: splitId
});

// Credor marca como recebido
await supabase.rpc('mark_as_received_by_creditor', {
  p_split_id: splitId
});
```

---

## 📞 SUPORTE

Em caso de problemas:

1. **Verificar Logs**
   ```sql
   SELECT * FROM audit_log ORDER BY changed_at DESC LIMIT 100;
   ```

2. **Executar Testes**
   ```sql
   SELECT * FROM tests.run_all_tests();
   ```

3. **Consultar Documentação**
   - `/docs/DATABASE/README.md`
   - `/docs/AUDITORIA_COMPLETA_INTEGRIDADE_FINANCEIRA_01_01_2026.md`

4. **Rollback se Necessário**
   - Seguir procedimento de rollback acima

---

## ✅ CHECKLIST FINAL

- [ ] Backup completo realizado
- [ ] Migrations aplicadas em ordem
- [ ] Todos os testes PASSED
- [ ] Integridade verificada (0 órfãos)
- [ ] Performance verificada (índices usados)
- [ ] Audit log funcionando
- [ ] Soft delete funcionando
- [ ] Acerto parcial funcionando
- [ ] Equipe treinada
- [ ] Monitoramento configurado
- [ ] Documentação atualizada

---

**FIM DO GUIA**

