import { useState } from "react";
import {
  Tag,
  Calendar,
  Users,
  User,
  CheckCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCurrencyRate } from "@/hooks/useCurrencyRate";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useTransactionModal } from "@/contexts/TransactionModalContext";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { moneyUtils } from "@/utils/money";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import type { Trip, TripParticipant } from "@/hooks/useTrips";
import type { TripBalance, TripTransaction, TripTransactionSplit, TripUser } from "./types";

interface TripExpensesTabProps {
  tripTransactions: TripTransaction[];
  participants: TripParticipant[];
  selectedTrip: Trip;
  user: TripUser;
  formatCurrency: (value: number, currency: string) => string;
  balances?: TripBalance[];
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
  const [isSharedExpanded, setIsSharedExpanded] = useState(false);
  const [isPersonalExpanded, setIsPersonalExpanded] = useState(false);
  const navigate = useNavigate();
  const currency = selectedTrip.currency || "BRL";

  const { data: profile } = useUserProfile();
  const { setShowTransactionModal } = useTransactionModal();
  const baseCurrency = profile?.base_currency || "BRL";
  const isInternational = currency !== baseCurrency;
  const { data: rate } = useCurrencyRate(isInternational ? currency : "", baseCurrency);

  // ===== SEPARAÇÃO CLARA DE DESPESAS =====
  // Compartilhadas: qualquer participante pode ter pago
  const sharedExpenses = tripTransactions.filter((t) => t.type === "EXPENSE" && t.is_shared);

  // Pessoais: apenas minhas, não compartilhadas e que não sejam acertos financeiros (para evitar poluir a viagem e duplicar orçamento)
  const personalExpenses = tripTransactions.filter((t) => {
    const isMineAndNotShared =
      (t.type === "EXPENSE" || t.type === "INCOME") &&
      !t.is_shared &&
      (t.creator_user_id === user?.id || t.user_id === user?.id);
    const isSettlement =
      t.description?.toLowerCase().includes("acerto") ||
      t.description?.toLowerCase().includes("compensação");
    return isMineAndNotShared && !isSettlement;
  });

  const myBalance = balances.find((b) => b.participantId === user?.id);
  const myShareOfShared = myBalance?.owes || 0;

