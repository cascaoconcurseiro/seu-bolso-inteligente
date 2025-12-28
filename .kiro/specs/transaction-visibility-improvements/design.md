# Design Document: Transaction Visibility Improvements

## Overview

Este documento descreve o design técnico para melhorar a visibilidade e gestão de transações no sistema financeiro pessoal. O objetivo é criar uma experiência similar a apps financeiros populares (Nubank, Mobills, Organizze), onde transações são exibidas de forma clara, agrupadas por dia, com controle total do usuário sobre edição, exclusão e gestão de parcelas.

## Architecture

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Transactions   │  │  AccountDetail  │  │  TransactionForm│  │
│  │  (Lista por dia)│  │  (Extrato)      │  │  (Criar/Editar) │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│  ┌────────┴────────────────────┴────────────────────┴────────┐  │
│  │                    Custom Hooks                            │  │
│  │  useTransactions, useAccountStatement, useInstallments     │  │
│  └────────────────────────────┬──────────────────────────────┘  │
├───────────────────────────────┼─────────────────────────────────┤
│                               │                                  │
│  ┌────────────────────────────┴──────────────────────────────┐  │
│  │                    Supabase Client                         │  │
│  └────────────────────────────┬──────────────────────────────┘  │
└───────────────────────────────┼─────────────────────────────────┘
                                │
┌───────────────────────────────┼─────────────────────────────────┐
│                        Backend (Supabase)                        │
├───────────────────────────────┼─────────────────────────────────┤
│  ┌────────────────────────────┴──────────────────────────────┐  │
│  │                    PostgreSQL Database                     │  │
│  │  transactions, accounts, transaction_splits, credit_cards  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Lista de Transações**: Query filtra por user_id, competence_date, exclui TRANSFER
2. **Extrato de Conta**: Query filtra por account_id, inclui TRANSFER
3. **Adiantamento de Parcelas**: Update em competence_date das parcelas selecionadas
4. **Exclusão em Série**: Delete com filtro por series_id

## Components and Interfaces

### 1. TransactionList Component

Componente principal para exibir transações agrupadas por dia.

```typescript
interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onViewDetails: (transaction: Transaction) => void;
}

interface DayGroup {
  date: string;           // YYYY-MM-DD
  label: string;          // "Hoje", "Ontem", "25 de dezembro"
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  balance: number;        // totalIncome - totalExpense
}

function groupTransactionsByDay(transactions: Transaction[]): DayGroup[] {
  // Agrupa transações por date
  // Calcula totais por dia
  // Ordena por data decrescente
}
```

### 2. AccountStatement Component

Componente para exibir extrato de conta com running balance.

```typescript
interface AccountStatementProps {
  accountId: string;
  startDate?: string;
  endDate?: string;
}

interface StatementEntry {
  transaction: Transaction;
  runningBalance: number;  // Saldo acumulado até esta transação
  isIncoming: boolean;     // true se entrada, false se saída
}

function calculateRunningBalance(
  transactions: Transaction[],
  initialBalance: number
): StatementEntry[] {
  // Ordena por data crescente
  // Calcula saldo acumulado
}
```

### 3. InstallmentManager Component

Componente para gerenciar parcelas (adiantar, excluir série).

```typescript
interface InstallmentManagerProps {
  transaction: Transaction;  // Parcela atual
  onAdvance: (installmentIds: string[]) => void;
  onDeleteSeries: () => void;
  onDeleteFuture: () => void;
}

interface InstallmentSeries {
  seriesId: string;
  totalInstallments: number;
  paidInstallments: number;
  futureInstallments: Transaction[];
  totalAmount: number;
  remainingAmount: number;
}
```

### 4. AccountFilter Hook

Hook para filtrar contas baseado na viagem selecionada.

```typescript
interface UseAccountFilterOptions {
  tripId?: string;
  tripCurrency?: string;
}

function useAccountFilter(options: UseAccountFilterOptions) {
  // Se não tem viagem ou viagem é BRL: retorna contas nacionais
  // Se viagem é internacional: retorna contas na moeda da viagem
  return {
    filteredAccounts: Account[];
    hasCompatibleAccounts: boolean;
    currencyMismatchMessage?: string;
  };
}
```

## Data Models

### Transaction (existente, sem alterações)

```typescript
interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  credit_card_id: string | null;
  category_id: string | null;
  trip_id: string | null;
  amount: number;
  description: string;
  date: string;
  competence_date: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  currency: string | null;
  is_shared: boolean;
  payer_id: string | null;
  is_installment: boolean;
  current_installment: number | null;
  total_installments: number | null;
  series_id: string | null;
  advanced_at: string | null;  // NOVO: data do adiantamento
  created_at: string;
  updated_at: string;
}
```

### TransactionSplit (existente, sem alterações)

