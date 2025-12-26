# 📋 INSTRUÇÕES PARA APLICAR MIGRAÇÕES NO SUPABASE

## 🎯 OPÇÃO 1: Usar o Dashboard do Supabase (RECOMENDADO)

### Passo 1: Acessar o SQL Editor

1. Acesse: https://supabase.com/dashboard/project/vrrcagukyfnlhxuvnssp
2. No menu lateral, clique em **"SQL Editor"**
3. Clique em **"New query"**

### Passo 2: Aplicar Migrações na Ordem

Copie e cole o conteúdo de cada arquivo SQL na ordem abaixo e execute:

#### 1️⃣ Schema Inicial
**Arquivo**: `supabase/migrations/20251225202740_858113b5-be75-41fa-b6f2-b5f2935e9a7f.sql`
- Cria todas as tabelas base
- Cria tipos enumerados
- Configura RLS policies

#### 2️⃣ Triggers de Espelho
**Arquivo**: `supabase/migrations/20251225204218_8c3e72a7-e8fa-490e-a22d-1d1e33f600ca.sql`
- Cria triggers para transferências
- Adiciona colunas para shared expenses

#### 3️⃣ Sistema de Espelhamento Compartilhado
**Arquivo**: `supabase/migrations/20251225212420_b50b7ab1-b12c-4598-bcb1-9a8d7ac00172.sql`
- Cria tabela shared_transaction_mirrors
- Funções de sincronização

#### 4️⃣ Demais Migrações
Continue aplicando os arquivos na ordem:
- `20251225213716_ebc09c53-8d44-4c9f-a39c-7eb5d8897692.sql`
- `20251225214344_b8e280bd-c254-4f95-b971-a3046abbfaa2.sql`
- `20251225214359_267c1504-8536-4929-a9ee-9ab794e56146.sql`
- `20251225222431_4495f0b5-0993-4dd8-b26a-d0dbbe2b661f.sql`
- `20251225222956_6c26ca75-480f-4820-bbfd-80234d3cd1ee.sql`
- `20251226_001_consolidacao_schema.sql`
- `20251226_002_constraints_e_auditoria.sql`
- `20251226_003_budgets_goals_investments.sql`

### Passo 3: Verificar

Após aplicar todas as migrações, execute:

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar saúde do sistema
SELECT * FROM view_system_health;
```

---

## 🎯 OPÇÃO 2: Instalar Supabase CLI e Aplicar Automaticamente

### Passo 1: Instalar Supabase CLI

**Windows (PowerShell como Administrador)**:
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Ou via NPM**:
```bash
npm install -g supabase
```

### Passo 2: Linkar Projeto

```bash
supabase link --project-ref vrrcagukyfnlhxuvnssp
```

Quando solicitado, use a senha do banco de dados.

### Passo 3: Aplicar Migrações

```bash
supabase db push
```

Ou aplicar uma por uma:

```bash
supabase db execute --file supabase/migrations/20251225202740_858113b5-be75-41fa-b6f2-b5f2935e9a7f.sql --linked
supabase db execute --file supabase/migrations/20251225204218_8c3e72a7-e8fa-490e-a22d-1d1e33f600ca.sql --linked
# ... e assim por diante
```

### Passo 4: Gerar Types

```bash
supabase gen types typescript --linked > src/types/database.ts
```

---

## 🎯 OPÇÃO 3: Usar o Power do Supabase (Kiro)

Se você estiver usando o Kiro, pode pedir para ele aplicar as migrações automaticamente:

```
"Aplique todas as migrações do diretório supabase/migrations no projeto vrrcagukyfnlhxuvnssp"
```

---

## ✅ VERIFICAÇÃO FINAL

Após aplicar todas as migrações, verifique:

### 1. Tabelas Criadas

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Esperado**:
- accounts
- categories
- families
- family_members
- profiles
- shared_transaction_mirrors
- transaction_splits
- transactions
- trip_checklist
- trip_itinerary
- trip_participants
- trips

### 2. Funções Criadas

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

**Esperado**:
- create_transfer_mirror
- delete_mirror_on_delete
- get_user_family_id
- handle_new_user
- handle_shared_transaction_sync
- is_family_member
- is_trip_participant
- sync_mirror_on_update
- sync_shared_transaction
- update_updated_at_column
- validate_transaction_splits

### 3. Triggers Criados

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

### 4. Saúde do Sistema

```sql
SELECT * FROM view_system_health;
```

Deve retornar 0 para todos os tipos de problemas.

---

## 🔧 TROUBLESHOOTING

### Erro: "relation already exists"
- Ignore, significa que a tabela já foi criada

### Erro: "type already exists"
- Ignore, significa que o tipo já foi criado

### Erro: "function already exists"
- Use `CREATE OR REPLACE FUNCTION` ao invés de `CREATE FUNCTION`

### Erro: "permission denied"
- Verifique se você está usando o usuário correto
- No dashboard, você tem permissões de admin automaticamente

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verifique os logs no Supabase Dashboard → Logs
2. Execute `SELECT * FROM view_system_health;` para diagnóstico
3. Consulte a documentação: https://supabase.com/docs

---

**Data**: 26/12/2024  
**Projeto**: vrrcagukyfnlhxuvnssp  
**URL**: https://vrrcagukyfnlhxuvnssp.supabase.co
