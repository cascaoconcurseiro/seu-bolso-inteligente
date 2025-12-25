import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, Plus, TrendingUp, Loader2, CreditCard, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinancialSummary, useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useFinancialSummary();
  const { data: transactions, isLoading: txLoading } = useTransactions();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const recentTransactions = transactions?.slice(0, 5) || [];
  const isLoading = summaryLoading || txLoading || accountsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const balance = summary?.balance || 0;
  const income = summary?.income || 0;
  const expenses = summary?.expenses || 0;
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/configuracoes">
              <Button size="lg" variant="outline" className="gap-2">
                <CreditCard className="h-5 w-5" />
                Adicionar conta
              </Button>
            </Link>
            <Link to="/transacoes/nova">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Nova transação
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Balance */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Saldo total</p>
        <h1 className={cn(
          "font-display font-bold text-5xl md:text-6xl tracking-tight",
          balance >= 0 ? "text-foreground" : "text-negative"
        )}>
          {formatCurrency(balance)}
        </h1>
        <p className="text-muted-foreground">
          em {accounts?.length || 0} conta{accounts?.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link to="/transacoes/nova">
          <Button size="lg" className="group transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="h-5 w-5 mr-2 transition-transform group-hover:rotate-90" />
            Nova transação
          </Button>
        </Link>
      </div>

      {/* Month Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl border border-border hover:border-foreground/20 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-positive/10 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-positive" />
            </div>
            <span className="text-sm text-muted-foreground">Receitas</span>
          </div>
          <p className="font-mono text-2xl font-bold text-positive">
            {formatCurrency(income)}
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-border hover:border-foreground/20 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-negative/10 flex items-center justify-center">
              <ArrowDownRight className="h-5 w-5 text-negative" />
            </div>
            <span className="text-sm text-muted-foreground">Despesas</span>
          </div>
          <p className="font-mono text-2xl font-bold text-negative">
            {formatCurrency(expenses)}
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-border hover:border-foreground/20 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-foreground/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-sm text-muted-foreground">Economia</span>
          </div>
          <p className={cn(
            "font-mono text-2xl font-bold",
            income - expenses >= 0 ? "text-positive" : "text-negative"
          )}>
            {formatCurrency(income - expenses)}
          </p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Transactions */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Últimas transações
            </h2>
            <Link 
              to="/transacoes" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver todas →
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground">Nenhuma transação ainda</p>
              <Link to="/transacoes/nova">
                <Button variant="outline" size="sm" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar primeira
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="group flex items-center justify-between p-4 rounded-xl border border-border 
                             hover:border-foreground/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">
                      {tx.category?.icon || (tx.type === "INCOME" ? "💰" : "💸")}
                    </div>
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {tx.category?.name || "Sem categoria"} • {new Date(tx.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <p className={cn(
                    "font-mono font-semibold",
                    tx.type === "INCOME" ? "text-positive" : "text-negative"
                  )}>
                    {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Quick Links */}
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Acesso rápido
            </h2>
            {[
              { to: "/cartoes", label: "Cartões", icon: CreditCard },
              { to: "/compartilhados", label: "Compartilhados", icon: Users },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </div>

          {/* Accounts Overview */}
          {accounts && accounts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Contas
              </h2>
              {accounts.slice(0, 4).map((account) => (
                <div
                  key={account.id}
                  className="p-3 rounded-xl border border-border hover:border-foreground/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: account.bank_color || "hsl(var(--muted))" }}
                    >
                      {account.bank_logo ? (
                        <img src={account.bank_logo} alt={account.name} className="w-5 h-5 object-contain" />
                      ) : (
                        <span className="text-xs font-bold text-white">
                          {account.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{account.name}</p>
                    </div>
                    <p className={cn(
                      "font-mono text-sm font-medium",
                      account.type === "CREDIT_CARD" 
                        ? "text-muted-foreground" 
                        : Number(account.balance) >= 0 ? "text-foreground" : "text-negative"
                    )}>
                      {account.type === "CREDIT_CARD" 
                        ? `Limite`
                        : formatCurrency(Number(account.balance))
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
