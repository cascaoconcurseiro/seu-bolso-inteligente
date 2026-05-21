import { Plane, Clock, CheckCircle2, MoreHorizontal, Undo2, Calendar, Trash2, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import * as dateFns from "date-fns";
import { InvoiceItem } from "@/hooks/useSharedFinances";

interface SharedTripCardProps {
  trip: any;
  members: any[];
  getFilteredInvoice: (memberId: string) => InvoiceItem[];
  getTotals: (items: InvoiceItem[]) => any;
  formatCurrency: (value: number, currency: string) => string;
  user: any;
  onSettle: (memberId: string, type: "PAY" | "RECEIVE", amount: number) => void;
  onUndo: (item: InvoiceItem) => void;
  onDelete: (item: InvoiceItem) => void;
  onDeleteSeries: (item: InvoiceItem) => void;
  onConfirmReceipt: (item: InvoiceItem) => void;
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
  onConfirmReceipt,
  onAnticipate,
}: SharedTripCardProps) {
  const tripItems: InvoiceItem[] = [];
  members.forEach(member => {
    const memberItems = getFilteredInvoice(member.id).filter(i => i.tripId === trip.id);
    tripItems.push(...memberItems);
  });

  if (tripItems.length === 0) return null;

  const totals = getTotals(tripItems);
  const tripCurrency = trip.currency || 'BRL';
  const net = totals[tripCurrency]?.net || 0;

  const itemsByMember: Record<string, InvoiceItem[]> = {};
  tripItems.forEach(item => {
    if (!itemsByMember[item.memberId]) {
      itemsByMember[item.memberId] = [];
    }
    itemsByMember[item.memberId].push(item);
  });

  const pendingCount = tripItems.filter(i => !i.isPaid).length;

  const itemsWaitingMe = tripItems.filter(item => {
    if (item.isPaid) return false;
    const isCredit = item.type === 'CREDIT';
    return !isCredit && item.settledByDebtor && !item.settledByCreditor;
  });

  return (
    <div
      key={trip.id}
      className="rounded-xl border-2 border-blue-200 dark:border-blue-900/50 overflow-hidden transition-all bg-card"
    >
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white bg-blue-500 shrink-0 shadow-lg shadow-blue-500/20">
              <Plane className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-display font-semibold text-lg truncate">{trip.name}</p>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold border-blue-300 text-blue-700 bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-900/50"
                >
                  {tripCurrency}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {pendingCount} {pendingCount === 1 ? "item pendente" : "itens pendentes"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-blue-200/50">
            <div className="text-left sm:text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 font-medium">Saldo da Viagem</p>
              <p className={cn(
                "font-mono font-bold text-2xl leading-none tracking-tight",
                net === 0 ? "text-muted-foreground" :
                  net < 0 ? "text-red-600 dark:text-red-400" :
                    "text-green-600 dark:text-green-400"
              )}>
                {net === 0 ? "Em dia" : formatCurrency(Math.abs(net), tripCurrency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {itemsWaitingMe.length > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-500/5 border-t border-b border-amber-500/20 p-4 space-y-3 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">
                Aguardando sua confirmação nesta viagem
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400/90 mt-0.5 leading-relaxed">
                {itemsWaitingMe.length === 1 ? (
                  <>
                    Um participante marcou a transação de acerto <strong>"{itemsWaitingMe[0].description}"</strong> de <strong>{formatCurrency(itemsWaitingMe[0].amount, itemsWaitingMe[0].currency)}</strong> como paga. Confirme o recebimento e escolha em qual conta deseja creditar.
                  </>
                ) : (
                  <>
                    Há <strong>{itemsWaitingMe.length} acertos pendentes</strong> (total de <strong>{formatCurrency(itemsWaitingMe.reduce((sum, i) => sum + i.amount, 0), tripCurrency)}</strong>) marcados como pagos. Confirme para atualizar seu saldo e escolher as contas de recebimento.
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {itemsWaitingMe.map((item) => (
              <Button
                key={item.id}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-amber-600/10 active:scale-95 transition-all"
                onClick={() => onConfirmReceipt(item)}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                {itemsWaitingMe.length === 1 ? "Confirmar e Escolher Conta" : `Confirmar R$ ${item.amount.toFixed(2).replace('.', ',')}`}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border">
        {Object.entries(itemsByMember).map(([memberId, memberItems]) => {
          const member = members.find(m => m.id === memberId);
          if (!member) return null;

          const memberTotals = getTotals(memberItems);
          const memberNet = memberTotals[tripCurrency]?.net || 0;

          return (
            <div key={memberId} className="border-b border-border last:border-0">
              <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={member.name}
                    avatarUrl={member.avatar_url}
                    size="sm"
                  />
                  <span className="font-medium">{member.name}</span>
                </div>
                <span className={cn(
                  "font-mono font-semibold",
                  memberNet === 0 ? "text-muted-foreground" :
                    memberNet < 0 ? "text-red-600" : "text-green-600"
                )}>
                  {formatCurrency(Math.abs(memberNet), tripCurrency)}
                </span>
              </div>

              <div className="divide-y divide-border">
                {memberItems.map(item => {
                  const isCredit = item.type === 'CREDIT';
                  const isWaitingMe = !isCredit && item.settledByDebtor && !item.settledByCreditor;
                  const isWaitingOther = isCredit && item.settledByDebtor && !item.settledByCreditor;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "px-3 md:px-4 py-3 hover:bg-muted/30 transition-colors flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-2 md:items-center text-sm",
                        item.isPaid && "opacity-60 bg-green-50/30 dark:bg-green-950/10"
                      )}
                    >
                      <div className="flex md:hidden items-start gap-3">
                        <div className="shrink-0 pt-0.5">
                          {item.isPaid ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : isWaitingMe || isWaitingOther ? (
                            <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
                          ) : (
                            <div className={cn(
                              "h-5 w-5 rounded-full border-2",
                              isCredit ? "border-green-500" : "border-red-500"
                            )} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-medium truncate",
                                item.isPaid && "text-muted-foreground line-through"
                              )}>
                                {item.description}
                              </p>
                              {item.creatorName && (
                                <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded uppercase tracking-wider font-medium inline-block mt-1">
                                  💳 {item.creatorName}
                                </span>
                              )}
                            </div>
                            <span className={cn(
                              "font-mono text-sm font-bold shrink-0 whitespace-nowrap",
                              item.isPaid ? "text-muted-foreground" :
                                isCredit ? "text-green-600 dark:text-green-400" :
                                  "text-red-600 dark:text-red-400"
                            )}>
                              {formatCurrency(item.amount, item.currency)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {item.category && (
                              <span className="truncate">{item.category}</span>
                            )}
                            <span className="whitespace-nowrap">
                              {dateFns.format(new Date(item.date + 'T12:00:00'), "dd/MM/yy")}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-2">
                            {item.isPaid && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold border-green-500 text-green-700 bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-950/50"
                              >
                                PAGO
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold",
                                item.isPaid ? "border-gray-300 text-gray-500" :
                                  isCredit ? "border-green-300 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950/30" :
                                    "border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30"
                              )}
                            >
                              {isCredit ? "CRÉDITO" : "DÉBITO"}
                            </Badge>

                            {isWaitingMe && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-[10px] bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 font-bold"
                                onClick={() => onConfirmReceipt(item)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Confirmar
                              </Button>
                            )}

                            {isWaitingOther && (
                              <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-600 border-amber-200">
                                Aguardando
                              </Badge>
                            )}

                            {(item.isPaid || item.creatorUserId === user?.id || (item.totalInstallments && item.totalInstallments > 1 && !item.isPaid && item.canAnticipate)) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {item.isPaid && (
                                    <DropdownMenuItem
                                      onClick={() => onUndo(item)}
                                    >
                                      <Undo2 className="h-4 w-4 mr-2" />
                                      Desfazer acerto
                                    </DropdownMenuItem>
                                  )}
                                  {!item.isPaid && item.totalInstallments && item.totalInstallments > 1 && item.seriesId && item.canAnticipate && (
                                    <DropdownMenuItem
                                      onClick={() => onAnticipate(item)}
                                      className="text-blue-600 focus:text-blue-600"
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
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : isWaitingMe || isWaitingOther ? (
                            <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
                          ) : (
                            <div className={cn(
                              "h-5 w-5 rounded-full border-2",
                              isCredit ? "border-green-500" : "border-red-500"
                            )} />
                          )}
                        </div>

                        <div className="col-span-5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn(
                              "font-medium",
                              item.isPaid && "text-muted-foreground line-through"
                            )}>
                              {item.description}
                            </p>
                            {item.creatorName && (
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-medium">
                                💳 {item.creatorName}
                              </span>
                            )}
                          </div>
                          {item.category && (
                            <p className="text-xs text-muted-foreground">{item.category}</p>
                          )}
                        </div>

                        <div className="col-span-2 text-muted-foreground">
                          {dateFns.format(new Date(item.date + 'T12:00:00'), "dd/MM/yyyy")}
                        </div>

                        <div className="col-span-2 text-right">
                          <span className={cn(
                            "font-mono text-sm font-medium",
                            item.isPaid ? "text-muted-foreground" :
                            isCredit ? "text-green-600 dark:text-green-400" :
                              "text-red-600 dark:text-red-400"
                          )}>
                            {formatCurrency(item.amount, item.currency)}
                          </span>
                        </div>

                        <div className="col-span-2 flex items-center justify-end gap-2">
                          {item.isPaid && (
                            <Badge
                              variant="outline"
                              className="text-xs font-bold border-green-500 text-green-700 bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-950/50"
                            >
                              PAGO
                            </Badge>
                          )}

                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-bold",
                              item.isPaid ? "border-gray-300 text-gray-500" :
                                isCredit ? "border-green-300 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950/30" :
                                  "border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30"
                            )}
                          >
                            {isCredit ? "CRÉDITO" : "DÉBITO"}
                          </Badge>

                          {isWaitingMe && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-[10px] bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 font-bold"
                              onClick={() => onConfirmReceipt(item)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Confirmar
                            </Button>
                          )}

                          {isWaitingOther && (
                            <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-600 border-amber-200">
                              Aguardando
                            </Badge>
                          )}

                          {(item.isPaid || item.creatorUserId === user?.id || (item.totalInstallments && item.totalInstallments > 1 && !item.isPaid && item.canAnticipate)) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {item.isPaid && (
                                  <DropdownMenuItem
                                    onClick={() => onUndo(item)}
                                  >
                                    <Undo2 className="h-4 w-4 mr-2" />
                                    Desfazer acerto
                                  </DropdownMenuItem>
                                )}
                                {!item.isPaid && item.totalInstallments && item.totalInstallments > 1 && item.seriesId && item.canAnticipate && (
                                  <DropdownMenuItem
                                    onClick={() => onAnticipate(item)}
                                    className="text-blue-600 focus:text-blue-600"
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

              {memberNet !== 0 && memberItems.filter(i => !i.isPaid).length > 0 && (
                <div className="px-4 py-3 bg-muted/20">
                  <Button
                    variant={memberNet < 0 ? "destructive" : "default"}
                    size="sm"
                    className={cn(
                      "h-11 sm:h-9 w-full",
                      memberNet > 0 && "bg-green-600 hover:bg-green-700"
                    )}
                    onClick={() => onSettle(
                      memberId,
                      memberNet < 0 ? "PAY" : "RECEIVE",
                      Math.abs(memberNet)
                    )}
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
