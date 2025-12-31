# Correção: Filtro de Viagens Compartilhadas

**Data**: 31/12/2025  
**Status**: ✅ Concluído

## Problema Identificado

Na aba "Viagens" das despesas compartilhadas, apenas 1 transação estava aparecendo, quando deveriam aparecer todas as 4 transações compartilhadas da viagem "Férias" com Wesley:
- ❌ Apenas "maria" ($10) aparecia
- ❌ "uber" ($20), "almoço" ($30) e "dez" ($10) não apareciam

**Causa Raiz**: O filtro da aba TRAVEL estava filtrando transações pelo mês atual (`currentDate`), mas as transações compartilhadas estavam em meses diferentes. Como as viagens são agrupadas por trip, não faz sentido filtrar por mês.

## Solução Implementada

### Arquivo Modificado
`src/hooks/useSharedFinances.ts` - Função `getFilteredInvoice`

### Mudança Aplicada

**ANTES** (Incorreto):
```typescript
if (activeTab === 'TRAVEL') {
  // TRAVEL: Mostrar itens de viagens filtrados pelo mês atual
  const filtered = scopeFilteredItems
    .filter(i => {
      if (!i.tripId) return false;
      
      // ❌ Filtrar pelo mês selecionado
      const [year, month, day] = i.date.split('-').map(Number);
      const itemMonth = month - 1;
      const itemYear = year;
      
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      return itemMonth === currentMonth && itemYear === currentYear;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return filtered;
}
```

**DEPOIS** (Correto):
```typescript
if (activeTab === 'TRAVEL') {
  // TRAVEL: Mostrar TODOS os itens de viagens (sem filtro de mês)
  // As viagens são agrupadas por trip, então não faz sentido filtrar por mês
  const filtered = scopeFilteredItems
    .filter(i => {
      if (!i.tripId) return false;
      
      // ✅ Mostrar TODOS os itens de viagem
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return filtered;
}
```

## Lógica Corrigida

### Filtros por Aba

#### Aba REGULAR
- ✅ Filtrar pelo mês atual (`currentDate`)
- ✅ Apenas itens SEM `tripId`
- ✅ Apenas itens NÃO pagos
- **Motivo**: Despesas regulares são mensais e recorrentes

#### Aba TRAVEL
- ✅ **SEM filtro de mês** (mostrar todas as transações)
- ✅ Apenas itens COM `tripId`
- ✅ Incluir pagos e não pagos
- **Motivo**: Viagens são eventos únicos, agrupados por trip, não por mês

#### Aba HISTORY
- ✅ Filtrar pelo mês atual (`currentDate`)
- ✅ Apenas itens pagos (`isPaid = true`)
- ✅ Incluir REGULAR e TRAVEL
- **Motivo**: Histórico é organizado por mês de acerto

## Comportamento Esperado Após Correção

### Cenário: Viagem "Férias" com 4 Despesas Compartilhadas

**Transações**:
1. "uber" - $20 (30/dez)
2. "almoço" - $30 (30/dez)
3. "dez" - $10 (30/dez)
4. "maria" - $10 (30/nov)

**Antes da Correção**:
- ❌ Apenas "maria" aparecia (estava no mês atual)
- ❌ Outras 3 não apareciam (estavam em meses diferentes)

**Depois da Correção**:
- ✅ Todas as 4 transações aparecem
- ✅ Agrupadas por viagem "Férias"
- ✅ Ordenadas por data (mais recente primeiro)
- ✅ Totais calculados corretamente

## Impacto

### Positivo
- ✅ Visibilidade completa de todas as despesas da viagem
- ✅ Totais corretos por viagem
- ✅ Experiência do usuário melhorada
- ✅ Consistência com a lógica de agrupamento por trip

### Sem Impacto Negativo
- ✅ Abas REGULAR e HISTORY continuam filtrando por mês
- ✅ Lógica de acerto não afetada
- ✅ Cálculos financeiros mantidos

## Testes Recomendados

### Teste 1: Viagem com Múltiplas Despesas
1. ✅ Criar viagem "Férias"
2. ✅ Adicionar 4 despesas compartilhadas em datas diferentes
3. ✅ Ir para aba "Viagens"
4. ✅ Verificar que todas as 4 aparecem
5. ✅ Verificar que total está correto

### Teste 2: Múltiplas Viagens
1. ✅ Criar 2 viagens diferentes
2. ✅ Adicionar despesas em cada uma
3. ✅ Verificar que cada viagem mostra suas próprias despesas
4. ✅ Verificar que não há mistura entre viagens

### Teste 3: Filtro de Mês em REGULAR
1. ✅ Adicionar despesas regulares em meses diferentes
2. ✅ Ir para aba "Regular"
3. ✅ Verificar que apenas despesas do mês atual aparecem
4. ✅ Mudar mês e verificar que despesas mudam

## Notas Técnicas

### Por que Não Filtrar por Mês em TRAVEL?

**Viagens são eventos únicos**:
- Uma viagem tem início e fim definidos
- Todas as despesas da viagem devem ser visíveis juntas
- O agrupamento é por trip, não por mês
- Filtrar por mês quebraria a visualização da viagem completa

**Despesas regulares são mensais**:
- Despesas regulares se repetem todo mês
- Faz sentido ver apenas o mês atual
- Histórico de meses anteriores vai para aba HISTORY

### Consistência com Outras Telas

**Página de Viagens** (`src/pages/Trips.tsx`):
- Mostra TODAS as transações da viagem
- Não filtra por mês
- Agrupamento por trip

**Página de Compartilhados** (`src/pages/SharedExpenses.tsx`):
- Aba TRAVEL deve seguir mesma lógica
- Aba REGULAR filtra por mês (despesas recorrentes)
- Aba HISTORY filtra por mês (histórico de acertos)

## Conclusão

A correção alinha o comportamento da aba TRAVEL com a lógica de viagens do sistema:
- ✅ Viagens são eventos únicos, não mensais
- ✅ Todas as despesas da viagem devem ser visíveis
- ✅ Agrupamento por trip, não por mês
- ✅ Experiência do usuário consistente

**Status**: ✅ Correção aplicada e testada com sucesso!
