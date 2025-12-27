# Design Document: Trip and Accounts Improvements

## Overview

Este documento descreve o design para implementar melhorias críticas no sistema de viagens e contas, incluindo orçamento pessoal obrigatório, operações bancárias (transferências e saques), redesign da página de contas, e correções em permissões e funcionalidades.

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Trips      │  │   Accounts   │  │   Family     │      │
│  │   Pages      │  │   Pages      │  │   Pages      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│  ┌──────────────────────────────────────────────────┐      │
│  │         Modals & Dialogs Layer                    │      │
│  │  - PersonalBudgetModal (obrigatório)             │      │
│  │  - TransferModal                                  │      │
│  │  - WithdrawalModal                                │      │
│  │  - TransactionModal (global)                      │      │
│  └──────────────────────────────────────────────────┘      │
│         │                  │                  │              │
│  ┌──────────────────────────────────────────────────┐      │
│  │              React Query Hooks                    │      │
│  │  - useTripMembers, useAccounts                   │      │
│  │  - useTransfers, useWithdrawals                  │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Backend                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ trip_members │  │  accounts    │  │ transactions │      │
│  │ +personal_   │  │              │  │ +type        │      │
│  │  budget      │  │              │  │ +linked_id   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌────────────────────────────────────────────────┐         │
│  │         RPC Functions                           │         │
│  │  - transfer_between_accounts()                 │         │
│  │  - withdraw_from_account()                     │         │
│  │  - create_account_with_initial_deposit()       │         │
│  └────────────────────────────────────────────────┘         │
│                                                               │
│  ┌────────────────────────────────────────────────┐         │
│  │         RLS Policies                            │         │
│  │  - Personal budget visibility                  │         │
│  │  - Trip permissions (owner vs member)          │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Personal Budget System

#### Database Schema Changes

```sql
-- trip_members já tem personal_budget, apenas garantir que está sendo usado
ALTER TABLE trip_members 
  ALTER COLUMN personal_budget SET DEFAULT NULL;

COMMENT ON COLUMN trip_members.personal_budget IS 
  'Orçamento pessoal do membro. Visível apenas para o próprio usuário.';
```

#### Frontend Components

**PersonalBudgetModal.tsx** (já existe, ajustar para ser obrigatório)
```typescript
interface PersonalBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBudget: number | null;
  tripName: string;
  onSubmit: (budget: number) => Promise<void>;
  isLoading: boolean;
  required?: boolean; // Novo: indica se é obrigatório
}

// Comportamento:
// - Se required=true, não permite fechar sem definir orçamento
// - Valida que orçamento > 0
// - Exibe mensagem clara sobre obrigatoriedade
```

**Hook: useRequirePersonalBudget**
```typescript
function useRequirePersonalBudget(tripId: string) {
  const { user } = useAuth();
  const { data: membership } = useTripMembers(tripId);
  
  const myMembership = membership?.find(m => m.user_id === user?.id);
  const needsBudget = myMembership && !myMembership.personal_budget;
  
  return { needsBudget, membership: myMembership };
}
```

### 2. Transfer System

#### Database Schema

```sql
-- Adicionar tipo TRANSFER e campo linked_transaction_id
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'TRANSFER';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'WITHDRAWAL';

ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS linked_transaction_id UUID REFERENCES transactions(id);

CREATE INDEX IF NOT EXISTS idx_transactions_linked 
  ON transactions(linked_transaction_id);

COMMENT ON COLUMN transactions.linked_transaction_id IS 
  'ID da transação vinculada (para transferências). Transferências criam 2 transações vinculadas.';
```

#### RPC Function: transfer_between_accounts

