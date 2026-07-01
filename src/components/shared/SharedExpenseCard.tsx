import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  CheckCircle2,
  Wallet,
  MoreHorizontal,
  Undo2,
  Trash2,
  Clock,
  CheckCircle,
  FastForward,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FamilyMember } from "@/hooks/useFamily";
import { InvoiceItem } from "@/utils/sharedFinanceCalculations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";

interface SharedExpenseCardProps {
  member: FamilyMember;
  items: InvoiceItem[];
  netAmount: number;
  currency: string;
  isHistory: boolean;
  onSettle: (
    memberId: string,
    type: "PAY" | "RECEIVE",
    amount: number,
    specificItem?: InvoiceItem
  ) => void;
  onUndo: (item: InvoiceItem) => void;
  onDelete: (item: InvoiceItem) => void;

  onAnticipate?: (item: InvoiceItem) => void;
  formatCurrency: (value: number, currency: string) => string;
  currentUserId?: string;
}

export function SharedExpenseCard({
  member,
  items,
  netAmount,
  currency,
  isHistory,
  onSettle,
  onUndo,
  onDelete,

  onAnticipate,
  formatCurrency,
  currentUserId,
}: SharedExpenseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const iOwe = netAmount < 0;
  const theyOweMe = netAmount > 0;

  const pendingCount = items.filter((i) => !i.isPaid).length;
  const paidCount = items.filter((i) => i.isPaid).length;



  // Group items by trip
  const groups: Record<string, { tripName?: string; items: InvoiceItem[] }> = {};
  items.forEach((item) => {
    const tripKey = item.tripId || "no-trip";
    if (!groups[tripKey]) {
      groups[tripKey] = { items: [] };
    }
    groups[tripKey].items.push(item);
  });

  return (
    <div
      className={cn(
        "rounded-xl border-2 overflow-hidden transition-all",
        isHistory
          ? "border-border"
          : iOwe
            ? "border-destructive/20"
            : theyOweMe
              ? "border-success/20"
              : "border-border"
      )}
    >
      <div
        className={cn(
          "p-4",
          isHistory
            ? "bg-muted/30"
            : iOwe
              ? "bg-destructive/5"
              : theyOweMe
                ? "bg-success/5"
                : "bg-muted/30"
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={member.name}
              avatarUrl={member.avatar_url}
              colorId={member.avatar_color || "green"}
              iconId={member.avatar_icon || "avatar_1"}
              size="md"
              className="h-12 w-12 sm:h-10 sm:w-10"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-display font-semibold text-base sm:text-base truncate">
                  {member.name}
                </p>
                {!isHistory && netAmount !== 0 && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px] font-bold px-2 py-0 border-0",
                      iOwe ? "bg-destructive/12 text-destructive" : "bg-success/12 text-success"
                    )}
                  >
                    {iOwe ? "PAGAR" : "RECEBER"}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                {isHistory ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" /> {paidCount}{" "}
                    {paidCount === 1 ? "item acertado" : "itens acertados"}
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3" /> {pendingCount}{" "}
                    {pendingCount === 1 ? "item pendente" : "itens pendentes"}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50">
            {!isHistory && (
              <div className="text-left sm:text-right flex-1 sm:flex-none">
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-0.5">
                  Saldo com {member.name.split(" ")[0]}
                </p>
                <div className="flex flex-col">
                  <p
                    className={cn(
                      "font-mono font-bold text-xl sm:text-2xl leading-tight",
                      netAmount === 0
                        ? "text-muted-foreground"
                        : iOwe
                          ? "text-destructive dark:text-destructive"
                          : "text-success dark:text-success"
                    )}
                  >
                    {netAmount === 0 ? "Em dia" : formatCurrency(Math.abs(netAmount), currency)}
                  </p>
                  {netAmount !== 0 && (
                    <span className="text-sm text-muted-foreground leading-none">
                      {iOwe ? "Você deve" : "Devem a você"}
                    </span>
                  )}
                </div>
              </div>
            )}

            {!isHistory && netAmount !== 0 && (
              <Button
                variant={iOwe ? "destructive" : "default"}
                size="default"
                className={cn(
                  "flex-1 sm:flex-none h-12 px-5 sm:px-6 text-sm sm:text-base shadow-lg transition-all shrink-0 font-bold rounded-xl active:scale-95"
                )}
                onClick={() => onSettle(member.id, iOwe ? "PAY" : "RECEIVE", Math.abs(netAmount))}
              >
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                <span className="sm:hidden">{iOwe ? "Pagar" : "Receber"}</span>
                <span className="hidden sm:inline">
                  {iOwe ? "Fazer Acerto (Pagar)" : "Fazer Acerto (Receber)"}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>



      {/* Accordion Toggle Button */}
      {items.length > 0 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-muted/20 hover:bg-muted/40 border-t border-border transition-colors text-sm font-semibold text-muted-foreground uppercase tracking-widest"
        >
          {isExpanded ? (
            <>
              Ocultar Extrato <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Ver Extrato ({items.length} {items.length === 1 ? "item" : "itens"}){" "}
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      )}

      {isExpanded && (
        <div className="divide-y divide-border border-t border-border animate-in slide-in-from-top-2 fade-in duration-300">
          {Object.entries(groups).map(([tripKey, group]) => (
            <div key={tripKey}>
              <div className="divide-y divide-border">
                {group.items.map((item) => {
                  const isCredit = item.type === "CREDIT";

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "px-4 py-3 grid grid-cols-[auto_1fr] md:grid-cols-12 gap-y-2 gap-x-3 items-center hover:bg-muted/20 transition-colors",
                        item.isPaid && "opacity-60 bg-success/5"
                      )}
                    >
                      <div className="md:col-span-1 shrink-0 flex items-center justify-center self-start md:self-auto pt-1 md:pt-0">
                        {item.isPaid ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <div
                            className={cn(
                              "w-3 h-3 rounded-full",
                              isCredit ? "bg-success/80" : "bg-destructive/80"
                            )}
                          />
                        )}
                      </div>

                      <div className="md:col-span-5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={cn(
                              "text-sm font-medium truncate",
                              item.isPaid && "line-through text-muted-foreground"
                            )}
                          >
                            {item.description}
                          </p>
                          {item.creatorName && (
                            <div className="flex items-center gap-2 ml-2 shrink-0 bg-secondary/50 rounded-full pr-2">
                              <UserAvatar 
                                name={item.creatorName} 
                                avatarUrl={item.creatorAvatarUrl}
                                colorId={item.creatorAvatarColor || undefined}
                                iconId={item.creatorAvatarIcon || undefined}
                                className="h-5 w-5" 
                              />
                              <span className="text-sm font-bold uppercase tracking-wider text-secondary-foreground truncate max-w-[80px]">
                                {item.creatorName.split(" ")[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.category && (
                            <span className="text-sm text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                              📁 {item.category}
                            </span>
                          )}
                          {item.totalInstallments && item.totalInstallments > 1 && (
                            <span className="text-sm text-muted-foreground bg-accent/5 dark:bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
                              {item.installmentNumber}/{item.totalInstallments}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="col-start-2 md:col-start-auto md:col-span-2 flex flex-col justify-center w-full md:w-auto">
                        <div className="text-sm text-muted-foreground flex items-center justify-between md:justify-start">
                          <span>
                            {(() => {
                              const d = item.originalDate || item.date;
                              if (!d) return "-";
                              const dt = new Date(d + "T12:00:00");
                              return dateFns.isValid(dt)
                                ? dateFns.format(dt, "dd/MM/yy", { locale: ptBR })
                                : "-";
                            })()}
                          </span>
                          <span
                            className={cn(
                              "font-mono text-sm font-bold md:hidden",
                              item.isPaid
                                ? "text-muted-foreground"
                                : isCredit
                                  ? "text-success"
                                  : "text-destructive"
                            )}
                          >
                            {formatCurrency(item.amount, item.currency)}
                          </span>
                        </div>
                        {item.accountName && (
                          <span
                            className="text-[9px] text-muted-foreground/70 truncate max-w-[130px] font-medium"
                            title={item.accountName}
                          >
                            {item.accountName}
                          </span>
                        )}
                      </div>

                      <div className="hidden md:block md:col-span-2 text-right">
                        <span
                          className={cn(
                            "font-mono text-sm font-bold",
                            item.isPaid
                              ? "text-muted-foreground"
                              : isCredit
                                ? "text-success"
                                : "text-destructive"
                          )}
                        >
                          {formatCurrency(item.amount, item.currency)}
                        </span>
                      </div>

                      <div className="col-span-2 md:col-span-2 flex justify-end gap-2 mt-2 md:mt-0">
                        {!item.isPaid && !isHistory && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-10 md:h-8 flex-1 md:flex-none text-sm md:text-sm bg-success/8 border-success/20 text-success hover:bg-success/12 font-bold"
                            onClick={() =>
                              onSettle(member.id, isCredit ? "RECEIVE" : "PAY", item.amount, item)
                            }
                          >
                            <Wallet className="h-4 w-4 md:h-3 md:w-3 mr-1.5" />
                            Acertar
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            sideOffset={8}
                            className="z-[100] min-w-[150px]"
                          >
                            {(item.isPaid || isHistory) && (
                              <DropdownMenuItem onClick={() => onUndo(item)}>
                                <Undo2 className="h-4 w-4 mr-2" /> Desfazer
                              </DropdownMenuItem>
                            )}
                            {onAnticipate &&
                              item.totalInstallments &&
                              item.totalInstallments > 1 &&
                              item.creatorUserId === currentUserId &&
                              !item.isPaid && (
                                <DropdownMenuItem onClick={() => onAnticipate(item)}>
                                  <FastForward className="h-4 w-4 mr-2" /> Adiantar Parcelas
                                </DropdownMenuItem>
                              )}
                            {item.creatorUserId === currentUserId && !item.isPaid && (
                              <DropdownMenuItem
                                onClick={() => onDelete(item)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
