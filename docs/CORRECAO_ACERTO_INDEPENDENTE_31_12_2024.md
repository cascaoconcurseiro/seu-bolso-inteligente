# Correção: Acerto Independente para Devedor e Credor

**Data**: 31/12/2024  
**Problema**: Quando a Fran pagava sua dívida ao Wesley, o sistema marcava automaticamente como "pago" para ambos, mas cada pessoa deveria fazer seu próprio acerto escolhendo data e conta.

## Problema Identificado

### Cenário Atual (ERRADO)
1. Wesley cria transação "teste compartilhado" de R$ 100
2. Divide com Fran (R$ 50)
3. Fran paga sua parte → Sistema marca `is_settled = true` no split
4. **PROBLEMA**: Para o Wesley também aparece como pago automaticamente!

### Por Que Isso Acontecia?
Ambos (devedor e credor) compartilhavam o **MESMO split** com uma **ÚNICA flag** `is_settled`:
- **Fran** (devedora): Via como DÉBITO - `isPaid: split.is_settled`
- **Wesley** (credor): Via como CRÉDITO - `isPaid: split.is_settled`

Quando a Fran marcava como pago, o `split.is_settled = true` afetava ambos os lados!

## Solução Implementada

### 1. Novas Colunas no Banco de Dados

Adicionadas 4 novas colunas na tabela `transaction_splits`:

```sql
ALTER TABLE transaction_splits 
ADD COLUMN settled_by_debtor BOOLEAN DEFAULT FALSE,
ADD COLUMN settled_by_creditor BOOLEAN DEFAULT FALSE,
ADD COLUMN debtor_settlement_tx_id UUID REFERENCES transactions(id),
ADD COLUMN creditor_settlement_tx_id UUID REFERENCES transactions(id);
```

**Explicação**:
- `settled_by_debtor`: Indica se o devedor (quem deve) marcou como pago
- `settled_by_creditor`: Indica se o credor (quem recebe) marcou como recebido
- `debtor_settlement_tx_id`: ID da transação de acerto criada pelo devedor
- `creditor_settlement_tx_id`: ID da transação de acerto criada pelo credor

### 2. Atualização da Lógica de Exibição

**Arquivo**: `src/hooks/useSharedFinances.ts`

**Para CRÉDITO (me devem)**:
```typescript
isPaid: split.settled_by_creditor === true
```

**Para DÉBITO (eu devo)**:
```typescript
isPaid: split.settled_by_debtor === true
```

### 3. Atualização da Lógica de Acerto

**Arquivo**: `src/pages/SharedExpenses.tsx`

Quando o usuário clica em "Pagar" ou "Receber":

```typescript
const updateFields: any = {
  settled_at: new Date().toISOString(),
};

if (settleType === 'PAY') {
  // Devedor está pagando
  updateFields.settled_by_debtor = true;
  updateFields.debtor_settlement_tx_id = settlementTxId;
} else {
  // Credor está recebendo
  updateFields.settled_by_creditor = true;
  updateFields.creditor_settlement_tx_id = settlementTxId;
}

// Manter is_settled como true se ambos marcaram
if (settleType === 'PAY' && existingSplit.settled_by_creditor) {
  updateFields.is_settled = true;
} else if (settleType === 'RECEIVE' && existingSplit.settled_by_debtor) {
  updateFields.is_settled = true;
}
```

### 4. Migração de Dados Existentes

Todos os splits que já estavam marcados como `is_settled = true` foram migrados:

```sql
UPDATE transaction_splits
SET 
  settled_by_debtor = is_settled,
  settled_by_creditor = is_settled,
  debtor_settlement_tx_id = settled_transaction_id,
  creditor_settlement_tx_id = settled_transaction_id
WHERE is_settled = TRUE;
```

## Fluxo Correto Agora

### Cenário: Fran deve R$ 50 ao Wesley

#### 1. Estado Inicial
- **Fran** vê: "Wesley - DÉBITO - R$ 50,00" (pendente)
- **Wesley** vê: "Fran - CRÉDITO - R$ 50,00" (pendente)

#### 2. Fran Paga
- Fran clica em "Pagar"
- Escolhe a conta e data
- Sistema cria transação de DESPESA para Fran
- Sistema marca `settled_by_debtor = true`
- **Fran** vê: Item vai para o histórico (pago)
- **Wesley** vê: Item continua pendente (ainda não recebeu)

#### 3. Wesley Recebe
- Wesley clica em "Receber"
- Escolhe a conta e data
- Sistema cria transação de RECEITA para Wesley
- Sistema marca `settled_by_creditor = true`
- Sistema marca `is_settled = true` (ambos confirmaram)
- **Wesley** vê: Item vai para o histórico (recebido)

## Benefícios

✅ **Controle Independente**: Cada pessoa controla seu próprio acerto  
✅ **Escolha de Data**: Cada um escolhe a data real do pagamento/recebimento  
✅ **Escolha de Conta**: Cada um escolhe a conta que foi debitada/creditada  
✅ **Rastreabilidade**: Duas transações separadas para auditoria  
✅ **Flexibilidade**: Permite acertos parciais e em datas diferentes  

## Arquivos Modificados

1. **Migration**: `supabase/migrations/20251231160000_add_separate_settlement_flags.sql`
   - Adiciona novas colunas
   - Migra dados existentes

2. **Hook**: `src/hooks/useSharedFinances.ts`
   - Usa `settled_by_creditor` para CRÉDITO
   - Usa `settled_by_debtor` para DÉBITO

3. **Página**: `src/pages/SharedExpenses.tsx`
   - Atualiza lógica de `handleSettle`
   - Marca flag correta baseado no tipo de acerto
   - Verifica flag correta antes de atualizar

## Testes Recomendados

1. ✅ Fran paga → Item desaparece para Fran, continua para Wesley
2. ✅ Wesley recebe → Item desaparece para Wesley
3. ✅ Ambos marcam → `is_settled = true`
4. ✅ Cada um escolhe sua própria data e conta
5. ✅ Transações separadas são criadas para cada lado

## Conclusão

✅ **Problema resolvido!**

Agora cada pessoa tem controle independente sobre seus acertos. A Fran pode marcar como pago quando ela pagar, e o Wesley pode marcar como recebido quando ele receber, cada um escolhendo sua própria data e conta.
