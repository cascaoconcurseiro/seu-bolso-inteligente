import { forwardRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { moneyUtils } from "@/utils/money";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, currency = "BRL", className, ...props }, ref) => {
    // Inicializa o estado visual a partir do value (caso venha preenchido)
    const [displayValue, setDisplayValue] = useState(() => {
      if (!value) return "";
      const numericValue = moneyUtils.parse(value);
      if (isNaN(numericValue)) return "";
      return numericValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    });

    // Sincroniza o valor do input caso ele seja alterado externamente (ex: initialData ao editar transação)
    useEffect(() => {
      if (!value) {
        setDisplayValue("");
        return;
      }
      const numericValue = moneyUtils.parse(value);
      const currentParsedDisplay = moneyUtils.parse(displayValue.replace(/\./g, "").replace(",", "."));
      
      // Se o valor real for diferente do que está sendo exibido, atualiza o display
      // Isso impede que ele pisque/reset se estivermos apenas digitando (e.g. 1.00 vs 1,00)
      if (!isNaN(numericValue) && numericValue !== currentParsedDisplay) {
        setDisplayValue(numericValue.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }));
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);


    const formatToCurrency = (val: string) => {
      const digits = val.replace(/\D/g, "");
      if (!digits) return "";
      
      const numericValue = parseInt(digits, 10) / 100;
      return numericValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const digits = rawValue.replace(/\D/g, "");
      
      if (!digits) {
        setDisplayValue("");
        onChange("");
        return;
      }
      
      const numericValue = parseInt(digits, 10) / 100;
      
      const formatted = numericValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      
      setDisplayValue(formatted);
      onChange(numericValue.toString());
    };

    const handleBlur = () => {
      // Nothing needed here since the format is strictly controlled on every change
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn("font-mono", className)}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
