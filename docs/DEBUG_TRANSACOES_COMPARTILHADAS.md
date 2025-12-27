# � DDEBUG: Transações Compartilhadas - Histórico Completo

## 📋 Resumo do Problema

**Situação Atual**: Transações compartilhadas criadas por Fran não aparecem para Wesley.

**Causa Raiz Identificada**: Múltiplos problemas em cascata:
1. ✅ **RESOLVIDO**: Projeto Supabase errado no `.env`
2. ✅ **RESOLVIDO**: Banco vazio (sem dados de teste)
3. ✅ **RESOLVIDO**: Usuários não existiam
4. ✅ **RESOLVIDO**: Confirmação de email ativada
5. 🔄 **EM PROGRESSO**: `full_name` NULL nos profiles

---

## 🔍 Histórico de Investigação

### Problema 1: Projeto Supabase Errado ✅

**Descoberta**: `.env` estava apontando para projeto `uefthdzwnydgiphtmyum` (vazio), mas o correto é `vrrcagukyfnlhxuvnssp`.

**Solução Aplicada**:
```env
VITE_SUPABASE_PROJECT_ID="vrrcagukyfnlhxuvnssp"
VITE_SUPABASE_URL="https://vrrcagukyfnlhxuvnssp.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Problema 2: Banco Vazio ✅

**Descoberta**: Banco `vrrcagukyfnlhxuvnssp` tinha tabelas mas sem dados.

**Solução Aplicada**: Populado com dados de teste via script SQL.

### Problema 3: Usuários Não Existiam ✅

**Descoberta**: Tabela `auth.users` estava vazia.

**Solução Aplicada**: Criados manualmente via dashboard:
- `wesley.diaslima@gmail.com` (senha: Teste@123)
- `francy.von@gmail.com` (senha: Teste@123)

### Problema 4: Confirmação de Email ✅

**Descoberta**: Supabase estava exigindo confirmação de email, impedindo login.

**Solução Aplicada**: Desabilitado em Authentication > Settings > Email Auth > "Enable email confirmations" = OFF

### Problema 5: full_name NULL nos Profiles 🔄

**Descoberta**: Profiles criados com `full_name = NULL`, causando problemas na validação de email ao adicionar membros da família.

**Impacto**:
- Validação de email mostra "usuário não cadastrado" mesmo quando existe
- Nome não aparece na interface
- Sistema usa fallback (parte do email), mas precisa garantir que sempre tenha valor

**Solução**:
1. ✅ Atualizar profiles existentes com `full_name` (usa parte do email como fallback)
2. ✅ Corrigir trigger `handle_new_user()` para sempre preencher `full_name`
3. ✅ Melhorar validação em `InviteMemberDialog.tsx` (delay 1.5s + regex)

**IMPORTANTE**: Sistema usa **EMAIL** como identificador único. Nome é apenas para exibição.

---

## 🔧 Scripts SQL Aplicados

### 1. Configurar Sistema de Espelhamento

**Arquivo**: `scripts/fix-shared-transactions.sql`

**O que faz**:
- Remove triggers conflitantes
- Cria função `create_transaction_mirrors()`
- Cria triggers para espelhamento automático
- Migra transações existentes

**Status**: ✅ Aplicado

### 2. Popular Banco com Dados de Teste

**Conteúdo**:
```sql
-- Criar família
INSERT INTO families (name, created_by) VALUES ('Família Teste', 'user-id');

-- Adicionar membros
INSERT INTO family_members (family_id, user_id, name, email, role) VALUES ...

-- Criar contas
INSERT INTO accounts (user_id, name, type, balance) VALUES ...

