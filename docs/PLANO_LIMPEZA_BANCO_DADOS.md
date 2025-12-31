# 🧹 PLANO DE LIMPEZA DO BANCO DE DADOS
**Data**: 31/12/2024  
**Status**: 📋 PLANEJAMENTO

---

## 🎯 OBJETIVO

Identificar e remover:
1. ✅ Triggers duplicados ou obsoletos
2. ✅ Funções não utilizadas
3. ✅ Dados duplicados
4. ✅ Políticas RLS redundantes
5. ✅ Índices desnecessários

---

## 📊 ANÁLISE PRELIMINAR

### Triggers Identificados para Investigação

#### Tabela: `transactions`
```
✅ MANTER:
- trg_update_mirrored_transactions_on_update (atualiza mirrors)
- trg_validate_shared_transaction (validação)
- trg_sync_account_balance (atualiza saldo)
- trg_validate_competence_date (normaliza data)

⚠️ INVESTIGAR:
- trg_transaction_mirroring (pode estar duplicado)
```

#### Tabela: `transaction_splits`
```
✅ MANTER:
- trg_create_mirrored_transaction_on_split (cria mirror)
- trg_delete_mirrored_transaction_on_split_delete (remove mirror)
- trg_fill_split_user_id (preenche user_id)
- trg_create_ledger_on_split (cria entrada no ledger)

⚠️ INVESTIGAR:
- Verificar se há triggers duplicados
```

#### Tabela: `family_invitations`
```
✅ MANTER:
- trg_handle_invitation_accepted (adiciona membro)

⚠️ INVESTIGAR:
- Verificar se há triggers antigos de notificação
```

#### Tabela: `trip_invitations`
```
✅ MANTER:
- trg_handle_trip_invitation_accepted (adiciona membro)
- trg_create_trip_invitation_notification (notifica)

⚠️ INVESTIGAR:
- Verificar se há triggers duplicados
```

---

## 🔍 FUNÇÕES A INVESTIGAR

### Funções de Espelhamento
```sql
-- VERIFICAR SE EXISTEM E SE SÃO USADAS:
- handle_transaction_mirroring() -- Pode estar obsoleta
- mirror_shared_transaction() -- Pode estar obsoleta
- sync_shared_transaction() -- Pode estar obsoleta
```

### Funções de Saldo
```sql
-- VERIFICAR SE EXISTEM E SE SÃO USADAS:
- update_account_balance_on_insert() -- Obsoleta (já removida?)
- update_account_balance_on_delete() -- Obsoleta (já removida?)
- recalculate_account_balance() -- Obsoleta (já removida?)
```

### Funções de Convites
```sql
-- VERIFICAR SE EXISTEM E SE SÃO USADAS:
- create_family_invitation_notification() -- Pode estar duplicada
- create_trip_invitation_notification() -- Pode estar duplicada
```

---

## 🗑️ DADOS DUPLICADOS ENCONTRADOS

### 1. Splits Duplicados
**Problema**: Mesma transação, mesmo membro, mesmo valor aparece 2x

**Query para identificar**:
```sql
SELECT 
    transaction_id,
    member_id,
    user_id,
    amount,
    COUNT(*) as duplicates,
    ARRAY_AGG(id) as split_ids
FROM transaction_splits
GROUP BY transaction_id, member_id, user_id, amount
HAVING COUNT(*) > 1;
```

**Ação**: Manter o mais antigo (created_at menor), deletar os outros

### 2. Transações Espelhadas Duplicadas
**Problema**: Mesmo source_transaction_id, mesmo user_id aparece 2x

**Query para identificar**:
```sql
SELECT 
    source_transaction_id,
    user_id,
    amount,
    COUNT(*) as duplicates,
    ARRAY_AGG(id) as mirror_ids
FROM transactions
WHERE source_transaction_id IS NOT NULL
GROUP BY source_transaction_id, user_id, amount
HAVING COUNT(*) > 1;
```

**Ação**: Manter o mais antigo, deletar os outros

### 3. Entradas de Ledger Duplicadas
**Problema**: Mesma transação, mesmo user, mesmo tipo aparece 2x

**Query para identificar**:
```sql
SELECT 
    transaction_id,
    user_id,
    entry_type,
    related_user_id,
    amount,
    COUNT(*) as duplicates,
    ARRAY_AGG(id) as ledger_ids
FROM financial_ledger
GROUP BY transaction_id, user_id, entry_type, related_user_id, amount
HAVING COUNT(*) > 1;
```

**Ação**: Manter o mais antigo, deletar os outros

---

## 📋 CHECKLIST DE EXECUÇÃO

### FASE 1: AUDITORIA (EXECUTAR PRIMEIRO) ⚠️
```bash
# Executar script de auditoria no Supabase SQL Editor
# Arquivo: AUDITORIA_BANCO_DADOS_COMPLETA.sql
```

