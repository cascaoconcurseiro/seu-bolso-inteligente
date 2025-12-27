# Correções: Botão Nova Transação e Seletor de Mês

## Problemas Identificados

1. **Botão "Nova transação" só funciona no Dashboard e Transactions**
   - Falta adicionar listener em: Accounts, CreditCards, SharedExpenses, Reports, Trips, Family, Settings

2. **Seletor de mês não filtra transações**
   - `useTransactions` não usa o contexto `MonthContext`
   - Precisa filtrar automaticamente por mês selecionado

3. **Reports tem seletor próprio**
   - Deve usar o seletor global do AppLayout
   - Remover seletor local

## Correções a Fazer

### 1. Adicionar listener em todas as páginas

Adicionar em cada página:
```typescript
const [showTransactionModal, setShowTransactionModal] = useState(false);

useEffect(() => {
  const handleOpenModal = () => setShowTransactionModal(true);
  window.addEventListener('openTransactionModal', handleOpenModal);
  return () => window.removeEventListener('openTransactionModal', handleOpenModal);
}, []);

// No JSX:
<TransactionModal
  open={showTransactionModal}
  onOpenChange={setShowTransactionModal}
/>
```

### 2. Atualizar useTransactions

```typescript
import { useMonth } from "@/contexts/MonthContext";
import { startOfMonth, endOfMonth, format } from "date-fns";

export function useTransactions(filters?: TransactionFilters) {
  const { user } = useAuth();
  const { currentDate } = useMonth();

  // Adicionar filtro de mês automaticamente
  const effectiveFilters = filters || {};
  if (!effectiveFilters.startDate && !effectiveFilters.endDate) {
    effectiveFilters.startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    effectiveFilters.endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
  }

  return useQuery({
    queryKey: ["transactions", user?.id, effectiveFilters, currentDate],
    // ... resto
  });
}
```

### 3. Remover seletor de Reports

- Remover `selectedMonth` e `setSelectedMonth`
- Usar `currentDate` do contexto
- Remover botões de navegação de mês
