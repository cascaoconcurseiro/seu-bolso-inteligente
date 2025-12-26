# PLANO DE IMPLEMENTAÇÃO - DIFERENÇAS CRÍTICAS

## FASE 1: ESTRUTURA DE DADOS (Semana 1-2)

### 1.1 Adicionar Campos em Transactions

```sql
-- Reembolsos
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_refund BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_of_transaction_id UUID REFERENCES transactions(id);

-- Recorrência Avançada
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurrence_day INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS last_generated TIMESTAMP;

-- Notificações
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS enable_notification BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notification_date DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reminder_option TEXT;

-- Compartilhamento Avançado
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS creator_user_id UUID REFERENCES profiles(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS related_member_id UUID REFERENCES family_members(id);

-- Transferências Internacionais
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS destination_amount NUMERIC(15,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS destination_currency TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,6);

-- Reconciliação
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reconciled BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reconciled_by UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reconciled_with TEXT;

-- Espelho
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_mirror BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS mirror_transaction_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS linked_transaction_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS settled_by_tx_id UUID;
```

### 1.2 Adicionar Campos em Accounts

```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS initial_balance NUMERIC(15,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;
```

### 1.3 Adicionar Campos em Trips

```sql
-- Armazenar dados complexos como JSON
ALTER TABLE trips ADD COLUMN IF NOT EXISTS shopping_list JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS exchange_entries JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS source_trip_id UUID;
```

### 1.4 Criar Novas Tabelas

```sql
-- Requests de compartilhamento
CREATE TABLE IF NOT EXISTS shared_transaction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES profiles(id),
    invited_user_id UUID REFERENCES profiles(id),
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
    assigned_amount NUMERIC(15,2),
    expires_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS shared_system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type TEXT NOT NULL,
    operation_data JSONB,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    execution_time_ms INTEGER,
    user_id UUID REFERENCES profiles(id),
    transaction_id UUID REFERENCES transactions(id),
    request_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Operation queue
CREATE TABLE IF NOT EXISTS shared_operation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    operation_type TEXT NOT NULL,
    operation_data JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    error_message TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Circuit breaker
CREATE TABLE IF NOT EXISTS shared_circuit_breaker (
    operation_type TEXT PRIMARY KEY,
    circuit_state TEXT DEFAULT 'CLOSED', -- CLOSED, OPEN, HALF_OPEN
    failure_count INTEGER DEFAULT 0,
    last_failure_at TIMESTAMP,
    next_attempt_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## FASE 2: VALIDAÇÕES (Semana 2-3)

### 2.1 Criar Serviço de Validação

```typescript
// src/services/validationService.ts