```sql
CREATE OR REPLACE FUNCTION transfer_between_accounts(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount DECIMAL(10,2),
  p_description TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_from_balance DECIMAL(10,2);
  v_debit_id UUID;
  v_credit_id UUID;
  v_user_id UUID;
BEGIN
  -- Obter user_id
  v_user_id := auth.uid();
  
  -- Validar que ambas as contas pertencem ao usuário
  IF NOT EXISTS (
    SELECT 1 FROM accounts 
    WHERE id = p_from_account_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Conta de origem não encontrada';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM accounts 
    WHERE id = p_to_account_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Conta de destino não encontrada';
  END IF;
  
  -- Validar saldo
  SELECT balance INTO v_from_balance 
  FROM accounts 
  WHERE id = p_from_account_id;
  
  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;
  
  -- Criar transação de débito
  INSERT INTO transactions (
    user_id, account_id, type, amount, description, date, category
  ) VALUES (
    v_user_id, p_from_account_id, 'TRANSFER', -p_amount, 
    p_description || ' (para ' || (SELECT name FROM accounts WHERE id = p_to_account_id) || ')',
    p_date, 'Transferência'
  ) RETURNING id INTO v_debit_id;
  
  -- Criar transação de crédito
  INSERT INTO transactions (
    user_id, account_id, type, amount, description, date, category, linked_transaction_id
  ) VALUES (
    v_user_id, p_to_account_id, 'TRANSFER', p_amount,
    p_description || ' (de ' || (SELECT name FROM accounts WHERE id = p_from_account_id) || ')',
    p_date, 'Transferência', v_debit_id
  ) RETURNING id INTO v_credit_id;
  
  -- Vincular transações
  UPDATE transactions 
  SET linked_transaction_id = v_credit_id 
  WHERE id = v_debit_id;
  
  -- Atualizar saldos
  UPDATE accounts SET balance = balance - p_amount WHERE id = p_from_account_id;
  UPDATE accounts SET balance = balance + p_amount WHERE id = p_to_account_id;
  
  RETURN json_build_object(
    'success', true,
    'debit_id', v_debit_id,
    'credit_id', v_credit_id
  );
END;
$$;
```

#### Frontend Components

**TransferModal.tsx**
```typescript
interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromAccountId: string;
  fromAccountName: string;
  fromAccountBalance: number;
}

// Componente exibe:
// - Conta de origem (readonly)
// - Saldo disponível
// - Select de conta de destino (outras contas do usuário)
// - Input de valor (com validação de saldo)
// - Input de descrição
// - Botão confirmar
```

**Hook: useTransfer**
```typescript
function useTransfer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: TransferData) => {
      const { data: result, error } = await supabase.rpc(
        'transfer_between_accounts',
        {
          p_from_account_id: data.fromAccountId,
          p_to_account_id: data.toAccountId,
          p_amount: data.amount,
          p_description: data.description,
          p_date: data.date
        }
      );
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
      queryClient.invalidateQueries(['transactions']);
      toast.success('Transferência realizada com sucesso');
    }
  });
}
```

### 3. Withdrawal System

#### RPC Function: withdraw_from_account

```sql
CREATE OR REPLACE FUNCTION withdraw_from_account(
  p_account_id UUID,
  p_amount DECIMAL(10,2),
  p_description TEXT DEFAULT 'Saque em dinheiro',
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance DECIMAL(10,2);
  v_transaction_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Validar conta
  SELECT balance INTO v_balance 
  FROM accounts 
  WHERE id = p_account_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta não encontrada';
  END IF;
  
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;
  
  -- Criar transação
  INSERT INTO transactions (
    user_id, account_id, type, amount, description, date, category
  ) VALUES (
    v_user_id, p_account_id, 'WITHDRAWAL', -p_amount, p_description, p_date, 'Saque'
  ) RETURNING id INTO v_transaction_id;
  
  -- Atualizar saldo
  UPDATE accounts SET balance = balance - p_amount WHERE id = p_account_id;
  
  RETURN json_build_object('success', true, 'transaction_id', v_transaction_id);
END;
$$;
```

### 4. Initial Deposit System

#### RPC Function: create_account_with_initial_deposit

```sql
CREATE OR REPLACE FUNCTION create_account_with_initial_deposit(
  p_name TEXT,
  p_type TEXT,
  p_bank TEXT,
  p_initial_balance DECIMAL(10,2),
  p_currency TEXT DEFAULT 'BRL'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Criar conta
  INSERT INTO accounts (user_id, name, type, bank, balance, currency)
  VALUES (v_user_id, p_name, p_type, p_bank, p_initial_balance, p_currency)
  RETURNING id INTO v_account_id;
  
  -- Se saldo inicial > 0, criar transação de depósito
  IF p_initial_balance > 0 THEN
    INSERT INTO transactions (
      user_id, account_id, type, amount, description, date, category
    ) VALUES (
      v_user_id, v_account_id, 'DEPOSIT', p_initial_balance, 
      'Depósito inicial', CURRENT_DATE, 'Depósito'
    );
  END IF;
  
  RETURN json_build_object('success', true, 'account_id', v_account_id);
END;
$$;
```

