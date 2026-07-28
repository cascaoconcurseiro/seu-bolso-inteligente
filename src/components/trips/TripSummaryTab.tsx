import { TripTravelersSection } from "./summary/TripTravelersSection";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getInclusiveCalendarDays } from "@/utils/dateUtils";
import { moneyUtils } from "@/utils/money";
import { useQuery } from "@tanstack/react-query";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import type { Trip, TripParticipant } from "@/hooks/useTrips";
import type {
  SentTripInvitation,
  TripBalance,
  TripPermissions,
  TripTransaction,
  TripUser,
} from "./types";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  DollarSign,
  Info,
  Receipt,
  TrendingUp,
  User,
  Users,
  Wallet,
} from "lucide-react";

interface TripSummaryTabProps {
  selectedTrip: Trip;
  myTotalSpent: number;
  myPersonalBudget: number | null;
  participants: TripParticipant[];
  balances: TripBalance[];
  tripTransactions: TripTransaction[];
  user: TripUser;
  onAddParticipant: () => void;
  permissions: TripPermissions | null | undefined;
  onRemoveClick?: (participant: TripParticipant, balance: TripBalance) => void;
  pendingInvitations?: SentTripInvitation[];
  onCancelInvitation?: (id: string) => void;
  setActiveTab?: (tab: string) => void;
}

