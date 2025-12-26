# ⚠️ APLICAR AGORA: Correção full_name NULL

## 🎯 O que este script faz

Corrige o problema de `full_name = NULL` nos profiles, que estava causando:
- ❌ Validação de email mostrando "usuário não cadastrado" mesmo quando existe
- ❌ Nome não aparecendo na interface
- ❌ Problemas ao adicionar membros da família

## 📋 Passo a Passo

### 1. Abrir SQL Editor do Supabase

Acesse: https://supabase.com/dashboard/project/vrrcagukyfnlhxuvnssp/sql

### 2. Copiar o Script

Abra o arquivo `scripts/fix-profile-full-name.sql` e copie TODO o conteúdo.

### 3. Colar e Executar

1. Cole o script no SQL Editor
2. Clique em **"Run"** (ou pressione Ctrl+Enter)
3. Aguarde a execução

### 4. Verificar Resultado

Você deve ver algo como:

```
✅ Profiles atualizados
total: 2
com_nome: 2
sem_nome: 0
```

Se aparecer `sem_nome: 0`, está tudo certo! ✅

## 🧪 Testar Após Aplicar

### Teste 1: Validação de Email

1. Abra o aplicativo
2. Vá em **"Família"**
3. Clique em **"Adicionar Membro"**
4. Digite: `francy.von@gmail.com`
5. Aguarde 1.5 segundos
6. Deve aparecer: ✅ **"Usuário cadastrado: Fran"**

### Teste 2: Criar Transação Compartilhada

1. **Login como Wesley**:
   - Email: `wesley.diaslima@gmail.com`
   - Senha: `Teste@123`

2. **Adicionar Fran na família** (se ainda não estiver):
   - Ir em "Família"
   - Adicionar membro: `francy.von@gmail.com`
   - Permissão: Editor
   - Deve aparecer o nome "Fran" ✅

3. **Criar transação compartilhada**:
   - Ir em "Nova Transação"
   - Tipo: **Despesa**
   - Valor: **R$ 100,00**
   - Descrição: **"Teste compartilhado"**
   - Clicar em **"Dividir despesa"**
   - Selecionar **Fran (50%)**
   - Salvar

4. **Verificar logs no console** (F12):
   ```
   🔍 DEBUG TransactionForm - Splits: [...]
   🔍 DEBUG useTransactions - Criando splits: [...]
   🔍 DEBUG useTransactions - Membros encontrados: [...]
   ✅ Splits criados com sucesso!
   ```

5. **Login como Fran**:
   - Email: `francy.von@gmail.com`
   - Senha: `Teste@123`
   - Ir em **"Compartilhados"**
   - Deve ver a transação **"Teste compartilhado"** ✅
   - Deve aparecer como **"DEBIT" (eu devo R$ 50,00)** ✅

## 🔍 Verificar no Banco (Opcional)

Se quiser confirmar que tudo está correto, execute no SQL Editor:

```sql
-- Ver profiles atualizados
SELECT 
  id,
  email,
  full_name,
  CASE 
    WHEN full_name IS NOT NULL THEN '✅ OK'
    ELSE '❌ NULL'
  END as status
FROM profiles
ORDER BY created_at DESC;

-- Ver última transação compartilhada
SELECT 
  t.id,
  t.description,
  t.amount,
  t.is_shared,
  p.full_name as creator_name
FROM transactions t
LEFT JOIN profiles p ON p.id = t.user_id
WHERE t.is_shared = true 
AND t.source_transaction_id IS NULL
ORDER BY t.created_at DESC
LIMIT 1;

-- Ver splits da última transação
SELECT 
  ts.percentage,
  ts.amount,
  fm.name as member_name,
  fm.email as member_email
FROM transaction_splits ts
LEFT JOIN family_members fm ON fm.id = ts.member_id
WHERE ts.transaction_id = (
  SELECT id FROM transactions 
  WHERE is_shared = true 
  AND source_transaction_id IS NULL
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Ver espelhos criados
SELECT 
  t.id,
  t.description,
  t.amount,
  p.full_name as owner_name,
  t.source_transaction_id
FROM transactions t
LEFT JOIN profiles p ON p.id = t.user_id
WHERE t.source_transaction_id IS NOT NULL
ORDER BY t.created_at DESC
LIMIT 5;
```

## ✅ Resultado Esperado

Após aplicar o script e testar:

1. ✅ Profiles têm `full_name` preenchido
2. ✅ Validação de email funciona corretamente
3. ✅ Adicionar membro da família funciona
4. ✅ Criar transação compartilhada funciona
5. ✅ Splits são criados corretamente (logs no console)
6. ✅ Espelhos são criados automaticamente
7. ✅ Fran vê transação quando faz login
8. ✅ Saldo é calculado corretamente

## 🚨 Se Algo Der Errado

### Erro: "column full_name does not exist"

**Causa**: Coluna `full_name` não existe na tabela `profiles`.

**Solução**: Execute antes:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
```

### Erro: "trigger already exists"

**Causa**: Trigger já foi criado anteriormente.

**Solução**: O script já trata isso com `DROP TRIGGER IF EXISTS`. Execute novamente.

### Profiles ainda com full_name NULL

**Causa**: Script não foi executado ou houve erro.

**Solução**: Execute manualmente:
```sql
UPDATE profiles 
SET full_name = 'Wesley'
WHERE email = 'wesley.diaslima@gmail.com';

UPDATE profiles 
SET full_name = 'Fran'
WHERE email = 'francy.von@gmail.com';
```

### Transação não aparece para Fran

**Causa**: Espelhos não foram criados.

**Solução**: Verifique se o script `fix-shared-transactions.sql` foi aplicado:
```sql
-- Verificar se função existe
SELECT proname FROM pg_proc WHERE proname = 'create_transaction_mirrors';

-- Verificar se triggers existem
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%mirror%';
```

Se não existirem, aplique o script `scripts/fix-shared-transactions.sql`.

## 📞 Próximos Passos

Após aplicar este script e testar:

1. ✅ Sistema de profiles está corrigido
2. ✅ Validação de email funciona
3. ✅ Pronto para testar transações compartilhadas
4. ✅ Sistema completo funcionando

---

**Data**: 26/12/2024  
**Prioridade**: 🔴 CRÍTICA  
**Tempo estimado**: 5 minutos  
**Arquivo**: `scripts/fix-profile-full-name.sql`
