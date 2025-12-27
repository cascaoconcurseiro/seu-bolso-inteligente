# 🔧 Correção: Transações Compartilhadas Não Aparecem para Todos os Membros

## 📋 Problema Identificado

**Sintoma**: Quando Wesley cria uma transação compartilhada, ela aparece na página "Compartilhados" dele, mas NÃO aparece na página "Compartilhados" de Fran (embora apareça nas transações normais de Fran).

## 🔍 Causa Raiz

O problema está na função `sync_shared_transaction` no banco de dados. Ela só cria transações espelho (mirrors) para membros da família que têm `linked_user_id` preenchido:

```sql
-- Linha problemática na função sync_shared_transaction
WHERE ts.transaction_id = p_transaction_id
AND fm.linked_user_id IS NOT NULL  -- ❌ Isso exclui membros sem linked_user_id
AND fm.linked_user_id != v_transaction.user_id
```

### Como Funciona o Sistema

1. **Wesley cria transação compartilhada** com splits para Fran
2. **Trigger dispara** `sync_shared_transaction()`
3. **Função busca membros** com `linked_user_id` preenchido
4. **Se Fran não tem `linked_user_id`**, nenhum espelho é criado
5. **Resultado**: Fran não vê a transação na página "Compartilhados"

### Por Que Isso Acontece?

O campo `linked_user_id` em `family_members` é usado para vincular um membro da família a uma conta de usuário real no sistema. Existem dois cenários:

**Cenário A - Membro com conta no sistema:**
- `user_id`: ID do usuário que adicionou o membro
- `linked_user_id`: ID da conta do próprio membro
- ✅ Recebe espelhos de transações compartilhadas

**Cenário B - Membro sem conta no sistema:**
- `user_id`: ID do usuário que adicionou o membro
- `linked_user_id`: NULL
- ❌ NÃO recebe espelhos de transações compartilhadas

## 🎯 Solução

Precisamos verificar e corrigir o `linked_user_id` dos membros da família. Existem duas abordagens:

### Opção 1: Verificar e Corrigir Manualmente (Recomendado)

Execute esta query no Supabase SQL Editor para verificar o estado atual:

```sql
-- Ver todos os membros da família e seus vínculos
SELECT 
  fm.id,
  fm.name,
  fm.email,
  fm.user_id as "adicionado_por",
  fm.linked_user_id as "conta_vinculada",
  p.email as "email_da_conta",
  CASE 
    WHEN fm.linked_user_id IS NOT NULL THEN '✅ Vinculado'
    ELSE '❌ Não vinculado'
  END as status
FROM family_members fm
LEFT JOIN profiles p ON p.id = fm.linked_user_id
ORDER BY fm.created_at DESC;
```

Se Fran aparecer como "❌ Não vinculado", execute:

```sql
-- Corrigir linked_user_id de Fran
UPDATE family_members
SET linked_user_id = (
  SELECT id FROM profiles WHERE email = 'francy.von@gmail.com'
)
WHERE email = 'francy.von@gmail.com'
AND linked_user_id IS NULL;

-- Verificar se foi corrigido
SELECT 
  name,
  email,
  linked_user_id,
  CASE 
    WHEN linked_user_id IS NOT NULL THEN '✅ OK'
    ELSE '❌ Ainda NULL'
  END as status
FROM family_members
WHERE email = 'francy.von@gmail.com';
```

### Opção 2: Corrigir Automaticamente com Trigger

Criar um trigger que automaticamente preenche `linked_user_id` quando um membro é adicionado:

```sql
-- Função para auto-vincular membros
CREATE OR REPLACE FUNCTION auto_link_family_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Se email foi fornecido e linked_user_id está NULL
  IF NEW.email IS NOT NULL AND NEW.linked_user_id IS NULL THEN
    -- Buscar usuário com este email
    SELECT id INTO v_user_id
    FROM profiles
    WHERE email = NEW.email
    LIMIT 1;
    
    -- Se encontrou, vincular
    IF v_user_id IS NOT NULL THEN
      NEW.linked_user_id := v_user_id;
      RAISE NOTICE 'Auto-vinculado membro % ao usuário %', NEW.name, v_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_auto_link_family_member ON family_members;
CREATE TRIGGER trg_auto_link_family_member
  BEFORE INSERT OR UPDATE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_family_member();
```

### Opção 3: Sincronizar Transações Pendentes

Depois de corrigir o `linked_user_id`, sincronizar transações que já foram criadas:

```sql
-- Função para re-sincronizar transações compartilhadas
CREATE OR REPLACE FUNCTION resync_shared_transactions_for_member(p_member_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Para cada transação compartilhada onde este membro tem split
  FOR v_transaction_id IN
    SELECT DISTINCT ts.transaction_id
    FROM transaction_splits ts
    JOIN transactions t ON t.id = ts.transaction_id
    WHERE ts.member_id = p_member_id
    AND t.is_shared = true
    AND t.source_transaction_id IS NULL
  LOOP
    -- Re-sincronizar
    PERFORM sync_shared_transaction(v_transaction_id);
    RAISE NOTICE 'Re-sincronizada transação %', v_transaction_id;
  END LOOP;
END;
$$;

-- Executar para Fran (substitua pelo ID correto)
SELECT resync_shared_transactions_for_member('id-do-membro-fran');
```

## 📝 Passo a Passo para Resolver

### 1. Verificar Estado Atual

```sql
-- Ver membros e seus vínculos
SELECT 
  fm.name,
  fm.email,
  fm.linked_user_id,
  p.email as conta_email
FROM family_members fm
LEFT JOIN profiles p ON p.id = fm.linked_user_id;
```

