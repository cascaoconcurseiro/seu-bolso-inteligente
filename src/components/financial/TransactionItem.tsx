import { cn } from "@/lib/utils";
import { CurrencyDisplay } from "./CurrencyDisplay";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Home, 
  Car, 
  Utensils, 
  Heart, 
  Plane, 
  CreditCard,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  type LucideIcon
} from "lucide-react";

export type TransactionType = "income" | "expense" | "transfer";
export type TransactionCategory = 
  | "alimentacao" 
  | "moradia" 
  | "transporte" 
  | "lazer" 
  | "saude" 
  | "viagem" 
  | "cartao"
  | "outros";

interface TransactionItemProps {
  id: string;
  description: string;
  value: number;
  type: TransactionType;
  category: TransactionCategory;
  date: Date;
  isShared?: boolean;
  sharedWith?: string[];
  installment?: { current: number; total: number };
  onClick?: () => void;
  className?: string;
}

const categoryIcons: Record<TransactionCategory, LucideIcon> = {
  alimentacao: Utensils,
  moradia: Home,
  transporte: Car,
  lazer: ShoppingCart,
  saude: Heart,
  viagem: Plane,
  cartao: CreditCard,
  outros: ShoppingCart,
};

const categoryLabels: Record<TransactionCategory, string> = {
  alimentacao: "Alimentação",
  moradia: "Moradia",
  transporte: "Transporte",
  lazer: "Lazer",
  saude: "Saúde",
  viagem: "Viagem",
  cartao: "Cartão",
  outros: "Outros",
};

export function TransactionItem({
  description,
  value,
  type,
  category,
  date,
  isShared,
  sharedWith,
  installment,
  onClick,
  className,
}: TransactionItemProps) {
  const Icon = categoryIcons[category];
  const TypeIcon = type === "income" ? ArrowDownLeft : ArrowUpRight;
  const displayValue = type === "expense" ? -value : value;

  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 md:gap-4 p-3 md:p-4 bg-card rounded-lg transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:bg-card/80",
        className
      )}
    >
      {/* Ícone da categoria */}
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full shrink-0",
          type === "income" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4 md:h-5 md:w-5" />
      </div>

      {/* Descrição e metadados */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate text-sm md:text-base">{description}</p>
        <div className="flex items-center gap-1.5 md:gap-2 mt-1 flex-wrap">
          <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">{formattedDate}</span>
          <span className="text-muted-foreground hidden md:inline">•</span>
          <span className="text-[10px] md:text-xs text-muted-foreground truncate">{categoryLabels[category]}</span>
          {installment && (
            <>
              <span className="text-muted-foreground hidden md:inline">•</span>
              <Badge variant="muted" className="text-[10px] md:text-xs px-1 py-0">
                {installment.current}/{installment.total}
              </Badge>
            </>
          )}
          {isShared && (
            <Badge variant="secondary" className="text-[10px] md:text-xs gap-1 px-1 py-0">
              <Users className="h-2.5 w-2.5 md:h-3 md:w-3" />
              {sharedWith?.length || 0}
            </Badge>
          )}
        </div>
      </div>

      {/* Valor */}
      <div className="text-right shrink-0">
        <div className="text-sm md:text-base font-mono font-semibold">
          <CurrencyDisplay value={displayValue} size="md" showSign />
        </div>
        <div className="flex items-center justify-end gap-0.5 md:gap-1 mt-1">
          <TypeIcon
            className={cn(
              "h-2.5 w-2.5 md:h-3 md:w-3",
              type === "income" ? "text-positive" : "text-muted-foreground"
            )}
          />
          <span className="text-[9px] md:text-xs text-muted-foreground whitespace-nowrap">
            {type === "income" ? "Entrada" : type === "expense" ? "Saída" : "Transf."}
          </span>
        </div>
      </div>
    </div>
  );
}