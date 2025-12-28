# Design Document: Trip Currency Exchange

## Overview

Este documento descreve o design técnico para o sistema de controle de câmbio em viagens. A funcionalidade permite que usuários registrem compras de moeda estrangeira, calculem a média ponderada do câmbio incluindo CET, e visualizem o custo real das despesas.

## Architecture

O sistema segue a arquitetura existente do projeto:
- **Frontend**: React + TypeScript com componentes shadcn/ui
- **Backend**: Supabase (PostgreSQL + RLS)
- **State Management**: TanStack Query para cache e sincronização

```
┌─────────────────────────────────────────────────────────────┐
│                      Trip Detail Page                        │
├─────────────────────────────────────────────────────────────┤
│  Header: Trip Name + Owner + Currency                        │
├─────────────────────────────────────────────────────────────┤
│  Tabs: Resumo | Gastos | Compras | Câmbio | Roteiro | Check │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Exchange Summary Card                      │    │
│  │  Total Purchased | Total Spent BRL | Avg Rate       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Exchange Purchase List                     │    │
│  │  - Date, Amount, Rate, CET, Effective Rate, Total   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Database Schema

```sql
-- Tabela para compras de câmbio
CREATE TABLE trip_exchange_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Valores da compra
  foreign_amount DECIMAL(15,2) NOT NULL,  -- Quantidade de moeda estrangeira
  exchange_rate DECIMAL(10,6) NOT NULL,   -- Taxa de câmbio nominal
  cet_percentage DECIMAL(5,2) DEFAULT 0,  -- CET em percentual (ex: 6.38 para IOF)
  
  -- Valores calculados
  effective_rate DECIMAL(10,6) NOT NULL,  -- Taxa efetiva (rate * (1 + cet/100))
  local_amount DECIMAL(15,2) NOT NULL,    -- Total em moeda local (BRL)
  
  -- Metadados
  description TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_trip_exchange_trip_id ON trip_exchange_purchases(trip_id);
CREATE INDEX idx_trip_exchange_user_id ON trip_exchange_purchases(user_id);

-- RLS Policies
ALTER TABLE trip_exchange_purchases ENABLE ROW LEVEL SECURITY;

-- Participantes da viagem podem ver compras de câmbio
CREATE POLICY "Trip members can view exchange purchases"
  ON trip_exchange_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trip_exchange_purchases.trip_id
      AND tm.user_id = auth.uid()
    )
  );

-- Usuários podem criar suas próprias compras
CREATE POLICY "Users can create own exchange purchases"
  ON trip_exchange_purchases FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuários podem editar suas próprias compras
CREATE POLICY "Users can update own exchange purchases"
  ON trip_exchange_purchases FOR UPDATE
  USING (user_id = auth.uid());

-- Usuários podem deletar suas próprias compras
CREATE POLICY "Users can delete own exchange purchases"
  ON trip_exchange_purchases FOR DELETE
  USING (user_id = auth.uid());
```

### TypeScript Interfaces

```typescript
// types/tripExchange.ts
export interface ExchangePurchase {
  id: string;
  trip_id: string;
  user_id: string;
  foreign_amount: number;
  exchange_rate: number;
  cet_percentage: number;
  effective_rate: number;
  local_amount: number;
  description: string | null;
  purchase_date: string;
  created_at: string;
  updated_at: string;
}

export interface ExchangePurchaseInput {
  foreign_amount: number;
  exchange_rate: number;
  cet_percentage: number;
  description?: string;
  purchase_date: string;
}

export interface ExchangeSummary {
  totalForeignPurchased: number;
  totalLocalSpent: number;
  weightedAverageRate: number;
  purchaseCount: number;
}
```

### React Hooks

```typescript
// hooks/useTripExchange.ts
export function useTripExchangePurchases(tripId: string | null);
export function useCreateExchangePurchase();
export function useUpdateExchangePurchase();
export function useDeleteExchangePurchase();
export function useExchangeSummary(tripId: string | null);
```

### React Components

```typescript
// components/trips/TripExchange.tsx
interface TripExchangeProps {
  trip: Trip;
  isOwner: boolean;
}

// components/trips/ExchangePurchaseDialog.tsx
interface ExchangePurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  currency: string;
  purchase?: ExchangePurchase; // Para edição
  onSubmit: (data: ExchangePurchaseInput) => void;
  isLoading: boolean;
}

