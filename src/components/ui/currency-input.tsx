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
    const [internalValue, setInternalValue] = useState("");

    // Sincronizar com valor externo
    useEffect(() => {
      if (value === "" || value === "0") {
        setInternalValue("");
      } else {
        // Formatar o valor externo para exibição
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          setInternalValue(numValue.toFixed(2).replace(".", ","));
        }
      }
    }, [value]);

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
      setInternalValue(inputValue);
      
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
      if (internalValue && internalValue !== ",") {
        const normalizedValue = internalValue.replace(",", ".");
        const numericValue = parseFloat(normalizedValue);
        
        if (!isNaN(numericValue)) {
          setInternalValue(numericValue.toFixed(2).replace(".", ","));
        }
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn("font-mono", className)}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
