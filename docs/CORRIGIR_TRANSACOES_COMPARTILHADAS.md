# 🔴 PROBLEMA: Transações Compartilhadas Não Aparecem

## 📋 Descrição do Problema

**Situação**: Usuário A (Fran) cria uma transação compartilhada, mas não aparece para Usuário B (Wesley).

**Causa Raiz**: Sistema tem DOIS mecanismos de espelhamento conflitantes:
1. Tabela `shared_transaction_mirrors` (não está sendo usada pelo frontend)
2. Campo `source_transaction_id` na tabela `transactions` (usado pelo frontend)

## 🔍 Diagnóstico

### Como o Sistema DEVERIA Funcionar

1. **Usuário A cria transação compartilhada**:
   - Cria transação na tabela `transactions` com `is_shared = true`
   - Cria splits na tabela `transaction_splits` para cada membro

2. **Trigger automático cria espelhos**:
   - Para cada split, cria uma transação espelhada
   - Transação espelhada tem `source_transaction_id` apontando para a original
   - Transação espelhada tem `user_id` do membro da família

3. **Usuário B vê a transação**:
   - Hook `useSharedFinances` busca transações onde `user_id = B` e `source_transaction_id IS NOT NULL`
   - Mostra como "DEBIT" (eu devo)

### Como Está Funcionando (ERRADO)

1. ✅ Transação é criada com `is_shared = true`
2. ✅ Splits são criados
3. ❌ Triggers NÃO estão criando espelhos corretamente
4. ❌ Usuário B não vê nada

## 🔧 Solução

### Passo 1: Aplicar Script SQL

Execute o script `scripts/fix-shared-transactions.sql` no Supabase SQL Editor:

```bash
# Copie o conteúdo do arquivo e cole no SQL Editor do Supabase
# Ou use o comando abaixo se tiver psql instalado:
psql "sua-connection-string" -f scripts/fix-shared-transactions.sql
```

### O que o script faz:

1. **Remove triggers conflitantes**
2. **Cria função simplificada** `create_transaction_mirrors()`
3. **Cria triggers corretos**:
   - `trigger_create_mirrors_on_insert` - Para novas transações
   - `trigger_create_mirrors_on_update` - Para transações atualizadas
4. **Migra transações existentes** - Cria espelhos para transações que não têm

### Passo 2: Verificar Membros da Família

Certifique-se de que os membros da família têm `user_id` ou `linked_user_id` vinculado:

```sql
-- Verificar membros
SELECT 
  id,
  name,
  user_id,
  linked_user_id,
  email
FROM family_members;

-- Se algum membro não tem user_id/linked_user_id, vincular:
UPDATE family_members
SET linked_user_id = (SELECT id FROM auth.users WHERE email = 'email@exemplo.com')
WHERE id = 'member-id';
```

### Passo 3: Testar

1. **Criar nova transação compartilhada**:
   - Usuário A cria transação
   - Divide com Usuário B
   - Salva

2. **Verificar no banco**:
   ```sql
   -- Ver transação original
   SELECT * FROM transactions 
   WHERE is_shared = true 
   AND source_transaction_id IS NULL
   ORDER BY created_at DESC LIMIT 1;
   
   -- Ver espelho criado
   SELECT * FROM transactions 
   WHERE source_transaction_id = 'id-da-transacao-original';
   ```

3. **Verificar no frontend**:
   - Usuário B deve ver a transação na página "Compartilhados"
   - Deve aparecer como "DEBIT" (eu devo)

## 📊 Como o Sistema Funciona (Arquitetura)

### Fonte de Verdade: Banco de Dados Supabase

O sistema usa **Supabase (PostgreSQL)** como fonte de verdade:

- ✅ Todas as transações são salvas no banco
- ✅ Queries em tempo real via React Query
- ✅ RLS (Row Level Security) para segurança
- ✅ Triggers automáticos para espelhamento

### LocalStorage: Apenas Cache Mínimo

LocalStorage é usado APENAS para:
- ✅ Token de autenticação (Supabase Auth)
- ✅ Preferências de UI (tema, idioma)
- ❌ **NÃO** armazena transações
- ❌ **NÃO** armazena dados financeiros

### Fluxo de Dados

```
Frontend (React)
    ↓
React Query (Cache em memória)
    ↓
Supabase Client
    ↓
PostgreSQL (Fonte de Verdade)
    ↓
Triggers (Espelhamento automático)
```

## 🎯 Checklist de Verificação

Após aplicar o script, verifique:

- [ ] Triggers foram criados corretamente
- [ ] Transações existentes têm espelhos
- [ ] Membros da família têm `user_id` ou `linked_user_id`
- [ ] Nova transação compartilhada cria espelho automaticamente
- [ ] Usuário B vê transação na página "Compartilhados"
- [ ] Acerto de contas funciona corretamente

## 🚨 Problemas Comuns

### 1. Espelhos não são criados

**Causa**: Membro não tem `user_id` ou `linked_user_id` vinculado

**Solução**:
```sql
UPDATE family_members
SET linked_user_id = (SELECT id FROM auth.users WHERE email = 'email@exemplo.com')
WHERE name = 'Nome do Membro';
```

### 2. Transação aparece duplicada

**Causa**: Triggers conflitantes criando múltiplos espelhos

**Solução**: Execute o script novamente (ele remove triggers antigos)

### 3. Erro de permissão ao criar espelho

**Causa**: RLS Policy bloqueando criação

**Solução**: Função usa `SECURITY DEFINER` para bypassar RLS

## 📝 Logs para Debug

Para debugar problemas, execute:

```sql
-- Ver todas as transações de um usuário
SELECT 
  id,
  description,
  amount,
  is_shared,
  source_transaction_id,
  payer_id,
  user_id
FROM transactions
WHERE user_id = 'user-id'
ORDER BY created_at DESC;

-- Ver splits de uma transação
SELECT 
  ts.*,
  fm.name as member_name,
  fm.user_id as member_user_id,
  fm.linked_user_id as member_linked_user_id
FROM transaction_splits ts
LEFT JOIN family_members fm ON fm.id = ts.member_id
WHERE ts.transaction_id = 'transaction-id';

-- Ver espelhos de uma transação
SELECT * FROM transactions
WHERE source_transaction_id = 'transaction-id';
```

## 🎉 Resultado Esperado

Após aplicar a correção:

1. ✅ Usuário A cria transação compartilhada
2. ✅ Sistema cria espelho automaticamente para Usuário B
3. ✅ Usuário B vê transação na página "Compartilhados"
4. ✅ Saldo é calculado corretamente (quem deve/quem recebe)
5. ✅ Acerto de contas funciona
6. ✅ Histórico é mantido

---

**Data**: 26/12/2024  
**Status**: Aguardando aplicação do script  
**Prioridade**: 🔴 CRÍTICA
