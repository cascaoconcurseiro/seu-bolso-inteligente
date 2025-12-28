# Design Document: International Accounts

## Overview

Este documento descreve o design técnico para o sistema de contas e cartões internacionais. A funcionalidade permite que usuários gerenciem finanças em múltiplas moedas, com transações em moeda estrangeira vinculadas a contas/cartões internacionais.

## Architecture

O sistema utiliza a arquitetura existente:
- **Frontend**: React + TypeScript com componentes shadcn/ui
- **Backend**: Supabase (PostgreSQL + RLS)
- **State Management**: TanStack Query

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                    Transaction Creation                      │
├─────────────────────────────────────────────────────────────┤
│  1. User selects trip with foreign currency                 │
│  2. Amount field shows trip currency symbol                 │
│  3. Only international accounts/cards are shown             │
│  4. Transaction saved with currency field                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Transaction Display                       │
├─────────────────────────────────────────────────────────────┤
│  Main Transactions Page: Only BRL transactions              │
│  Trip Expenses: Trip currency transactions                  │
│  Account Statement: Account currency transactions           │
│  Shared Expenses: All currencies (grouped)                  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Database Schema Changes

A tabela `accounts` já possui:
- `is_international` (boolean) - Se é conta internacional
- `currency` (text) - Moeda da conta (BRL, USD, EUR, etc.)

A tabela `transactions` agora possui:
- `currency` (text) - Moeda da transação (default: BRL)

### TypeScript Interfaces

```typescript
// Extensão da interface Account
interface Account {
  // ... campos existentes
  is_international: boolean;
  currency: string;
}

// Extensão da interface Transaction
interface Transaction {
  // ... campos existentes
  currency: string;
}
```

### Component Updates

1. **TransactionForm.tsx**
   - Detectar moeda da viagem selecionada
   - Filtrar contas/cartões por moeda
   - Exibir símbolo da moeda correta

2. **AccountForm.tsx**
   - Adicionar toggle para conta internacional
   - Adicionar seleção de moeda quando internacional

3. **useTransactions.ts**
   - Filtrar transações em moeda estrangeira da lista principal

## Data Models

### Currency Filtering Logic

```typescript
// Filtrar contas por moeda
const getAccountsForCurrency = (accounts: Account[], currency: string) => {
  if (currency === 'BRL') {
    return accounts.filter(a => !a.is_international);
  }
  return accounts.filter(a => a.is_international && a.currency === currency);
};

// Filtrar transações por moeda
const filterTransactionsByCurrency = (transactions: Transaction[], currency: string) => {
  return transactions.filter(t => (t.currency || 'BRL') === currency);
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Currency Consistency

*For any* transaction linked to a trip with foreign currency, the transaction currency SHALL match the trip currency.

**Validates: Requirements 3.4, 6.2**

### Property 2: Account Currency Match

*For any* transaction in foreign currency, the linked account/card SHALL have the same currency.

**Validates: Requirements 3.2, 3.3**

### Property 3: Main Page Currency Filter

*For any* transaction displayed on the main transactions page, the currency SHALL be BRL or null.

**Validates: Requirements 4.1, 4.2**

### Property 4: International Account Requirement

*For any* transaction in foreign currency, there SHALL be a linked international account or card.

**Validates: Requirements 3.3**

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| No international account for currency | Show message to create one |
| Currency mismatch | Prevent transaction creation |
| Missing currency field | Default to BRL |

## Testing Strategy

### Unit Tests

1. Currency filtering functions
2. Account selection by currency
3. Transaction currency assignment

### Integration Tests

1. Create transaction with foreign currency
2. Verify transaction appears in correct contexts
3. Verify transaction hidden from main page
