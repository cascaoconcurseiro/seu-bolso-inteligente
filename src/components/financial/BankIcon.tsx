import { getBankById, getBankByName, getCardBrand } from "@/lib/banks";
import { cn } from "@/lib/utils";

interface BankIconProps {
  bankId?: string | null;
  bankName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BankIcon({ bankId, bankName, size = "md", className }: BankIconProps) {
  const bank = bankId ? getBankById(bankId) : bankName ? getBankByName(bankName) : null;
  
  if (!bank) return null;

  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  return (
    <div
      className={cn(
        "rounded-xl flex items-center justify-center font-bold shrink-0",
        sizeClasses[size],
        className
      )}
      style={{ 
        backgroundColor: bank.color, 
        color: bank.textColor 
      }}
    >
      {bank.icon}
    </div>
  );
}

interface CardBrandIconProps {
  brand: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CardBrandIcon({ brand, size = "sm", className }: CardBrandIconProps) {
  const brandConfig = getCardBrand(brand);
  
  if (!brandConfig) return null;

  const sizeClasses = {
    sm: "w-5 h-3 text-[8px]",
    md: "w-8 h-5 text-[10px]",
    lg: "w-10 h-6 text-xs",
  };

  return (
    <div
      className={cn(
        "rounded flex items-center justify-center font-bold",
        sizeClasses[size],
        className
      )}
      style={{ 
        backgroundColor: brandConfig.color, 
        color: "#FFFFFF" 
      }}
    >
      {brandConfig.icon}
    </div>
  );
}
