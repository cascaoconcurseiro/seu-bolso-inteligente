# Design Document: Financial System Improvements

## Overview

Este documento descreve o design técnico para implementar melhorias críticas no sistema financeiro pessoal, garantindo conformidade com princípios contábeis de partidas dobradas, precisão em cálculos financeiros, e interligação completa de dados.

O sistema atual já possui uma base sólida com SafeFinancialCalculator, validação de transações, e suporte a compartilhamento. Este design foca em:

1. Fortalecer o sistema de partidas dobradas com validação rigorosa
2. Corrigir o fluxo de transações pagas por outros
3. Implementar alertas e projeções financeiras
4. Adicionar reconciliação bancária e exportação de dados
5. Garantir integridade contábil em todas as operações

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Transaction  │  │  Dashboard   │  │   Reports    │      │
│  │    Form      │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Transaction  │  │    Ledger    │  │   Alerts     │      │
│  │  Service     │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Validation   │  │ Projection   │  │ Reconcile    │      │
│  │  Service     │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                       Data Access Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Transactions │  │   Accounts   │  │  Categories  │      │
│  │     Hook     │  │     Hook     │  │     Hook     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Transactions │  │   Accounts   │  │    Ledger    │      │
│  │    Table     │  │    Table     │  │    Table     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────────────────────────────────────────┐       │
│  │         Triggers & Functions                     │       │
│  │  - update_account_balance()                      │       │
│  │  - create_ledger_entries()                       │       │
│  │  - validate_double_entry()                       │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Separation of Concerns**: Cada camada tem responsabilidade clara
2. **Immutability**: Transações reconciliadas não podem ser editadas
3. **Auditability**: Todas as operações são rastreáveis
4. **Consistency**: Validação em múltiplas camadas (UI, Service, Database)
5. **Precision**: SafeFinancialCalculator para todos os cálculos
6. **Real-time**: React Query para sincronização automática

## Components and Interfaces

### 1. Enhanced Ledger Service

**Responsabilidade**: Gerenciar livro-razão contábil com partidas dobradas

```typescript
interface LedgerEntry {
  id: string;
  transaction_id: string;
  date: string;
  competence_date: string;
  description: string;
  account_debit: string;
  account_credit: string;
  amount: number;
  entry_type: 'DEBIT' | 'CREDIT';
  created_at: string;
}

interface TrialBalance {
  accounts: Array<{
    name: string;
    debit_total: number;
    credit_total: number;
    balance: number;
  }>;
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
  difference: number;
}

class EnhancedLedgerService {
  // Criar entradas de ledger para uma transação
  createLedgerEntries(transaction: Transaction): Promise<LedgerEntry[]>
  
  // Gerar trial balance
  generateTrialBalance(startDate: string, endDate: string): Promise<TrialBalance>
  
  // Validar integridade contábil
  validateDoubleEntry(transactionId: string): Promise<boolean>
  
  // Obter ledger completo
  getLedger(filters: LedgerFilters): Promise<LedgerEntry[]>
  
  // Reverter entradas de ledger
  reverseLedgerEntries(transactionId: string): Promise<void>
}
```

### 2. Transaction Service (Enhanced)

**Responsabilidade**: Gerenciar criação, edição e exclusão de transações

```typescript
interface TransactionCreateInput {
  amount: number;
  description: string;
  date: string;
  type: TransactionType;
  account_id?: string;
  destination_account_id?: string;
  category_id?: string;
  trip_id?: string;
  payer_id?: string; // Se não for 'me', não vincular conta
  is_shared: boolean;
  splits?: TransactionSplit[];
  is_installment: boolean;
  total_installments?: number;
  is_recurring: boolean;
  frequency?: RecurrenceFrequency;
  notes?: string;
}

interface TransactionUpdateInput extends Partial<TransactionCreateInput> {
  id: string;
  force_update_reconciled?: boolean; // Requer confirmação
}

class TransactionService {
  // Criar transação com validação completa
  async createTransaction(input: TransactionCreateInput): Promise<Transaction> {
    // 1. Validar dados
    const validation = await this.validate(input);
    if (!validation.isValid) throw new ValidationError(validation.errors);
    
    // 2. Se payer_id != 'me', não vincular conta
    if (input.payer_id && input.payer_id !== 'me') {
      input.account_id = undefined;
    }
    
    // 3. Criar transação(ões)
    const transactions = await this.createTransactionRecords(input);
    
    // 4. Criar entradas de ledger
    for (const tx of transactions) {
      await ledgerService.createLedgerEntries(tx);
    }
    
    // 5. Atualizar saldos (via trigger)
    // 6. Criar splits se necessário
    // 7. Criar espelhos se compartilhado
    
    return transactions[0];
  }
  
  // Editar transação
  async updateTransaction(input: TransactionUpdateInput): Promise<Transaction>
  
  // Excluir transação
  async deleteTransaction(id: string): Promise<void>
  
  // Validar transação
  async validate(input: TransactionCreateInput): Promise<ValidationResult>
}
```

