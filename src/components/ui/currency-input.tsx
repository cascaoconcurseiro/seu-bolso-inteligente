import { forwardRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, currency = "BRL", className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState("");

    // Formata o valor para exibição
    const formatDisplay = (numericValue: string) => {
      if (!numericValue) return "";
      
      // Remove tudo que não é número
      const numbers = numericValue.replace(/\D/g, "");
      if (!numbers) return "";

      // Converte para número (últimos 2 dígitos são centavos)
      const cents = parseInt(numbers, 10);
      const reais = cents / 100;

      // Formata com separadores
      if (currency === "BRL") {
        return reais.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      } else {
        return reais.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
    };

    // Atualiza display quando value externo muda
    useEffect(() => {
      if (value === "") {
        setDisplayValue("");
      } else {
        const numbers = value.replace(/\D/g, "");
        if (numbers) {
          setDisplayValue(formatDisplay(numbers));
        }
      }
    }, [value, currency]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Remove tudo que não é número
      const numbers = inputValue.replace(/\D/g, "");
      
      if (!numbers) {
        setDisplayValue("");
        onChange("");
        return;
      }

      // Atualiza display formatado
      const formatted = formatDisplay(numbers);
      setDisplayValue(formatted);

      // Retorna o valor numérico puro (em reais)
      const cents = parseInt(numbers, 10);
      const reais = cents / 100;
      onChange(reais.toString());
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Permite: backspace, delete, tab, escape, enter
      if ([8, 9, 27, 13, 46].includes(e.keyCode)) {
        return;
      }
      // Permite: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
        return;
      }
      // Permite: home, end, left, right
      if (e.keyCode >= 35 && e.keyCode <= 39) {
        return;
      }
      // Bloqueia se não for número
      if ((e.shiftKey || e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={cn("font-mono", className)}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
