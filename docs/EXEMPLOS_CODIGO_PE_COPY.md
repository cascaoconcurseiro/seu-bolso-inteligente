# EXEMPLOS DE CÓDIGO DO PE COPY

## 1. VALIDAÇÃO DE TRANSAÇÕES (PE copy)

### Arquivo: `PE copy/producao/src/services/validationService.ts`

```typescript
// VALIDAÇÃO CRÍTICA: Divisão compartilhada não pode exceder total
if (transaction.isShared && transaction.sharedWith) {
    const totalPercentage = SafeFinancialCalculator.safeSum(
        transaction.sharedWith.map(s => SafeFinancialCalculator.toSafeNumber(s.percentage, 0))
    );
    const totalAssigned = SafeFinancialCalculator.safeSum(
        transaction.sharedWith.map(s => SafeFinancialCalculator.toSafeNumber(s.assignedAmount, 0))
    );
    
    // Validate percentages sum to 100%
    if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.push('A soma das porcentagens deve ser 100%');
    }
    
    // ✅ VALIDAÇÃO CRÍTICA: Splits não podem exceder o valor total
    const safeAmount = SafeFinancialCalculator.toSafeNumber(transaction.amount, 0);
    if (safeAmount > 0 && totalAssigned > safeAmount) {
        errors.push(`Divisão inválida: soma dos valores (${totalAssigned.toFixed(2)}) é maior que o total (${safeAmount.toFixed(2)})`);
    }
}

// VALIDAÇÃO: Data inválida (ex: 2024-02-30)
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

// VALIDAÇÃO: Parcelamento
if (transaction.isInstallment) {
    if (!transaction.totalInstallments || transaction.totalInstallments < 2) {
        errors.push('Parcelamento deve ter pelo menos 2 parcelas');
    }
    if (transaction.totalInstallments && transaction.totalInstallments > 48) {
        warnings.push('Número de parcelas muito alto (mais de 48)');
    }
}
```

---

## 2. LEDGER COM REEMBOLSOS (PE copy)

### Arquivo: `PE copy/producao/src/services/ledger.ts`

```typescript
if (tx.type === TransactionType.EXPENSE) {
    // Expense: Debit Category, Credit Account
    // If it's a refund, it's reversed: Debit Account, Credit Category
    if (tx.isRefund) {
        ledger.push({
            id: tx.id,
            date,
            description: `Reembolso: ${description}`,
            debit: getAccountName(tx.accountId),
            credit: tx.category,
            amount
        });
    } else {
        ledger.push({
            id: tx.id,
            date,
            description,
            debit: tx.category,
            credit: getAccountName(tx.accountId),
            amount
        });
    }
}

// ✅ VALIDAÇÃO CRÍTICA: Ignorar transações órfãs (conta deletada)
if (!tx.accountId || !accountIds.has(tx.accountId)) {
    return;
}

// ✅ VALIDAÇÃO CRÍTICA: Para transferências, verificar se destino existe
if (tx.type === TransactionType.TRANSFER && tx.destinationAccountId) {
    if (!accountIds.has(tx.destinationAccountId)) {
        return;
    }
}
```

---

## 3. COMPARTILHAMENTO COM DEBIT LOGIC (PE copy)

### Arquivo: `PE copy/producao/src/hooks/useSharedFinances.ts`