### 3. Alert Service

**Responsabilidade**: Gerenciar alertas financeiros

```typescript
interface Alert {
  id: string;
  user_id: string;
  type: AlertType;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

type AlertType = 
  | 'NEGATIVE_BALANCE'
  | 'CREDIT_LIMIT_WARNING'
  | 'DUPLICATE_TRANSACTION'
  | 'EXCESSIVE_SPENDING'
  | 'INSTALLMENT_DUE'
  | 'UNRECONCILED_OLD'
  | 'PROJECTED_NEGATIVE';

class AlertService {
  // Verificar e criar alertas
  async checkAlerts(userId: string): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    // 1. Verificar saldos negativos
    const negativeAccounts = await this.checkNegativeBalances(userId);
    alerts.push(...negativeAccounts);
    
    // 2. Verificar limites de cartão
    const creditWarnings = await this.checkCreditLimits(userId);
    alerts.push(...creditWarnings);
    
    // 3. Verificar duplicatas
    const duplicates = await this.checkDuplicates(userId);
    alerts.push(...duplicates);
    
    // 4. Verificar gastos excessivos
    const excessive = await this.checkExcessiveSpending(userId);
    alerts.push(...excessive);
    
    // 5. Verificar parcelas próximas
    const installments = await this.checkUpcomingInstallments(userId);
    alerts.push(...installments);
    
    return alerts;
  }
  
  // Obter alertas do usuário
  async getAlerts(userId: string, unreadOnly: boolean): Promise<Alert[]>
  
  // Marcar alerta como lido
  async markAsRead(alertId: string): Promise<void>
  
  // Configurar limites personalizados
  async setCustomLimits(userId: string, limits: CustomLimits): Promise<void>
}
```

### 4. Projection Service

**Responsabilidade**: Calcular projeções financeiras

```typescript
interface Projection {
  month: string; // YYYY-MM
  projected_balance: number;
  projected_income: number;
  projected_expenses: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  breakdown: {
    recurring: number;
    installments: number;
    average_expenses: number;
  };
}

interface ProjectionScenario {
  name: string;
  additional_expenses: Array<{
    description: string;
    amount: number;
    month: string;
  }>;
  additional_income: Array<{
    description: string;
    amount: number;
    month: string;
  }>;
}

class ProjectionService {
  // Calcular projeção para próximos N meses
  async calculateProjection(
    userId: string,
    months: number = 3
  ): Promise<Projection[]> {
    const projections: Projection[] = [];
    
    for (let i = 0; i < months; i++) {
      const month = this.getMonthOffset(i);
      
      // 1. Buscar transações recorrentes
      const recurring = await this.getRecurringForMonth(userId, month);
      
      // 2. Buscar parcelas futuras
      const installments = await this.getInstallmentsForMonth(userId, month);
      
      // 3. Calcular média de gastos por categoria
      const averageExpenses = await this.calculateAverageExpenses(userId);
      
      // 4. Calcular projeção
      const projection = this.buildProjection(
        month,
        recurring,
        installments,
        averageExpenses
      );
      
      projections.push(projection);
    }
    
    return projections;
  }
  
  // Simular cenário
  async simulateScenario(
    userId: string,
    scenario: ProjectionScenario
  ): Promise<Projection[]>
  
  // Detectar meses com saldo negativo projetado
  async detectNegativeProjections(userId: string): Promise<string[]>
}
```

### 5. Reconciliation Service

**Responsabilidade**: Gerenciar reconciliação bancária

```typescript
interface ReconciliationSession {
  id: string;
  user_id: string;
  account_id: string;
  start_date: string;
  end_date: string;
  bank_statement_balance: number;
  system_balance: number;
  difference: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  reconciled_count: number;
  unreconciled_count: number;
  created_at: string;
  completed_at?: string;
}

class ReconciliationService {
  // Iniciar sessão de reconciliação
  async startReconciliation(
    userId: string,
    accountId: string,
    bankBalance: number,
    endDate: string
  ): Promise<ReconciliationSession>
  
  // Marcar transação como reconciliada
  async reconcileTransaction(
    transactionId: string,
    userId: string
  ): Promise<void> {
    await supabase
      .from('transactions')
      .update({
        reconciled: true,
        reconciled_at: new Date().toISOString(),
        reconciled_by: userId
      })
      .eq('id', transactionId);
  }
  
  // Desmarcar reconciliação
  async unreconcileTransaction(transactionId: string): Promise<void>
  
  // Calcular diferença de reconciliação
  async calculateReconciliationDifference(
    accountId: string,
    endDate: string
  ): Promise<number>
  
  // Gerar relatório de reconciliação
  async generateReconciliationReport(
    sessionId: string
  ): Promise<ReconciliationReport>
}
```

