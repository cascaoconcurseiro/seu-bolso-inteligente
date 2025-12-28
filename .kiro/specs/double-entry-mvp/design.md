# Design Document: Double Entry MVP

## Overview

Este documento descreve o design técnico para implementar as melhorias MVP no sistema financeiro pessoal, focando em partidas dobradas funcionais, desabilitação de conta quando pago por terceiros, e interligação correta de dados.

## Architecture

### Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  TransactionForm.tsx  │  Transactions.tsx  │  Dashboard.tsx │
│  SplitModal.tsx       │  SharedExpenses.tsx│  Accounts.tsx  │
├─────────────────────────────────────────────────────────────┤
│                     Hooks (React Query)                      │
│  useTransactions  │  useAccounts  │  useSharedFinances      │
├─────────────────────────────────────────────────────────────┤
│                      Services                                │
│  SafeFinancialCalculator  │  ledger.ts  │  validationService│
├─────────────────────────────────────────────────────────────┤
│                      Supabase                                │
│  transactions  │  accounts  │  transaction_splits           │
└─────────────────────────────────────────────────────────────┘
```

### Mudanças Propostas

1. **TransactionForm.tsx**: Adicionar lógica para esconder campo de conta quando `payerId !== 'me'`
2. **useTransactions.ts**: Filtrar transações pagas por outros na query principal
3. **Supabase Triggers**: Criar triggers para atualização automática de saldos
4. **SharedExpenses.tsx**: Exibir transações pagas por outros como débitos

## Components and Interfaces

### 1. TransactionForm - Modificações

```typescript
// Novo estado para controlar visibilidade da conta
const isPaidByOther = payerId !== 'me' && payerId !== '';

// Renderização condicional do campo de conta
{!isPaidByOther && (
  <div className="space-y-2">
    <Label>{isExpense ? 'Pagar com' : 'Receber em'}</Label>
    <Select value={accountId} onValueChange={setAccountId}>
      {/* ... opções de conta */}
    </Select>
  </div>
)}

{isPaidByOther && (
  <Alert className="bg-muted">
    <AlertDescription>
      💡 Despesa paga por {getPayerName(payerId)} - não afeta suas contas
    </AlertDescription>
  </Alert>
)}
```

### 2. useTransactions - Filtro de Pagador

```typescript
// Query modificada para excluir transações pagas por outros
let query = supabase
  .from("transactions")
  .select(`*`)
  .eq("user_id", user!.id)
  .or(`payer_id.is.null,payer_id.eq.${user!.id}`) // Apenas minhas ou sem pagador
  .is("source_transaction_id", null);
```

### 3. useSharedDebts - Novo Hook

```typescript
interface SharedDebt {
  personId: string;
  personName: string;
  totalOwed: number;      // Quanto devo a essa pessoa
  totalOwedToMe: number;  // Quanto essa pessoa me deve
  balance: number;        // Saldo (positivo = devo, negativo = me devem)
  transactions: Transaction[];
}

export function useSharedDebts() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["shared-debts", user?.id],
    queryFn: async () => {
      // Buscar transações onde outro pagou por mim
      const { data: paidByOthers } = await supabase
        .from("transactions")
        .select(`*, payer:family_members!payer_id(name)`)
        .eq("user_id", user!.id)
        .not("payer_id", "is", null)
        .neq("payer_id", user!.id);
      
      // Buscar transações onde eu paguei por outros (via splits)
      const { data: paidForOthers } = await supabase
        .from("transaction_splits")
        .select(`*, transaction:transactions(*)`)
        .eq("transaction.user_id", user!.id)
        .eq("transaction.payer_id", user!.id);
      
      // Calcular saldos por pessoa
      return calculateDebts(paidByOthers, paidForOthers);
    }
  });
}
```

### 4. Database Triggers para Saldos

```sql
-- Trigger para atualizar saldo após INSERT
CREATE OR REPLACE FUNCTION update_account_balance_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atualiza se tem account_id e não é pago por outro
  IF NEW.account_id IS NOT NULL AND 
     (NEW.payer_id IS NULL OR NEW.payer_id = NEW.user_id) THEN
    
    IF NEW.type = 'EXPENSE' THEN
      UPDATE accounts 
      SET balance = balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
      
    ELSIF NEW.type = 'INCOME' THEN
      UPDATE accounts 
      SET balance = balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
      
    ELSIF NEW.type = 'TRANSFER' THEN
      -- Debita origem
      UPDATE accounts 
      SET balance = balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
      
      -- Credita destino
      IF NEW.destination_account_id IS NOT NULL THEN
        UPDATE accounts 
        SET balance = balance + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.destination_account_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_balance_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_insert();

-- Trigger para reverter saldo após DELETE
CREATE OR REPLACE FUNCTION update_account_balance_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.account_id IS NOT NULL AND 
     (OLD.payer_id IS NULL OR OLD.payer_id = OLD.user_id) THEN
    
    IF OLD.type = 'EXPENSE' THEN
      UPDATE accounts 
      SET balance = balance + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_id;
      
    ELSIF OLD.type = 'INCOME' THEN
      UPDATE accounts 
      SET balance = balance - OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_id;
      
    ELSIF OLD.type = 'TRANSFER' THEN
      UPDATE accounts 
      SET balance = balance + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_id;
      
      IF OLD.destination_account_id IS NOT NULL THEN
        UPDATE accounts 
        SET balance = balance - OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.destination_account_id;
      END IF;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_balance_delete