```typescript
// 2. DEBIT LOGIC: Other Paid, User Owes
else {
    // Fix: Map Payer UserID to MemberID
    // The payerId on the transaction is the Auth User ID (UUID).
    // We need to group it under the Family Member ID.
    let payerMember = members.find(m => m.linkedUserId === t.payerId);

    // FALLBACK: Fuzzy Match by Name from Description
    // If database link is missing, try to parse "(Compartilhado por NAME)"
    if (!payerMember && t.description) {
        const match = t.description.match(/\(Compartilhado por (.*?)\)/);
        if (match && match[1]) {
            const nameToFind = match[1].trim().toLowerCase();
            payerMember = members.find(m => 
                m.name.toLowerCase() === nameToFind || 
                m.name.split(' ')[0].toLowerCase() === nameToFind
            );
        }
    }

    const targetMemberId = payerMember ? payerMember.id : t.payerId;

    // CORREÇÃO: Verificar se EU estou no shared_with como devedor
    // Se sim, usar o meu assignedAmount diretamente
    const myUserId = t.userId; // ID do usuário atual (dono da transação)
    const mySplit = t.sharedWith?.find(s => s.memberId === myUserId);

    let myShare: number;
    if (mySplit) {
        // EU estou explicitamente no shared_with, usar o valor atribuído
        myShare = mySplit.assignedAmount;
    } else {
        // Lógica antiga: calcular o resto (para compatibilidade)
        const totalSplits = t.sharedWith?.reduce((sum, s) => sum + s.assignedAmount, 0) || 0;
        myShare = t.amount - totalSplits;
    }

    if (myShare > 0.01) {
        invoiceMap[targetMemberId].push({
            id: `${t.id}-debit-${targetMemberId}`,
            originalTxId: t.id,
            description: t.description,
            date: t.date,
            category: t.category as string,
            amount: myShare,
            type: 'DEBIT',
            isPaid: !!t.isSettled,
            tripId: t.tripId,
            memberId: targetMemberId,
            currency: txCurrency,
            installmentNumber: t.currentInstallment,
            totalInstallments: t.totalInstallments,
            creatorUserId: (t.payerId && t.payerId !== 'me') ? t.payerId : t.userId
        });
    }
}
```

---

## 4. ABA "COMPRAS" EM VIAGENS (PE copy)

### Arquivo: `PE copy/producao/src/features/trips/tabs/TripShopping.tsx`