### 6. Export Service

**Responsabilidade**: Exportar dados em diversos formatos

```typescript
interface ExportOptions {
  format: 'CSV' | 'PDF' | 'EXCEL';
  startDate?: string;
  endDate?: string;
  accountId?: string;
  categoryId?: string;
  includeReconciled?: boolean;
}

class ExportService {
  // Exportar transações
  async exportTransactions(
    userId: string,
    options: ExportOptions
  ): Promise<Blob> {
    const transactions = await this.fetchTransactions(userId, options);
    
    switch (options.format) {
      case 'CSV':
        return this.generateCSV(transactions);
      case 'PDF':
        return this.generatePDF(transactions);
      case 'EXCEL':
        return this.generateExcel(transactions);
    }
  }
  
  // Exportar ledger
  async exportLedger(
    userId: string,
    options: ExportOptions
  ): Promise<Blob>
  
  // Exportar trial balance
  async exportTrialBalance(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Blob>
  
  // Gerar nome de arquivo
  private generateFilename(type: string, format: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `${type}_${date}.${format.toLowerCase()}`;
  }
}
```

## Data Models

### Enhanced Transaction Model

```typescript
interface Transaction {
  // Campos existentes
  id: string;
  user_id: string;
  creator_user_id: string;
  account_id: string | null; // NULL quando payer_id != user_id
  destination_account_id: string | null;
  category_id: string | null;
  trip_id: string | null;
  amount: number;
  description: string;
  date: string;
  competence_date: string;
  type: TransactionType;
  domain: TransactionDomain;
  
  // Compartilhamento
  is_shared: boolean;
  payer_id: string | null; // ID do membro que pagou
  
  // Parcelamento
  is_installment: boolean;
  current_installment: number | null;
  total_installments: number | null;
  series_id: string | null;
  
  // Recorrência
  is_recurring: boolean;
  frequency: string | null;
  recurrence_day: number | null;
  
  // Reconciliação (NOVO)
  reconciled: boolean;
  reconciled_at: string | null;
  reconciled_by: string | null;
  
  // Auditoria
  created_at: string;
  updated_at: string;
  
  // Relacionamentos
  account?: Account;
  category?: Category;
  splits?: TransactionSplit[];
}
```

### New Ledger Entry Model

```typescript
interface LedgerEntry {
  id: string;
  transaction_id: string;
  user_id: string;
  date: string;
  competence_date: string;
  description: string;
  
  // Partidas dobradas
  account_debit_id: string;
  account_debit_name: string;
  account_credit_id: string;
  account_credit_name: string;
  
  amount: number;
  entry_type: 'DEBIT' | 'CREDIT';
  
  // Metadados
  transaction_type: TransactionType;
  domain: TransactionDomain;
  
  created_at: string;
}
```

### New Alert Model

```typescript
interface Alert {
  id: string;
  user_id: string;
  type: AlertType;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  read_at: string | null;
}
```

### New Custom Limits Model