AFTER DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_delete();
```

## Data Models

### Transaction (Campos Relevantes)

```typescript
interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;      // NULL quando pago por outro
  payer_id: string | null;        // ID do membro que pagou (null = eu paguei)
  amount: number;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  domain: 'PERSONAL' | 'SHARED' | 'TRAVEL';
  is_shared: boolean;
  // ...
}
```

### SharedDebt (Novo Modelo)

```typescript
interface SharedDebt {
  personId: string;
  personName: string;
  totalOwed: number;
  totalOwedToMe: number;
  balance: number;
  transactions: Transaction[];
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Conta Desabilitada Quando Outro Paga

*For any* transação onde `payer_id` é diferente do `user_id` atual, o campo `account_id` deve ser `null` e o campo de seleção de conta deve estar oculto na interface.

**Validates: Requirements 1.1, 1.2, 1.5, 1.6**

### Property 2: Transações Pagas por Outros Excluídas da Lista Principal

*For any* consulta à lista de transações na página Transações, nenhuma transação retornada deve ter `payer_id` diferente de `null` e diferente do `user_id` atual.

**Validates: Requirements 2.1, 2.7**

### Property 3: Débitos Compartilhados Calculados Corretamente

*For any* pessoa da família, o saldo devedor deve ser igual à soma de todas as transações onde essa pessoa pagou por mim, menos a soma de todas as transações onde eu paguei por ela.

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 4: Atualização de Saldo por Tipo de Transação

*For any* transação criada com `account_id` válido e `payer_id` igual a `null` ou `user_id`:
- Se `type = 'EXPENSE'`: saldo da conta deve diminuir pelo valor da transação
- Se `type = 'INCOME'`: saldo da conta deve aumentar pelo valor da transação
- Se `type = 'TRANSFER'`: saldo da origem diminui e destino aumenta pelo mesmo valor

**Validates: Requirements 3.1, 3.2, 3.3, 3.7**

### Property 5: Reversão de Saldo ao Excluir

*For any* transação excluída, o saldo da conta deve retornar ao valor anterior à criação da transação (round-trip).

**Validates: Requirements 3.4**

### Property 6: Transação Paga por Outro Não Afeta Saldo

*For any* transação onde `payer_id` é diferente de `null` e diferente de `user_id`, o saldo de todas as contas do usuário deve permanecer inalterado.

**Validates: Requirements 3.6**

### Property 7: Transação Pessoal Requer Conta

*For any* transação com `domain = 'PERSONAL'` e `payer_id` igual a `null` ou `user_id`, o campo `account_id` não pode ser `null`.

**Validates: Requirements 4.1, 4.2**

### Property 8: Integridade Contábil - Débitos Iguais a Créditos

*For any* conjunto de transações no ledger, a soma de todos os débitos deve ser igual à soma de todos os créditos.

**Validates: Requirements 4.3**

### Property 9: Trial Balance Fecha em Zero

*For any* trial balance gerado a partir do ledger, a soma de todos os saldos (débito - crédito) deve ser zero.

**Validates: Requirements 4.5**

### Property 10: Consistência de Saldos Entre Páginas

*For any* conta, o saldo exibido no Dashboard deve ser igual ao saldo exibido na página Contas, que deve ser igual à soma das transações dessa conta.

**Validates: Requirements 6.2, 6.3, 6.6**

### Property 11: Distribuição Precisa de Valores em Splits

*For any* transação com splits, a soma dos valores de todos os splits deve ser exatamente igual ao valor total da transação, sem diferença de centavos.

**Validates: Requirements 7.2, 7.6**

### Property 12: Distribuição Precisa de Parcelas

*For any* transação parcelada, a soma de todas as parcelas deve ser exatamente igual ao valor total original.

**Validates: Requirements 7.3**

### Property 13: Arredondamento Correto

*For any* operação de arredondamento, valores com fração >= 0.005 devem arredondar para cima (ROUND_HALF_UP).

**Validates: Requirements 7.4, 7.5**

## Error Handling

### Validações no Frontend

1. **Transação sem conta**: Se `domain = 'PERSONAL'` e `payer_id` é nulo/próprio usuário, exigir `account_id`
2. **Conta com outro pagador**: Se `payer_id` != usuário, forçar `account_id = null`
3. **Splits inválidos**: Validar que soma de percentagens = 100%

### Validações no Backend (Triggers)

1. **Constraint de integridade**: Impedir `account_id` não-nulo quando `payer_id` é de outro usuário
2. **Validação de conta ativa**: Verificar que conta existe e está ativa antes de atualizar saldo

## Testing Strategy

### Unit Tests

- Testar `SafeFinancialCalculator` para operações de arredondamento
- Testar lógica de cálculo de débitos compartilhados
- Testar validações de formulário

### Property-Based Tests

Usar **fast-check** para TypeScript com mínimo de 100 iterações por propriedade.

Cada teste deve ser anotado com:
```typescript
// Feature: double-entry-mvp, Property N: [descrição]
// Validates: Requirements X.Y
```

### Integration Tests

- Testar fluxo completo de criação de transação com atualização de saldo
- Testar exclusão de transação com reversão de saldo
- Testar consistência entre páginas após mutações

