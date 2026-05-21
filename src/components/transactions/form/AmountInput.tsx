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
      <Label>Valor</Label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
          {currencySymbol}
        </span>
        <CurrencyInput
          placeholder="0,00"
          value={amount}
          onChange={onAmountChange}
          currency={currency}
          className={cn(
            'pl-12 h-16 text-3xl font-mono font-bold text-center',
            isExpense && 'text-destructive',
            isIncome && 'text-positive',
            isTransfer && 'text-primary'
          )}
          autoFocus
        />
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
