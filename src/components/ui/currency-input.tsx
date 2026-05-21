import { forwardRef, useState } from "react";
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;
      
      // Permitir apenas números e vírgula
      inputValue = inputValue.replace(/[^\d,]/g, "");
      
      // Permitir apenas uma vírgula
      const parts = inputValue.split(",");
      if (parts.length > 2) {
        return;
      }
      
      // Limitar casas decimais a 2
      if (parts.length === 2 && parts[1].length > 2) {
        return;
      }
      
      // Atualizar valor interno (o que o usuário vê)
      setDisplayValue(inputValue);
      
      // Converter para número e enviar para o pai
      if (!inputValue || inputValue === ",") {
        onChange("");
        return;
      }
      
      const normalizedValue = inputValue.replace(",", ".");
      const numericValue = parseFloat(normalizedValue);
      
      if (!isNaN(numericValue)) {
        onChange(numericValue.toString());
      } else {
        onChange("");
      }
    };

    const handleBlur = () => {
      // Ao sair do campo, garantir formato com 2 casas decimais
      if (displayValue && displayValue !== ",") {
        const normalizedValue = displayValue.replace(",", ".");
        const numericValue = parseFloat(normalizedValue);
        
        if (!isNaN(numericValue)) {
          const formatted = numericValue.toFixed(2).replace(".", ",");
          setDisplayValue(formatted);
          onChange(numericValue.toString());
        }
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
        className={cn("font-mono", className)}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
