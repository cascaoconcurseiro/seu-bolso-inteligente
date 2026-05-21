import { DollarSign, Tag, Calendar, Users, User, CheckCircle, Clock, ArrowRight, ExternalLink } from "lucide-react";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface TripExpensesTabProps {
  tripTransactions: any[];
  participants: any[];
  selectedTrip: any;
  user: any;
  formatCurrency: (value: number, currency: string) => string;
  balances?: any[];
  myTotalSpent?: number;
}

export function TripExpensesTab({
  tripTransactions,
  participants,
  selectedTrip,
  user,
  formatCurrency,
  balances = [],
  myTotalSpent,
}: TripExpensesTabProps) {
  const navigate = useNavigate();
  const currency = selectedTrip.currency || "BRL";

  // ===== SEPARAÇÃO CLARA DE DESPESAS =====
  // Compartilhadas: qualquer participante pode ter pago
  const sharedExpenses = tripTransactions.filter(
    (t) => t.type === "EXPENSE" && t.is_shared
  );

  // Pessoais: apenas minhas, não compartilhadas e acertos (INCOME/EXPENSE sem is_shared)
  const personalExpenses = tripTransactions.filter(
    (t) => (t.type === "EXPENSE" || t.type === "INCOME") && !t.is_shared && (t.creator_user_id === user?.id || t.user_id === user?.id)
  );

  const myBalance = balances.find(b => b.participantId === user?.id);
  const myShareOfShared = myBalance?.owes || 0;

  // Totais
  const totalShared = sharedExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalPersonalOnly = personalExpenses.reduce((sum, t) => sum + (t.type === "INCOME" ? -Number(t.amount) : Number(t.amount)), 0);
  const totalPersonal = totalPersonalOnly + myShareOfShared;
  const spentToDisplay = myTotalSpent !== undefined ? myTotalSpent : totalPersonal;
  const mySharedPaid = sharedExpenses
    .filter((t) => t.creator_user_id === user?.id || t.user_id === user?.id)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const getParticipantName = (userId: string) => {
    if (userId === user?.id) return "Você";
    const p = participants.find((p) => p.user_id === userId);
    return p?.name || "Participante";
  };

  const getSettlementStatus = (expense: any) => {
    // Se a transação tem splits, verificar se foram acertados
    if (!expense.transaction_splits || expense.transaction_splits.length === 0) {
      return "no_splits";
    }
    const allSettled = expense.transaction_splits.every((s: any) => s.is_settled);
    const anySettled = expense.transaction_splits.some((s: any) => s.is_settled);
    
    // Check if waiting for confirmation (one side settled, the other didn't)
    const waitingConfirmation = expense.transaction_splits.some((s: any) => 
        (s.settled_by_debtor && !s.settled_by_creditor) || (!s.settled_by_debtor && s.settled_by_creditor)
    );

    if (allSettled) return "settled";
    if (waitingConfirmation) return "waiting";
    if (anySettled) return "partial";
    return "pending";
  };

  return (
    <div className="space-y-8 mt-6 animate-fade-in">

      {/* ===== RESUMO RÁPIDO ===== */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-1">
            Total Compartilhado
          </p>
          <p className="font-mono font-black text-xl text-foreground">
            {formatCurrency(totalShared, currency)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{sharedExpenses.length} despesas</p>
        </div>
        <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">
            Eu Paguei (Compartilhado)
          </p>
          <p className="font-mono font-black text-xl text-foreground">
            {formatCurrency(mySharedPaid, currency)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">impacto no orçamento</p>
        </div>
        <div className="p-4 rounded-2xl border border-border/50 bg-card/50 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Meu Gasto (Orçamento)
          </p>
          <p className="font-mono font-black text-xl text-foreground">
            {formatCurrency(spentToDisplay, currency)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {myTotalSpent !== undefined 
              ? "Impacto real no seu orçamento" 
              : `${personalExpenses.length} privadas + sua parte (${formatCurrency(myShareOfShared, currency)})`}
          </p>
        </div>
      </div>

      {/* ===== SEÇÃO: DESPESAS COMPARTILHADAS ===== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
              Despesas Compartilhadas ({sharedExpenses.length})
            </h2>
          </div>
          {sharedExpenses.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:bg-purple-500/10"
              onClick={() => navigate("/compartilhados?tab=TRAVEL")}
            >
              Ir para Acertos <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Aviso sobre a lógica de orçamento */}
        {mySharedPaid > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-700 dark:text-amber-400">
            <span className="text-base shrink-0">💡</span>
            <span>
              <strong>Como funciona o orçamento:</strong> Quando você paga uma despesa compartilhada, o valor integral baixa do seu orçamento.
              Ao acertar nos <strong>Compartilhados</strong>, o valor recebido volta ao seu saldo efetivo.
            </span>
          </div>
        )}

        {sharedExpenses.length > 0 ? (
          <div className="grid gap-3">
            {sharedExpenses.map((expense) => {
              const iPaid = expense.creator_user_id === user?.id || expense.user_id === user?.id;
              const payerName = getParticipantName(expense.user_id);
              const status = getSettlementStatus(expense);
              const categoryIcon = expense.category?.icon || "💸";
              const categoryName = expense.category?.name || "Sem categoria";

              return (
                <div
                  key={expense.id}
                  className={cn(
                    "group relative overflow-hidden p-4 rounded-2xl border transition-all duration-300",
                    iPaid
                      ? "border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50 hover:bg-purple-500/10"
                      : "border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40 hover:bg-blue-500/8"
                  )}
                >
                  {/* Determinar minha parte */}
                  {(() => {
                    const mySplit = expense.transaction_splits?.find((s: any) => s.user_id === user?.id);
                    const mySplitAmount = mySplit ? Number(mySplit.amount) : 0;
                    
                    return (
                      <div className="flex items-start justify-between gap-4">
                    {/* Lado esquerdo */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 mt-0.5",
                          iPaid ? "bg-purple-500/15" : "bg-blue-500/10"
                        )}
                      >
                        {categoryIcon}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Nome + badges */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-bold text-foreground truncate">{expense.description}</p>

                          {/* Quem pagou — badge principal */}
                          <span
                            className={cn(
                              "text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black shrink-0",
                              iPaid
                                ? "bg-purple-500/20 text-purple-700 dark:text-purple-300"
                                : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                            )}
                          >
                            {iPaid ? "✓ Você pagou" : `${payerName} pagou`}
                          </span>

                          {/* Status do acerto */}
                          {status === "settled" && (
                            <span className="text-[9px] bg-green-500/15 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold shrink-0 flex items-center gap-0.5">
                              <CheckCircle className="h-2.5 w-2.5" /> Acertado
                            </span>
                          )}
                          {status === "waiting" && (
                            <span className="text-[9px] bg-blue-500/15 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold shrink-0 flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> Aguardando Confirmação
                            </span>
                          )}
                          {status === "pending" && (
                            <span className="text-[9px] bg-orange-500/15 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold shrink-0 flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> Pendente
                            </span>
                          )}
                          {status === "partial" && (
                            <span className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold shrink-0 flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> Parcial
                            </span>
                          )}
                        </div>

                        {/* Detalhes: categoria, data */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3 text-muted-foreground/60" />
                            {categoryName}
                          </span>
                          <span className="text-muted-foreground/30">•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground/60" />
                            {dateFns.format(new Date(expense.date), "dd MMM", { locale: ptBR })}
                          </span>
                        </div>

                        {/* Impacto no orçamento — mostrar apenas se EU paguei */}
                        {iPaid && (
                          <div className="mt-2 flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-bold">
                              Impactou orçamento: −{formatCurrency(Number(expense.amount), currency)}
                            </span>
                            {status !== "no_splits" && status !== "settled" && (
                              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                <ArrowRight className="h-3 w-3" />
                                Acerte nos Compartilhados para recuperar sua parte
                              </span>
                            )}
                            {status === "settled" && (
                              <span className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400">
                                <CheckCircle className="h-3 w-3" />
                                Acerto recebido — orçamento recuperado
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Valor */}
                    <div className="text-right shrink-0">
                      {iPaid ? (
                        <>
                          <p className="font-mono font-black text-base sm:text-lg text-foreground tracking-tight tabular-nums">
                            {formatCurrency(Number(expense.amount), currency)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">valor total pago</p>
                          {expense.transaction_splits && (
                            <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1">
                              Sua parte: {formatCurrency(mySplitAmount, currency)}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-mono font-black text-base sm:text-lg text-orange-600 dark:text-orange-400 tracking-tight tabular-nums">
                            {formatCurrency(mySplitAmount, currency)}
                          </p>
                          <p className="text-[10px] text-orange-600/70 dark:text-orange-400/70 mt-0.5 font-bold uppercase tracking-widest">
                            Sua parte
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            Total: {formatCurrency(Number(expense.amount), currency)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center border border-dashed border-purple-200 dark:border-purple-900 rounded-2xl bg-purple-500/3">
            <Users className="h-9 w-9 mx-auto mb-2.5 text-purple-400/60" />
            <p className="text-sm font-semibold text-foreground">Nenhuma despesa compartilhada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Despesas marcadas como compartilhadas aparecerão aqui
            </p>
          </div>
        )}
      </section>

      {/* ===== DIVISOR ===== */}
      {personalExpenses.length > 0 && sharedExpenses.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/40" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground uppercase tracking-widest font-bold">
              Gastos Pessoais
            </span>
          </div>
        </div>
      )}

      {/* ===== SEÇÃO: DESPESAS PESSOAIS ===== */}
      <section className="space-y-4">
        {personalExpenses.length === 0 && sharedExpenses.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-2xl bg-card/30">
            <DollarSign className="h-10 w-10 mx-auto mb-2.5 text-muted-foreground/60 animate-bounce" />
            <p className="text-sm font-semibold text-foreground">Nenhuma despesa registrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Todas as despesas da viagem aparecerão aqui
            </p>
          </div>
        ) : personalExpenses.length > 0 ? (
          <>
            {sharedExpenses.length === 0 && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" />
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                  Gastos Pessoais ({personalExpenses.length})
                </h2>
              </div>
            )}
            <div className="grid gap-3">
              {personalExpenses.map((expense) => {
                const categoryIcon = expense.category?.icon || "💸";
                const categoryName = expense.category?.name || "Sem categoria";

                return (
                  <div
                    key={expense.id}
                    className="group p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center text-xl shrink-0 transition-colors duration-300">
                        {categoryIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {expense.description}
                          </p>
                          <span className={cn(
                            "text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold",
                            expense.type === "INCOME" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          )}>
                            {expense.type === "INCOME" ? "Recebimento" : "Pessoal"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5 text-muted-foreground/60" />
                            {categoryName}
                          </span>
                          <span className="text-muted-foreground/30">•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                            {dateFns.format(new Date(expense.date), "dd MMM yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={cn(
                      "font-mono font-black text-base sm:text-lg tracking-tight tabular-nums shrink-0",
                      expense.type === "INCOME" ? "text-green-600 dark:text-green-400" : "text-foreground"
                    )}>
                      {expense.type === "INCOME" ? "+" : ""}{formatCurrency(Number(expense.amount), currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
