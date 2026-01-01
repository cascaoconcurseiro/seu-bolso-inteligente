# Integração: Viagem ↔ Compartilhados - 31/12/2024

## Resumo
Integração bidirecional entre página de Viagens e Compartilhados > Viagem, sincronizando saldos e acertos.

## Objetivo

Criar sincronização automática onde:
1. **Saldos de participantes** na viagem vêm de Compartilhados
2. **Acertos feitos** em Compartilhados atualizam saldos na viagem
3. **Orçamento da viagem** é ajustado quando acertos são feitos

## Fluxo Completo

### Cenário Exemplo:
```
1. Wesley cria viagem "Ferias" com orçamento $ 100,00
2. Wesley adiciona Fran como participante
3. Wesley gasta $ 10,00 (compartilhado 50/50)
4. Sistema cria:
   - Transação: $ 10,00 (Wesley pagou)
   - Split: $ 5,00 (Fran deve para Wesley)
5. Saldos:
   - Wesley: +$ 5,00 (Fran deve para ele)
   - Fran: -$ 5,00 (deve para Wesley)
6. Fran vai em Compartilhados > Viagem
7. Fran acerta pagando $ 5,00
8. Saldos zerados:
   - Wesley: $ 0,00
   - Fran: $ 0,00
9. Orçamento ajustado: $ 95,00 ($ 100 - $ 10 gasto + $ 5 acertado)
```

## Implementação

### 1. Integração com useSharedFinances ✅

**Arquivo**: `src/pages/Trips.tsx`

**Mudança**: Adicionar hook useSharedFinances para buscar saldos reais

```typescript
// INTEGRAÇÃO COM COMPARTILHADOS: Buscar saldos de viagem
const { invoices: sharedInvoices, getFilteredInvoice, getTotals } = useSharedFinances({
  currentDate: new Date(),
  activeTab: 'TRAVEL',
});
```

### 2. Cálculo de Balances Usando Compartilhados ✅

**Arquivo**: `src/pages/Trips.tsx`

**Mudança**: Substituir cálculo manual por dados de compartilhados

**Antes**:
```typescript
const calculateBalances = () => {
  // Cálculo manual: soma transações, divide por participantes
  const perPerson = totalExpenses / participants.length;
  const paid = // soma o que cada um pagou
  return { paid, owes: perPerson, balance: paid - perPerson };
};
```

**Depois**:
```typescript
const calculateBalances = () => {
  return participants.map((p) => {
    // Buscar membro da família
    const familyMember = familyMembers.find(fm => fm.linked_user_id === p.user_id);
    
    // Buscar itens compartilhados desta viagem
    const memberItems = getFilteredInvoice(familyMember.id)
      .filter(item => item.tripId === selectedTripId);
    
    const totals = getTotals(memberItems);
    
    // CREDIT = eu paguei (outros devem para mim)
    const paid = memberItems
      .filter(i => i.type === 'CREDIT')
      .reduce((sum, i) => sum + i.amount, 0);
    
    // DEBIT = eu devo (não paguei minha parte)
    const owes = memberItems
      .filter(i => i.type === 'DEBIT')
      .reduce((sum, i) => sum + i.amount, 0);
    
    // Saldo líquido (já considera acertos)
    const balance = totals[currency]?.net || 0;
    
    return { participantId: p.user_id, name: p.name, paid, owes, balance };
  });
};
```

### 3. Sincronização Automática

**Como funciona**:

1. **Transação compartilhada criada** → Aparece em ambos os lugares
   - Viagem: Lista de despesas
   - Compartilhados: Aba TRAVEL

2. **Acerto marcado** em Compartilhados → Saldo atualizado automaticamente
   - `settled_by_debtor` ou `settled_by_creditor` = true
   - `isPaid` = true
   - Balance recalculado

3. **Viagem busca dados** → Sempre atualizado
   - `useSharedFinances` busca splits atualizados
   - `calculateBalances` usa dados reais
   - Cards mostram saldos corretos

## Benefícios

### 1. Fonte Única de Verdade
- Saldos vêm de `transaction_splits` (banco de dados)
- Não há cálculos duplicados
- Sempre sincronizado

### 2. Acertos Automáticos
- Marcar acerto em Compartilhados → Viagem atualiza
- Não precisa marcar em dois lugares
- Sem inconsistências

### 3. Orçamento Dinâmico
- Orçamento considera acertos
- Valor disponível aumenta quando dívidas são pagas
- Visão real do que pode gastar

