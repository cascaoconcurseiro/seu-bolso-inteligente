# 🚀 SUPER FIX COMPLETO - APLICAR AGORA

## 🎯 O que este script faz

Configura **TODO** o banco de dados para transações compartilhadas funcionarem:

1. ✅ Corrige profiles (full_name)
2. ✅ Configura trigger para novos usuários
3. ✅ Configura sistema de espelhamento automático
4. ✅ Vincula membros da família aos usuários
5. ✅ Verifica e mostra status completo

## 📋 Como Aplicar (2 minutos)

### Passo 1: Abrir SQL Editor

https://supabase.com/dashboard/project/vrrcagukyfnlhxuvnssp/sql

### Passo 2: Copiar Script

Abra o arquivo: `SUPER_FIX_COMPLETO.sql`

Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)

### Passo 3: Colar e Executar

1. Cole no SQL Editor (Ctrl+V)
2. Clique em **"Run"** (ou Ctrl+Enter)
3. Aguarde a execução (pode demorar 10-20 segundos)

### Passo 4: Verificar Resultado

No final, você deve ver:

```
🎉 CONFIGURAÇÃO COMPLETA!

✅ Profiles corrigidos
✅ Trigger de novos usuários configurado
✅ Sistema de espelhamento configurado
✅ Membros da família vinculados
```

E um resumo com:
- `usuarios: 2`
- `profiles_ok: 2`
- `membros_vinculados: 2`
- `triggers ativos: 3`
- `funções criadas: 2`

## 🧪 Testar Após Aplicar

### Teste 1: Validação de Email

1. **Recarregue o aplicativo** (F5)
2. Vá em **"Família"** → **"Adicionar Membro"**
3. Digite: `francy.von@gmail.com`
4. Aguarde 1.5 segundos
5. **Abra o console** (F12) e veja:
   ```
   🔍 DEBUG InviteMemberDialog - Buscando email: francy.von@gmail.com
   ✅ Usuário encontrado: { ... }
   ```
6. Deve aparecer: ✅ **"Usuário cadastrado: [nome]"**

### Teste 2: Transação Compartilhada

1. **Login como Wesley**:
   - Email: `wesley.diaslima@gmail.com`
   - Senha: `Teste@123`

2. **Adicionar Fran na família** (se ainda não estiver):
   - Ir em "Família"
   - Adicionar membro: `francy.von@gmail.com`
   - Permissão: Editor
   - Salvar

3. **Criar transação compartilhada**:
   - Ir em "Nova Transação"
   - Tipo: **Despesa**
   - Valor: **R$ 100,00**
   - Descrição: **"Teste compartilhado"**
   - Clicar em **"Dividir despesa"**
   - Selecionar **Fran (50%)**
   - **Salvar**

4. **Verificar logs no console** (F12):
   ```
   🔍 DEBUG TransactionForm - Splits: [...]
   🔍 DEBUG useTransactions - Criando splits: [...]
   ✅ Splits criados com sucesso!
   ```

5. **Verificar no banco** (SQL Editor):
   ```sql
   -- Ver transação original
   SELECT * FROM transactions 
   WHERE description = 'Teste compartilhado'
   AND source_transaction_id IS NULL;
   
   -- Ver splits
   SELECT * FROM transaction_splits 
   WHERE transaction_id = (
     SELECT id FROM transactions 
     WHERE description = 'Teste compartilhado'
     AND source_transaction_id IS NULL
   );
   
   -- Ver espelho criado
   SELECT * FROM transactions 
   WHERE source_transaction_id = (
     SELECT id FROM transactions 
     WHERE description = 'Teste compartilhado'
     AND source_transaction_id IS NULL
   );
   ```

6. **Login como Fran**:
   - Email: `francy.von@gmail.com`
   - Senha: `Teste@123`
   - Ir em **"Compartilhados"**
   - Deve ver: **"Teste compartilhado"** ✅
   - Tipo: **"DEBIT" (eu devo R$ 50,00)** ✅

## 🚨 Se Não Funcionar

### Problema 1: Usuário não cadastrado

Execute no SQL Editor:
```sql
SELECT id, email, full_name FROM profiles;
```

Se `full_name` for NULL, execute:
```sql
UPDATE profiles
SET full_name = INITCAP(SPLIT_PART(email, '@', 1))
WHERE full_name IS NULL;
```

### Problema 2: Espelhos não criados

Execute no SQL Editor:
```sql
-- Ver triggers
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname LIKE '%mirror%';

-- Ver função
SELECT proname FROM pg_proc 
WHERE proname = 'create_transaction_mirrors';
```

Se não aparecer nada, execute o script novamente.

### Problema 3: Membros não vinculados

Execute no SQL Editor:
```sql
-- Ver membros
SELECT 
  fm.name,
  fm.email,
  fm.user_id,
  fm.linked_user_id,
  p.email as profile_email
FROM family_members fm
LEFT JOIN profiles p ON p.id = COALESCE(fm.user_id, fm.linked_user_id);

-- Vincular manualmente
UPDATE family_members fm
SET linked_user_id = p.id
FROM profiles p
WHERE fm.email = p.email
AND fm.user_id IS NULL
AND fm.linked_user_id IS NULL;
```

## 📞 Debug Avançado

Se ainda não funcionar, execute no SQL Editor:

```sql
-- Ver TUDO de uma transação
WITH original AS (
  SELECT * FROM transactions 
  WHERE description = 'Teste compartilhado'
  AND source_transaction_id IS NULL
  LIMIT 1
)
SELECT 
  'ORIGINAL' as tipo,
  o.id,
  o.description,
  o.amount,
  o.is_shared,
  o.user_id,
  p.email as user_email
FROM original o
LEFT JOIN profiles p ON p.id = o.user_id

UNION ALL

SELECT 
  'SPLIT' as tipo,
  ts.transaction_id as id,
  fm.name as description,
  ts.amount,
  NULL as is_shared,
  COALESCE(fm.user_id, fm.linked_user_id) as user_id,
  p.email as user_email
FROM transaction_splits ts
LEFT JOIN family_members fm ON fm.id = ts.member_id
LEFT JOIN profiles p ON p.id = COALESCE(fm.user_id, fm.linked_user_id)
WHERE ts.transaction_id = (SELECT id FROM original)

UNION ALL

SELECT 
  'MIRROR' as tipo,
  m.id,
  m.description,
  m.amount,
  m.is_shared,
  m.user_id,
  p.email as user_email
FROM transactions m
LEFT JOIN profiles p ON p.id = m.user_id
WHERE m.source_transaction_id = (SELECT id FROM original);
```

Isso vai mostrar:
- Transação original (criada por Wesley)
- Splits (divisão com Fran)
- Espelho (transação criada para Fran)

Se o espelho não aparecer, o problema está no trigger!

---

**IMPORTANTE**: Este script é COMPLETO e configura TODO o sistema. Depois de aplicar, tudo deve funcionar perfeitamente!