export const validateTransaction = (
    transaction: Partial<Transaction>,
    account?: Account,
    allTransactions?: Transaction[]
): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Campos obrigatórios
    if (!transaction.amount || transaction.amount <= 0) {
        errors.push('Valor deve ser maior que zero');
    }

    // 2. Data válida
    if (transaction.date) {
        const [year, month, day] = transaction.date.split('-').map(Number);
        const reconstructedDate = new Date(year, month - 1, day);
        if (
            reconstructedDate.getFullYear() !== year ||
            reconstructedDate.getMonth() !== month - 1 ||
            reconstructedDate.getDate() !== day
        ) {
            errors.push('Data inválida (dia não existe no mês)');
        }
    }

    // 3. Limite de cartão
    if (account?.type === 'CREDIT_CARD') {
        if (account.credit_limit && 
            Math.abs(account.balance) + (transaction.amount || 0) > account.credit_limit) {
            warnings.push(`Ultrapassará o limite do cartão`);
        }
    }

    // 4. Parcelamento
    if (transaction.is_installment) {
        if (!transaction.total_installments || transaction.total_installments < 2) {
            errors.push('Parcelamento deve ter pelo menos 2 parcelas');
        }
        if (transaction.total_installments && transaction.total_installments > 48) {
            warnings.push('Número de parcelas muito alto');
        }
    }

    // 5. Divisão compartilhada
    if (transaction.is_shared && transaction.transaction_splits) {
        const totalPercentage = transaction.transaction_splits.reduce(
            (sum, s) => sum + (s.percentage || 0), 0
        );
        const totalAssigned = transaction.transaction_splits.reduce(
            (sum, s) => sum + (s.amount || 0), 0
        );

        if (Math.abs(totalPercentage - 100) > 0.01) {
            errors.push('Soma das percentagens deve ser 100%');
        }

        if (totalAssigned > (transaction.amount || 0)) {
            errors.push('Divisão excede o valor total');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};
```

### 2.2 Atualizar TransactionForm

```typescript
// src/components/transactions/TransactionForm.tsx

// Adicionar validações
const [errors, setErrors] = useState<string[]>([]);
const [warnings, setWarnings] = useState<string[]>([]);

const handleSubmit = async () => {
    const validation = validateTransaction({
        amount: getNumericAmount(),
        description,
        date: format(date, 'yyyy-MM-dd'),
        type: activeTab,
        is_installment: isInstallment,
        total_installments: totalInstallments,
        is_shared: hasSharing,
        transaction_splits: splits
    }, selectedAccount, allTransactions);

    if (!validation.isValid) {
        setErrors(validation.errors);
        return;
    }

    if (validation.warnings.length > 0) {
        setWarnings(validation.warnings);
        // Mostrar confirmação
    }

    // Prosseguir com criação
};
```

---

## FASE 3: FUNCIONALIDADES AVANÇADAS (Semana 3-4)

### 3.1 Suporte a Reembolsos

```typescript
// src/components/transactions/TransactionForm.tsx

const [isRefund, setIsRefund] = useState(false);

// Adicionar toggle
<div className="flex items-center gap-2">
    <Switch
        checked={isRefund}
        onCheckedChange={setIsRefund}
    />
    <Label>Reembolso</Label>
</div>

// Atualizar descrição
const description = isRefund ? `Reembolso: ${baseDescription}` : baseDescription;

// Atualizar ledger
if (isRefund && activeTab === 'EXPENSE') {
    // Debit Account, Credit Category (invertido)
}
```

### 3.2 Recorrência Avançada

```typescript
// src/components/transactions/TransactionForm.tsx

const [isRecurring, setIsRecurring] = useState(false);
const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
const [recurrenceDay, setRecurrenceDay] = useState(1);

// Adicionar campos
{isRecurring && (
    <>
        <Select value={frequency} onValueChange={setFrequency}>
            <SelectItem value="DAILY">Diariamente</SelectItem>
            <SelectItem value="WEEKLY">Semanalmente</SelectItem>
            <SelectItem value="MONTHLY">Mensalmente</SelectItem>
            <SelectItem value="YEARLY">Anualmente</SelectItem>
        </Select>

        {frequency === 'MONTHLY' && (
            <Input
                type="number"
                min="1"
                max="31"
                value={recurrenceDay}
                onChange={(e) => setRecurrenceDay(parseInt(e.target.value))}
                placeholder="Dia do mês"
            />
        )}
    </>
)}
```

### 3.3 Notificações

```typescript
// src/components/transactions/TransactionForm.tsx

const [enableNotification, setEnableNotification] = useState(false);
const [notificationDate, setNotificationDate] = useState<Date>();

{enableNotification && (
    <>
        <Label>Data da Notificação</Label>
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline">
                    {notificationDate ? format(notificationDate, 'dd/MM/yyyy') : 'Selecionar'}
                </Button>
            </PopoverTrigger>
            <PopoverContent>
                <Calendar
                    mode="single"
                    selected={notificationDate}
                    onSelect={setNotificationDate}
                />
            </PopoverContent>
        </Popover>
    </>
)}
```

### 3.4 Aba "Compras" em Viagens

```typescript
// src/components/trips/TripShopping.tsx

interface TripShoppingItem {
    id: string;
    item: string;
    estimatedCost: number;
    purchased: boolean;
}

export function TripShopping({ trip, onUpdateTrip }: TripShoppingProps) {
    const [shoppingList, setShoppingList] = useState<TripShoppingItem[]>(
        trip.shopping_list || []
    );

    const handleAddItem = (item: string, cost: number) => {
        const newItem: TripShoppingItem = {
            id: crypto.randomUUID(),
            item,
            estimatedCost: cost,
            purchased: false
        };
        const updated = [...shoppingList, newItem];
        setShoppingList(updated);
        onUpdateTrip({ ...trip, shopping_list: updated });
    };

    const handleTogglePurchased = (id: string) => {
        const updated = shoppingList.map(item =>
            item.id === id ? { ...item, purchased: !item.purchased } : item
        );
        setShoppingList(updated);
        onUpdateTrip({ ...trip, shopping_list: updated });
    };

    const totalEstimated = shoppingList.reduce((sum, item) => sum + item.estimatedCost, 0);

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-semibold">Previsão Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalEstimated)}</p>
            </div>

            {/* Lista de itens */}
            <div className="space-y-2">
                {shoppingList.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                        <input
                            type="checkbox"
                            checked={item.purchased}
                            onChange={() => handleTogglePurchased(item.id)}
                        />
                        <div className="flex-1">
                            <p className={item.purchased ? 'line-through text-gray-400' : ''}>
                                {item.item}
                            </p>
                            <p className="text-sm text-gray-500">
                                {formatCurrency(item.estimatedCost)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

### 3.5 Contas Internacionais

```typescript
// src/components/accounts/AccountForm.tsx

const [isInternational, setIsInternational] = useState(false);
const [currency, setCurrency] = useState('BRL');

{isInternational && (
    <Select value={currency} onValueChange={setCurrency}>
        <SelectItem value="USD">USD - Dólar Americano</SelectItem>
        <SelectItem value="EUR">EUR - Euro</SelectItem>
        <SelectItem value="GBP">GBP - Libra Esterlina</SelectItem>
        <SelectItem value="JPY">JPY - Iene Japonês</SelectItem>
        {/* ... mais moedas */}
    </Select>
)}
```

---

## FASE 4: SISTEMA DE COMPARTILHAMENTO (Semana 4-5)

### 4.1 Criar SharedTransactionManager

```typescript
// src/services/SharedTransactionManager.ts

class SharedTransactionManager {
    private cache = new Map<string, any>();
    private syncInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.startAutoSync();
    }

    async createSharedTransaction(data: {
        amount: number;
        description: string;
        sharedWith: Array<{ memberId: string; amount: number }>;
    }) {
        // 1. Criar transação original
        const original = await supabase
            .from('transactions')
            .insert({
                ...data,
                is_shared: true,
                user_id: currentUser.id
            })
            .single();

        // 2. Criar mirrors para cada devedor
        const mirrors = data.sharedWith.map(split => ({
            ...data,
            amount: split.amount,
            source_transaction_id: original.id,
            user_id: split.memberId
        }));

        await supabase
            .from('transactions')
            .insert(mirrors);

        return original;
    }

    async respondToRequest(requestId: string, accept: boolean) {
        const request = await supabase
            .from('shared_transaction_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (accept) {
            // Criar transação para o usuário
            await this.createSharedTransaction({
                amount: request.assigned_amount,
                description: request.transaction_id,
                sharedWith: []
            });
        }

        // Atualizar status do request
        await supabase
            .from('shared_transaction_requests')
            .update({ status: accept ? 'accepted' : 'rejected' })
            .eq('id', requestId);
    }

    private startAutoSync() {
        this.syncInterval = setInterval(() => {
            this.syncPendingOperations();
        }, 30000); // 30 segundos
    }

    private async syncPendingOperations() {
        // Sincronizar operações pendentes
    }
}
```

### 4.2 Criar Hook useSharedFinances Avançado

```typescript
// src/hooks/useSharedFinances.ts

export const useSharedFinances = (memberId: string) => {
    const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            // 1. Transações onde EU paguei (CREDITS)
            const myTransactions = await supabase
                .from('transactions')
                .select(`
                    *,
                    transaction_splits(*)
                `)
                .eq('user_id', currentUser.id)
                .eq('is_shared', true);

            // 2. Transações onde OUTRO pagou (DEBITS)
            const otherTransactions = await supabase
                .from('transactions')
                .select(`
                    *,
                    source_transaction(user_id)
                `)
                .eq('user_id', currentUser.id)
                .not('source_transaction_id', 'is', null);

            // Processar e calcular
            const processed = processInvoices(myTransactions, otherTransactions);
            setInvoices(processed);
            setLoading(false);
        };

        fetchInvoices();
    }, []);

    return { invoices, loading };
};
```

---

## FASE 5: TESTES E OTIMIZAÇÕES (Semana 5-6)

### 5.1 Testes de Validação

```typescript
// src/__tests__/validationService.test.ts

describe('validateTransaction', () => {
    it('deve rejeitar data inválida', () => {
        const result = validateTransaction({
            date: '2024-02-30', // Fevereiro não tem 30 dias
            amount: 100,
            description: 'Test'
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Data inválida');
    });

    it('deve rejeitar divisão > total', () => {
        const result = validateTransaction({
            amount: 100,
            is_shared: true,
            transaction_splits: [
                { amount: 60, percentage: 60 },
                { amount: 50, percentage: 50 } // Total 110 > 100
            ]
        });
        expect(result.isValid).toBe(false);
    });

    it('deve aceitar divisão válida', () => {
        const result = validateTransaction({
            amount: 100,
            is_shared: true,
            transaction_splits: [
                { amount: 50, percentage: 50 },
                { amount: 50, percentage: 50 }
            ]
        });
        expect(result.isValid).toBe(true);
    });
});
```

### 5.2 Testes de Compartilhamento

```typescript
// src/__tests__/sharedTransactions.test.ts

describe('SharedTransactionManager', () => {
    it('deve criar transação com mirrors', async () => {
        const manager = new SharedTransactionManager();
        const result = await manager.createSharedTransaction({
            amount: 300,
            description: 'Jantar',
            sharedWith: [
                { memberId: 'user1', amount: 100 },
                { memberId: 'user2', amount: 100 },
                { memberId: 'user3', amount: 100 }
            ]
        });

        expect(result.id).toBeDefined();
        // Verificar que 3 mirrors foram criados
    });

    it('deve sincronizar transações automaticamente', async () => {
        // Teste de auto-sync
    });
});
```

---

## CRONOGRAMA RESUMIDO

| Fase | Semana | Tarefas |
|------|--------|---------|
| 1 | 1-2 | Adicionar campos, criar tabelas |
| 2 | 2-3 | Validações rigorosas |
| 3 | 3-4 | Reembolsos, recorrência, notificações, compras, internacional |
| 4 | 4-5 | Sistema de compartilhamento avançado |
| 5 | 5-6 | Testes, otimizações, deploy |

---

## CHECKLIST DE IMPLEMENTAÇÃO

### Estrutura de Dados
- [ ] Adicionar campos em transactions
- [ ] Adicionar campos em accounts
- [ ] Adicionar campos em trips
- [ ] Criar tabela shared_transaction_requests
- [ ] Criar tabela shared_system_audit_logs
- [ ] Criar tabela shared_operation_queue
- [ ] Criar tabela shared_circuit_breaker

### Validações
- [ ] Criar validationService.ts
- [ ] Validar data inválida
- [ ] Validar limite de cartão
- [ ] Validar parcelamento
- [ ] Validar divisão compartilhada
- [ ] Validar moeda em viagens

### Funcionalidades
- [ ] Suporte a reembolsos
- [ ] Recorrência avançada
- [ ] Notificações
- [ ] Aba "Compras" em viagens
- [ ] Contas internacionais
- [ ] Transferências com câmbio

### Compartilhamento
- [ ] SharedTransactionManager
- [ ] Sistema de requests
- [ ] Auto-sync
- [ ] Circuit breaker
- [ ] Retry automático

### Testes
- [ ] Testes de validação
- [ ] Testes de compartilhamento
- [ ] Testes de recorrência
- [ ] Testes de notificações
- [ ] Testes de integridade