**Resultado esperado**:
- [ ] Lista completa de triggers
- [ ] Lista completa de funções
- [ ] Identificação de duplicados
- [ ] Identificação de objetos não usados

### FASE 2: ANÁLISE DOS RESULTADOS 🔍
**Revisar manualmente**:
- [ ] Triggers duplicados ou conflitantes
- [ ] Funções que não são chamadas por nenhum trigger
- [ ] Funções que não são usadas pelo frontend (RPC)
- [ ] Dados duplicados em cada tabela

### FASE 3: BACKUP ⚠️ CRÍTICO
```bash
# Fazer backup antes de qualquer alteração
# No Supabase Dashboard: Database > Backups > Create Backup
```

- [ ] Backup criado e confirmado

### FASE 4: LIMPEZA DE DADOS DUPLICADOS 🗑️
**Ordem de execução**:
1. [ ] Limpar ledger duplicado (não tem FK)
2. [ ] Limpar transações espelhadas duplicadas
3. [ ] Limpar splits duplicados

**Script**: `LIMPAR_DADOS_DUPLICADOS.sql` (criar após auditoria)

### FASE 5: LIMPEZA DE TRIGGERS OBSOLETOS 🗑️
**Após confirmar quais são obsoletos**:
- [ ] Remover triggers antigos de mirroring
- [ ] Remover triggers de notificação duplicados
- [ ] Remover triggers de saldo obsoletos

**Script**: `LIMPAR_TRIGGERS_OBSOLETOS.sql` (criar após auditoria)

### FASE 6: LIMPEZA DE FUNÇÕES OBSOLETAS 🗑️
**Após confirmar quais não são usadas**:
- [ ] Remover funções de espelhamento antigas
- [ ] Remover funções de saldo obsoletas
- [ ] Remover funções de convite duplicadas

**Script**: `LIMPAR_FUNCOES_OBSOLETAS.sql` (criar após auditoria)

### FASE 7: VALIDAÇÃO ✅
**Testes a executar**:
- [ ] Criar nova despesa compartilhada
- [ ] Verificar que apenas 1 split é criado
- [ ] Verificar que apenas 1 mirror é criado
- [ ] Verificar que ledger está correto
- [ ] Testar acerto de contas
- [ ] Criar convite de família
- [ ] Aceitar convite de família
- [ ] Criar convite de viagem
- [ ] Aceitar convite de viagem

### FASE 8: MONITORAMENTO 📊
**Após limpeza, monitorar por 24h**:
- [ ] Verificar logs de erro no Supabase
- [ ] Verificar se usuários reportam problemas
- [ ] Verificar se novas duplicações aparecem

---

## ⚠️ REGRAS DE SEGURANÇA

### NUNCA REMOVER SEM CONFIRMAR:
1. ✅ Triggers que são chamados automaticamente
2. ✅ Funções que são usadas por triggers ativos
3. ✅ Funções RPC usadas pelo frontend
4. ✅ Políticas RLS ativas

### SEMPRE FAZER BACKUP ANTES DE:
1. ⚠️ Deletar dados
2. ⚠️ Remover triggers
3. ⚠️ Remover funções
4. ⚠️ Alterar políticas RLS

### TESTAR EM DESENVOLVIMENTO PRIMEIRO:
1. 🧪 Executar scripts em ambiente local
2. 🧪 Validar que tudo funciona
3. 🧪 Só então aplicar em produção

---

## 🎯 PRÓXIMOS PASSOS

1. **EXECUTAR** `AUDITORIA_BANCO_DADOS_COMPLETA.sql`
2. **ANALISAR** resultados da auditoria
3. **CRIAR** scripts de limpeza específicos
4. **FAZER** backup
5. **EXECUTAR** limpeza em ordem
6. **VALIDAR** funcionamento
7. **MONITORAR** por 24h

---

## 📝 NOTAS

### Por que duplicações acontecem?
1. **Triggers conflitantes**: Múltiplos triggers tentam fazer a mesma coisa
2. **Migrations não limpas**: Migrations antigas não removem objetos obsoletos
3. **Double-click no frontend**: Usuário clica 2x rapidamente
4. **Race conditions**: Múltiplas requisições simultâneas

### Como prevenir no futuro?
1. ✅ Sempre remover triggers antigos ao criar novos
2. ✅ Usar constraints UNIQUE onde apropriado
3. ✅ Adicionar debounce em botões do frontend
4. ✅ Usar transações no backend
5. ✅ Testar migrations em desenvolvimento primeiro

---

## ✅ CONCLUSÃO

**Status**: Aguardando execução da auditoria completa

**Tempo estimado**: 
- Auditoria: 30 min
- Análise: 1h
- Limpeza: 2h
- Validação: 1h
- **TOTAL**: ~4-5 horas

**Risco**: 🟡 MÉDIO (com backup, risco é baixo)

**Impacto**: 🟢 POSITIVO (sistema mais limpo e performático)