```typescript
interface TransactionSplit {
  id: string;
  transaction_id: string;
  member_id: string;
  name: string;
  percentage: number;
  amount: number;
  is_settled: boolean;
  settled_at: string | null;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction List Completeness

*For any* user and time period, the transaction list SHALL contain all transactions where:
- type is EXPENSE or INCOME (not TRANSFER)
- user_id matches the current user
- competence_date is within the selected period
- source_transaction_id is null (not a mirror)

**Validates: Requirements 1.1, 1.7, 2.1**

### Property 2: Day Grouping Correctness

*For any* list of transactions, when grouped by day:
- Each transaction SHALL appear in exactly one day group
- The day group's date SHALL match the transaction's date field
- Transactions within a day SHALL be ordered by created_at descending

**Validates: Requirements 1.2, 1.6**

### Property 3: Day Total Calculation

*For any* day group, the balance SHALL equal:
- Sum of all INCOME amounts minus sum of all EXPENSE amounts

**Validates: Requirements 1.3**

### Property 4: Shared Transaction Full Amount Display

*For any* shared transaction where payer_id equals user_id or is null:
- The displayed amount SHALL be the full transaction amount
- The account balance impact SHALL be the full transaction amount

**Validates: Requirements 1.8, 4.1, 4.5**

### Property 5: Account Statement Completeness

*For any* account, the statement SHALL contain all transactions where:
- account_id equals the account's id, OR
- destination_account_id equals the account's id (for transfers)

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 6: Transfer Direction in Statement

*For any* transfer in an account statement:
- If account_id equals the account, display as negative (outgoing)
- If destination_account_id equals the account, display as positive (incoming)

**Validates: Requirements 2.2, 2.3, 2.4**

### Property 7: Running Balance Calculation

*For any* position in an account statement, the running balance SHALL equal:
- Initial account balance + sum of all transactions up to that position
- Where INCOME and incoming transfers add, EXPENSE and outgoing transfers subtract

**Validates: Requirements 3.5**

### Property 8: Installment Advance Updates Competence

*For any* installment that is advanced:
- competence_date SHALL be updated to the current month (YYYY-MM-01)
- advanced_at SHALL be set to the current timestamp
- The installment SHALL appear in the current period's totals

**Validates: Requirements 6.4, 6.5, 6.6**

### Property 9: Series Deletion Completeness

*For any* series deletion operation:
- All transactions with the same series_id SHALL be deleted
- The account balance SHALL be adjusted by the sum of all deleted amounts

**Validates: Requirements 7.2, 7.4**

### Property 10: Future Installments Deletion

*For any* "delete future installments" operation from installment N:
- Only transactions with current_installment >= N SHALL be deleted
- Transactions with current_installment < N SHALL remain unchanged

**Validates: Requirements 7.3, 7.6**

### Property 11: Account Filter by Trip Currency

*For any* transaction form:
- If no trip selected OR trip currency is BRL: show only accounts where is_international = false
- If trip currency is not BRL: show only accounts where currency = trip.currency

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 12: Settlement Status Update

*For any* settlement confirmation:
- The split's is_settled SHALL be set to true
- The split's settled_at SHALL be set to current timestamp
- When all splits are settled, the transaction status SHALL reflect "fully settled"

**Validates: Requirements 9.2, 9.3, 9.6**

### Property 13: Transaction Edit Timestamp

*For any* transaction edit operation:
- updated_at SHALL be greater than its previous value
- updated_at SHALL be approximately equal to the current timestamp

**Validates: Requirements 5.3**

### Property 14: Transaction Delete Balance Reversal

*For any* transaction deletion:
- If type is EXPENSE: account balance SHALL increase by amount
- If type is INCOME: account balance SHALL decrease by amount

**Validates: Requirements 5.5**

## Error Handling

### User-Facing Errors

| Scenario | Error Message | Action |
|----------|---------------|--------|
| No compatible account for trip | "Nenhuma conta encontrada na moeda {currency}. Crie uma conta internacional." | Show create account link |
| Delete series with settled splits | "Algumas parcelas já foram acertadas. Deseja excluir mesmo assim?" | Confirmation dialog |
| Advance already advanced installment | "Esta parcela já foi adiantada." | Disable advance button |
| Edit mirror transaction | "Transações espelhadas não podem ser editadas." | Disable edit button |

### System Errors

| Scenario | Handling |
|----------|----------|
| Database constraint violation | Rollback transaction, show generic error |
| Network timeout | Retry with exponential backoff, show retry button |
| Concurrent modification | Refetch data, show conflict resolution dialog |

## Testing Strategy

### Unit Tests

Testes unitários para funções puras:

1. `groupTransactionsByDay()` - agrupamento correto por data
2. `calculateRunningBalance()` - cálculo de saldo acumulado
3. `filterAccountsByTripCurrency()` - filtro de contas por moeda
4. `calculateDayTotals()` - cálculo de totais diários

### Property-Based Tests

Usar **fast-check** para testes de propriedade:

1. **Property 1**: Completude da lista de transações
2. **Property 2**: Agrupamento por dia
3. **Property 3**: Cálculo de totais diários
4. **Property 4**: Valor integral de transações compartilhadas
5. **Property 7**: Cálculo de running balance
6. **Property 9**: Exclusão de série completa
7. **Property 11**: Filtro de contas por moeda

Cada teste de propriedade deve rodar no mínimo 100 iterações.

### Integration Tests

1. Criar transação e verificar aparece na lista
2. Criar transferência e verificar aparece apenas no extrato
3. Adiantar parcela e verificar competência atualizada
4. Excluir série e verificar todas parcelas removidas
5. Confirmar ressarcimento e verificar status atualizado

