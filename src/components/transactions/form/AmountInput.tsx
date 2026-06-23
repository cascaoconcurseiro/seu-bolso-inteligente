import { AmountInput as GenericAmountInput } from '@/components/ui/amount-input';
import { Plane } from 'lucide-react';
import { useTransactionStore } from '@/store/useTransactionStore';

interface AmountInputProps {
  currency: string;
  currencySymbol: string;
  selectedTrip?: any;
}

export function AmountInput({
  currency,
  currencySymbol,
  selectedTrip
}: AmountInputProps) {
  const amount = useTransactionStore((state) => state.amount);
  const setAmount = useTransactionStore((state) => state.setAmount);
  const activeTab = useTransactionStore((state) => state.activeTab);

  const isExpense = activeTab === 'EXPENSE';
  const isIncome = activeTab === 'INCOME';
  const isTransfer = activeTab === 'TRANSFER';

  let textColorClass = '';
  if (isExpense) textColorClass = 'text-destructive';
  if (isIncome) textColorClass = 'text-positive';
  if (isTransfer) textColorClass = 'text-primary';

  return (
    <GenericAmountInput
      value={amount}
      onChange={setAmount}
      currency={currency}
      currencySymbol={currencySymbol}
      textColorClass={textColorClass}
      size="md"
      autoFocus
    >
      {selectedTrip && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
          <Plane className="h-3 w-3" />
          Moeda da viagem: {selectedTrip.currency}
        </p>
      )}
    </GenericAmountInput>
  );
}