-- Criar categorias
INSERT INTO categories (user_id, name, type, icon) VALUES ...
```

**Status**: ✅ Aplicado

### 3. Corrigir full_name NULL

**Arquivo**: `scripts/fix-profile-full-name.sql`

**O que faz**:
1. Atualiza profiles existentes com `full_name` (usa parte do email como fallback)
2. Corrige trigger `handle_new_user()` para sempre preencher `full_name`
3. Adiciona fallback: metadata → parte do email
4. Adiciona verificações de status

**IMPORTANTE**: Sistema usa EMAIL como identificador único. Nome é apenas para exibição.

**Status**: 🔄 **AGUARDANDO APLICAÇÃO**

---

## 📝 Próximos Passos

### Passo 1: Aplicar Script SQL ⚠️ IMPORTANTE

Execute o script `scripts/fix-profile-full-name.sql` no Supabase SQL Editor:

1. Acesse: https://supabase.com/dashboard/project/vrrcagukyfnlhxuvnssp/sql
2. Cole o conteúdo do arquivo `scripts/fix-profile-full-name.sql`
3. Clique em "Run"
4. Verifique os resultados

**Resultado Esperado**:
```
✅ Profiles atualizados
total: 2
com_nome: 2
sem_nome: 0
```

### Passo 2: Testar Validação de Email

1. Abra o aplicativo
2. Vá em "Família"
3. Clique em "Adicionar Membro"
4. Digite o email: `francy.von@gmail.com`
5. Aguarde 1.5 segundos
6. Deve aparecer: ✅ "Usuário cadastrado: Fran"

### Passo 3: Testar Transação Compartilhada

1. **Login como Wesley**:
   - Email: `wesley.diaslima@gmail.com`
   - Senha: `Teste@123`

2. **Adicionar Fran na família** (se ainda não estiver):
   - Ir em "Família"
   - Adicionar membro: `francy.von@gmail.com`
   - Permissão: Editor

3. **Criar transação compartilhada**:
   - Ir em "Nova Transação"
   - Tipo: Despesa
   - Valor: R$ 100,00
   - Descrição: "Teste compartilhado"
   - Clicar em "Dividir despesa"
   - Selecionar Fran (50%)
   - Salvar

4. **Verificar no banco**:
   ```sql
   -- Ver transação original
   SELECT * FROM transactions 
   WHERE description = 'Teste compartilhado'
   AND source_transaction_id IS NULL;
   
   -- Ver splits
   SELECT * FROM transaction_splits 
   WHERE transaction_id = 'id-da-transacao';
   
   -- Ver espelho
   SELECT * FROM transactions 
   WHERE source_transaction_id = 'id-da-transacao';
   ```

5. **Login como Fran**:
   - Email: `francy.von@gmail.com`
   - Senha: `Teste@123`
   - Ir em "Compartilhados"
   - Deve ver a transação "Teste compartilhado"
   - Deve aparecer como "DEBIT" (eu devo R$ 50,00)

---

## 🎯 Checklist de Verificação

### Configuração Inicial
- [x] Projeto Supabase correto no `.env`
- [x] Usuários criados no banco
- [x] Confirmação de email desabilitada
- [x] Dados de teste populados
- [ ] **Script `fix-profile-full-name.sql` aplicado** ⚠️

### Funcionalidades
- [ ] Validação de email funciona corretamente
- [ ] Adicionar membro da família funciona
- [ ] Criar transação compartilhada funciona
- [ ] Splits são criados corretamente
- [ ] Espelhos são criados automaticamente
- [ ] Fran vê transação quando faz login
- [ ] Saldo é calculado corretamente

### Logs de Debug
- [x] Logs adicionados em `TransactionForm.tsx`
- [x] Logs adicionados em `useTransactions.ts`
- [ ] Verificar logs no console ao criar transação

---

## 🚨 Problemas Conhecidos

### 1. Validação de Email Muito Rápida

**Problema**: Validação acontecia após digitar `@`, antes de terminar o email.

**Solução Aplicada**:
- Aumentado delay para 1.5 segundos
- Adicionada validação de regex completo antes de buscar no banco
- Melhorado fallback para usar parte do email se `full_name` for NULL

**Arquivo**: `src/components/family/InviteMemberDialog.tsx`

### 2. full_name NULL nos Profiles

**Problema**: Profiles criados com `full_name = NULL`.

**Solução**:
- Script SQL para atualizar profiles existentes
- Trigger corrigido para sempre preencher `full_name`
- Fallback para usar parte do email

**Arquivo**: `scripts/fix-profile-full-name.sql`

---

## 📊 Arquitetura do Sistema

### Fonte de Verdade: Supabase (PostgreSQL)

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  - React Query (cache em memória)                       │
│  - Supabase Client                                       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL)                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Tabela: transactions                             │   │
│  │ - id, user_id, amount, description, is_shared   │   │
│  │ - source_transaction_id (para espelhos)         │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Tabela: transaction_splits                       │   │
│  │ - transaction_id, member_id, percentage, amount │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Trigger: create_transaction_mirrors()            │   │
│  │ - Dispara ao inserir/atualizar splits           │   │
│  │ - Cria transação espelhada para cada membro     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de Transação Compartilhada

```
1. Wesley cria transação compartilhada
   ↓
2. Frontend chama useTransactions.createTransaction()
   ↓
