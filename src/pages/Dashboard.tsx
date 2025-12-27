import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownRight, Plus, Loader2, CreditCard, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinancialSummary, useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useSharedFinances } from "@/hooks/useSharedFinances";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { PendingInvitationsAlert } from "@/components/family/PendingInvitationsAlert";
import { PendingTripInvitationsAlert } from "@/components/trips/PendingTripInvitationsAlert";
import { cn } from "@/lib/utils";
import { getBankById } from "@/lib/banks";

export function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useFinancialSummary();
  const { data: transactions, isLoading: txLoading } = useTransactions();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: familyMembers = [] } = useFamilyMembers();
  const { getSummary, getFilteredInvoice } = useSharedFinances({ activeTab: 'REGULAR' });
  
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Listen for global transaction modal event
  useEffect(() => {
    const handleOpenModal = () => setShowTransactionModal(true);
    window.addEventListener('openTransactionModal', handleOpenModal);
    return () => window.removeEventListener('openTransactionModal', handleOpenModal);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const recentTransactions = transactions?.slice(0, 5) || [];
  const isLoading = summaryLoading || txLoading || accountsLoading;

  // Cálculos
  const balance = summary?.balance || 0;
  const income = summary?.income || 0;
  const expenses = summary?.expenses || 0;
  const savings = income - expenses;
  const projectedBalance = balance + savings;

  // Cartões de crédito com faturas
  const creditCards = accounts?.filter(a => a.type === "CREDIT_CARD") || [];
  const creditCardsWithBalance = creditCards.filter(c => Number(c.balance) !== 0);
  
  // Transações compartilhadas pendentes - DADOS REAIS
  const sharedSummary = getSummary();
  const membersWithPendingBalance = familyMembers.filter(m => {
    const items = getFilteredInvoice(m.id);
    const unpaidItems = items.filter(i => !i.isPaid);
    const balance = unpaidItems.reduce((sum, i) => {
      return sum + (i.type === 'CREDIT' ? i.amount : -i.amount);
    }, 0);
    return balance > 0; // Apenas membros que me devem
  });

  // Contadores para acesso rápido
  const cardInvoicesCount = creditCardsWithBalance.length;
  const sharedPendingCount = membersWithPendingBalance.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAccounts = accounts && accounts.length > 0;
  const hasTransactions = transactions && transactions.length > 0;

  // Empty state - novo usuário
  if (!hasAccounts && !hasTransactions) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="text-center py-16">
          <h1 className="font-display font-bold text-4xl tracking-tight mb-4">
            Bem-vindo ao finança
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            Comece adicionando uma conta bancária ou criando sua primeira transação.
          </p>
          <div className="flex justify-center">
            <Link to="/configuracoes">
              <Button size="lg" variant="outline" className="gap-2">
                <CreditCard className="h-5 w-5" />
                Adicionar conta
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Pending Invitations Alert */}
      <PendingInvitationsAlert />
      
      {/* Pending Trip Invitations Alert */}
      <PendingTripInvitationsAlert />
      
      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
            Saldo atual
          </p>
          <h1 className={cn(
            "font-display font-bold text-5xl md:text-6xl tracking-tight",
            balance >= 0 ? "text-foreground" : "text-negative"
          )}>
            {formatCurrency(balance)}
          </h1>
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4 text-positive" />
              <span className="text-muted-foreground">Entradas</span>
              <span className="text-positive font-medium">{formatCurrency(income)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowDownRight className="h-4 w-4 text-negative" />
              <span className="text-muted-foreground">Saídas</span>
              <span className="text-negative font-medium">{formatCurrency(expenses)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Precisa de Atenção */}
          {(creditCardsWithBalance.length > 0 || membersWithPendingBalance.length > 0) && (
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Precisa de atenção
              </h2>
              <div className="space-y-2">
                {/* Faturas de cartão */}
                {creditCardsWithBalance.map((card) => {
                  const bank = getBankById(card.bank_id);
                  const dueDay = card.due_day || 10;
                  const today = new Date().getDate();
                  const daysUntilDue = dueDay >= today ? dueDay - today : 30 - today + dueDay;
                  
                  return (
                    <Link
                      key={card.id}
                      to="/cartoes"
                      className="group flex items-center justify-between p-4 rounded-xl border border-border 
                                 hover:border-foreground/20 transition-all"
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
                        <span className="text-negative font-mono font-semibold">
                          -{formatCurrency(Math.abs(Number(card.balance)))}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}

                {/* Divisões pendentes - DADOS REAIS */}
                {membersWithPendingBalance.slice(0, 2).map((member) => {
                  const items = getFilteredInvoice(member.id);
                  const unpaidItems = items.filter(i => !i.isPaid);
                  const pendingAmount = unpaidItems.reduce((sum, i) => {
                    return sum + (i.type === 'CREDIT' ? i.amount : -i.amount);
                  }, 0);
                  
                  if (pendingAmount <= 0) return null;
                  
                  return (
                    <Link
                      key={member.id}
                      to="/compartilhados"
                      className="group flex items-center justify-between p-4 rounded-xl border border-border 
                                 hover:border-foreground/20 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{member.name} te deve</p>
                          <p className="text-sm text-muted-foreground">
                            {unpaidItems.length} {unpaidItems.length === 1 ? 'item' : 'itens'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-positive font-mono font-semibold">
                          +{formatCurrency(pendingAmount)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                <p className="text-sm text-muted-foreground mt-2">Use o botão "Nova transação" acima para começar</p>
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
                      className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {tx.category?.name || "Sem categoria"} • {dateLabel}
                        </p>
                      </div>
                      <p className={cn(
                        "font-mono font-semibold",
                        tx.type === "INCOME" ? "text-positive" : "text-negative"
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
              className="group flex items-center justify-between p-4 rounded-xl border border-border 
                         hover:border-foreground/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Cartões</p>
                  {cardInvoicesCount > 0 && (
                    <p className="text-xs text-muted-foreground">{cardInvoicesCount} fatura{cardInvoicesCount !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>

            <Link
              to="/compartilhados"
              className="group flex items-center justify-between p-4 rounded-xl border border-border 
                         hover:border-foreground/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Compartilhados</p>
                  {sharedPendingCount > 0 && (
                    <p className="text-xs text-muted-foreground">{sharedPendingCount} pendência{sharedPendingCount !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
              savings >= 0 ? "text-positive" : "text-negative"
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