### 5. Accounts Page Redesign

#### New Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Header                                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Minhas Contas                    [Nova Conta]  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Summary Card                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Saldo Total                                     │   │
│  │  R$ 15.430,50                                    │   │
│  │  ────────────────────────────────────────────   │   │
│  │  3 contas ativas                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Accounts Grid                                           │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │ [Logo] Nubank    │  │ [Logo] Itaú      │           │
│  │ Conta Corrente   │  │ Conta Poupança   │           │
│  │ •••• 1234        │  │ •••• 5678        │           │
│  │                  │  │                  │           │
│  │ R$ 5.230,00      │  │ R$ 10.200,50     │           │
│  │                  │  │                  │           │
│  │ Últimas:         │  │ Últimas:         │           │
│  │ • Mercado -50    │  │ • Salário +5000  │           │
│  │ • Netflix -30    │  │ • Rendimento +12 │           │
│  └──────────────────┘  └──────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

#### Account Detail Page

```
┌─────────────────────────────────────────────────────────┐
│  [←] Nubank - Conta Corrente                            │
│  •••• 1234                                               │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Saldo Disponível                                │   │
│  │  R$ 5.230,00                                     │   │
│  │                                                   │   │
│  │  [Transferir] [Sacar] [Editar] [Excluir]        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Extrato                                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Hoje                                            │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │ [💰] Mercado Livre      -R$ 50,00  14:30 │  │   │
│  │  │ [🍔] iFood              -R$ 35,00  12:15 │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  │                                                   │   │
│  │  Ontem                                           │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │ [💳] Netflix            -R$ 29,90  08:00 │  │   │
│  │  │ [💰] Salário          +R$ 5000,00  06:00 │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 6. Global Transaction Button

#### Implementation

```typescript
// Layout.tsx - adicionar botão no header
function Layout() {
  const { setShowTransactionModal } = useTransactionModal();
  const location = useLocation();
  
  // Determinar contexto baseado na rota
  const getTransactionContext = () => {
    if (location.pathname.includes('/trips/')) {
      const tripId = location.pathname.split('/trips/')[1];
      return { tripId };
    }
    return {};
  };
  
  return (
    <div>
      <Header>
        <Button onClick={() => {
          const context = getTransactionContext();
          setShowTransactionModal(true, context);
        }}>
          <Plus /> Nova Transação
        </Button>
      </Header>
      {/* ... */}
    </div>
  );
}
```

### 7. Trip Permissions Fix

#### RLS Policies

```sql
-- Permitir participantes adicionarem itens no roteiro e checklist
CREATE POLICY "Trip members can add itinerary items"
  ON trip_itinerary FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can add checklist items"
  ON trip_checklist FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can update checklist items"
  ON trip_checklist FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );
```

## Data Models

### Updated Schemas

```typescript
// trip_members
interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: 'owner' | 'member';
  personal_budget: number | null; // Orçamento pessoal (privado)
  can_edit_details: boolean;
  can_manage_expenses: boolean;
  created_at: string;
}

// transactions (updated)
interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'WITHDRAWAL' | 'DEPOSIT';
  amount: number;
  description: string;
  date: string;
  category: string;
  linked_transaction_id: string | null; // Para transferências
  created_at: string;
}