  // Totais
  const totalShared = sharedExpenses.reduce(
    (sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)).toNumber(),
    0
  );
  const totalPersonalOnly = personalExpenses.reduce((sum, t) => {
    const val = Number(t.amount);
    return t.type === "INCOME"
      ? SafeFinancialCalculator.subtract(sum, val).toNumber()
      : SafeFinancialCalculator.add(sum, val).toNumber();
  }, 0);
  const totalPersonal = SafeFinancialCalculator.add(totalPersonalOnly, myShareOfShared).toNumber();
  const spentToDisplay = myTotalSpent !== undefined ? myTotalSpent : totalPersonal;
  const mySharedPaid = sharedExpenses
    .filter((t) => t.creator_user_id === user?.id || t.user_id === user?.id)
    .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)).toNumber(), 0);

  const getParticipantName = (userId: string) => {
    if (userId === user?.id) return "Você";
    const p = participants.find((p) => p.user_id === userId);
    return p?.name || "Participante";
  };

  const getSettlementStatus = (expense: TripTransaction) => {
    // Se a transação tem splits, verificar se foram acertados
    if (!expense.transaction_splits || expense.transaction_splits.length === 0) {
      return "no_splits";
    }
    const allSettled = expense.transaction_splits.every((split) => split.is_settled);
    const anySettled = expense.transaction_splits.some((split) => split.is_settled);

    // Check if waiting for confirmation (one side settled, the other didn't)
    const waitingConfirmation = expense.transaction_splits.some(
      (split) =>
        (split.settled_by_debtor && !split.settled_by_creditor) ||
        (!split.settled_by_debtor && split.settled_by_creditor)
    );

    if (allSettled) return "settled";
    if (waitingConfirmation) return "waiting";
    if (anySettled) return "partial";
    return "pending";
  };

  return (
    <div className="space-y-8 mt-6 animate-fade-in">
      {/* ===== RESUMO RÁPIDO ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-accent/20 bg-accent/5 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-accent mb-1">
            Total Compartilhado
          </p>
          <p className="font-mono font-black text-base text-foreground">
            {formatCurrency(totalShared, currency)}
          </p>
          {isInternational && rate && (
            <p className="text-sm font-mono text-muted-foreground font-medium mt-0.5">
              ≈ {formatCurrency(moneyUtils.mul(totalShared, rate), baseCurrency)}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-0.5">{sharedExpenses.length} despesas</p>
        </div>
        <div className="p-4 rounded-2xl border border-accent/20 bg-accent/5 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-accent mb-1">
            Eu Paguei (Compartilhado)
          </p>
          <p className="font-mono font-black text-base text-foreground">
            {formatCurrency(mySharedPaid, currency)}
          </p>
          {isInternational && rate && (
            <p className="text-sm font-mono text-muted-foreground font-medium mt-0.5">
              ≈ {formatCurrency(moneyUtils.mul(mySharedPaid, rate), baseCurrency)}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-0.5">impacto no orçamento</p>
        </div>
        <div className="p-4 rounded-2xl border border-border/50 bg-card/50 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Meu Gasto (Orçamento)
          </p>
          <p className="font-mono font-black text-base text-foreground">
            {formatCurrency(spentToDisplay, currency)}
          </p>
          {isInternational && rate && (
            <p className="text-sm font-mono text-muted-foreground font-medium mt-0.5">
              ≈ {formatCurrency(moneyUtils.mul(spentToDisplay, rate), baseCurrency)}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-0.5">
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
            <Users className="h-4 w-4 text-accent" />
            <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-bold">
              Despesas Compartilhadas ({sharedExpenses.length})
            </h2>
          </div>
          {sharedExpenses.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-2 text-sm text-accent hover:text-accent/92 hover:bg-accent/10"
              onClick={() => navigate("/compartilhados?tab=TRAVEL")}
            >
              Ir para Acertos <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Aviso sobre a lógica de orçamento */}
        {mySharedPaid > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-xl border border-warning/20 bg-warning/8 dark:bg-warning/12 text-sm text-warning dark:text-warning">
            <span className="text-base shrink-0">💡</span>
            <span>
              <strong>Como funciona o orçamento:</strong> Quando você paga uma despesa
              compartilhada, o valor integral baixa do seu orçamento. Ao acertar nos{" "}
              <strong>Compartilhados</strong>, o valor recebido volta ao seu saldo efetivo.
            </span>
          </div>
        )}

        {sharedExpenses.length > 0 ? (
          <div className="border border-border rounded-2xl overflow-hidden bg-card/20">
            <button
              onClick={() => setIsSharedExpanded(!isSharedExpanded)}
              className="w-full flex items-center justify-between p-4 bg-muted/10 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  Ver {sharedExpenses.length}{" "}
                  {sharedExpenses.length === 1
                    ? "despesa compartilhada"
                    : "despesas compartilhadas"}
                </span>
              </div>
              {isSharedExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {isSharedExpanded && (
              <div className="p-3 grid gap-3 border-t border-border animate-in slide-in-from-top-2 fade-in duration-300">
                {sharedExpenses.map((expense) => {
                  const iPaid =
                    expense.creator_user_id === user?.id || expense.user_id === user?.id;
                  const payerName = getParticipantName(expense.user_id);
                  const status = getSettlementStatus(expense);
                  const categoryIcon = expense.category?.icon || "💸";
                  const categoryName = expense.category?.name || "Sem categoria";
                  const amount = Number(expense.amount);

                  return (
                    <div
                      key={expense.id}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest("button")) return;
                        window.dispatchEvent(
                          new CustomEvent("openTransactionModal", {
                            detail: { transaction: expense },
                          })
                        );
                      }}
                      className={cn(
                        "group relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 cursor-pointer",
                        iPaid
                          ? "border-accent/30 bg-accent/5 hover:border-accent/50 hover:bg-accent/10"
                          : "border-accent/20 bg-accent/5 hover:border-accent/40 hover:bg-accent/8"
                      )}
                    >
                      {/* Determinar minha parte */}
                      {(() => {
                        const mySplit = expense.transaction_splits?.find(
                          (split) => split.user_id === user?.id
                        );
                        const mySplitAmount = mySplit ? Number(mySplit.amount) : 0;

                        return (
                          <div className="flex items-start justify-between gap-4">
                            {/* Lado esquerdo */}
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div
                                className={cn(
                                  "w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 mt-0.5",
                                  iPaid ? "bg-accent/15" : "bg-accent/10"
                                )}
                              >
                                {categoryIcon}
                              </div>

                              <div className="flex-1 min-w-0">
                                {/* Nome + badges */}
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="font-bold text-foreground truncate">
                                    {expense.description}
                                  </p>

                                  {/* Quem pagou — badge principal */}
                                  <span
                                    className={cn(
                                      "text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black shrink-0",
                                      iPaid
                                        ? "bg-accent/20 text-accent"
                                        : "bg-accent/15 text-accent"
                                    )}
                                  >
                                    {iPaid ? "✓ Você pagou" : `${payerName} pagou`}
                                  </span>

                                  {/* Status do acerto */}
                                  {status === "settled" && (
                                    <span className="text-[9px] bg-success/15 text-success dark:text-success px-2 py-0.5 rounded-full uppercase tracking-widest font-bold shrink-0 flex items-center gap-0.5">
                                      <CheckCircle className="h-2.5 w-2.5" /> Acertado
                                    </span>
                                  )}
                                  {status === "waiting" && (
                                    <span className="text-[9px] bg-accent/15 text-accent px-2 py-0.5 rounded-full uppercase tracking-widest font-bold shrink-0 flex items-center gap-0.5">
                                      <Clock className="h-2.5 w-2.5" /> Aguardando Confirmação
                                    </span>
                                  )}
                                  {status === "pending" && (
                                    <span className="text-[9px] bg-warning/15 text-warning px-2 py-0.5 rounded-full uppercase tracking-widest font-bold shrink-0 flex items-center gap-0.5">
                                      <Clock className="h-2.5 w-2.5" /> Pendente
                                    </span>
                                  )}
                                  {status === "partial" && (
                                    <span className="text-[9px] bg-warning/15 text-warning dark:text-warning px-2 py-0.5 rounded-full uppercase tracking-widest font-bold shrink-0 flex items-center gap-0.5">
                                      <Clock className="h-2.5 w-2.5" /> Parcial
                                    </span>
                                  )}
                                </div>

                                {/* Detalhes: categoria, data */}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-widest border border-primary/20">
                                    <Tag className="h-2.5 w-2.5" />
                                    {categoryName}
                                  </span>
                                  <span className="text-muted-foreground/30">•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-muted-foreground/60" />
                                    {dateFns.format(new Date(expense.date), "dd MMM", {
                                      locale: ptBR,
                                    })}
                                  </span>
                                </div>

                                {/* Divisão de Custos (Avatars) */}
                                {expense.transaction_splits &&
                                  expense.transaction_splits.length > 0 && (
                                    <div className="mt-2.5 flex items-center gap-2">
                                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                        Dividido com:
                                      </span>
                                      <div className="flex -space-x-2.5">
                                        {expense.transaction_splits.map((split) => {
                                          const member = participants.find(
                                            (participant) => participant.id === split.member_id
                                          );
                                          return (
                                            <div
                                              key={split.id}
                                              className="hover:scale-110 transition-transform"
                                            >
                                              <UserAvatar
                                                name={member?.name || "?"}
                                                avatarUrl={member?.avatar_url}
                                                colorId={member?.avatar_color || undefined}
                                                iconId={member?.avatar_icon || undefined}
                                                size="sm"
                                                className="w-5 h-5 border-2 border-background shadow-sm text-[8px] ring-1 ring-border/20"
                                              />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                {/* Impacto no orçamento — mostrar apenas se EU paguei */}
                                {iPaid && (
                                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                                    <span className="text-sm font-mono text-accent font-bold">
                                      Impactou orçamento: −{formatCurrency(amount, currency)}
                                    </span>
                                    {status !== "no_splits" && status !== "settled" && (
                                      <span className="flex items-center gap-0.5 text-sm text-muted-foreground">
                                        <ArrowRight className="h-3 w-3" />
                                        Acerte nos Compartilhados para recuperar sua parte
                                      </span>
                                    )}
                                    {status === "settled" && (
                                      <span className="flex items-center gap-0.5 text-sm text-success dark:text-success">
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
                                  <p className="font-mono font-black text-base sm:text-base text-foreground tracking-tight tabular-nums">
                                    {formatCurrency(amount, currency)}
                                  </p>
                                  {isInternational && rate && (
                                    <p className="font-mono text-sm text-muted-foreground font-medium mt-0.5">
                                      ≈ {formatCurrency(moneyUtils.mul(amount, rate), baseCurrency)}
                                    </p>
                                  )}
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    valor total pago
                                  </p>
                                  {expense.transaction_splits && (
                                    <p className="text-sm text-accent font-bold mt-1">
                                      Sua parte: {formatCurrency(mySplitAmount, currency)}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <>
                                  <p className="font-mono font-black text-base sm:text-base text-warning tracking-tight tabular-nums">
                                    {formatCurrency(mySplitAmount, currency)}
                                  </p>
                                  {isInternational && rate && (
                                    <p className="font-mono text-sm text-warning/70 dark:text-warning/70 font-medium mt-0.5">
                                      ≈{" "}
                                      {formatCurrency(
                                        moneyUtils.mul(mySplitAmount, rate),
                                        baseCurrency
                                      )}
                                    </p>
                                  )}
                                  <p className="text-sm text-warning/70 dark:text-warning/70 mt-0.5 font-bold uppercase tracking-widest">
                                    Sua parte
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1.5">
                                    Total: {formatCurrency(amount, currency)}
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
            )}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="Nenhuma despesa compartilhada"
            description="Despesas marcadas como compartilhadas aparecerão aqui."
            action={
              <Button
                size="sm"
                onClick={() => setShowTransactionModal(true, { tripId: selectedTrip.id })}
                className="bg-accent hover:bg-accent/90"
              >
                <Plus className="h-4 w-4 mr-2" /> Lançar Despesa
              </Button>
            }
          />
        )}
      </section>

      {/* ===== DIVISOR ===== */}
      {personalExpenses.length > 0 && sharedExpenses.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/40" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-sm text-muted-foreground uppercase tracking-widest font-bold">
              Gastos Pessoais
            </span>
          </div>
        </div>
      )}

      {/* ===== SEÇÃO: DESPESAS PESSOAIS ===== */}
      <section className="space-y-4">
        {personalExpenses.length === 0 && sharedExpenses.length === 0 ? (
          <EmptyState
            icon={User}
            title="Nenhuma despesa pessoal"
            description="Seus gastos privados na viagem aparecerão aqui."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTransactionModal(true, { tripId: selectedTrip.id })}
              >
                <Plus className="h-4 w-4 mr-2" /> Lançar Despesa
              </Button>
            }
          />
        ) : personalExpenses.length > 0 ? (
          <>
            {sharedExpenses.length === 0 && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-accent" />
                <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-bold">
                  Gastos Pessoais ({personalExpenses.length})
                </h2>
              </div>
            )}
            <div className="border border-border rounded-2xl overflow-hidden bg-card/20">
              <button
                onClick={() => setIsPersonalExpanded(!isPersonalExpanded)}
                className="w-full flex items-center justify-between p-4 bg-muted/10 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    Ver {personalExpenses.length}{" "}
                    {personalExpenses.length === 1 ? "despesa pessoal" : "despesas pessoais"}
                  </span>
                </div>
                {isPersonalExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {isPersonalExpanded && (
                <div className="p-3 grid gap-3 border-t border-border animate-in slide-in-from-top-2 fade-in duration-300">
                  {personalExpenses.map((expense) => {
                    const categoryIcon = expense.category?.icon || "💸";
                    const categoryName = expense.category?.name || "Sem categoria";
                    const amount = Number(expense.amount);

                    return (
                      <div
                        key={expense.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest("button")) return;
                          window.dispatchEvent(
                            new CustomEvent("openTransactionModal", {
                              detail: { transaction: expense },
                            })
                          );
                        }}
                        className="group p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center text-base shrink-0 transition-colors duration-300">
                            {categoryIcon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                {expense.description}
                              </p>
                              <span
                                className={cn(
                                  "text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold",
                                  expense.type === "INCOME"
                                    ? "bg-success/12 text-success dark:text-success"
                                    : "bg-accent/10 text-accent"
                                )}
                              >
                                {expense.type === "INCOME" ? "Recebimento" : "Pessoal"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-widest border border-primary/20">
                                <Tag className="h-2.5 w-2.5" />
                                {categoryName}
                              </span>
                              <span className="text-muted-foreground/30">•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground/60" />
                                {dateFns.format(new Date(expense.date), "dd MMM yyyy", {
                                  locale: ptBR,
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={cn(
                              "font-mono font-black text-base sm:text-lg tracking-tight tabular-nums",
                              expense.type === "INCOME"
                                ? "text-success dark:text-success"
                                : "text-foreground"
                            )}
                          >
                            {expense.type === "INCOME" ? "+" : ""}
                            {formatCurrency(amount, currency)}
                          </p>
                          {isInternational && rate && (
                            <p
                              className={cn(
                                "font-mono text-xs font-medium mt-0.5",
                                expense.type === "INCOME"
                                  ? "text-success/70 dark:text-success/70"
                                  : "text-muted-foreground"
                              )}
                            >
                              ≈ {formatCurrency(moneyUtils.mul(amount, rate), baseCurrency)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