export function TripSummaryTab({
  selectedTrip,
  myTotalSpent,
  myPersonalBudget,
  participants,
  balances,
  tripTransactions,
  user,
  onAddParticipant,
  permissions,
  onRemoveClick,
  pendingInvitations = [],
  onCancelInvitation,
  setActiveTab,
}: TripSummaryTabProps) {
  const tripDays = Math.max(
    1,
    getInclusiveCalendarDays(selectedTrip.start_date, selectedTrip.end_date)
  );
  const currency = selectedTrip.currency || "BRL";

  // (a) Gastos pessoais: minhas transações NÃO compartilhadas
  const myPersonalExpenses = tripTransactions
    .filter(
      (t) =>
        t.type === "EXPENSE" &&
        !t.is_shared &&
        (t.creator_user_id === user?.id || t.user_id === user?.id)
    )
    .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)).toNumber(), 0);

  // Saldo do participante atual (do RPC — fonte única da verdade)
  const myBalance = balances.find((b) => b.participantId === user?.id);

  const myShareOfSharedExpenses = tripTransactions
    .filter((t) => t.type === "EXPENSE" && t.is_shared)
    .reduce((sum, t) => {
      if (!t.transaction_splits) return sum;
      const mySplit = t.transaction_splits.find((split) => split.user_id === user?.id);
      return SafeFinancialCalculator.add(sum, mySplit ? Number(mySplit.amount) : 0).toNumber();
    }, 0);

  const myTotalPersonal = SafeFinancialCalculator.add(
    myPersonalExpenses,
    myShareOfSharedExpenses
  ).toNumber();

  // (b) Gastos compartilhados pagos por mim (eu paguei a conta toda)
  const mySharedExpensesPaid = tripTransactions
    .filter(
      (t) =>
        t.type === "EXPENSE" &&
        t.is_shared &&
        (t.creator_user_id === user?.id || t.user_id === user?.id)
    )
    .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)).toNumber(), 0);

  // (c) Total de despesas compartilhadas do grupo (para exibição geral)
  const totalSharedExpenses = tripTransactions
    .filter((t) => t.type === "EXPENSE" && t.is_shared)
    .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)).toNumber(), 0);

  // Busca cotação em tempo real se não for BRL
  const { data: realTimeRate } = useQuery({
    queryKey: ["currency-quote", currency],
    queryFn: async () => {
      if (currency === "BRL") return null;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase.functions.invoke("get-currency-quote", {
        body: { currency },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data.rate as number;
    },
    enabled: currency !== "BRL",
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return (
    <div className="space-y-8 mt-6 animate-fade-in pb-20">
      {/* Mensagem de Boas Vindas caso não haja transações */}
      {tripTransactions.length === 0 && (
        <div className="p-6 rounded-4xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-card relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative z-10 max-w-xl">
            <h2 className="font-display font-black text-2xl mb-1 text-foreground">
              Sua viagem está pronta! ✈️
            </h2>
            <p className="text-muted-foreground text-sm">
              Use as ações rápidas abaixo para convidar amigos, montar seu roteiro e iniciar os
              lançamentos. O resumo da viagem será atualizado automaticamente.
            </p>
          </div>
          <TrendingUp className="w-32 h-32 text-primary/5 absolute right-4 top-1/2 -translate-y-1/2 sm:-right-4" />
        </div>
      )}

      {/* ===== AÇÕES RÁPIDAS (Sempre visíveis) ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={onAddParticipant}
          className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-accent/30 hover:shadow-accent/10 transition-all group backdrop-blur-sm"
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Users className="h-6 w-6 text-accent" />
          </div>
          <span className="font-bold text-sm text-center leading-tight">
            Convidar
            <br />
            Amigos
          </span>
        </button>

        <button
          onClick={() => setActiveTab && setActiveTab("itinerary")}
          className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-warning/30 hover:shadow-warning/10 transition-all group backdrop-blur-sm"
        >
          <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Calendar className="h-6 w-6 text-warning" />
          </div>
          <span className="font-bold text-sm text-center leading-tight">
            Montar
            <br />
            Roteiro
          </span>
        </button>

        <button
          onClick={() => setActiveTab && setActiveTab("expenses")}
          className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-success/30 hover:shadow-[0_0_15px_rgba(34,197,94,0.1)] transition-all group backdrop-blur-sm"
        >
          <div className="w-12 h-12 rounded-full bg-success/12 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <DollarSign className="h-6 w-6 text-success" />
          </div>
          <span className="font-bold text-sm text-center leading-tight">
            Lançar
            <br />
            Despesa
          </span>
        </button>

        <button
          onClick={() => setActiveTab && setActiveTab("checklist")}
          className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-accent/30 hover:shadow-accent/10 transition-all group backdrop-blur-sm"
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <CheckCircle className="h-6 w-6 text-accent" />
          </div>
          <span className="font-bold text-sm text-center leading-tight">
            Fazer as
            <br />
            Malas
          </span>
        </button>
      </div>

      {/* Grid de Informações Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-widest">Duração</span>
          </div>
          <p className="font-mono text-3xl font-black tracking-tighter">
            {tripDays}
            <span className="text-sm font-normal text-muted-foreground ml-1">dias</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-widest">Minha Média/Dia</span>
          </div>
          <p className="font-mono text-3xl font-black tracking-tighter text-primary">
            {moneyUtils.format(myTotalPersonal / tripDays, currency)}
          </p>
        </div>
      </div>

      {/* ===== SEÇÃO DE GASTOS — 3 BLOCOS SEPARADOS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* (A) Gastos Pessoais — apenas meus, privados e impacto no orçamento */}
        <div className="p-6 rounded-3xl border border-border/50 bg-gradient-to-br from-card/50 to-muted/20 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <User className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <User className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-bold uppercase tracking-widest">Meu Gasto (Orçamento)</h3>
            </div>
            <p className="font-mono text-3xl font-black tracking-tighter text-foreground mb-1">
              {moneyUtils.format(myTotalSpent, currency)}
            </p>
            <p className="text-sm text-muted-foreground">
              Impacto real (caixa): privadas + adiantamentos pendentes em compartilhados
            </p>
            {myPersonalBudget && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest mb-1">
                  Orçamento Pessoal
                </p>
                <p className="text-sm font-mono font-bold text-accent">
                  {((myTotalSpent / myPersonalBudget) * 100).toFixed(1)}% utilizado
                </p>
              </div>
            )}

            {/* Aviso de Cotação em Tempo Real para Moedas Estrangeiras */}
            {currency !== "BRL" && realTimeRate && (
              <div className="mt-4 p-3 rounded-lg border border-warning/30 bg-warning/10 backdrop-blur-sm relative overflow-hidden group">
                <div className="flex items-start gap-2 relative z-10">
                  <Info className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-warning mb-0.5">Cotação Oficial de Hoje</p>
                    <p className="text-sm text-muted-foreground">
                      Seu gasto pelo <strong>PM atual</strong> é{" "}
                      {moneyUtils.format(myTotalSpent, currency)}. Pela cotação de hoje (R${" "}
                      {realTimeRate.toFixed(2)}), custaria{" "}
                      <strong className="text-warning">
                        R${" "}
                        {(myTotalSpent * realTimeRate).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                      .
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* (B) Compartilhados que EU paguei */}
        <div className="p-6 rounded-3xl border border-border/50 bg-gradient-to-br from-card/50 to-muted/20 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <Receipt className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Receipt className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-bold uppercase tracking-widest">
                Compartilhados que Paguei
              </h3>
            </div>
            <p className="font-mono text-3xl font-black tracking-tighter text-foreground mb-1">
              {moneyUtils.format(mySharedExpensesPaid, currency)}
            </p>
            <p className="text-sm text-muted-foreground">
              {
                tripTransactions.filter(
                  (t) =>
                    t.type === "EXPENSE" &&
                    t.is_shared &&
                    (t.creator_user_id === user?.id || t.user_id === user?.id)
                ).length
              }{" "}
              despesas do grupo
            </p>
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest mb-1">
                Total do Grupo
              </p>
              <p className="text-sm font-mono font-bold text-accent">
                {moneyUtils.format(totalSharedExpenses, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* (C) Valores que me devem / Eu devo (do RPC — fonte de verdade) */}
        <div className="p-6 rounded-3xl border border-border/50 bg-gradient-to-br from-card/50 to-muted/20 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <DollarSign className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <DollarSign className="h-4 w-4 text-success" />
              <h3 className="text-sm font-bold uppercase tracking-widest">Saldo Compartilhado</h3>
            </div>
            {myBalance ? (
              <>
                <p
                  className={cn(
                    "font-mono text-3xl font-black tracking-tighter mb-1",
                    Math.abs(myBalance.balance) < 0.01
                      ? "text-muted-foreground"
                      : myBalance.balance > 0
                        ? "text-success dark:text-success"
                        : "text-warning"
                  )}
                >
                  {Math.abs(myBalance.balance) < 0.01 ? (
                    "Em dia!"
                  ) : (
                    <>
                      {myBalance.balance > 0 ? "+" : ""}
                      {moneyUtils.format(myBalance.balance, currency)}
                    </>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {Math.abs(myBalance.balance) < 0.01
                    ? "Tudo acertado"
                    : myBalance.balance > 0
                      ? "Outros te devem"
                      : "Você deve ao grupo"}
                </p>
                <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest mb-0.5">
                      Paguei
                    </p>
                    <p className="text-sm font-mono font-bold text-success dark:text-success">
                      {moneyUtils.format(mySharedExpensesPaid, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest mb-0.5">
                      Minha parte
                    </p>
                    <p className="text-sm font-mono font-bold text-warning">
                      {moneyUtils.format(myShareOfSharedExpenses, currency)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados de saldo</p>
            )}
          </div>
        </div>
      </div>

      {/* Painel de Acerto Final */}
      {participants.length > 0 &&
        myBalance &&
        (() => {
          const isSettled = Math.abs(myBalance.balance) < 0.01;

          // Verificar se há acertos pendentes de confirmação
          const waitingMyConfirmation = tripTransactions.some(
            (t) =>
              t.type === "EXPENSE" &&
              t.is_shared &&
              t.transaction_splits?.some(
                (split) =>
                  split.user_id !== user?.id && // não sou eu que devo
                  (t.creator_user_id === user?.id || t.user_id === user?.id) && // eu paguei
                  split.settled_by_debtor === true &&
                  !split.settled_by_creditor
              )
          );

          const waitingTheirConfirmation = tripTransactions.some(
            (t) =>
              t.type === "EXPENSE" &&
              t.is_shared &&
              t.transaction_splits?.some(
                (split) =>
                  split.user_id === user?.id && // eu devo
                  split.settled_by_debtor === true &&
                  !split.settled_by_creditor
              )
          );

          return (
            <div
              className={cn(
                "p-8 rounded-4xl border transition-all duration-500 relative overflow-hidden",
                isSettled
                  ? "border-success/20 bg-success/5"
                  : myBalance.balance >= 0
                    ? "border-accent/20 bg-accent/5"
                    : "border-warning/20 bg-warning/5"
              )}
            >
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-5">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110",
                      isSettled
                        ? "bg-success shadow-success/20"
                        : myBalance.balance >= 0
                          ? "bg-accent shadow-accent/20"
                          : "bg-warning shadow-warning/20"
                    )}
                  >
                    {isSettled ? (
                      <CheckCircle className="h-8 w-8 text-white" />
                    ) : (
                      <Wallet className="h-8 w-8 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-2xl tracking-tight">
                      Meu Saldo de Acertos
                    </h3>
                    <p className="text-muted-foreground">
                      {isSettled
                        ? "Você está em dia com a viagem!"
                        : myBalance.balance >= 0
                          ? "Você pagou mais que a sua parte."
                          : "Você deve para o grupo ou participante."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-8 md:gap-12">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest">
                      Eu Paguei
                    </p>
                    <p className="font-mono text-2xl font-black tracking-tighter text-success dark:text-success">
                      {moneyUtils.format(mySharedExpensesPaid, currency)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest">
                      Minha Parte
                    </p>
                    <p className="font-mono text-2xl font-black tracking-tighter text-warning">
                      {moneyUtils.format(myShareOfSharedExpenses, currency)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest">
                      Saldo Atual
                    </p>
                    <p
                      className={cn(
                        "font-mono text-2xl font-black tracking-tighter",
                        isSettled
                          ? "text-success dark:text-success"
                          : myBalance.balance >= 0
                            ? "text-accent"
                            : "text-warning"
                      )}
                    >
                      {isSettled ? (
                        moneyUtils.format(0, currency)
                      ) : (
                        <>
                          {myBalance.balance >= 0 ? "+" : ""}
                          {moneyUtils.format(myBalance.balance, currency)}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {!isSettled && (
                <div className="mt-8 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                    <Info className="h-4 w-4" />
                    {waitingMyConfirmation ? (
                      <span className="text-accent font-semibold">
                        Existem pagamentos aguardando sua confirmação de recebimento.
                      </span>
                    ) : waitingTheirConfirmation ? (
                      <span className="text-warning font-semibold">
                        Aguardando o credor confirmar o seu pagamento.
                      </span>
                    ) : myBalance.balance >= 0 ? (
                      "Aguarde os outros participantes realizarem o acerto com você."
                    ) : (
                      "Realize o acerto na aba Compartilhados para equilibrar seu saldo."
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-xl gap-2 hover:bg-muted"
                    onClick={() => (window.location.href = "/compartilhados?tab=TRAVEL")}
                  >
                    Ir para Acertos <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })()}

      {/* Seção de Viajantes da Viagem */}
      <TripTravelersSection
        participants={participants}
        balances={balances}
        tripTransactions={tripTransactions}
        user={user}
        currency={currency}
        permissions={permissions}
        onAddParticipant={onAddParticipant}
        onRemoveClick={onRemoveClick}
        pendingInvitations={pendingInvitations}
        onCancelInvitation={onCancelInvitation}
      />
    </div>
  );
}
