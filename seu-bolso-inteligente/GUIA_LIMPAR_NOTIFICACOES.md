# Guia: Limpar Notificações Duplicadas

## Passo 1: Abrir Supabase SQL Editor

1. Acesse https://supabase.com
2. Entre no seu projeto
3. Clique em "SQL Editor" no menu lateral

## Passo 2: Executar Script de Limpeza

Copie e cole cada comando abaixo, um de cada vez:

### 2.1. Ver quantas duplicatas existem
```sql
SELECT 
  user_id,
  type,
  related_id,
  COUNT(*) as count,
  MIN(created_at) as primeira,
  MAX(created_at) as ultima
FROM notifications
WHERE 
  type IN ('BUDGET_WARNING', 'BUDGET_EXCEEDED')
  AND is_dismissed = false
GROUP BY user_id, type, related_id
HAVING COUNT(*) > 1
ORDER BY count DESC;
```

### 2.2. Atualizar created_date para notificações existentes
```sql
UPDATE notifications
SET created_date = DATE(created_at)
WHERE created_date IS NULL;
```

### 2.3. Deletar duplicatas (mantém apenas a mais recente de cada dia)
```sql
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, type, related_id, DATE(created_at)
      ORDER BY created_at DESC
    ) as rn
  FROM notifications
  WHERE 
    type IN ('BUDGET_WARNING', 'BUDGET_EXCEEDED')
    AND is_dismissed = false
)
DELETE FROM notifications
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
```

### 2.4. Verificar resultado
```sql
SELECT 
  type,
  title,
  created_at,
  created_date
FROM notifications
WHERE 
  type IN ('BUDGET_WARNING', 'BUDGET_EXCEEDED')
  AND is_dismissed = false
ORDER BY created_at DESC;
```

## Passo 3: Recarregar a Aplicação

1. Volte para a aplicação
2. Pressione F5 ou Ctrl+R para recarregar
3. Verifique que agora aparece apenas 1 notificação de orçamento

## Resultado Esperado

**Antes**:
- 18 notificações idênticas de "Orçamento Alimentação excedido"

**Depois**:
- 1 notificação de "Orçamento Alimentação excedido"

## Se Precisar Limpar TODAS as Notificações

Se quiser começar do zero:

```sql
-- CUIDADO: Isso deleta TODAS as notificações!
DELETE FROM notifications WHERE user_id = 'SEU_USER_ID';
```

Para encontrar seu user_id:
```sql
SELECT id, email FROM auth.users;
```

## Prevenção Futura

Após executar este script, o problema não deve mais ocorrer porque:
- ✅ Código corrigido para setar `created_date`
- ✅ Verificação de duplicação funcional
- ✅ Máximo 1 notificação por orçamento por dia

## Suporte

Se tiver problemas, verifique:
1. Você está no projeto correto do Supabase?
2. Você tem permissão para executar SQL?
3. A tabela `notifications` existe?

Para verificar a tabela:
```sql
SELECT * FROM notifications LIMIT 5;
```
