import { CurrencyInput } from '@/components/ui/currency-input';
import { Plane } from 'lucide-react';
import { useTransactionStore } from '@/store/useTransactionStore';
import { cn } from '@/lib/utils';

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
  if (isExpense) textColorClass = 'text-[hsl(var(--danger))]';
  if (isIncome) textColorClass = 'text-[hsl(var(--success))]';
  if (isTransfer) textColorClass = 'text-[hsl(var(--accent))]';

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="flex items-center justify-center w-full">
        <span className={cn(
          "text-[20px] text-[hsl(var(--text-secondary))] font-medium mr-1 mt-1 leading-none"
        )}>
          {currencySymbol}
        </span>
        <CurrencyInput
          placeholder="0,00"
          value={amount}
          onChange={setAmount}
          currency={currency}
          className={cn(
            'text-[40px] font-bold text-center bg-transparent border-0 border-b-2 border-[hsl(var(--border-color))] rounded-none shadow-none focus-visible:ring-0 focus-visible:border-[hsl(var(--ring))] px-1 py-0 min-w-[120px] w-auto max-w-[280px]',
            'placeholder:text-[hsl(var(--text-muted))] placeholder:opacity-30',
            'transition-colors duration-200 focus-visible:outline-none',
            'caret-[hsl(var(--text-primary))]',
            textColorClass
          )}
          autoFocus
        />
      </div>
      {selectedTrip && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
          <Plane className="h-3 w-3" />
          Moeda da viagem: {selectedTrip.currency}
        </p>
      )}
    </div>
  );
}