// components/trips/ExchangeSummaryCard.tsx
interface ExchangeSummaryCardProps {
  summary: ExchangeSummary;
  currency: string;
}
```

## Data Models

### Exchange Purchase Calculation

```typescript
// Cálculo da taxa efetiva e valor total
function calculateExchangePurchase(input: ExchangePurchaseInput): {
  effective_rate: number;
  local_amount: number;
} {
  const effectiveRate = input.exchange_rate * (1 + input.cet_percentage / 100);
  const localAmount = input.foreign_amount * effectiveRate;
  
  return {
    effective_rate: effectiveRate,
    local_amount: localAmount,
  };
}
```

### Weighted Average Rate Calculation

```typescript
// Cálculo da média ponderada
function calculateWeightedAverageRate(purchases: ExchangePurchase[]): number {
  if (purchases.length === 0) return 0;
  
  const totalForeign = purchases.reduce((sum, p) => sum + p.foreign_amount, 0);
  const totalLocal = purchases.reduce((sum, p) => sum + p.local_amount, 0);
  
  if (totalForeign === 0) return 0;
  
  return totalLocal / totalForeign;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Effective Rate and Local Amount Calculation

*For any* exchange purchase with a positive exchange rate (> 0), positive foreign amount (> 0), and non-negative CET percentage (>= 0):
- The effective rate SHALL equal `exchange_rate * (1 + cet_percentage / 100)`
- The local amount SHALL equal `foreign_amount * effective_rate`

**Validates: Requirements 4.3, 5.2**

### Property 2: Weighted Average Rate Calculation

*For any* non-empty set of exchange purchases, the weighted average rate SHALL equal `sum(local_amounts) / sum(foreign_amounts)`, which is mathematically equivalent to the weighted average of effective rates weighted by foreign amounts.

**Validates: Requirements 6.2, 7.1**

### Property 3: Weighted Average Rate Recalculation on Changes

*For any* addition, update, or deletion of an exchange purchase, the weighted average rate SHALL be recalculated to reflect the current state of all purchases. The new average SHALL satisfy Property 2.

**Validates: Requirements 6.3, 8.5**

### Property 4: Input Validation - Positive Numbers

*For any* exchange purchase input, the system SHALL reject:
- exchange_rate <= 0
- foreign_amount <= 0
- cet_percentage < 0

**Validates: Requirements 4.4, 4.5**

### Property 5: Summary Totals Consistency

*For any* set of exchange purchases, the summary SHALL display:
- Total foreign purchased = sum of all foreign_amounts
- Total local spent = sum of all local_amounts
- These totals SHALL be consistent with the weighted average rate (total_local / total_foreign = weighted_avg_rate)

**Validates: Requirements 7.1, 7.2**

### Property 6: Currency Symbol Formatting

*For any* currency code (USD, EUR, BRL, etc.), the formatting function SHALL return the correct symbol ($ for USD, € for EUR, R$ for BRL, etc.).

**Validates: Requirements 2.3**

### Property 7: Chronological Ordering

*For any* list of exchange purchases displayed, they SHALL be ordered by purchase_date in descending order (most recent first).

**Validates: Requirements 8.1**

### Property 8: Display Completeness

*For any* exchange purchase displayed in the list, the rendered output SHALL contain: date, foreign amount, nominal rate, CET percentage, effective rate, and total local cost.

**Validates: Requirements 8.2**

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Invalid exchange rate (≤ 0) | Show validation error, prevent submission |
| Invalid CET (< 0) | Show validation error, prevent submission |
| Invalid foreign amount (≤ 0) | Show validation error, prevent submission |
| Database error on save | Show toast error, allow retry |
| Network error | Show toast error, data remains in form |
| Unauthorized access | Redirect to login or show permission error |

## Testing Strategy

### Unit Tests

1. **Calculation Functions**
   - Test effective rate calculation with various CET values
   - Test local amount calculation
   - Test weighted average rate calculation
   - Test edge cases (zero values, single purchase, multiple purchases)

2. **Validation Functions**
   - Test required field validation
   - Test numeric validation (positive numbers)
   - Test date validation

### Property-Based Tests

1. **Property 1**: Effective rate calculation
   - Generate random exchange rates and CET percentages
   - Verify formula: effective_rate = exchange_rate * (1 + cet/100)

2. **Property 2**: Local amount calculation
   - Generate random foreign amounts and effective rates
   - Verify formula: local_amount = foreign_amount * effective_rate

3. **Property 3**: Weighted average consistency
   - Generate random sets of purchases
   - Verify: avg_rate = sum(local_amounts) / sum(foreign_amounts)

### Integration Tests

1. **CRUD Operations**
   - Create exchange purchase and verify persistence
   - Update exchange purchase and verify changes
   - Delete exchange purchase and verify removal

2. **Summary Calculations**
   - Add multiple purchases and verify summary totals
   - Edit purchase and verify summary updates
   - Delete purchase and verify summary updates
