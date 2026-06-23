import { CurrencyInput } from '@/components/ui/currency-input';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface AmountInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  currencySymbol?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  textColorClass?: string;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  containerClassName?: string;
}

export function AmountInput({
  label = 'Valor',
  value,
  onChange,
  currency = 'BRL',
  currencySymbol = 'R$',
  className,
  error,
  disabled,
  autoFocus,
  textColorClass = '',
  children,
  size = 'md',
  containerClassName
}: AmountInputProps) {
  
  const sizeClasses = {
    sm: 'h-10 text-xl',
    md: 'h-12 text-2xl',
    lg: 'h-14 text-3xl',
  };

  const symbolSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  return (
    <div className={cn("space-y-2", containerClassName)}>
      <div className="relative flex flex-col items-center justify-center py-2">
        {label && (
          <span className="text-sm font-medium text-muted-foreground mb-2 text-center">
            {label}
          </span>
        )}
        <div className="flex items-center justify-center w-full">
          <span className={cn("text-muted-foreground/50 font-medium mr-2 mt-2", symbolSizeClasses[size])}>
            {currencySymbol}
          </span>
          <CurrencyInput
            placeholder="0,00"
            value={value}
            onChange={onChange}
            currency={currency}
            disabled={disabled}
            className={cn(
              sizeClasses[size],
              'font-display font-bold text-center bg-transparent border-none shadow-none focus-visible:ring-0 p-0 placeholder:text-muted-foreground/20 min-w-[100px] w-auto max-w-full inline-block',
              error && 'text-destructive',
              textColorClass,
              className
            )}
            autoFocus={autoFocus}
          />
        </div>
        {children}
      </div>
    </div>
  );
}