```typescript
export const TripShopping: React.FC<TripShoppingProps> = ({ trip, onUpdateTrip }) => {
    const [shopItem, setShopItem] = useState('');
    const [shopEstCost, setShopEstCost] = useState('');
    const [editingShoppingId, setEditingShoppingId] = useState<string | null>(null);

    // OPTIMISTIC STATE
    const [localShoppingList, setLocalShoppingList] = useState<TripShoppingItem[]>(trip.shoppingList || []);

    const syncToServer = (newList: TripShoppingItem[]) => {
        onUpdateTrip({ ...trip, shoppingList: newList });
    };

    const handleSaveShoppingItem = () => {
        if (!shopItem.trim()) return;
        let updatedList = [...localShoppingList];
        const estCost = shopEstCost ? parseFloat(shopEstCost) : 0;

        if (editingShoppingId) {
            updatedList = updatedList.map(item => 
                item.id === editingShoppingId 
                    ? { ...item, item: shopItem, estimatedCost: estCost } 
                    : item
            );
        } else {
            updatedList.push({ 
                id: Math.random().toString(36).substr(2, 9), 
                item: shopItem, 
                estimatedCost: estCost, 
                purchased: false 
            });
        }

        // Optimistic
        setLocalShoppingList(updatedList);
        syncToServer(updatedList);

        setShopItem('');
        setShopEstCost('');
        setEditingShoppingId(null);
    };

    const toggleShoppingItem = (itemId: string) => {
        const updatedList = localShoppingList.map(i => 
            i.id === itemId ? { ...i, purchased: !i.purchased } : i
        );
        setLocalShoppingList(updatedList);
        syncToServer(updatedList);
    };

    return (
        <div className="space-y-6">
            <Card title={editingShoppingId ? "Editar Item" : "Lista de Desejos"}>
                <div className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-xl mb-4">
                    <span className="text-sm font-bold text-violet-700">Previsão Total de Gastos</span>
                    <span className="text-lg font-black text-violet-900">
                        {formatCurrency(
                            localShoppingList.reduce((acc, item) => acc + (item.estimatedCost || 0), 0), 
                            trip.currency
                        )}
                    </span>
                </div>

                <div className="space-y-2">
                    {localShoppingList.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3 flex-1 cursor-pointer" 
                                 onClick={() => toggleShoppingItem(item.id)}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center 
                                    ${item.purchased ? 'bg-emerald-500 border-emerald-500' : 'border-slate-400'}`}>
                                    {item.purchased && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div>
                                    <p className={`font-bold text-sm 
                                        ${item.purchased ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                        {item.item}
                                    </p>
                                    {item.estimatedCost && 
                                        <p className="text-xs text-slate-500">
                                            Est: {formatCurrency(item.estimatedCost, trip.currency)}
                                        </p>
                                    }
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => startEditingShopping(item)}>
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteShoppingItem(item.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};
```

---

## 5. TRANSFERÊNCIAS INTERNACIONAIS (PE copy)

### Arquivo: `PE copy/producao/src/features/transactions/TransactionForm.tsx`

```typescript
// NEW: Strict Transfer Logic
const [isConversion, setIsConversion] = React.useState(false);

// Reset conversion toggle if account changes
useEffect(() => {
    setIsConversion(false);
}, [accountId]);

const filteredDestinationAccounts = React.useMemo(() => {
    if (!isTransfer || !selectedAccountObj) return [];

    return accounts.filter(acc => {
        // Cannot transfer to itself
        if (acc.id === accountId) return false;
        // NEVER transfer TO credit card
        if (acc.type === AccountType.CREDIT_CARD || (acc.type as string) === 'CREDIT_CARD') return false;

        // Conversion Logic
        const isSourceInternational = selectedAccountObj.isInternational || selectedAccountObj.currency !== 'BRL';

        if (isSourceInternational) {
            // Sender is International (or Foreign Currency)
            // Can transfer to:
            // 1. Another international account (same currency)
            // 2. BRL account (with conversion)
            return true;
        } else {
            // Sender is BRL
            // Can transfer to:
            // 1. Another BRL account
            // 2. International account (with conversion)
            return true;
        }
    });
}, [accountId, accounts, isTransfer, selectedAccountObj]);

// MULTI-CURRENCY TRANSFER
const isMultiCurrencyTransfer = isTransfer && 
    selectedAccountObj && 
    selectedDestAccountObj && 
    selectedAccountObj.currency !== selectedDestAccountObj.currency;

// If multi-currency, show exchange rate input
{isMultiCurrencyTransfer && (
    <div className="space-y-2">
        <label className="text-sm font-bold">Taxa de Câmbio</label>
        <input
            type="number"
            value={manualExchangeRate}
            onChange={(e) => setManualExchangeRate(parseFloat(e.target.value))}
            placeholder="1.00"
            step="0.01"
        />
        <p className="text-xs text-slate-500">
            {activeAmount} {selectedAccountObj.currency} = 
            {(activeAmount * manualExchangeRate).toFixed(2)} {selectedDestAccountObj.currency}
        </p>
    </div>
)}
```

---

## 6. OWNERSHIP CHECK (PE copy)

### Arquivo: `PE copy/producao/src/features/transactions/TransactionForm.tsx`

```typescript
// OWNERSHIP CHECK
// If we have initialData (Edit Mode) AND we have IDs to compare:
// User can edit if they are the owner (userId matches) OR if they created the transaction (createdBy matches).
// Legacy support: If initialData.userId is missing, allow edit (assume migration or lax rule).
const isOwner = !initialData || !initialData.userId || !currentUserId || 
                initialData.userId === currentUserId || 
                initialData.createdBy === currentUserId;
const isReadOnly = !isOwner;

// LOCK LOGIC: If this transaction is a Mirror (has sourceTransactionId), IT IS READ ONLY.
const isLocked = !!initialData?.sourceTransactionId;

// Render form as read-only if locked or not owner
{(isReadOnly || isLocked) && (
    <Alert>
        <AlertDescription>
            {isLocked 
                ? 'Esta é uma transação espelho e não pode ser editada.' 
                : 'Você não tem permissão para editar esta transação.'}
        </AlertDescription>
    </Alert>
)}
```

---

## 7. TRIP CURRENCY VALIDATION (PE copy)

```typescript
// STRICT CURRENCY MATCH: Trip expenses can ONLY use accounts with the SAME currency
const filteredAccountsForTrip = React.useMemo(() => {
    if (!selectedTrip) {
        return availableAccounts; // No trip = all accounts available
    }
    // Only show accounts that match the trip's currency
    return availableAccounts.filter(acc => acc.currency === selectedTrip.currency);
}, [availableAccounts, selectedTrip]);

// If trip is selected and account currency doesn't match
if (selectedTrip && selectedAccountObj && selectedAccountObj.currency !== selectedTrip.currency) {
    errors.push(
        `Conta em ${selectedAccountObj.currency} não pode ser usada em viagem em ${selectedTrip.currency}`
    );
}
```

---

## 8. SHARED TRANSACTION MANAGER (PE copy)

### Arquivo: `PE copy/producao/src/services/SharedTransactionManager.ts`

```typescript
class SharedTransactionManager extends SimpleEventEmitter {
    private cache = new Map<string, CacheEntry<any>>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    private syncInterval: number | null = null;

    // ==================
    // CACHE MANAGEMENT
    // ==================

    private getCacheKey(type: string, id: string): string {
        return `${type}:${id}`;
    }

    private setCache<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    private getCache<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    private invalidateCache(pattern: string): void {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }

    // ==================
    // AUTO SYNC
    // ==================

    private startAutoSync(): void {
        this.syncInterval = window.setInterval(() => {
            this.syncPendingOperations();
        }, 30000); // 30 seconds
    }

    private async syncPendingOperations(): Promise<void> {
        // Sync logic here
        this.emit('sync-complete');
    }

    // ==================
    // REALTIME SUBSCRIPTIONS
    // ==================

    private setupRealtimeSubscriptions(): void {
        // Subscribe to shared_transaction_requests
        // Subscribe to shared_transaction_mirrors
        // Subscribe to shared_operation_queue
    }
}
```

---

## 9. TIPOS DE DADOS COMPLETOS (PE copy)

### Arquivo: `PE copy/producao/src/types/db.ts`

```typescript
export interface DBTransaction extends DBBaseEntity {
    date: string;
    amount: number;
    type: TransactionType;
    category: string;
    description: string;
    account_id?: string;
    destination_account_id?: string;
    trip_id?: string;
    currency?: string;

    // Recorrência
    is_recurring?: boolean;
    frequency?: Frequency;
    recurrence_day?: number;
    last_generated?: string;

    // Parcelamento
    is_installment?: boolean;
    current_installment?: number;
    total_installments?: number;
    original_amount?: number;
    series_id?: string;

    // Notificações
    enable_notification?: boolean;
    notification_date?: string;

    // Compartilhamento
    observation?: string;
    is_shared?: boolean;
    shared_with?: Record<string, unknown>[] | null; // JSONB
    payer_id?: string;

    // Acertos
    is_settled?: boolean;
    settled_at?: string;

    // Reembolsos
    is_refund?: boolean;
    destination_amount?: number;
    exchange_rate?: number;

    // Sincronização
    external_id?: string;
}
```

---

## 10. FUNÇÕES SQL AVANÇADAS (PE copy)

```sql
-- Criar transação compartilhada com mirrors automáticos
CREATE OR REPLACE FUNCTION create_shared_transaction_v2(
    p_account_id UUID,
    p_amount NUMERIC,
    p_category TEXT,
    p_description TEXT,
    p_due_date TEXT DEFAULT NULL,
    p_installments INTEGER DEFAULT 1,
    p_shared_with JSONB,
    p_user_id UUID
) RETURNS JSON AS $$
DECLARE
    v_transaction_id UUID;
    v_result JSON;
BEGIN
    -- 1. Create original transaction
    INSERT INTO transactions (
        user_id, account_id, amount, category, description,
        date, type, is_shared, shared_with
    ) VALUES (
        p_user_id, p_account_id, p_amount, p_category, p_description,
        COALESCE(p_due_date::DATE, CURRENT_DATE), 'EXPENSE', true, p_shared_with
    ) RETURNING id INTO v_transaction_id;

    -- 2. Create mirror transactions for each participant
    INSERT INTO transactions (
        user_id, account_id, amount, category, description,
        date, type, is_shared, source_transaction_id
    )
    SELECT
        (item->>'user_id')::UUID,
        p_account_id,
        (item->>'amount')::NUMERIC,
        p_category,
        p_description,
        COALESCE(p_due_date::DATE, CURRENT_DATE),
        'EXPENSE',
        true,
        v_transaction_id
    FROM jsonb_array_elements(p_shared_with) AS item;

    -- 3. Return result
    SELECT json_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'message', 'Transação compartilhada criada com sucesso'
    ) INTO v_result;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

