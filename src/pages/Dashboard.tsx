import { moneyUtils } from "@/utils/money";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { CreditCard, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "@/hooks/useDashboard";
import { useAccounts } from "@/hooks/useAccounts";
import { useMonthlyProjection } from "@/hooks/useMonthlyProjection";
import { useWealthEvolution } from "@/hooks/useWealthEvolution";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { GreetingCard } from "@/components/dashboard/GreetingCard";
import { PendingInvitationsAlert } from "@/components/family/PendingInvitationsAlert";
import { PendingTripInvitationsAlert } from "@/components/trips/PendingTripInvitationsAlert";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardInvoices } from "@/components/dashboard/DashboardInvoices";
import { DashboardRecentActivity } from "@/components/dashboard/DashboardRecentActivity";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plane } from "lucide-react";
import { TripDashboardView } from "@/components/dashboard/TripDashboardView";

export function Dashboard() {
  const [selectedCurrency, setSelectedCurrency] = useState<string>("BRL");
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [isTravelMode, setIsTravelMode] = useState(false);
  
  const { data: dashboardData, isLoading: txLoading, isError: txError } = useDashboardData();
  const { data: accounts, isLoading: accountsLoading, isError: accountsError } = useAccounts();
  const { data: projection } = useMonthlyProjection(selectedCurrency);
  const { data: wealthHistory } = useWealthEvolution(selectedCurrency);

  useEffect(() => {
    const handleOpenModal = () => setShowTransactionModal(true);
    window.addEventListener('openTransactionModal', handleOpenModal);
    return () => window.removeEventListener('openTransactionModal', handleOpenModal);
  }, []);

  const recentTransactions = dashboardData?.recent_transactions || [];
  const hasError = txError || accountsError;
  const isLoading = (txLoading || accountsLoading) && !hasError;

  const totalsByCurrency = dashboardData?.totals_by_currency || [];

  const currenciesData = useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) return [];
    
    const map = new Map<string, { currency: string, balance: number, income: number, expense: number }>();
    
    // Aggregate balances from accounts
    accounts.filter(a => a.type !== 'CREDIT_CARD').forEach(acc => {
      const c = acc.currency || 'BRL';
      const current = map.get(c) || { currency: c, balance: 0, income: 0, expense: 0 };
      current.balance += Number(acc.balance || 0);
      map.set(c, current);
    });

    // Add income/expense from dashboardData
    totalsByCurrency.forEach(t => {
      const c = t.currency || 'BRL';
      const current = map.get(c) || { currency: c, balance: 0, income: 0, expense: 0 };
      current.income += Number(t.income || 0);
      current.expense += Number(t.expense || 0);
      map.set(c, current);
    });

    return Array.from(map.values()).sort((a, b) => a.currency === 'BRL' ? -1 : 1);
  }, [accounts, totalsByCurrency]);

  const brlData = currenciesData.find(c => c.currency === 'BRL') || { currency: 'BRL', balance: 0, income: 0, expense: 0 };
  const foreignData = currenciesData.filter(c => c.currency !== 'BRL');
  const activeCurrencyData = currenciesData.find(c => c.currency === selectedCurrency) || currenciesData[0] || brlData;

  const savings = activeCurrencyData.income - activeCurrencyData.expense;
  const projectedBalance = projection?.projected_balance ?? activeCurrencyData.balance;

  const balancesByForeignCurrency = foreignData.reduce((acc, curr) => {
    acc[curr.currency] = curr.balance;
    return acc;
  }, {} as Record<string, number>);

  const hasAccounts = accounts && accounts.length > 0;
  const hasTransactions = recentTransactions && recentTransactions.length > 0;

  const creditCardsWithBalance = useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) return [];
    return accounts.filter(a => a.type === "CREDIT_CARD" && Number(a.balance) < 0);
  }, [accounts]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Hero skeleton */}
        <div className="relative overflow-hidden p-6 md:p-8 rounded-[2rem] border border-border/50 bg-card/50">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
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
      <div className="space-y-8 animate-fade-in">
        <PendingInvitationsAlert />
        <PendingTripInvitationsAlert />
        <div className="text-center py-16 bg-background border border-border rounded-2xl">
          <div className="w-16 h-16 bg-negative/10 text-negative rounded-full flex items-center justify-center mb-4 mx-auto">
            <TrendingUp className="h-8 w-8 rotate-180" />
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight mb-2">
            Erro ao carregar dashboard
          </h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Não conseguimos buscar seus dados financeiros no momento. Isso pode ser um problema temporário de conexão.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Recarregar página
          </Button>
        </div>
      </div>
    );
  }

  if (!hasAccounts && !hasTransactions) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PendingInvitationsAlert />
        <PendingTripInvitationsAlert />
        
        <div className="text-center py-16">
          <h1 className="font-display font-bold text-4xl tracking-tight mb-4">
            Bem-vindo ao Pé de Meia
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            Comece adicionando uma conta bancária ou criando sua primeira transação.
          </p>
          <Link to="/contas">
            <Button size="lg" variant="outline" className="gap-2 h-12 md:h-11">
              <CreditCard className="h-5 w-5" />
              <span className="hidden sm:inline">Adicionar conta</span>
              <span className="sm:hidden">Conta</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <GreetingCard className="animate-fade-in-down" />
      <PendingInvitationsAlert />
      <PendingTripInvitationsAlert />

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2 bg-muted/50 p-2 rounded-xl border border-border/50 shadow-sm">
            <Switch
              id="travel-mode"
              checked={isTravelMode}
              onCheckedChange={setIsTravelMode}
              className="data-[state=checked]:bg-primary"
            />
            <Label htmlFor="travel-mode" className="flex items-center gap-2 cursor-pointer font-medium">
              <Plane className="h-4 w-4" />
              Modo Viagem
            </Label>
          </div>

          {currenciesData.length > 1 && !isTravelMode && (
          <div className="flex justify-end">
            <div className="w-32">
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="h-9 bg-muted/50 border-border/50">
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
          </div>
          </div>
        )}
        
        {isTravelMode ? (
          <TripDashboardView />
        ) : (
          <DashboardHero
            currency={activeCurrencyData.currency}
          balance={activeCurrencyData.balance}
          income={activeCurrencyData.income}
          expenses={activeCurrencyData.expense}
          formatCurrency={(val) => moneyUtils.format(val, activeCurrencyData.currency)}
          wealthHistory={wealthHistory}
        />
      </div>

        />
      </div>

      {!isTravelMode && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <div className="lg:col-span-8 space-y-6 md:space-y-8">
            <DashboardInvoices
              creditCardsWithBalance={creditCardsWithBalance}
              formatCurrency={(val) => moneyUtils.format(val, 'BRL')}
            />

            <DashboardRecentActivity
              recentTransactions={recentTransactions}
              formatCurrencyWithSymbol={(val, curr) => moneyUtils.format(val, curr)}
            />
          </div>

          <DashboardSidebar
            savings={savings}
            projectedBalance={projectedBalance}
            projection={projection ?? null}
            formatCurrency={(val) => moneyUtils.format(val, activeCurrencyData.currency)}
          />
        </div>
      )}

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
      />
    </div>
  );
}
