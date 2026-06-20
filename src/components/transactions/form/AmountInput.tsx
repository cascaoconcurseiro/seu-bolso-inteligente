import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { cn } from '@/lib/utils';
import { Plane } from 'lucide-react';
import { TabType } from '@/types/transactions';

interface AmountInputProps {
  amount: string;
  onAmountChange: (value: string) => void;
  currency: string;
  currencySymbol: string;
  activeTab: TabType;
  selectedTrip?: any;
}

export function AmountInput({
  amount,
  onAmountChange,
  currency,
  currencySymbol,
  activeTab,
  selectedTrip
}: AmountInputProps) {
  const isExpense = activeTab === 'EXPENSE';
  const isIncome = activeTab === 'INCOME';
  const isTransfer = activeTab === 'TRANSFER';

  return (
    <div className="space-y-2">
      <div className="relative flex flex-col items-center justify-center py-6">
        <span className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-widest">
          Valor
        </span>
        <div className="flex items-center justify-center">
          <span className="text-2xl text-muted-foreground/50 font-medium mr-2 mt-2">
            {currencySymbol}
          </span>
          <CurrencyInput
            placeholder="0,00"
            value={amount}
            onChange={onAmountChange}
            currency={currency}
            className={cn(
              'h-20 md:h-24 text-5xl md:text-6xl font-display font-bold text-center bg-transparent border-none shadow-none focus-visible:ring-0 p-0 placeholder:text-muted-foreground/20',
              isExpense && 'text-destructive',
              isIncome && 'text-positive',
              isTransfer && 'text-primary'
            )}
            autoFocus
          />
        </div>
      </div>
      {selectedTrip && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Plane className="h-3 w-3" />
          Moeda da viagem: {selectedTrip.currency}
        </p>
      )}
    </div>
  );
}
