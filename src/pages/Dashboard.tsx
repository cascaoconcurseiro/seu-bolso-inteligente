import { moneyUtils } from "@/utils/money";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { CreditCard, Wallet, AlertCircle, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardData, DashboardTransaction } from "@/hooks/useDashboard";
import { useAccounts } from "@/hooks/useAccounts";
import { useTrips, Trip } from "@/hooks/useTrips";
import { useWealthEvolution } from "@/hooks/useWealthEvolution";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCurrencyRate } from "@/hooks/useCurrencyRate";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { PendingInvitationsAlert } from "@/components/family/PendingInvitationsAlert";
import { PendingTripInvitationsAlert } from "@/components/trips/PendingTripInvitationsAlert";
import { PendingSharedCardInvitationsAlert } from "@/components/credit-cards/PendingSharedCardInvitationsAlert";
import { useMonth } from "@/contexts/MonthContext";
import { useAuth } from "@/contexts/AuthContext";
import * as dateFns from "date-fns";
import { GreetingCard } from "@/components/dashboard/GreetingCard";
import { MonthInsight } from "@/components/dashboard/MonthInsight";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardInvoices } from "@/components/dashboard/DashboardInvoices";
import { DashboardRecentActivity } from "@/components/dashboard/DashboardRecentActivity";
import { DashboardQuickAccess } from "@/components/dashboard/DashboardQuickAccess";
import { DashboardBillsDue } from "@/components/dashboard/DashboardBillsDue";
import { DashboardUpcomingRecurring } from "@/components/dashboard/DashboardUpcomingRecurring";
import { DashboardLowBalanceAlert } from "@/components/dashboard/DashboardLowBalanceAlert";
import { FamilyBalancePanel } from "@/components/dashboard/FamilyBalancePanel";
import { TripDashboardView } from "@/components/dashboard/TripDashboardView";
import { useFamilyMembers } from "@/hooks/useFamily";
import { getTransactionCurrency } from "@/utils/transactionUtils";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Dashboard() {
  const [selectedCurrency, setSelectedCurrency] = useState<string>("BRL");
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<DashboardTransaction | null>(null);
  const [isTripMode, setIsTripMode] = useState(false);

  const { user } = useAuth();
  const { currentDate } = useMonth();
  const { data: dashboardData, isLoading: txLoading, isError: txError } = useDashboardData();
  const { data: familyMembers = [] } = useFamilyMembers();
  const { data: accounts, isLoading: accountsLoading, isError: accountsError } = useAccounts();
  const { data: trips } = useTrips();
  const { data: wealthHistory } = useWealthEvolution(selectedCurrency);
  const { data: profile } = useUserProfile();
  const { data: realTimeRate, isLoading: isRateLoading } = useCurrencyRate(selectedCurrency, "BRL");

  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.transaction) {
        setTransactionToEdit(detail.transaction);
      } else {
        setTransactionToEdit(null);
      }
      setShowTransactionModal(true);
    };
    window.addEventListener("openTransactionModal", handleOpenModal);
    return () => window.removeEventListener("openTransactionModal", handleOpenModal);
  }, []);

  const recentTransactions = useMemo(() => {
    return (dashboardData?.recent_transactions || [])
      .filter((tx) => {
        if (getTransactionCurrency(tx) !== selectedCurrency) return false;

        if (tx.source_transaction_id) return false;

        if (tx.is_shared === true) {
          const isCreator = tx.creator_user_id === user?.id;
          const myFamilyMember = familyMembers.find((m) => m.linked_user_id === user?.id);
          const isPayer = myFamilyMember && tx.payer_id === myFamilyMember.id;
          if (!isCreator && !isPayer) return false;
        }

        return true;
      })
      .slice(0, 5);
  }, [dashboardData?.recent_transactions, familyMembers, selectedCurrency, user?.id]);
  const hasError = txError || accountsError;
  const isLoading = (txLoading || accountsLoading) && !hasError;

  const activeTrip = useMemo(() => {
    if (!trips || trips.length === 0) return null;
    const now = new Date();
    // Prioritize currently active trips, otherwise fallback to the most recent/upcoming
    const current = trips.find(
      (t: Trip) => new Date(t.start_date) <= now && new Date(t.end_date) >= now
    );
    return current || trips[0];
  }, [trips]);

  const currenciesData = useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) return [];

    const totalsByCurrency = dashboardData?.totals_by_currency || [];

    const map = new Map<
      string,
      {
        currency: string;
        balance: number;
        total_patrimony: number;
        income: number;
        expense: number;
        pending_income: number;
        pending_expense: number;
      }
    >();

    // Aggregate balances from accounts
    const endOfCurrentMonth = dateFns.endOfMonth(currentDate);
    accounts
      .filter((a) => a.type !== "CREDIT_CARD" && new Date(a.created_at) <= endOfCurrentMonth)
      .forEach((acc) => {
        const c = acc.currency || "BRL";
        const current = map.get(c) || {
          currency: c,
          balance: 0,
          total_patrimony: 0,
          income: 0,
          expense: 0,
          pending_income: 0,
          pending_expense: 0,
        };

        current.total_patrimony = SafeFinancialCalculator.add(
          current.total_patrimony,
          Number(acc.balance || 0)
        ).toNumber();

        if (acc.type !== "INVESTMENT" && acc.type !== "EMERGENCY_FUND") {
          current.balance = SafeFinancialCalculator.add(
            current.balance,
            Number(acc.balance || 0)
          ).toNumber();
        }

        map.set(c, current);
      });

    // Add income/expense from dashboardData
    totalsByCurrency.forEach((t) => {
      const c = t.currency || "BRL";
      const current = map.get(c) || {
        currency: c,
        balance: 0,
        total_patrimony: 0,
        income: 0,
        expense: 0,
        pending_income: 0,
        pending_expense: 0,
      };
      current.income = SafeFinancialCalculator.add(
        current.income,
        Number(t.income || 0)
      ).toNumber();
      current.expense = SafeFinancialCalculator.add(
        current.expense,
        Number(t.expense || 0)
      ).toNumber();
      current.pending_income = SafeFinancialCalculator.add(
        current.pending_income,
        Number(t.pending_income || 0)
      ).toNumber();
      current.pending_expense = SafeFinancialCalculator.add(
        current.pending_expense,
        Number(t.pending_expense || 0)
      ).toNumber();
      map.set(c, current);
    });

    return Array.from(map.values()).sort((a) => (a.currency === "BRL" ? -1 : 1));
  }, [accounts, currentDate, dashboardData]);

  const brlData = currenciesData.find((c) => c.currency === "BRL") || {
    currency: "BRL",
    balance: 0,
    total_patrimony: 0,
    income: 0,
    expense: 0,
    pending_income: 0,
    pending_expense: 0,
  };
  const activeCurrencyData =
    currenciesData.find((c) => c.currency === selectedCurrency) || currenciesData[0] || brlData;

  const displayData = activeCurrencyData;

  const hasAccounts = accounts && accounts.length > 0;
  const hasTransactions = recentTransactions && recentTransactions.length > 0;

  const creditCardsWithBalance = useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) return [];
    return accounts.filter((a) => a.type === "CREDIT_CARD" && Number(a.balance) < 0);
  }, [accounts]);

  if (isLoading) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Carregando painel financeiro">
        {/* Hero skeleton */}
        <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
          <div className="space-y-4">
            <div className="skeleton h-4 w-48 rounded-lg" />
            <div className="skeleton h-16 w-72 rounded-xl" />
            <div className="flex gap-3">
              <div className="skeleton h-10 w-36 rounded-2xl" />
              <div className="skeleton h-10 w-36 rounded-2xl" />
            </div>
          </div>
        </div>
        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-4">
            <div className="skeleton h-40 w-full rounded-2xl" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-16 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="skeleton h-32 w-full rounded-2xl" />
            <div className="skeleton h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-5">
        <PendingInvitationsAlert />
        <PendingTripInvitationsAlert />
        <PendingSharedCardInvitationsAlert />
        <EmptyState
          icon={AlertCircle}
          variant="danger"
          title="Erro ao carregar dashboard"
          description="Não conseguimos buscar seus dados financeiros no momento. Isso pode ser um problema temporário de conexão."
          action={
            <Button onClick={() => window.location.reload()} variant="outline">
              Recarregar página
            </Button>
          }
        />
      </div>
    );
  }

  if (!hasAccounts && !hasTransactions) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-5">
        <PendingInvitationsAlert />
        <PendingTripInvitationsAlert />
        <PendingSharedCardInvitationsAlert />

        <section className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-card p-6 text-center md:p-8">
          <div className="flex flex-col items-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Wallet className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>

            <h1 className="mb-2 font-display text-2xl font-semibold tracking-tight">
              Comece pela sua primeira conta
            </h1>
            <p className="mx-auto mb-6 max-w-md text-base text-muted-foreground">
              Cadastre onde você guarda ou movimenta dinheiro. Depois disso, seu saldo e suas
              transações aparecerão neste painel.
            </p>

            <Link to="/contas">
              <Button size="lg" className="h-11 px-6 text-base">
                <CreditCard className="mr-2 h-5 w-5" aria-hidden="true" />
                Adicionar primeira conta
              </Button>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <PullToRefresh queryKeys={[["dashboard-data"], ["accounts"], ["trips"]]}>
      <div className="space-y-5">
        <GreetingCard />
        <MonthInsight
          income={displayData.income}
          expense={displayData.expense}
          pendingExpense={displayData.pending_expense}
          currency={displayData.currency}
        />
        <PendingInvitationsAlert />
        <PendingTripInvitationsAlert />
        <PendingSharedCardInvitationsAlert />

        <div className="space-y-4">
          <DashboardHero
            currency={displayData.currency}
            balance={displayData.balance}
            totalPatrimony={displayData.total_patrimony}
            income={displayData.income}
            expenses={displayData.expense}
            formatCurrency={(val) => moneyUtils.format(val, displayData.currency)}
            wealthHistory={wealthHistory}
            monthlyBudget={profile?.monthly_budget}
            realTimeRate={realTimeRate}
            isRateLoading={isRateLoading}
          />

          <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border pb-4">
            {activeTrip && (
              <Button
                variant="outline"
                onClick={() => setIsTripMode(!isTripMode)}
                className={`h-10 gap-2 px-3 font-medium ${
                  isTripMode
                    ? "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground"
                }`}
                title={isTripMode ? "Sair do Modo Viagem" : "Entrar no Modo Viagem"}
                aria-pressed={isTripMode}
              >
                <Plane className="h-4 w-4" aria-hidden="true" />
                <span>{isTripMode ? "Viagem ativa" : "Modo viagem"}</span>
              </Button>
            )}
            {currenciesData.length > 1 && (
              <div className="w-24">
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger className="h-10 bg-background px-3 font-medium">
                    <SelectValue placeholder="Moeda" />
                  </SelectTrigger>
                  <SelectContent>
                    {currenciesData.map((c) => (
                      <SelectItem key={c.currency} value={c.currency} className="font-medium">
                        {c.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {isTripMode && activeTrip ? (
          <div className="mb-2">
            <TripDashboardView />
          </div>
        ) : (
          <div>
            {/* Mobile: stack | Desktop: 2-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
              {/* Coluna principal — 8 cols */}
              <div className="lg:col-span-8 space-y-4 md:space-y-5">
                <DashboardQuickAccess />
                <DashboardLowBalanceAlert
                  currentBalance={brlData.balance}
                  threshold={profile?.low_balance_threshold ?? 0}
                />
                <DashboardRecentActivity
                  recentTransactions={recentTransactions}
                  formatCurrencyWithSymbol={(val, curr) => moneyUtils.format(val, curr)}
                />
              </div>

              {/* Sidebar — 4 cols */}
              <div className="lg:col-span-4 space-y-4 md:space-y-5">
                <DashboardBillsDue />
                <DashboardUpcomingRecurring />
                <DashboardInvoices
                  creditCardsWithBalance={creditCardsWithBalance}
                  formatCurrency={(val) => moneyUtils.format(val, "BRL")}
                />
                <FamilyBalancePanel />
              </div>
            </div>
          </div>
        )}

        <TransactionModal
          open={showTransactionModal}
          onOpenChange={setShowTransactionModal}
          // TransactionModal usa Record<string, unknown> como tipo coringa para edição genérica;
          // DashboardTransaction é estruturalmente compatível em runtime (todas as props são string-keyed).
          initialData={transactionToEdit as unknown as Record<string, unknown> | undefined}
        />
      </div>
    </PullToRefresh>
  );
}
