import { getBankById, getBankByName, getCardBrand } from "@/lib/banks";
import { getBankLogo, getCardBrandLogo } from "@/utils/bankLogos";
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
    sm: "w-8 h-8 text-[10px]",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-base",
  };

  // Para cartões de crédito, usar apenas texto personalizado (sem logos)
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
    sm: "w-8 h-5 text-[8px]",
    md: "w-12 h-8 text-[10px]",
    lg: "w-16 h-10 text-xs",
  };

  // Tentar buscar logo real da bandeira
  const logoUrl = getCardBrandLogo(brand);

  if (logoUrl) {
    return (
      <div className={cn("shrink-0 flex items-center justify-center", className)}>
        <img
          src={logoUrl}
          alt={brandConfig.name}
          className={cn(
            "object-contain rounded",
            sizeClasses[size]
          )}
          onError={(e) => {
            // Fallback se a imagem não carregar
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Fallback para ícone colorido
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
