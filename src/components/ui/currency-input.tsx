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
    // Inicializa o estado visual a partir do value (caso venha preenchido)
    const [displayValue, setDisplayValue] = useState(() => {
      if (!value) return "";
      const numericValue = parseFloat(value);
      if (isNaN(numericValue)) return "";
      return numericValue.toString().replace(".", ",");
    });

    const formatToCurrency = (val: string) => {
      if (!val) return "";
      let cleanValue = val.replace(/[^\d,]/g, "");
      const parts = cleanValue.split(",");
      if (parts.length > 2) {
        cleanValue = parts[0] + "," + parts.slice(1).join("");
      }
      const finalParts = cleanValue.split(",");
      if (finalParts.length === 2 && finalParts[1].length > 2) {
        finalParts[1] = finalParts[1].slice(0, 2);
      }
      finalParts[0] = finalParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return finalParts.join(",");
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const formatted = formatToCurrency(rawValue);
      setDisplayValue(formatted);
      
      const unformatted = formatted.replace(/\./g, "").replace(",", ".");
      const numericValue = parseFloat(unformatted);
      
      if (!isNaN(numericValue)) {
        onChange(numericValue.toString());
      } else {
        onChange("");
      }
    };

    const handleBlur = () => {
      if (displayValue && displayValue !== ",") {
        const unformatted = displayValue.replace(/\./g, "").replace(",", ".");
        const numericValue = parseFloat(unformatted);
        
        if (!isNaN(numericValue)) {
          const formatted = formatToCurrency(numericValue.toFixed(2).replace(".", ","));
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
