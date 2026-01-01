# 📚 Documentação do Banco de Dados

## Índice

- [Schema Completo](./SCHEMA.md) - Estrutura completa de tabelas
- [Funções](./FUNCTIONS.md) - Todas as funções SQL
- [Triggers](./TRIGGERS.md) - Todos os triggers
- [RLS Policies](./RLS.md) - Políticas de segurança
- [Índices](./INDEXES.md) - Índices e performance
- [Migrations](./MIGRATIONS.md) - Histórico de migrations

## Visão Geral

O banco de dados do Pé de Meia é construído em PostgreSQL com Supabase e implementa:

- ✅ **Integridade Referencial** - Foreign Keys com CASCADE adequado
- ✅ **Soft Delete** - Proteção contra perda de dados
- ✅ **Audit Log** - Rastreamento completo de mudanças
- ✅ **RLS (Row Level Security)** - Segurança em nível de linha
- ✅ **Triggers Automáticos** - Espelhamento, saldos, settlements
- ✅ **Financial Ledger** - Fonte única da verdade para débitos/créditos

## Tabelas Principais

### Core
- `profiles` - Perfis de usuários
- `accounts` - Contas bancárias
- `transactions` - Transações financeiras
- `transaction_splits` - Divisões de despesas
- `categories` - Categorias de transações

### Compartilhamento
- `families` - Famílias/grupos
- `family_members` - Membros de famílias
- `family_invitations` - Convites de família
- `financial_ledger` - Ledger de débitos/créditos

### Viagens
- `trips` - Viagens
- `trip_members` - Membros de viagens
- `trip_invitations` - Convites de viagens
- `trip_participants` - Participantes (usuários + membros)

### Auditoria
- `audit_log` - Log de todas as mudanças
- `notifications` - Notificações do sistema

## Conceitos Importantes

### Soft Delete
Registros não são deletados permanentemente. São marcados com `deleted_at`.

```sql
-- Soft delete
UPDATE transactions SET deleted_at = NOW() WHERE id = '...';

-- Restaurar
UPDATE transactions SET deleted_at = NULL WHERE id = '...';
```

### Espelhamento de Transações
Transações compartilhadas são espelhadas para cada membro ver sua parte.

```
Original (Wesley): R$ 300
  ↓ Split (Fran: R$ 150)
  ↓ Trigger automático
Espelho (Fran): R$ 150
```

### Financial Ledger
Sistema de double-entry bookkeeping para rastrear débitos e créditos.

```
Wesley paga R$ 300 e divide com Fran:
- DEBIT: Wesley R$ 300 (pagou)
- CREDIT: Wesley R$ 150 (vai receber)
- DEBIT: Fran R$ 150 (deve)
```

### Settlements (Acertos)
Dois campos independentes para devedor e credor confirmarem pagamento.

```sql
-- Devedor marca como pago
settled_by_debtor = TRUE

-- Credor marca como recebido
settled_by_creditor = TRUE

-- Totalmente acertado quando ambos TRUE
is_settled = (settled_by_debtor AND settled_by_creditor)
```

## Queries Comuns

### Buscar Transações do Mês
```sql
SELECT * FROM transactions
WHERE user_id = '...'
  AND competence_date >= '2026-01-01'
  AND competence_date < '2026-02-01'
  AND deleted_at IS NULL;
```

### Calcular Saldo de Conta
```sql
SELECT calculate_account_balance('account-id');
```

### Buscar Dívidas Pendentes
```sql
SELECT * FROM transaction_splits
WHERE user_id = '...'
  AND is_settled = FALSE
  AND deleted_at IS NULL;
```

### Histórico de Mudanças
```sql
SELECT * FROM get_record_history('transactions', 'tx-id');
```

## Manutenção

### Executar Testes
```sql
SELECT * FROM tests.run_all_tests();
```

### Recalcular Saldos
```sql
SELECT * FROM recalculate_all_account_balances();
```

### Limpeza de Dados Antigos
```sql
-- Deletar permanentemente soft-deleted há mais de 90 dias
SELECT permanent_delete_old_records();

-- Limpar audit logs com mais de 1 ano
SELECT cleanup_old_audit_logs();
```

## Backup e Restore

### Backup Manual
```bash
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

### Restore
```bash
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

## Monitoramento

### Queries Lentas
```sql
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Tamanho de Tabelas
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Suporte

Para dúvidas ou problemas:
1. Consulte a documentação específica em cada arquivo
2. Verifique o audit log para rastrear mudanças
3. Execute os testes para validar integridade
4. Consulte as migrations para entender histórico

