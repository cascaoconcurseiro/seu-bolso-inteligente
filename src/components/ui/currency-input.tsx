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
    const [rawValue, setRawValue] = useState("");

    // Formata o valor para exibição
    const formatDisplay = (val: string) => {
      if (!val) return "";
      
      const numericValue = parseFloat(val);
      if (isNaN(numericValue)) return "";

      // Formata com separadores
      if (currency === "BRL") {
        return numericValue.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      } else {
        return numericValue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
    };

    // Atualiza display quando value externo muda
    useEffect(() => {
      if (value === "" || value === "0") {
        setDisplayValue("");
        setRawValue("");
      } else {
        setRawValue(value);
        setDisplayValue(formatDisplay(value));
      }
    }, [value, currency]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;
      
      // Permitir apenas números, vírgula e ponto
      inputValue = inputValue.replace(/[^\d,]/g, "");
      
      // Substituir vírgula por ponto para cálculos
      const normalizedValue = inputValue.replace(",", ".");
      
      // Validar formato (apenas um ponto decimal)
      const parts = normalizedValue.split(".");
      if (parts.length > 2) {
        return; // Mais de um ponto decimal, ignorar
      }
      
      // Limitar casas decimais a 2
      if (parts.length === 2 && parts[1].length > 2) {
        return;
      }
      
      // Se está vazio, limpar tudo
      if (!inputValue) {
        setDisplayValue("");
        setRawValue("");
        onChange("");
        return;
      }
      
      // Atualizar raw value
      setRawValue(normalizedValue);
      
      // Atualizar display (manter o que o usuário está digitando)
      setDisplayValue(inputValue);
      
      // Retornar valor numérico
      const numericValue = parseFloat(normalizedValue);
      if (!isNaN(numericValue)) {
        onChange(numericValue.toString());
      } else {
        onChange("");
      }
    };

    const handleBlur = () => {
      // Ao sair do campo, formatar o valor
      if (rawValue) {
        const formatted = formatDisplay(rawValue);
        setDisplayValue(formatted);
      }
    };

    const handleFocus = () => {
      // Ao focar, mostrar valor editável (com vírgula)
      if (rawValue) {
        const numericValue = parseFloat(rawValue);
        if (!isNaN(numericValue)) {
          // Mostrar com vírgula para edição
          const editableValue = numericValue.toFixed(2).replace(".", ",");
          setDisplayValue(editableValue);
        }
      }
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
      // Permite vírgula (188, 194)
      if ([188, 194].includes(e.keyCode)) {
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
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className={cn("font-mono", className)}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