3. Insere na tabela transactions (is_shared = true)
   ↓
4. Insere splits na tabela transaction_splits
   ↓
5. Trigger create_transaction_mirrors() dispara
   ↓
6. Para cada split, cria transação espelhada:
   - user_id = membro da família (Fran)
   - source_transaction_id = transação original
   - amount = valor do split
   ↓
7. Fran faz login
   ↓
8. useSharedFinances busca transações onde:
   - user_id = Fran
   - source_transaction_id IS NOT NULL
   ↓
9. Mostra como "DEBIT" (eu devo)
```

### LocalStorage: Apenas Cache Mínimo

LocalStorage é usado APENAS para:
- ✅ Token de autenticação (Supabase Auth)
- ✅ Preferências de UI (tema, idioma)
- ❌ **NÃO** armazena transações
- ❌ **NÃO** armazena dados financeiros

---

## 🔍 Queries SQL para Debug

### Ver Profiles

```sql
SELECT 
  id,
  email,
  full_name,
  CASE 
    WHEN full_name IS NOT NULL THEN '✅ OK'
    ELSE '❌ NULL'
  END as status,
  created_at
FROM profiles
ORDER BY created_at DESC;
```

### Ver Membros da Família

```sql
SELECT 
  fm.id,
  fm.name,
  fm.email,
  fm.role,
  fm.user_id,
  fm.linked_user_id,
  p.full_name as profile_name
FROM family_members fm
LEFT JOIN profiles p ON p.id = fm.user_id OR p.id = fm.linked_user_id
ORDER BY fm.created_at DESC;
```

### Ver Transações Compartilhadas

```sql
-- Transações originais (criadas por Wesley)
SELECT 
  t.id,
  t.description,
  t.amount,
  t.is_shared,
  t.user_id,
  p.full_name as creator_name,
  t.created_at
FROM transactions t
LEFT JOIN profiles p ON p.id = t.user_id
WHERE t.is_shared = true 
AND t.source_transaction_id IS NULL
ORDER BY t.created_at DESC;
```

### Ver Splits

```sql
SELECT 
  ts.transaction_id,
  ts.member_id,
  ts.percentage,
  ts.amount,
  fm.name as member_name,
  fm.email as member_email
FROM transaction_splits ts
LEFT JOIN family_members fm ON fm.id = ts.member_id
WHERE ts.transaction_id = 'id-da-transacao'
ORDER BY ts.percentage DESC;
```

### Ver Espelhos

```sql
-- Transações espelhadas (criadas automaticamente para Fran)
SELECT 
  t.id,
  t.description,
  t.amount,
  t.user_id,
  p.full_name as owner_name,
  t.source_transaction_id,
  t.created_at
FROM transactions t
LEFT JOIN profiles p ON p.id = t.user_id
WHERE t.source_transaction_id IS NOT NULL
ORDER BY t.created_at DESC;
```

### Ver Tudo de Uma Transação

```sql
-- Substitua 'transaction-id' pelo ID da transação
WITH original AS (
  SELECT * FROM transactions WHERE id = 'transaction-id'
),
splits AS (
  SELECT * FROM transaction_splits WHERE transaction_id = 'transaction-id'
),
mirrors AS (
  SELECT * FROM transactions WHERE source_transaction_id = 'transaction-id'
)
SELECT 
  'ORIGINAL' as tipo,
  o.id,
  o.description,
  o.amount,
  o.is_shared,
  o.user_id,
  NULL as member_id,
  NULL as percentage
FROM original o
UNION ALL
SELECT 
  'SPLIT' as tipo,
  s.transaction_id as id,
  NULL as description,
  s.amount,
  NULL as is_shared,
  NULL as user_id,
  s.member_id,
  s.percentage
FROM splits s
UNION ALL
SELECT 
  'MIRROR' as tipo,
  m.id,
  m.description,
  m.amount,
  m.is_shared,
  m.user_id,
  NULL as member_id,
  NULL as percentage
FROM mirrors m;
```

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar logs do console** (F12 no navegador)
2. **Executar queries SQL de debug** (acima)
3. **Verificar se script foi aplicado** (`fix-profile-full-name.sql`)
4. **Verificar se usuários existem** (tabela `auth.users`)
5. **Verificar se membros estão vinculados** (tabela `family_members`)

---

**Data**: 26/12/2024  
**Status**: 🔄 Aguardando aplicação do script `fix-profile-full-name.sql`  
**Prioridade**: 🟡 ALTA (bloqueando testes de transações compartilhadas)
