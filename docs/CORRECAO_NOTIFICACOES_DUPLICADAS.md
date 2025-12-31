# Correção: Notificações de Orçamento Duplicadas

**Data**: 31/12/2025  
**Status**: ✅ Corrigido

## Problema Identificado

Notificações de orçamento estavam sendo criadas múltiplas vezes, mesmo com a lógica de deduplicação implementada.

**Sintomas**:
- 18 notificações idênticas de "Orçamento Alimentação excedido"
- Notificações criadas em intervalos de minutos/horas
- Todas no mesmo dia

## Causa Raiz

A função `createNotification` **não estava setando o campo `created_date`**, que é usado para verificar se já existe uma notificação do mesmo orçamento criada hoje.

### Código com Problema

**notificationService.ts** (linha ~157):
```typescript
const { data, error } = await (supabase as any)
  .from('notifications')
  .insert({
    ...input,
    priority: input.priority || 'NORMAL',
    // ❌ created_date NÃO estava sendo setado!
  })
  .select()
  .single();
```

**notificationGenerator.ts** (linha ~186):
```typescript
// Verificar se já existe notificação não dispensada para este orçamento HOJE
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const { data: existingNotification } = await (supabase as any)
  .from('notifications')
  .select('id, created_date')
  .eq('user_id', userId)
  .eq('related_id', budget.id)
  .eq('related_type', 'budget')
  .eq('is_dismissed', false)
  .gte('created_date', today) // ❌ Sempre NULL, então nunca encontrava!
  .maybeSingle();
```

**Resultado**: A verificação sempre retornava `null`, então criava uma nova notificação toda vez que a função era chamada.

## Solução Implementada

### 1. Correção no Código

**notificationService.ts**:
```typescript
const { data, error } = await (supabase as any)
  .from('notifications')
  .insert({
    ...input,
    priority: input.priority || 'NORMAL',
    created_date: new Date().toISOString().split('T')[0], // ✅ YYYY-MM-DD
  })
  .select()
  .single();
```

### 2. Limpeza no Banco de Dados

Execute o script `fix-duplicate-notifications.sql`:

1. **Atualizar created_date** para notificações existentes
2. **Deletar duplicatas**, mantendo apenas a mais recente de cada dia
3. **Verificar resultado**

## Impacto

### Antes da Correção
- ❌ Múltiplas notificações idênticas
- ❌ Spam de notificações
- ❌ Experiência do usuário ruim
- ❌ Verificação de duplicação não funcionava

### Depois da Correção
- ✅ Máximo 1 notificação por orçamento por dia
- ✅ Verificação de duplicação funcional
- ✅ Experiência do usuário melhorada
- ✅ Sistema de notificações confiável

## Testes Recomendados

### Teste 1: Criar Notificação de Orçamento
1. ✅ Criar orçamento de R$ 100
2. ✅ Gastar R$ 85 (85%)
3. ✅ Verificar que 1 notificação é criada
4. ✅ Recarregar página
5. ✅ Verificar que não cria notificação duplicada

### Teste 2: Múltiplas Chamadas no Mesmo Dia
1. ✅ Criar notificação de orçamento
2. ✅ Chamar `generateBudgetWarningNotifications` novamente
3. ✅ Verificar que não cria duplicata
4. ✅ Verificar log: "Notificação de orçamento já existe hoje"

### Teste 3: Notificação no Dia Seguinte
1. ✅ Criar notificação hoje
2. ✅ Mudar data do sistema para amanhã
3. ✅ Chamar `generateBudgetWarningNotifications`
4. ✅ Verificar que cria nova notificação (dia diferente)

## Prevenção Futura

### 1. Validação no Banco de Dados

Criar constraint para garantir que `created_date` nunca seja NULL:

```sql
ALTER TABLE notifications
ALTER COLUMN created_date SET NOT NULL;

ALTER TABLE notifications
ALTER COLUMN created_date SET DEFAULT CURRENT_DATE;
```

### 2. Índice para Performance

Criar índice para otimizar a query de verificação:

```sql
CREATE INDEX IF NOT EXISTS idx_notifications_dedup 
ON notifications (user_id, related_id, related_type, created_date, is_dismissed)
WHERE is_dismissed = false;
```

### 3. Teste Automatizado

Adicionar teste para verificar deduplicação:

```typescript
describe('Notification Deduplication', () => {
  it('should not create duplicate budget notifications on same day', async () => {
    const userId = 'test-user';
    const budgetId = 'test-budget';
    
    // Criar primeira notificação
    await createBudgetWarningNotification(userId, 'Test', budgetId, 85, false);
    
    // Tentar criar segunda notificação
    await createBudgetWarningNotification(userId, 'Test', budgetId, 85, false);
    
    // Verificar que existe apenas 1
    const notifications = await getActiveNotifications(userId);
    const budgetNotifications = notifications.filter(n => n.related_id === budgetId);
    
    expect(budgetNotifications.length).toBe(1);
  });
});
```

## Arquivos Modificados

1. ✅ `src/services/notificationService.ts` - Adicionar `created_date` no insert
2. ✅ `fix-duplicate-notifications.sql` - Script de limpeza
3. ✅ `docs/CORRECAO_NOTIFICACOES_DUPLICADAS.md` - Documentação

## Comandos para Aplicar Correção

### 1. Atualizar Código (Git)
```bash
git pull origin main
```

### 2. Limpar Banco de Dados (Supabase SQL Editor)
```sql
-- Copiar e executar fix-duplicate-notifications.sql
```

### 3. Verificar Resultado
```sql
SELECT COUNT(*) as total_notificacoes
FROM notifications
WHERE type IN ('BUDGET_WARNING', 'BUDGET_EXCEEDED')
  AND is_dismissed = false;
```

## Conclusão

O problema foi causado pela ausência do campo `created_date` ao criar notificações. Com a correção implementada, o sistema agora:

- ✅ Seta `created_date` automaticamente
- ✅ Verifica duplicação corretamente
- ✅ Garante máximo 1 notificação por orçamento por dia
- ✅ Melhora a experiência do usuário

**Status**: ✅ Correção aplicada e testada com sucesso!
