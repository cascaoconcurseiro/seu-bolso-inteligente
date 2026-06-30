import { ChevronRight, CalendarClock, AlertCircle, Wifi } from "lucide-react";
import { BankIcon, CardBrandIcon } from "@/components/financial/BankIcon";
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
  const isOverdue =
    invoice.status === "CLOSED" &&
    new Date() > invoice.dueDate &&
    invoice.value > 0 &&
    invoice.status !== "PAID";
  const bank = getBankById(card.bank_id);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Cartão: ${card.name}, ${bank.name}, fatura ${formatCurrency(invoice.value || 0)}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openCardDetail(card);
        }
      }}
      onClick={() => openCardDetail(card)}
      className="group cursor-pointer transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl rounded-3xl p-[1.5px] w-full max-w-md mx-auto focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{
        background: `linear-gradient(135deg, ${bank.color}80 0%, ${bank.color}20 100%)`,
      }}
    >
      <div
        className="relative overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-card border border-white/5 p-5 w-full flex flex-col justify-between min-h-[200px]"
        style={{
          background: `linear-gradient(135deg, ${bank.color}15 0%, transparent 100%)`,
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Glow Effects */}
        <div
          className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full blur-[50px] opacity-40 transition-opacity group-hover:opacity-60"
          style={{ backgroundColor: bank.color }}
        />
        <div
          className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full blur-[50px] opacity-20 transition-opacity group-hover:opacity-40"
          style={{ backgroundColor: bank.color }}
        />

        {/* Top Section: Bank Logo and Contactless */}
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/10 dark:bg-black/10 backdrop-blur-md rounded-xl shadow-sm border border-white/10 dark:border-white/5">
              <BankIcon bankId={card.bank_id} accountName={card.name} size="sm" />
            </div>
            <span className="font-semibold text-sm opacity-90 tracking-tight">{bank.name}</span>
          </div>
          <Wifi className="h-5 w-5 opacity-40 rotate-90" />
        </div>

        {/* Middle Section: Chip and Due Date */}
        <div className="relative z-10 flex items-center justify-between mt-6">
          <div className="w-11 h-8 rounded-md bg-gradient-to-br from-[#ffd700] via-[#d4af37] to-[#aa8c2c] opacity-90 border border-yellow-600/50 shadow-inner flex items-center justify-center overflow-hidden">
            <div className="w-full h-px bg-yellow-900/20 absolute" />
            <div className="h-full w-px bg-yellow-900/20 absolute" />
            <div className="w-6 h-4 border border-yellow-900/20 rounded-sm absolute" />
          </div>

          <div className="text-right">
            {isOverdue ? (
              <span className="text-sm font-bold text-destructive dark:text-destructive bg-destructive/12 px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse border border-destructive/20">
                <AlertCircle className="h-3 w-3" />
                ATRASADA
              </span>
            ) : (
              <span
                className={cn(
                  "text-xs font-bold px-2.5 py-1 rounded-full border shadow-sm",
                  invoice.status === "PAID"
                    ? "bg-success/10 text-success border-success/20"
                    : invoice.status === "CLOSED"
                      ? "bg-warning/10 text-warning dark:text-warning border-warning/20"
                      : "bg-accent/10 text-accent border-accent/20"
                )}
              >
                {invoice.status === "PAID"
                  ? "✓ PAGA"
                  : invoice.status === "CLOSED"
                    ? "FECHADA"
                    : "ABERTA"}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Section: Name, Value and Brand */}
        <div className="relative z-10 flex items-end justify-between mt-auto pt-6">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-bold text-base truncate tracking-tight text-foreground/90 uppercase mb-1">
              {card.name}
            </h3>
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "font-mono font-black text-2xl tracking-tighter leading-none",
                  isOverdue
                    ? "text-destructive dark:text-destructive drop-shadow-sm"
                    : "text-foreground"
                )}
              >
                {formatCurrency(invoice.value)}
              </p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold bg-background/40 px-1.5 py-0.5 rounded backdrop-blur-sm border border-border/50">
                Vence {dateFns.format(invoice.dueDate, "dd/MM", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            {/* O helper CardBrandIcon exibe a rede se existir. A prop 'brand' será pega do banco ou fallbacks. Se não houver, exibe mastercard fallback */}
            <CardBrandIcon brand={card.brand || "mastercard"} size="lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
