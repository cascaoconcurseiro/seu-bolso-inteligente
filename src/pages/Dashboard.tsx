import { Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, Loader2, CreditCard, Users, ChevronRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinancialSummary, useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { GreetingCard } from "@/components/dashboard/GreetingCard";
import { cn } from "@/lib/utils";
import { getBankById } from "@/lib/banks";

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
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useFinancialSummary();
  const { data: transactions, isLoading: txLoading, isError: txError } = useTransactions();
  const { data: accounts, isLoading: accountsLoading, isError: accountsError } = useAccounts();
  
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Listen for global transaction modal event
  useEffect(() => {
    const handleOpenModal = () => setShowTransactionModal(true);
    window.addEventListener('openTransactionModal', handleOpenModal);
    return () => window.removeEventListener('openTransactionModal', handleOpenModal);
  }, []);

  const recentTransactions = transactions?.slice(0, 5) || [];
  
  // Se tiver erro, não ficar travado no loading
  const hasError = summaryError || txError || accountsError;
  const isLoading = (summaryLoading || txLoading || accountsLoading) && !hasError;

  const balance = summary?.balance || 0;
  const income = summary?.income || 0;
  const expenses = summary?.expenses || 0;
  const savings = income - expenses;
  const projectedBalance = balance + savings;

  // Saldos em moedas estrangeiras
  const balancesByForeignCurrency = useMemo(() => {
    if (!accounts) return {};
    const grouped: Record<string, number> = {};
    accounts
      .filter(a => a.is_international && a.type !== 'CREDIT_CARD')
      .forEach(acc => {
        const currency = acc.currency || 'USD';
        grouped[currency] = (grouped[currency] || 0) + Number(acc.balance);
      });
    return grouped;
  }, [accounts]);

  const hasForeignBalances = Object.keys(balancesByForeignCurrency).length > 0;

  // Cartões com fatura
  const creditCardsWithBalance = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter(a => a.type === "CREDIT_CARD" && Number(a.balance) !== 0);
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
        <div className="text-center py-16">
          <h1 className="font-display font-bold text-4xl tracking-tight mb-4">
            Bem-vindo ao Pé de Meia
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            Comece adicionando uma conta bancária ou criando sua primeira transação.
          </p>
          <Link to="/configuracoes">
            <Button size="lg" variant="outline" className="gap-2">
              <CreditCard className="h-5 w-5" />
              Adicionar conta
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting Card */}
      <GreetingCard className="animate-fade-in" />

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
            Saldo atual (BRL)
          </p>
          <h1 className={cn(
            "font-display font-bold text-5xl md:text-6xl tracking-tight",
            balance >= 0 ? "text-foreground" : "text-destructive"
          )}>
            {formatCurrency(balance)}
          </h1>
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Entradas</span>
              <span className="text-green-500 font-medium">{formatCurrency(income)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowDownRight className="h-4 w-4 text-red-500" />
              <span className="text-muted-foreground">Saídas</span>
              <span className="text-red-500 font-medium">{formatCurrency(expenses)}</span>
            </span>
          </div>
        </div>
        
        {/* Saldos em Moedas Estrangeiras */}
        {hasForeignBalances && (
          <div className="flex flex-wrap gap-4">
            {Object.entries(balancesByForeignCurrency).map(([currency, currencyBalance]) => (
              <div 
                key={currency} 
                className="flex items-center gap-2 p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20"
              >
                <Globe className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-medium">
                    {currency}
                  </p>
                  <p className={cn(
                    "font-mono font-bold text-lg",
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Faturas de Cartão */}
          {creditCardsWithBalance.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Faturas pendentes
              </h2>
              <div className="space-y-2">
                {creditCardsWithBalance.map((card) => {
                  const bank = getBankById(card.bank_id);
                  const dueDay = card.due_day || 10;
                  const today = new Date().getDate();
                  const daysUntilDue = dueDay >= today ? dueDay - today : 30 - today + dueDay;
                  
                  return (
                    <Link
                      key={card.id}
                      to="/cartoes"
                      className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: bank.color }}
                        >
                          <CreditCard className="h-5 w-5" style={{ color: bank.textColor }} />
                        </div>
                        <div>
                          <p className="font-medium">Fatura {card.name}</p>
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Atividade recente
              </h2>
              <Link 
                to="/transacoes" 
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Ver todas
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl">
                <p className="text-muted-foreground">Nenhuma transação ainda</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentTransactions.map((tx) => {
                  const txDate = new Date(tx.date);
                  const today = new Date();
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  
                  let dateLabel = txDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
                  if (txDate.toDateString() === today.toDateString()) dateLabel = "Hoje";
                  else if (txDate.toDateString() === yesterday.toDateString()) dateLabel = "Ontem";
                  
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-3 border-b border-border last:border-0 hover:bg-muted/30 px-2 -mx-2 rounded-lg transition-colors"
                    >
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {tx.category?.name || "Sem categoria"} • {dateLabel}
                        </p>
                      </div>
                      <p className={cn(
                        "font-mono font-semibold",
                        tx.type === "INCOME" ? "text-green-500" : "text-red-500"
                      )}>
                        {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Acesso Rápido */}
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Acesso rápido
            </h2>
            
            <Link
              to="/cartoes"
              className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <p className="font-medium">Cartões</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-all" />
            </Link>

            <Link
              to="/compartilhados"
              className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <p className="font-medium">Compartilhados</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-all" />
            </Link>
          </div>

          {/* Insight Card */}
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Este mês você</p>
            <p className="font-semibold">
              {savings >= 0 ? "Economizou" : "Gastou a mais"}
            </p>
            <p className={cn(
              "text-sm flex items-center gap-1",
              savings >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {savings >= 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
              {formatCurrency(Math.abs(savings))}
            </p>
          </div>

          {/* Projeção do Mês */}
          <div className="p-4 rounded-xl bg-foreground text-background">
            <p className="text-xs opacity-70 mb-1">Projeção fim do mês</p>
            <p className="font-mono text-2xl font-bold">
              {formatCurrency(projectedBalance)}
            </p>
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