## Arquivos Modificados

1. ✅ `src/pages/Trips.tsx` - Integração com useSharedFinances
2. ✅ `src/hooks/useSharedFinances.ts` - Já existente, sem mudanças

## Verificação

### Teste 1: Saldos Sincronizados
1. Abrir viagem "Ferias"
2. Ver saldo de Wesley: +$ 5,00 (ou o valor correto)
3. Ir em Compartilhados > Viagem
4. Ver mesmo saldo: +$ 5,00
5. ✅ Valores devem ser idênticos

### Teste 2: Acerto Atualiza Viagem
1. Em Compartilhados > Viagem
2. Marcar acerto de $ 5,00
3. Voltar para Viagem "Ferias"
4. Ver saldo zerado: $ 0,00
5. ✅ Atualização automática

### Teste 3: Múltiplas Moedas
1. Criar viagem em USD
2. Fazer despesas compartilhadas
3. Verificar que saldos são em USD
4. Acertar em USD
5. ✅ Moeda correta em todos os lugares

## Próximos Passos

### Fase 2: Ajuste de Orçamento (Futuro)
Quando acerto é feito, ajustar orçamento da viagem:

```typescript
// Quando split é marcado como settled
const adjustTripBudget = async (tripId: string, settledAmount: number) => {
  // Buscar orçamento atual
  const { data: trip } = await supabase
    .from('trips')
    .select('budget')
    .eq('id', tripId)
    .single();
  
  // Aumentar orçamento disponível
  const newBudget = (trip.budget || 0) + settledAmount;
  
  // Atualizar
  await supabase
    .from('trips')
    .update({ budget: newBudget })
    .eq('id', tripId);
};
```

**Lógica**:
- Acerto de dívida = dinheiro "volta" para o orçamento
- Exemplo: Orçamento $ 100, gastou $ 10, acertou $ 5 → Disponível $ 95

## Status

✅ Integração básica implementada
✅ Saldos sincronizados
✅ Acertos refletem automaticamente
✅ Função get_trip_financial_summary atualizada com total_settled
✅ Trigger criado para monitorar acertos
✅ View trip_budget_summary criada

## Implementação Completa

### 1. Banco de Dados ✅

**Arquivos**:
- `supabase/migrations/20251231200000_add_trip_budget_adjustment_trigger.sql`
- `supabase/migrations/20251231201000_update_trip_financial_summary_with_settlements.sql`

**Mudanças**:
1. Trigger `adjust_trip_budget_on_settlement` - Monitora quando splits são marcados como pagos
2. View `trip_budget_summary` - Calcula resumo completo incluindo acertos
3. Function `get_trip_financial_summary` - Retorna dados incluindo `total_settled`

### 2. TypeScript ✅

**Arquivo**: `src/hooks/useTrips.ts`

**Mudança**: Interface atualizada

```typescript
export interface TripFinancialSummary {
  total_budget: number | null;
  total_spent: number;
  total_settled: number; // ✅ NOVO: Total de acertos feitos
  remaining: number;
  percentage_used: number;
  currency: string;
  participants_count: number;
  transactions_count: number;
}
```

### 3. Dados Disponíveis

Agora `tripFinancialSummary` retorna:
- `total_budget`: $ 500 (orçamento planejado)
- `total_spent`: $ 10 (total gasto)
- `total_settled`: $ 0 (acertos feitos) ← **NOVO**
- `remaining`: $ 490 (orçamento restante)
- `percentage_used`: 2% (percentual usado)

### 4. Como Usar na UI

```typescript
const { data: tripFinancialSummary } = useTripFinancialSummary(selectedTripId);

// Mostrar informações
<div>
  <p>Orçamento: {formatCurrency(tripFinancialSummary.total_budget)}</p>
  <p>Gasto: {formatCurrency(tripFinancialSummary.total_spent)}</p>
  <p>Acertado: {formatCurrency(tripFinancialSummary.total_settled)}</p>
  <p>Restante: {formatCurrency(tripFinancialSummary.remaining)}</p>
</div>
```

## Notas Técnicas

### Por que usar useSharedFinances?
- Já calcula saldos corretamente
- Considera acertos (isPaid)
- Separa por moeda
- Filtra por viagem (tripId)

### Fallback
Se membro não for encontrado em family_members:
- Usa cálculo manual (antigo)
- Garante que sempre funciona
- Evita erros

### Performance
- useSharedFinances já está em cache
- Não faz queries extras
- Reutiliza dados existentes