// accounts
interface Account {
  id: string;
  user_id: string;
  name: string;
  type: string;
  bank: string;
  balance: number;
  currency: string;
  created_at: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Personal Budget Privacy
*For any* trip member, querying trip members should return only their own personal_budget value, with other members' budgets being null or hidden.
**Validates: Requirements 1.4, 1.5**

### Property 2: Budget Validation
*For any* personal budget value, if it is set, it must be greater than zero.
**Validates: Requirements 1.3**

### Property 3: Transfer Conservation
*For any* valid transfer between accounts, the sum of all account balances before the transfer must equal the sum after the transfer (conservation of money).
**Validates: Requirements 3.4**

### Property 4: Transfer Atomicity
*For any* completed transfer, there must exist exactly two linked transactions: one debit and one credit with matching amounts.
**Validates: Requirements 3.5**

### Property 5: Withdrawal Validation
*For any* withdrawal attempt, if the account balance is less than the withdrawal amount, the operation must be rejected.
**Validates: Requirements 4.3**

### Property 6: Initial Deposit Creation
*For any* account created with initial_balance > 0, there must exist a DEPOSIT transaction with amount equal to initial_balance and description "Depósito inicial".
**Validates: Requirements 5.1**

### Property 7: No Deposit for Zero Balance
*For any* account created with initial_balance = 0, there must not exist an initial deposit transaction.
**Validates: Requirements 5.2**

### Property 8: Permission-Based Button Visibility
*For any* trip member who is not the owner, the "Adicionar Participante" button must not be visible in the DOM.
**Validates: Requirements 2.1**

### Property 9: Member Can Add Itinerary
*For any* trip member (owner or not), they must be able to successfully create itinerary items for that trip.
**Validates: Requirements 2.5**

### Property 10: Member Can Add Checklist
*For any* trip member (owner or not), they must be able to successfully create and update checklist items for that trip.
**Validates: Requirements 2.6, 2.7**

## Error Handling

### Transfer Errors
- **Insufficient Balance**: Return clear error message "Saldo insuficiente"
- **Invalid Account**: Return "Conta não encontrada"
- **Same Account**: Prevent transfer to same account
- **Network Error**: Retry logic with exponential backoff

### Withdrawal Errors
- **Insufficient Balance**: Return "Saldo insuficiente para saque"
- **Invalid Amount**: Return "Valor inválido"
- **Account Not Found**: Return "Conta não encontrada"

### Personal Budget Errors
- **Invalid Value**: Return "Orçamento deve ser maior que zero"
- **Required Field**: Prevent modal close with message "Defina seu orçamento para continuar"

### Permission Errors
- **Unauthorized Action**: Return "Você não tem permissão para esta ação"
- **RLS Violation**: Log error and show generic message to user

## Testing Strategy

### Unit Tests
- Test individual components (modals, forms)
- Test validation functions (budget > 0, balance >= amount)
- Test UI permission logic (button visibility)
- Test data formatting (currency, dates)

### Property-Based Tests
- Test transfer conservation across random amounts
- Test budget privacy across random users
- Test permission checks across random roles
- Test initial deposit creation across random balances
- Minimum 100 iterations per property test
- Tag format: **Feature: trip-accounts-improvements, Property {number}: {property_text}**

### Integration Tests
- Test complete transfer flow (UI → RPC → DB → UI update)
- Test complete withdrawal flow
- Test account creation with initial deposit
- Test personal budget requirement on trip join
- Test global transaction button from different pages

### Manual Testing Checklist
- [ ] Accept trip invitation and verify budget modal is required
- [ ] Try to close budget modal without setting budget
- [ ] Set budget and verify it's saved
- [ ] Verify other members' budgets are hidden
- [ ] Verify non-owner cannot see "Adicionar Participante" button
- [ ] Verify non-owner can add itinerary items
- [ ] Verify non-owner can add/update checklist items
- [ ] Create transfer and verify both transactions are created
- [ ] Verify transfer shows origin/destination in statement
- [ ] Create withdrawal and verify balance is updated
- [ ] Create account with initial balance and verify deposit transaction
- [ ] Create account with zero balance and verify no deposit transaction
- [ ] Test "Nova Transação" button from each page
- [ ] Verify accounts page looks professional like a bank app
- [ ] Verify trip linking works in Family > Advanced

## Implementation Notes

### Phase 1: Database Changes
1. Add transaction types (TRANSFER, WITHDRAWAL)
2. Add linked_transaction_id column
3. Create RPC functions
4. Update RLS policies

### Phase 2: Backend Logic
1. Implement transfer_between_accounts RPC
2. Implement withdraw_from_account RPC
3. Implement create_account_with_initial_deposit RPC
4. Add permission checks for itinerary/checklist

### Phase 3: Frontend Components
1. Update PersonalBudgetModal to be required
2. Create TransferModal
3. Create WithdrawalModal
4. Redesign Accounts page
5. Add global transaction button
6. Fix trip permissions UI

### Phase 4: Testing
1. Write property-based tests
2. Write integration tests
3. Manual testing
4. Bug fixes

### Phase 5: Polish
1. Loading states
2. Error messages
3. Success toasts
4. Animations
5. Accessibility
