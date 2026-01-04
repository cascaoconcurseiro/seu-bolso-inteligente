import { Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, Loader2, CreditCard, Users, ChevronRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinancialSummary, useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useMonthlyProjection } from "@/hooks/useMonthlyProjection";
import { useAuth } from "@/contexts/AuthContext";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { GreetingCard } from "@/components/dashboard/GreetingCard";
import { PendingInvitationsAlert } from "@/components/family/PendingInvitationsAlert";
import { PendingTripInvitationsAlert } from "@/components/trips/PendingTripInvitationsAlert";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { groupTransactionsByDay } from "@/utils/transactionUtils";
import { useFamilyMembers } from "@/hooks/useFamily";
import { getBankById } from "@/lib/banks";
import { BankIcon } from "@/components/financial/BankIcon";

// Helper para formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const formatCurrencyWithSymbol = (value: number, currency: string = 'BRL') => {
  const symbols: Record<string, string> = {
    'BRL': 'R$',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$',
    'CHF': 'CHF',
    'CNY': '¥',
    'MXN': 'MX$',
  };
  const symbol = symbols[currency] || currency;

  if (currency === 'BRL') {
    return formatCurrency(value);
  }

  return `${symbol} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function Dashboard() {
  const { user } = useAuth();
  const { data: familyMembers = [] } = useFamilyMembers();
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useFinancialSummary();
  const { data: transactions, isLoading: txLoading, isError: txError } = useTransactions();
  const { data: accounts, isLoading: accountsLoading, isError: accountsError } = useAccounts();
  const { data: projection, isLoading: projectionLoading } = useMonthlyProjection();

  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Listen for global transaction modal event
  useEffect(() => {
    const handleOpenModal = () => setShowTransactionModal(true);
    window.addEventListener('openTransactionModal', handleOpenModal);
    return () => window.removeEventListener('openTransactionModal', handleOpenModal);
  }, []);

  // CORREÇÃO: Filtrar transações compartilhadas não acertadas
  const recentTransactions = (transactions || [])
    .filter(t => {
      // Excluir transações compartilhadas onde outra pessoa deve pagar
      if (t.is_shared || t.domain === 'SHARED') {
        // Se não tem splits, não mostrar
        const splits = (t as any).transaction_splits;
        if (!splits || splits.length === 0) {
          return false;
        }

        // Verificar se TODOS os splits foram acertados
        const allSettled = splits.every((s: any) => s.is_settled);

        // Se não foram todos acertados, não mostrar no dashboard
        if (!allSettled) {
          return false;
        }

        // Se foram acertados, verificar se o usuário atual é o criador/pagador
        const creatorUserId = (t as any).creator_user_id;
        if (creatorUserId !== user?.id && t.user_id !== user?.id) {
          return false;
        }
      }
      return true;
    })
    .slice(0, 5);

  // Se tiver erro, não ficar travado no loading
  const hasError = summaryError || txError || accountsError;
  const isLoading = (summaryLoading || txLoading || accountsLoading) && !hasError;

  const balance = summary?.balance || 0;
  const income = summary?.income || 0;
  const expenses = summary?.expenses || 0;
  const savings = income - expenses;

  // PROJEÇÃO CORRETA: usar a função que considera tudo do mês
  const projectedBalance = projection?.projected_balance ?? balance;

  // Saldos em moedas estrangeiras
  const balancesByForeignCurrency = useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) return {};
    const grouped: Record<string, number> = {};

    const foreignAccounts = (accounts || []).filter(a => a.is_international && a.type !== 'CREDIT_CARD');
    foreignAccounts.forEach(acc => {
      const currency = acc.currency || 'USD';
      grouped[currency] = (grouped[currency] || 0) + Number(acc.balance);
    });

    return grouped;
  }, [accounts]);

  const hasForeignBalances = Object.keys(balancesByForeignCurrency).length > 0;

  // Cartões com fatura
  const creditCardsWithBalance = useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) return [];
    return (accounts || []).filter(a => a.type === "CREDIT_CARD" && Number(a.balance) !== 0);
  }, [accounts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAccounts = accounts && accounts.length > 0;
  const hasTransactions = transactions && transactions.length > 0;

  // Empty state
  if (!hasAccounts && !hasTransactions) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Pending Invitations Alert - SEMPRE mostrar */}
        <PendingInvitationsAlert />
        <PendingTripInvitationsAlert />

        <div className="text-center py-16">
          <h1 className="font-display font-bold text-4xl tracking-tight mb-4">
            Bem-vindo ao Pé de Meia
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            💰 Comece sua jornada financeira adicionando uma conta ou registrando sua primeira movimentação
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
      {/* Greeting Card */}
      <GreetingCard className="animate-fade-in-down" />

      {/* Pending Invitations Alert */}
      <PendingInvitationsAlert />
      <PendingTripInvitationsAlert />

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 md:gap-6 animate-fade-in-up stagger-1">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
            Saldo atual (BRL)
          </p>
          <h1 className={cn(
            "font-display font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight animate-count-up",
            balance >= 0 ? "text-foreground" : "text-destructive"
          )}>
            {formatCurrency(balance)}
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
            <span className="flex items-center gap-1.5 animate-stagger stagger-2">
              <ArrowUpRight className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Entradas</span>
              <span className="text-green-500 font-medium">{formatCurrency(income)}</span>
            </span>
            <span className="flex items-center gap-1.5 animate-stagger stagger-3">
              <ArrowDownRight className="h-4 w-4 text-red-500" />
              <span className="text-muted-foreground">Saídas</span>
              <span className="text-red-500 font-medium">{formatCurrency(expenses)}</span>
            </span>
          </div>
        </div>

        {/* Saldos em Moedas Estrangeiras */}
        {hasForeignBalances && (
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4">
            {Object.entries(balancesByForeignCurrency).map(([currency, currencyBalance], index) => (
              <div
                key={currency}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 hover-lift animate-stagger",
                  `stagger-${index + 4}`
                )}
              >
                <Globe className="h-4 w-4 text-blue-500 animate-soft-pulse" />
                <div className="min-w-0">
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-medium truncate">
                    {currency}
                  </p>
                  <p className={cn(
                    "font-mono font-bold text-base sm:text-lg truncate",
                    currencyBalance >= 0 ? "text-foreground" : "text-destructive"
                  )}>
                    {formatCurrencyWithSymbol(currencyBalance, currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          {/* Faturas de Cartão */}
          {creditCardsWithBalance.length > 0 && (
            <div className="space-y-3 animate-fade-in-up stagger-4">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Faturas pendentes
              </h2>
              <div className="space-y-2">
                {creditCardsWithBalance.map((card, index) => {
                  const bank = getBankById(card.bank_id);
                  const dueDay = card.due_day || 10;
                  const today = new Date().getDate();
                  const daysUntilDue = dueDay >= today ? dueDay - today : 30 - today + dueDay;

                  return (
                    <Link
                      key={card.id}
                      to="/cartoes"
                      className={cn(
                        "group flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 card-animated hover-lift animate-stagger",
                        `stagger-${index + 1}`
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <BankIcon bankId={card.bank_id} size="md" />
                        <div>
                          <p className="font-medium">💳 Fatura {card.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Vence em {daysUntilDue} dia{daysUntilDue !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-500 font-mono font-semibold">
                          -{formatCurrency(Math.abs(Number(card.balance)))}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Atividade Recente */}
          <div className="space-y-3 animate-fade-in-up stagger-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Atividade recente
              </h2>
              <Link
                to="/transacoes"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-animated"
              >
                Ver todas
              </Link>
            </div>

            {/* Dashboard Transactions List - Standardized */}
            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl">
                <p className="text-muted-foreground">Nenhuma transação recente</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupTransactionsByDay(recentTransactions).map((group) => (
                  <div key={group.date} className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground px-2">
                      {group.label}
                    </h3>
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                      {group.transactions.map((tx) => (
                        <TransactionItem
                          key={tx.id}
                          transaction={tx}
                          user={user}
                          familyMembers={familyMembers}
                          // Dashboard usually read-only or quick edit? user didn't specify, but safer to enable edits if they want "consistency"
                          // For now, I'll enable click but maybe not full buttons if space is tight? 
                          // TransactionItem handles space well (flex).
                          onClick={() => {
                            // Assuming Dashboard has a way to view details or navigate.
                            // Current Dashboard had no onClick handler in the inline code!
                            // I will leave onClick empty or navigate?
                            // Better: Add navigation or Modal support if Dashboard has it.
                            // Dashboard.tsx has TransactionModal support (lines 430+).
                            // No "Edit Transaction" state in Dashboard?
                            // Line 430: <TransactionModal isOpen={showTransactionModal} ... />
                            // It seems Dashboard ONLY allows Creating New, not Editing existing.
                            // So I will render Read-Only for now or add basic 'view' support if I see `setEditingTransaction`.
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <aside className="lg:col-span-4 space-y-4 md:space-y-6 animate-fade-in-right stagger-6">
          {/* Acesso Rápido */}
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Acesso rápido
            </h2>

            <Link
              to="/cartoes"
              className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 card-animated hover-lift"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground group-hover:scale-110 transition-transform" />
                <p className="font-medium">Cartões</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
            </Link>

            <Link
              to="/compartilhados"
              className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 card-animated hover-lift"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground group-hover:scale-110 transition-transform" />
                <p className="font-medium">Compartilhados</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
            </Link>
          </div>

          {/* Insight Card - Saldo do Mês */}
          <div className="p-4 rounded-xl border border-border bg-muted/30 animate-scale-in hover-glow">
            <p className="text-xs text-muted-foreground mb-1">💵 Resultado do mês</p>
            <p className="font-semibold">
              {savings >= 0 ? "Economizando" : "No vermelho"}
            </p>
            <p className={cn(
              "text-sm flex items-center gap-1",
              savings >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {savings >= 0 ? <ArrowDownRight className="h-3 w-3 animate-soft-bounce" /> : <ArrowUpRight className="h-3 w-3 animate-soft-bounce" />}
              {formatCurrency(Math.abs(savings))}
            </p>
          </div>

          {/* Projeção do Mês */}
          <div className="p-4 rounded-xl bg-foreground text-background animate-scale-in-bounce hover-lift">
            <p className="text-xs opacity-70 mb-1">🔮 Previsão para fim do mês</p>
            <p className="font-mono text-2xl font-bold animate-count-up">
              {formatCurrency(projectedBalance)}
            </p>

            {/* Detalhamento da Projeção */}
            {projection && (
              projection.future_income > 0 ||
              projection.future_expenses > 0 ||
              projection.credit_card_invoices > 0 ||
              projection.shared_debts > 0
            ) && (
                <div className="mt-3 pt-3 border-t border-background/20 space-y-1 text-xs opacity-80">
                  {projection.future_income > 0 && (
                    <div className="flex justify-between">
                      <span>💰 Receitas futuras</span>
                      <span>{formatCurrency(projection.future_income)}</span>
                    </div>
                  )}
                  {projection.future_expenses > 0 && (
                    <div className="flex justify-between">
                      <span>💸 Despesas futuras</span>
                      <span>{formatCurrency(projection.future_expenses)}</span>
                    </div>
                  )}
                  {projection.credit_card_invoices > 0 && (
                    <div className="flex justify-between">
                      <span>💳 Faturas cartão</span>
                      <span>{formatCurrency(projection.credit_card_invoices)}</span>
                    </div>
                  )}
                  {projection.shared_debts > 0 && (
                    <div className="flex justify-between">
                      <span>👥 Compartilhados</span>
                      <span>{formatCurrency(projection.shared_debts)}</span>
                    </div>
                  )}
                </div>
              )}
          </div>
        </aside>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
      />
    </div>
  );
}
