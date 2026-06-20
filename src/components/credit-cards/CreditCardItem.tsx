import { ChevronRight, CalendarClock, AlertCircle, CreditCard } from "lucide-react";
import { CardBrandIcon } from "@/components/financial/BankIcon";
import { cn } from "@/lib/utils";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBankById } from "@/lib/banks";

interface CreditCardItemProps {
  card: any;
  getCardInvoice: (card: any) => any;
  formatCurrency: (value: number) => string;
  openCardDetail: (card: any) => void;
}

export function CreditCardItem({
  card,
  getCardInvoice,
  formatCurrency,
  openCardDetail,
}: CreditCardItemProps) {
  const invoice = getCardInvoice(card);
  const isOverdue = invoice.status === 'CLOSED' && new Date() > invoice.dueDate && invoice.value > 0;
  const bankColor = card.bank_color || getBankById(card.bank_id).color;
  
  return (
    <div 
      onClick={() => openCardDetail(card)}
      className="group relative overflow-hidden p-4 md:p-5 bg-card hover:bg-muted/30 rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 cursor-pointer flex items-center gap-3 md:gap-4 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Decorative credit card accent glow */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-16 h-16 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

      <div className="relative">
        <div 
          className="p-1 rounded-xl ring-1 ring-border group-hover:ring-primary/20 transition-all text-white flex items-center justify-center w-10 h-10 shadow-sm"
          style={{ backgroundColor: bankColor }}
        >
          <CreditCard className="w-5 h-5" />
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 bg-background border border-border/50 rounded-full p-0.5 shadow-sm">
          <CardBrandIcon brand="visa" size="sm" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-base truncate group-hover:text-primary transition-colors">
          {card.name}
        </h3>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1 mt-0.5">
          <CalendarClock className="h-3 w-3 text-muted-foreground/60" />
          Vence dia {card.due_day || "-"}
        </p>
      </div>

      <div className="text-right">
        <p className={cn(
          "font-mono font-black text-lg tracking-tight leading-none mb-1",
          isOverdue ? "text-negative" : "text-foreground"
        )}>
          {formatCurrency(invoice.value)}
        </p>
        <div className="flex items-center justify-end gap-1.5">
          {isOverdue ? (
            <span className="text-[9px] font-bold text-negative bg-negative/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
              <AlertCircle className="h-2.5 w-2.5" />
              ATRASADA
            </span>
          ) : (
            <span className="text-[9px] font-bold text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded-full">
              {invoice.status === 'CLOSED' ? 'FECHADA' : 'ABERTA'}
            </span>
          )}
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {dateFns.format(invoice.dueDate, "dd MMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
    </div>
  );
}
