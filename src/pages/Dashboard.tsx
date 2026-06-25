import { moneyUtils } from "@/utils/money";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { CreditCard, TrendingUp, Wallet, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardData } from "@/hooks/useDashboard";
import { useAccounts } from "@/hooks/useAccounts";
import { useTrips } from "@/hooks/useTrips";
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
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardInvoices } from "@/components/dashboard/DashboardInvoices";
import { DashboardRecentActivity } from "@/components/dashboard/DashboardRecentActivity";
import { DashboardQuickAccess } from "@/components/dashboard/DashboardQuickAccess";
import { DashboardBillsDue } from "@/components/dashboard/DashboardBillsDue";
import { DashboardLowBalanceAlert } from "@/components/dashboard/DashboardLowBalanceAlert";
import { FamilyBalancePanel } from "@/components/dashboard/FamilyBalancePanel";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useTransactions } from "@/hooks/useTransactions";
import { getTransactionCurrency } from "@/utils/transactionUtils";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane } from "lucide-react";
import { TripDashboardView } from "@/components/dashboard/TripDashboardView";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { logger } from '@/utils/logger';

export function Dashboard() {
  const [selectedCurrency, setSelectedCurrency] = useState<string>("BRL");
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<any>(null);
  const [isTripMode, setIsTripMode] = useState(false);

  const { user } = useAuth();
  const { currentDate } = useMonth();
  const { data: dashboardData, isLoading: txLoading, isError: txError } = useDashboardData();
  const { data: dashboardRecentTransactions = [], isLoading: recentLoading } = useTransactions({ limit: 100 });
  const { data: familyMembers = [] } = useFamilyMembers();
  const { data: accounts, isLoading: accountsLoading, isError: accountsError } = useAccounts();
  const { data: trips } = useTrips();
  const { data: wealthHistory } = useWealthEvolution(selectedCurrency);
  const { data: profile } = useUserProfile();
  const { data: realTimeRate, isLoading: isRateLoading } = useCurrencyRate(selectedCurrency, "BRL");



  useEffect(() => {
    // Sincroniza fechamento de faturas automaticamente
    import("@/integrations/supabase/client").then(({ supabase }) => {
      // Chamada direta sem verificação de tipo para RPC não tipada
      (supabase.rpc as any)("process_credit_card_invoices").then(({ error }: any) => {
        if (error) logger.error("Falha ao sincronizar faturas:", error);
      });
    });
  }, []);

  useEffect(() => {
    const handleOpenModal = (e: any) => {
      if (e.detail?.transaction) {
        setTransactionToEdit(e.detail.transaction);
      } else {
        setTransactionToEdit(null);
      }
      setShowTransactionModal(true);
    };
    window.addEventListener('openTransactionModal', handleOpenModal);
    return () => window.removeEventListener('openTransactionModal', handleOpenModal);
  }, []);

  const recentTransactions = useMemo(() => {
    return dashboardRecentTransactions
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
  }, [dashboardRecentTransactions, familyMembers, selectedCurrency, user?.id]);
  const hasError = txError || accountsError;
  const isLoading = (txLoading || accountsLoading || recentLoading) && !hasError;

  const activeTrip = useMemo(() => {
    if (!trips || trips.length === 0) return null;
    const now = new Date();
    // Prioritize currently active trips, otherwise fallback to the most recent/upcoming
    const current = trips.find((t: any) => new Date(t.start_date) <= now && new Date(t.end_date) >= now);
    return current || trips[0];
  }, [trips]);


  const currenciesData = useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) return [];
    
    const totalsByCurrency = dashboardData?.totals_by_currency || [];
    
    const map = new Map<string, { currency: string, balance: number, total_patrimony: number, income: number, expense: number, pending_income: number, pending_expense: number }>();
    
    // Aggregate balances from accounts
    const endOfCurrentMonth = dateFns.endOfMonth(currentDate);
    accounts.filter(a => a.type !== 'CREDIT_CARD' && new Date(a.created_at) <= endOfCurrentMonth).forEach(acc => {
      const c = acc.currency || 'BRL';
      const current = map.get(c) || { currency: c, balance: 0, total_patrimony: 0, income: 0, expense: 0, pending_income: 0, pending_expense: 0 };
      
      current.total_patrimony = SafeFinancialCalculator.add(current.total_patrimony, Number(acc.balance || 0));
      
      if (acc.type !== 'INVESTMENT' && acc.type !== 'EMERGENCY_FUND') {
        current.balance = SafeFinancialCalculator.add(current.balance, Number(acc.balance || 0));
      }

      map.set(c, current);
    });

    // Add income/expense from dashboardData
    totalsByCurrency.forEach(t => {
      const c = t.currency || 'BRL';
      const current = map.get(c) || { currency: c, balance: 0, total_patrimony: 0, income: 0, expense: 0, pending_income: 0, pending_expense: 0 };
      current.income = SafeFinancialCalculator.add(current.income, Number(t.income || 0));
      current.expense = SafeFinancialCalculator.add(current.expense, Number(t.expense || 0));
      current.pending_income = SafeFinancialCalculator.add(current.pending_income, Number(t.pending_income || 0));
      current.pending_expense = SafeFinancialCalculator.add(current.pending_expense, Number(t.pending_expense || 0));
      map.set(c, current);
    });

    return Array.from(map.values()).sort((a) => a.currency === 'BRL' ? -1 : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, currentDate]);

  const brlData = currenciesData.find(c => c.currency === 'BRL') || { currency: 'BRL', balance: 0, total_patrimony: 0, income: 0, expense: 0, pending_income: 0, pending_expense: 0 };
  const activeCurrencyData = currenciesData.find(c => c.currency === selectedCurrency) || currenciesData[0] || brlData;

  const displayData = activeCurrencyData;

  const hasAccounts = accounts && accounts.length > 0;
  const hasTransactions = recentTransactions && recentTransactions.length > 0;

  const creditCardsWithBalance = useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) return [];
    return accounts.filter(a => a.type === "CREDIT_CARD" && Number(a.balance) < 0);
  }, [accounts]);

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        {/* Hero skeleton */}
        <div className="relative overflow-hidden p-4 md:p-6 rounded-3xl border border-border/50 bg-card/50">
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
              {[1, 2, 3, 4].map(i => (
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
      <div className="space-y-5 animate-fade-in">
        <PendingInvitationsAlert />
        <PendingTripInvitationsAlert />
        <PendingSharedCardInvitationsAlert />
        <EmptyState
          icon={AlertCircle}
          variant="danger"
          title="Erro ao carregar dashboard"
          description="Não conseguimos buscar seus dados financeiros no momento. Isso pode ser um problema temporário de conexão."
          action={<Button onClick={() => window.location.reload()} variant="outline">Recarregar página</Button>}
        />
      </div>
    );
  }

  if (!hasAccounts && !hasTransactions) {
    return (
      <div className="space-y-5 animate-fade-in flex flex-col items-center justify-center min-h-[60vh]">
        <PendingInvitationsAlert />
        <PendingTripInvitationsAlert />
        <PendingSharedCardInvitationsAlert />
        
        <div className="relative overflow-hidden w-full max-w-2xl mx-auto rounded-[2.5rem] bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-2xl p-8 text-center backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[60px] rounded-full z-0 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 blur-[60px] rounded-full z-0 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-background rounded-3xl flex items-center justify-center shadow-lg border border-white/5 mb-6 rotate-3 transition-transform hover:rotate-6">
              <Wallet className="w-10 h-10 text-primary" />
            </div>
            
            <h1 className="text-2xl font-display font-bold mb-3 tracking-tight">O palco está montado</h1>
            <p className="text-muted-foreground text-base mb-8 max-w-md mx-auto">
              Seu império financeiro começa aqui. Adicione sua primeira conta para ver a mágica do Pé de Meia acontecer.
            </p>
            
            <Link to="/contas">
              <Button size="lg" className="px-8 text-base rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all">
                <CreditCard className="h-5 w-5 mr-3" />
                Adicionar Primeira Conta
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <GreetingCard className="animate-fade-in-down" />
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

        <div className="flex justify-end items-center gap-3 pt-1">
          {activeTrip && (
            <Button
              variant="outline"
              onClick={() => setIsTripMode(!isTripMode)}
              className={`rounded-full h-10 px-4 flex items-center gap-2 border transition-all duration-500 shadow-md hover:shadow-lg active:scale-95 z-10 font-semibold backdrop-blur-md ${
                isTripMode 
                  ? "bg-primary/20 border-primary text-primary hover:bg-primary/30 shadow-primary/20" 
                  : "bg-background/80 border-border text-muted-foreground hover:bg-background shadow-black/5"
              }`}
              title={isTripMode ? "Sair do Modo Viagem" : "Entrar no Modo Viagem"}
            >
              <div className={`flex items-center justify-center rounded-full p-1 transition-transform duration-500 ${isTripMode ? "bg-primary text-primary-foreground rotate-12" : "bg-muted text-muted-foreground"}`}>
                <Plane className="h-4 w-4" />
              </div>
              <span>{isTripMode ? "Viagem Ativa" : "Modo Viagem"}</span>
            </Button>
          )}
          {currenciesData.length > 1 && (
            <div className="w-[85px]">
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="h-10 rounded-full border-none bg-muted/50 hover:bg-muted shadow-none font-semibold px-3 focus:ring-0 focus:ring-offset-0 transition-colors">
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
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 mb-2">
          <TripDashboardView />
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
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
              <DashboardInvoices
                creditCardsWithBalance={creditCardsWithBalance}
                formatCurrency={(val) => moneyUtils.format(val, 'BRL')}
              />
              <FamilyBalancePanel />
            </div>

          </div>
        </div>
      )}

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        initialData={transactionToEdit}
      />
    </div>
  );
}
