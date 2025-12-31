# Correção: Notificações Duplicadas e Seletor de Mês

**Data**: 31/12/2024  
**Status**: ✅ Concluído

## Problema Reportado

1. **Notificações de orçamento duplicadas**: Usuário reportou que notificações de orçamento apareceram 12 vezes (duplicadas)
2. **Seletor de mês na página de fatura**: O seletor de mês deve desaparecer ao entrar na página de cartões de crédito, pois o usuário deve seguir o seletor do ciclo da fatura

## Solução Implementada

### 1. Deduplicação de Notificações de Orçamento

**Arquivo**: `src/services/notificationGenerator.ts`

**Mudança**: Adicionada verificação antes de criar notificação de orçamento para evitar duplicatas.

```typescript
// Verificar se já existe notificação não dispensada para este orçamento
const { data: existingNotification } = await (supabase as any)
  .from('notifications')
  .select('id')
  .eq('user_id', userId)
  .eq('related_id', budget.id)
  .eq('related_type', 'budget')
  .eq('is_dismissed', false)
  .maybeSingle();

// Se já existe notificação ativa, pular
if (existingNotification) {
  continue;
}
```

**Lógica**:
- Antes de criar uma notificação de orçamento, verifica se já existe uma notificação ativa (não dispensada) para o mesmo orçamento
- Se existir, pula a criação da nova notificação
- Isso previne que múltiplas notificações sejam criadas para o mesmo orçamento

**Nota**: A função `createNotification` em `notificationService.ts` já tinha uma verificação similar, mas era genérica. Esta verificação específica garante que notificações de orçamento nunca sejam duplicadas.

### 2. Ocultar Seletor de Mês na Página de Cartões

**Arquivo**: `src/components/layout/AppLayout.tsx`

**Mudança**: Adicionada condição para ocultar o seletor de mês quando o usuário está na página de cartões de crédito.

```typescript
{/* Hide month selector on credit cards page (uses invoice cycle selector instead) */}
{location.pathname !== '/cartoes' && (
  <div className="border-t border-border bg-background">
    {/* MonthSelector component */}
  </div>
)}
```

**Comportamento**:
- ✅ Seletor de mês **oculto** na página `/cartoes`
- ✅ Seletor de mês **visível** em todas as outras páginas
- ✅ Usuário segue o seletor de ciclo da fatura na página de cartões
- ✅ Seletor de mês reaparece automaticamente ao sair da página de cartões

## Arquivos Modificados

1. `src/services/notificationGenerator.ts` - Deduplicação de notificações de orçamento
2. `src/components/layout/AppLayout.tsx` - Ocultação condicional do seletor de mês

## Testes Recomendados

### Notificações de Orçamento
1. ✅ Criar um orçamento que esteja acima do limite de alerta (ex: 80%)
2. ✅ Aguardar geração automática de notificações
3. ✅ Verificar que apenas UMA notificação é criada por orçamento
4. ✅ Verificar que notificação não é recriada enquanto não for dispensada
5. ✅ Dispensar notificação e verificar que nova pode ser criada

### Seletor de Mês
1. ✅ Navegar para página inicial - seletor deve estar visível
2. ✅ Navegar para `/cartoes` - seletor deve desaparecer
3. ✅ Navegar de volta para qualquer outra página - seletor deve reaparecer
4. ✅ Verificar que o seletor de ciclo da fatura funciona corretamente na página de cartões

## Impacto

- **Positivo**: Elimina notificações duplicadas que poluem a interface
- **Positivo**: Melhora UX na página de cartões ao remover seletor conflitante
- **Positivo**: Usuário segue o ciclo correto da fatura sem confusão
- **Sem impacto negativo**: Mudanças são apenas melhorias de UX

## Notas Técnicas

- A verificação de duplicatas usa `related_id` e `related_type` para identificar notificações relacionadas ao mesmo orçamento
- O campo `is_dismissed` garante que notificações antigas (já dispensadas) não bloqueiem novas notificações
- A ocultação do seletor de mês é baseada em `location.pathname`, que é reativo e atualiza automaticamente