### 2. Corrigir linked_user_id

```sql
-- Para cada membro sem linked_user_id que tem conta no sistema
UPDATE family_members fm
SET linked_user_id = p.id
FROM profiles p
WHERE fm.email = p.email
AND fm.linked_user_id IS NULL;
```

### 3. Re-sincronizar Transações

```sql
-- Re-sincronizar todas as transações compartilhadas
DO $$
DECLARE
  v_tx_id UUID;
BEGIN
  FOR v_tx_id IN
    SELECT id FROM transactions 
    WHERE is_shared = true 
    AND source_transaction_id IS NULL
  LOOP
    PERFORM sync_shared_transaction(v_tx_id);
  END LOOP;
END $$;
```

### 4. Verificar Resultado

```sql
-- Ver espelhos criados
SELECT 
  t.description,
  t.amount,
  p.email as "para_usuario",
  t.source_transaction_id as "transacao_original"
FROM transactions t
JOIN profiles p ON p.id = t.user_id
WHERE t.source_transaction_id IS NOT NULL
ORDER BY t.created_at DESC;
```

## 🧪 Como Testar

### 1. Antes da Correção

```sql
-- Ver estado atual
SELECT 
  'Membros sem linked_user_id' as tipo,
  COUNT(*) as quantidade
FROM family_members
WHERE linked_user_id IS NULL
UNION ALL
SELECT 
  'Transações compartilhadas sem espelhos' as tipo,
  COUNT(DISTINCT t.id) as quantidade
FROM transactions t
JOIN transaction_splits ts ON ts.transaction_id = t.id
LEFT JOIN transactions m ON m.source_transaction_id = t.id
WHERE t.is_shared = true
AND t.source_transaction_id IS NULL
AND m.id IS NULL;
```

### 2. Aplicar Correção

Execute os scripts SQL acima.

### 3. Depois da Correção

```sql
-- Verificar se foi corrigido
SELECT 
  'Membros sem linked_user_id' as tipo,
  COUNT(*) as quantidade
FROM family_members
WHERE linked_user_id IS NULL
UNION ALL
SELECT 
  'Transações compartilhadas sem espelhos' as tipo,
  COUNT(DISTINCT t.id) as quantidade
FROM transactions t
JOIN transaction_splits ts ON ts.transaction_id = t.id
LEFT JOIN transactions m ON m.source_transaction_id = t.id
WHERE t.is_shared = true
AND t.source_transaction_id IS NULL
AND m.id IS NULL;
```

**Resultado esperado**: Ambos devem ser 0.

### 4. Testar na Interface

1. **Login como Wesley**
2. **Criar nova transação compartilhada** com Fran
3. **Verificar no banco**:
   ```sql
   -- Ver última transação e seus espelhos
   SELECT 
     t.description,
     t.amount,
     p.email,
     CASE 
       WHEN t.source_transaction_id IS NULL THEN 'ORIGINAL'
       ELSE 'ESPELHO'
     END as tipo
   FROM transactions t
   JOIN profiles p ON p.id = t.user_id
   WHERE t.is_shared = true
   ORDER BY t.created_at DESC
   LIMIT 5;
   ```
4. **Login como Fran**
5. **Ir em "Compartilhados"**
6. **Verificar se a transação aparece**

## 🎯 Resultado Esperado

Após aplicar a correção:

✅ Fran tem `linked_user_id` preenchido  
✅ Transações compartilhadas criam espelhos para Fran  
✅ Fran vê transações na página "Compartilhados"  
✅ Saldo é calculado corretamente  
✅ Pode acertar contas normalmente  

## 📊 Queries Úteis para Debug

### Ver Fluxo Completo de Uma Transação

```sql
-- Substitua 'transaction-id' pelo ID real
WITH RECURSIVE tx_tree AS (
  -- Transação original
  SELECT 
    t.*,
    0 as nivel,
    'ORIGINAL' as tipo
  FROM transactions t
  WHERE t.id = 'transaction-id'
  
  UNION ALL
  
  -- Espelhos
  SELECT 
    t.*,
    tt.nivel + 1,
    'ESPELHO' as tipo
  FROM transactions t
  JOIN tx_tree tt ON t.source_transaction_id = tt.id
)
SELECT 
  tipo,
  description,
  amount,
  (SELECT email FROM profiles WHERE id = user_id) as usuario,
  created_at
FROM tx_tree
ORDER BY nivel, created_at;
```

### Ver Splits de Uma Transação

```sql
SELECT 
  ts.member_id,
  fm.name as membro,
  fm.email,
  fm.linked_user_id,
  ts.percentage,
  ts.amount,
  ts.is_settled,
  CASE 
    WHEN fm.linked_user_id IS NOT NULL THEN '✅ Vai receber espelho'
    ELSE '❌ NÃO vai receber espelho'
  END as status_espelho
FROM transaction_splits ts
JOIN family_members fm ON fm.id = ts.member_id
WHERE ts.transaction_id = 'transaction-id';
```

## 🚨 Importante

- **Sempre faça backup** antes de executar UPDATE em produção
- **Teste em ambiente de desenvolvimento** primeiro
- **Verifique os resultados** com as queries de verificação
- **Monitore os logs** do Supabase para erros

---

**Data**: 26/12/2024  
**Status**: 🔄 Aguardando aplicação  
**Prioridade**: 🔴 CRÍTICA (funcionalidade principal quebrada)
