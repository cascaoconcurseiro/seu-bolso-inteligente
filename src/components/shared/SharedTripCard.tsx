import {
  Plane,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  Undo2,
  Calendar,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import * as dateFns from "date-fns";
import { InvoiceItem } from "@/utils/sharedFinanceCalculations";

interface SharedTripCardProps {
  trip: any;
  members: any[];
  getFilteredInvoice: (memberId: string) => InvoiceItem[];
  getTotals: (items: InvoiceItem[]) => any;
  formatCurrency: (value: number, currency: string) => string;
  user: any;
  onSettle: (
    memberId: string,
    type: "PAY" | "RECEIVE",
    amount: number,
    specificItem?: InvoiceItem
  ) => void;
  onUndo: (item: InvoiceItem) => void;
  onDelete: (item: InvoiceItem) => void;
  onDeleteSeries: (item: InvoiceItem) => void;
  onAnticipate: (item: InvoiceItem) => void;
}

export function SharedTripCard({
  trip,
  members,
  getFilteredInvoice,
  getTotals,
  formatCurrency,
  user,
  onSettle,
  onUndo,
  onDelete,
  onDeleteSeries,
  onAnticipate,
}: SharedTripCardProps) {
  const tripItems: InvoiceItem[] = [];
  members.forEach((member) => {
    const memberItems = getFilteredInvoice(member.id).filter((i) => i.tripId === trip.id);
    tripItems.push(...memberItems);
  });

  if (tripItems.length === 0) return null;

  const totals = getTotals(tripItems);
  const tripCurrency = trip.currency || "BRL";
  const net = totals[tripCurrency]?.net || 0;

  const itemsByMember: Record<string, InvoiceItem[]> = {};
  tripItems.forEach((item) => {
    if (!itemsByMember[item.memberId]) {
      itemsByMember[item.memberId] = [];
    }
    itemsByMember[item.memberId].push(item);
  });

  const pendingCount = tripItems.filter((i) => !i.isPaid).length;



  return (
    <div
      key={trip.id}
      className="rounded-xl border-2 border-accent/20 overflow-hidden transition-all bg-card"
    >
      <div className="p-4 bg-accent/5 dark:bg-accent/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white bg-accent shrink-0 shadow-lg shadow-accent/20">
              <Plane className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-display font-semibold text-base truncate">{trip.name}</p>
                <Badge
                  variant="outline"
                  className="text-sm font-bold border-accent/30 text-accent bg-accent/15"
                >
                  {tripCurrency}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {pendingCount} {pendingCount === 1 ? "item pendente" : "itens pendentes"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-accent/20">
            <div className="text-left sm:text-right">
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-0.5 font-medium">
                Saldo da Viagem
              </p>
              <p
                className={cn(
                  "font-mono font-bold text-2xl leading-none tracking-tight",
                  net === 0
                    ? "text-muted-foreground"
                    : net < 0
                      ? "text-destructive dark:text-destructive"
                      : "text-success dark:text-success"
                )}
              >
                {net === 0 ? "Em dia" : formatCurrency(Math.abs(net), tripCurrency)}
              </p>
            </div>
          </div>
        </div>
      </div>



      <div className="border-t border-border">
        {Object.entries(itemsByMember).map(([memberId, memberItems]) => {
          const member = members.find((m) => m.id === memberId);
          if (!member) return null;

          const memberTotals = getTotals(memberItems);
          const memberNet = memberTotals[tripCurrency]?.net || 0;

          return (
            <div key={memberId} className="border-b border-border last:border-0">
              <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar name={member.name} avatarUrl={member.avatar_url} size="sm" />
                  <span className="font-medium">{member.name}</span>
                </div>
                <span
                  className={cn(
                    "font-mono font-semibold",
                    memberNet === 0
                      ? "text-muted-foreground"
                      : memberNet < 0
                        ? "text-destructive"
                        : "text-success"
                  )}
                >
                  {formatCurrency(Math.abs(memberNet), tripCurrency)}
                </span>
              </div>

              <div className="divide-y divide-border">
                {memberItems.map((item) => {
                  const isCredit = item.type === "CREDIT";
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "px-3 md:px-4 py-3 hover:bg-muted/30 transition-colors flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-2 md:items-center text-sm",
                        item.isPaid && "opacity-60 bg-success/5"
                      )}
                    >
                      <div className="flex md:hidden items-start gap-3">
                        <div className="shrink-0 pt-0.5">
                          {item.isPaid ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <div
                              className={cn(
                                "h-5 w-5 rounded-full border-2",
                                isCredit ? "border-success" : "border-destructive"
                              )}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-sm font-medium truncate",
                                  item.isPaid && "text-muted-foreground line-through"
                                )}
                              >
                                {item.description}
                              </p>
                              {item.creatorName && (
                                <span className="text-[11px] bg-accent/15 text-accent px-1 py-0.5 rounded uppercase tracking-wider font-medium inline-block mt-1">
                                  💳 {item.creatorName}
                                </span>
                              )}
                            </div>
                            <span
                              className={cn(
                                "font-mono text-sm font-bold shrink-0 whitespace-nowrap",
                                item.isPaid
                                  ? "text-muted-foreground"
                                  : isCredit
                                    ? "text-success dark:text-success"
                                    : "text-destructive dark:text-destructive"
                              )}
                            >
                              {formatCurrency(item.amount, item.currency)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            {item.category && <span className="truncate">{item.category}</span>}
                            <span className="whitespace-nowrap">
                              {(() => {
                                if (!item.date) return "-";
                                const dt = new Date(item.date + "T12:00:00");
                                return dateFns.isValid(dt) ? dateFns.format(dt, "dd/MM/yy") : "-";
                              })()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            {item.isPaid && (
                              <Badge
                                variant="outline"
                                className="text-xs font-bold bg-success/12 text-success border-0"
                              >
                                PAGO
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-bold border-0",
                                item.isPaid
                                  ? "bg-muted text-muted-foreground"
                                  : isCredit
                                    ? "bg-success/12 text-success"
                                    : "bg-destructive/12 text-destructive"
                              )}
                            >
                              {isCredit ? "CRÉDITO" : "DÉBITO"}
                            </Badge>



                            {(item.isPaid ||
                              item.creatorUserId === user?.id ||
                              (item.totalInstallments &&
                                item.totalInstallments > 1 &&
                                !item.isPaid &&
                                item.canAnticipate)) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {item.isPaid && (
                                    <DropdownMenuItem onClick={() => onUndo(item)}>
                                      <Undo2 className="h-4 w-4 mr-2" />
                                      Desfazer acerto
                                    </DropdownMenuItem>
                                  )}
                                  {!item.isPaid &&
                                    item.totalInstallments &&
                                    item.totalInstallments > 1 &&
                                    item.seriesId &&
                                    item.canAnticipate && (
                                      <DropdownMenuItem
                                        onClick={() => onAnticipate(item)}
                                        className="text-accent focus:text-accent"
                                      >
                                        <Calendar className="h-4 w-4 mr-2" />
                                        Antecipar Parcelas
                                      </DropdownMenuItem>
                                    )}
                                  {item.creatorUserId === user?.id && (
                                    <>
                                      {item.totalInstallments && item.totalInstallments > 1 ? (
                                        <DropdownMenuItem
                                          onClick={() => onDeleteSeries(item)}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Excluir série ({item.totalInstallments}x)
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() => onDelete(item)}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Excluir transação
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="hidden md:contents">
                        <div className="col-span-1">
                          {item.isPaid ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <div
                              className={cn(
                                "h-5 w-5 rounded-full border-2",
                                isCredit ? "border-success" : "border-destructive"
                              )}
                            />
                          )}
                        </div>

                        <div className="col-span-5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p
                              className={cn(
                                "font-medium",
                                item.isPaid && "text-muted-foreground line-through"
                              )}
                            >
                              {item.description}
                            </p>
                            {item.creatorName && (
                              <span className="text-sm bg-accent/15 text-accent px-1.5 py-0.5 rounded uppercase tracking-wider font-medium">
                                💳 {item.creatorName}
                              </span>
                            )}
                          </div>
                          {item.category && (
                            <p className="text-sm text-muted-foreground">{item.category}</p>
                          )}
                        </div>

                        <div className="col-span-2 text-muted-foreground">
                          {(() => {
                            if (!item.date) return "-";
                            const dt = new Date(item.date + "T12:00:00");
                            return dateFns.isValid(dt) ? dateFns.format(dt, "dd/MM/yyyy") : "-";
                          })()}
                        </div>

                        <div className="col-span-2 text-right">
                          <span
                            className={cn(
                              "font-mono text-sm font-medium",
                              item.isPaid
                                ? "text-muted-foreground"
                                : isCredit
                                  ? "text-success dark:text-success"
                                  : "text-destructive dark:text-destructive"
                            )}
                          >
                            {formatCurrency(item.amount, item.currency)}
                          </span>
                        </div>

                        <div className="col-span-2 flex items-center justify-end gap-2">
                          {item.isPaid && (
                            <Badge
                              variant="outline"
                              className="text-[11px] font-bold bg-success/12 text-success border-0"
                            >
                              PAGO
                            </Badge>
                          )}

                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] font-bold border-0",
                              item.isPaid
                                ? "bg-muted text-muted-foreground"
                                : isCredit
                                  ? "bg-success/12 text-success"
                                  : "bg-destructive/12 text-destructive"
                            )}
                          >
                            {isCredit ? "CRÉDITO" : "DÉBITO"}
                          </Badge>



                          {!item.isPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-sm bg-success/8 border-success/20 text-success hover:bg-success/12 font-bold"
                              onClick={() =>
                                onSettle(memberId, isCredit ? "RECEIVE" : "PAY", item.amount, item)
                              }
                            >
                              <Wallet className="h-3 w-3 mr-1" />
                              Acertar
                            </Button>
                          )}

                          {(item.isPaid ||
                            item.creatorUserId === user?.id ||
                            (item.totalInstallments &&
                              item.totalInstallments > 1 &&
                              !item.isPaid &&
                              item.canAnticipate)) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {item.isPaid && (
                                  <DropdownMenuItem onClick={() => onUndo(item)}>
                                    <Undo2 className="h-4 w-4 mr-2" />
                                    Desfazer acerto
                                  </DropdownMenuItem>
                                )}
                                {!item.isPaid &&
                                  item.totalInstallments &&
                                  item.totalInstallments > 1 &&
                                  item.seriesId &&
                                  item.canAnticipate && (
                                    <DropdownMenuItem
                                      onClick={() => onAnticipate(item)}
                                      className="text-accent focus:text-accent"
                                    >
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Antecipar Parcelas
                                    </DropdownMenuItem>
                                  )}
                                {item.creatorUserId === user?.id && (
                                  <>
                                    {item.totalInstallments && item.totalInstallments > 1 ? (
                                      <DropdownMenuItem
                                        onClick={() => onDeleteSeries(item)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir série ({item.totalInstallments}x)
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => onDelete(item)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir transação
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {memberNet !== 0 && memberItems.filter((i) => !i.isPaid).length > 0 && (
                <div className="px-4 py-3 bg-muted/20">
                  <Button
                    variant={memberNet < 0 ? "destructive" : "default"}
                    size="sm"
                    className={cn(
                      "h-12 sm:h-10 w-full",
                      memberNet > 0 && "bg-success hover:bg-success/92"
                    )}
                    onClick={() =>
                      onSettle(memberId, memberNet < 0 ? "PAY" : "RECEIVE", Math.abs(memberNet))
                    }
                  >
                    <span>{memberNet < 0 ? "Pagar" : "Receber"}</span>
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
