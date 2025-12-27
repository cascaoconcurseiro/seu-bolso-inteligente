# 🚀 APLICAR SISTEMA COMPLETO - INSTRUÇÕES

## ⚠️ IMPORTANTE: LEIA ANTES DE APLICAR

Este script vai aplicar TODAS as funcionalidades faltantes de uma vez:
- ✅ Sistema de espelhamento automático
- ✅ Permissões baseadas em roles
- ✅ Campos de recorrência, lembrete, conversão de moeda e estorno
- ✅ Triggers automáticos
- ✅ RLS Policies completas

## 📋 PASSO A PASSO

### 1. Abrir o Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto: **vrrcagukyfnlhxuvnssp**
3. Vá em **SQL Editor** (menu lateral esquerdo)

### 2. Copiar o Script

Abra o arquivo: `scripts/apply-complete-system.sql`

**OU** copie o conteúdo abaixo:

```sql
-- Cole aqui o conteúdo do arquivo scripts/apply-complete-system.sql
```

### 3. Executar o Script

1. Cole o script completo no SQL Editor
2. Clique em **RUN** (ou pressione Ctrl+Enter)
3. Aguarde a execução (pode levar 10-30 segundos)
4. Verifique se apareceu: **"Sistema completo aplicado com sucesso!"**

### 4. Verificar se Funcionou

Execute este comando para verificar:

```sql
-- Verificar se os triggers foram criados
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%mirror%'
ORDER BY trigger_name;

-- Deve retornar 3 triggers:
-- 1. trigger_delete_mirror_on_split_delete
-- 2. trigger_mirror_shared_transaction
-- 3. trigger_update_mirrors_on_split_change
```

### 5. Testar o Sistema

Após aplicar, teste criando uma transação compartilhada:

1. Vá em **Transações** > **Nova transação**
2. Crie uma despesa
3. Clique em **Dividir**
4. Selecione membros da família
5. Salve

**Resultado esperado**:
- A transação deve ser criada
- Os espelhos devem ser criados automaticamente na tabela `shared_transaction_mirrors`
- Cada membro deve ver sua parte na página de Compartilhados

## 🔍 VERIFICAR ESPELHOS CRIADOS

Execute este comando para ver os espelhos:

```sql
SELECT 
  stm.id,
  stm.description,
  stm.amount,
  stm.percentage,
  fm.name as member_name,
  stm.sync_status,
  stm.is_settled
FROM shared_transaction_mirrors stm
JOIN family_members fm ON fm.id = stm.member_id
ORDER BY stm.created_at DESC
LIMIT 10;
```

## ❌ SE DER ERRO

### Erro: "relation already exists"
**Solução**: Ignore, significa que já foi aplicado antes.

### Erro: "permission denied"
**Solução**: Você precisa ser o owner do projeto no Supabase.

### Erro: "function does not exist"
**Solução**: Execute o script novamente do início.

### Erro: "constraint already exists"
**Solução**: Ignore, significa que já foi aplicado antes.

## 📊 O QUE ESTE SCRIPT FAZ

### 1. Adiciona Campos Faltantes
- `family_members.role` - Permissões (admin, editor, viewer)
- `family_members.avatar_url` - Foto do membro
- `transactions.creator_user_id` - Quem criou a transação
- `transactions.frequency` - Recorrência (DAILY, WEEKLY, MONTHLY, YEARLY)
- `transactions.recurrence_day` - Dia da recorrência
- `transactions.enable_notification` - Ativar lembrete
- `transactions.notification_date` - Data do lembrete
- `transactions.reminder_option` - Opção de antecedência
- `transactions.exchange_rate` - Taxa de câmbio
- `transactions.destination_amount` - Valor convertido
- `transactions.destination_currency` - Moeda de destino
- `transactions.is_refund` - Se é estorno
- `transactions.refund_of_transaction_id` - ID da transação estornada
- `accounts.is_international` - Se é conta internacional

### 2. Cria Triggers Automáticos
- **trigger_mirror_shared_transaction**: Cria espelhos quando transação é marcada como compartilhada
- **trigger_update_mirrors_on_split_change**: Atualiza espelhos quando splits mudam
- **trigger_delete_mirror_on_split_delete**: Remove espelhos quando splits são deletados

### 3. Cria RLS Policies
- Visualização baseada em role (admin, editor, viewer)
- Edição apenas para criador ou admin/editor
- Exclusão apenas para criador ou admin
- Proteção contra edição de mirrors

### 4. Cria Índices para Performance
- Índices em creator_user_id, frequency, is_refund, role, etc
- Índices em shared_transaction_mirrors para queries rápidas

### 5. Migra Dados Existentes
- Preenche creator_user_id com user_id para transações antigas
- Cria espelhos para transações compartilhadas existentes

## ✅ APÓS APLICAR

O sistema estará **100% funcional** com:
- ✅ Espelhamento automático funcionando
- ✅ Permissões baseadas em roles
- ✅ Edição/exclusão condicional
- ✅ Badges de "Criado por" e "Espelhada"
- ✅ Campos prontos para recorrência, lembrete, conversão e estorno

## 🎉 PRÓXIMOS PASSOS

Após aplicar o script, você pode:
1. Testar criando transações compartilhadas
2. Verificar se os espelhos aparecem na página de Compartilhados
3. Testar edição/exclusão baseada em permissões
4. Implementar as UIs faltantes (recorrência, lembrete, etc)

---

**Data**: 26/12/2024  
**Arquivo**: `scripts/apply-complete-system.sql`  
**Status**: Pronto para aplicar