```typescript
interface CustomLimit {
  id: string;
  user_id: string;
  category_id: string | null; // NULL = limite geral
  limit_type: 'MONTHLY' | 'WEEKLY' | 'DAILY';
  amount: number;
  alert_threshold: number; // Percentual (ex: 80 = alerta em 80%)
  created_at: string;
  updated_at: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Double Entry Balance

*For any* set of ledger entries for a transaction, the sum of debits SHALL equal the sum of credits

**Validates: Requirements 1.4**

### Property 2: Account Balance Consistency

*For any* account, the calculated balance from transactions SHALL equal the stored balance

**Validates: Requirements 2.6**

### Property 3: Trial Balance Closure

*For any* period, the trial balance SHALL have total debits equal to total credits (difference = 0)

**Validates: Requirements 1.7**

### Property 4: Transaction Account Requirement

*For any* personal transaction (payer_id = user_id), account_id SHALL NOT be null

**Validates: Requirements 3.4**

### Property 5: Paid By Others No Account

*For any* transaction where payer_id != user_id, account_id SHALL be null

**Validates: Requirements 4.2**

### Property 6: Split Percentage Sum

*For any* shared transaction with splits, the sum of split percentages SHALL equal 100%

**Validates: Requirements 12.1**

### Property 7: Split Amount Sum

*For any* shared transaction with splits, the sum of split amounts SHALL equal the transaction amount (within 1 cent tolerance)

**Validates: Requirements 12.2**

### Property 8: Installment Amount Sum

*For any* installment series, the sum of all installment amounts SHALL equal the original total amount (within 1 cent tolerance per installment)

**Validates: Requirements 13.1**

### Property 9: Competence Date Consistency

*For any* installment, the competence_date SHALL be the first day of the month of the installment date

**Validates: Requirements 13.2**

### Property 10: Reconciled Immutability

*For any* reconciled transaction, updates SHALL require explicit force_update_reconciled flag

**Validates: Requirements 16.6**

### Property 11: Projection Non-Negative

*For any* projection calculation, if projected balance is negative, an alert SHALL be created

**Validates: Requirements 15.5**

### Property 12: Export Data Completeness

*For any* export operation, all transactions matching the filters SHALL be included in the export

**Validates: Requirements 17.6**

### Property 13: Alert Threshold Trigger

*For any* account with credit limit, when balance exceeds 80% of limit, a credit limit warning alert SHALL be created

**Validates: Requirements 11.2**

### Property 14: Ledger Entry Reversal

*For any* deleted transaction, all corresponding ledger entries SHALL be reversed or marked as deleted

**Validates: Requirements 1.5**

### Property 15: Transfer Double Account

*For any* transfer transaction, both account_id and destination_account_id SHALL NOT be null

**Validates: Requirements 3.3**

## Error Handling

### Validation Errors

```typescript
class ValidationError extends Error {
  constructor(
    public errors: string[],
    public warnings: string[] = []
  ) {
    super('Validation failed');
  }
}
```

**Handling Strategy**:
- Show all errors to user before submission
- Allow submission with warnings after confirmation
- Log validation failures for analysis

### Calculation Errors

```typescript
class CalculationError extends Error {
  constructor(
    public operation: string,
    public values: any[],
    message: string
  ) {
    super(`Calculation error in ${operation}: ${message}`);
  }
}
```

**Handling Strategy**:
- Never allow invalid calculations to persist
- Rollback transaction if calculation fails
- Alert development team for investigation

### Integrity Errors

```typescript
class IntegrityError extends Error {
  constructor(
    public entityType: string,
    public entityId: string,
    public issue: string
  ) {
    super(`Integrity violation in ${entityType} ${entityId}: ${issue}`);
  }
}
```

**Handling Strategy**:
- Block operation that would violate integrity
- Generate audit report
- Provide repair suggestions to user

### Reconciliation Errors

```typescript
class ReconciliationError extends Error {
  constructor(
    public accountId: string,
    public difference: number,
    public unreconciledCount: number
  ) {
    super(`Reconciliation mismatch: ${difference}`);
  }
}
```

**Handling Strategy**:
- Show detailed reconciliation report
- Highlight unreconciled transactions
- Suggest possible matches

## Testing Strategy

### Unit Tests

**Focus**: Testar funções individuais e cálculos

- SafeFinancialCalculator: Todos os métodos
- ValidationService: Cada regra de validação
- LedgerService: Criação de entradas
- AlertService: Cada tipo de alerta
- ProjectionService: Cálculos de projeção

**Example**:
```typescript
describe('SafeFinancialCalculator', () => {
  it('should calculate installments correctly', () => {
    const total = 100.00;
    const installments = 3;
    const result = SafeFinancialCalculator.calculateInstallment(total, installments);
    expect(result).toBe(33.33);
  });
});
```

### Property-Based Tests

**Focus**: Validar propriedades universais

**Library**: fast-check (TypeScript)

**Configuration**: Minimum 100 iterations per test

**Property Test 1: Double Entry Balance**
```typescript
// Feature: financial-system-improvements, Property 1: Double Entry Balance
it('should maintain double entry balance for all transactions', () => {
  fc.assert(
    fc.property(
      fc.record({
        amount: fc.double({ min: 0.01, max: 10000 }),
        type: fc.constantFrom('EXPENSE', 'INCOME', 'TRANSFER'),
        // ... other fields
      }),
      async (transaction) => {
        const ledgerEntries = await ledgerService.createLedgerEntries(transaction);
        const debits = ledgerEntries
          .filter(e => e.entry_type === 'DEBIT')
          .reduce((sum, e) => sum + e.amount, 0);
        const credits = ledgerEntries
          .filter(e => e.entry_type === 'CREDIT')
          .reduce((sum, e) => sum + e.amount, 0);
        
        expect(Math.abs(debits - credits)).toBeLessThan(0.01);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property Test 2: Split Percentage Sum**
```typescript
// Feature: financial-system-improvements, Property 6: Split Percentage Sum
it('should ensure split percentages sum to 100%', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          member_id: fc.uuid(),
          percentage: fc.double({ min: 0.01, max: 100 })
        }),
        { minLength: 2, maxLength: 10 }
      ),
      (splits) => {
        // Normalize to 100%
        const total = splits.reduce((sum, s) => sum + s.percentage, 0);
        const normalized = splits.map(s => ({
          ...s,
          percentage: (s.percentage / total) * 100
        }));
        
        const sum = normalized.reduce((acc, s) => acc + s.percentage, 0);
        expect(Math.abs(sum - 100)).toBeLessThan(0.01);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property Test 3: Installment Amount Sum**
```typescript
// Feature: financial-system-improvements, Property 8: Installment Amount Sum
it('should ensure installments sum to total', () => {
  fc.assert(
    fc.property(
      fc.double({ min: 10, max: 10000 }),
      fc.integer({ min: 2, max: 48 }),
      (total, installments) => {
        const installmentAmount = SafeFinancialCalculator.calculateInstallment(
          total,
          installments
        );
        const calculatedTotal = installmentAmount * installments;
        const difference = Math.abs(total - calculatedTotal);
        
        // Allow 1 cent per installment tolerance
        expect(difference).toBeLessThan(installments * 0.01);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Tests

**Focus**: Testar fluxos completos

- Criar transação → Verificar ledger → Verificar saldo
- Criar parcelamento → Verificar todas as parcelas
- Criar compartilhada → Verificar espelhos
- Reconciliar → Verificar imutabilidade
- Exportar → Verificar conteúdo

**Example**:
```typescript
describe('Transaction Creation Flow', () => {
  it('should create transaction, ledger entries, and update balance', async () => {
    const initialBalance = await getAccountBalance(accountId);
    
    await transactionService.createTransaction({
      amount: 100,
      type: 'EXPENSE',
      account_id: accountId,
      // ...
    });
    
    const finalBalance = await getAccountBalance(accountId);
    expect(finalBalance).toBe(initialBalance - 100);
    
    const ledgerEntries = await ledgerService.getLedger({ accountId });
    expect(ledgerEntries.length).toBeGreaterThan(0);
  });
});
```

### End-to-End Tests

**Focus**: Testar interface do usuário

- Criar transação via formulário
- Visualizar alertas no dashboard
- Exportar relatório
- Reconciliar transações

**Tools**: Playwright ou Cypress

## Implementation Notes

### Database Migrations

**New Tables**:
1. `ledger_entries` - Armazenar entradas de ledger
2. `alerts` - Armazenar alertas do usuário
3. `custom_limits` - Armazenar limites personalizados
4. `reconciliation_sessions` - Armazenar sessões de reconciliação

**New Columns**:
1. `transactions.reconciled` (boolean)
2. `transactions.reconciled_at` (timestamp)
3. `transactions.reconciled_by` (uuid)

**New Triggers**:
1. `create_ledger_entries_trigger` - Criar entradas de ledger automaticamente
2. `validate_double_entry_trigger` - Validar partidas dobradas
3. `check_alerts_trigger` - Verificar alertas após transação

### Performance Considerations

1. **Indexing**: Adicionar índices em:
   - `ledger_entries(transaction_id)`
   - `ledger_entries(user_id, competence_date)`
   - `transactions(reconciled, user_id)`
   - `alerts(user_id, is_read)`

2. **Caching**: Usar React Query com:
   - `staleTime: 30000` (30 segundos)
   - Invalidação automática após mutações

3. **Batch Operations**: Criar parcelas e splits em batch

4. **Lazy Loading**: Carregar ledger e alertas sob demanda

### Security Considerations

1. **RLS Policies**: Garantir que usuários só vejam seus dados
2. **Validation**: Validar em múltiplas camadas (UI, API, DB)
3. **Audit Trail**: Registrar todas as operações críticas
4. **Reconciliation Lock**: Impedir edição de transações reconciliadas

### Backward Compatibility

1. **Existing Transactions**: Migração para adicionar campos de reconciliação
2. **Existing Ledger**: Regenerar entradas de ledger para transações antigas
3. **API Compatibility**: Manter endpoints existentes funcionando
