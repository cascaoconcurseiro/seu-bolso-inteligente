import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransactions } from "@/hooks/useTransactions";
import { useFamilyMembers } from "@/hooks/useFamily";
import { SharedBalanceChart } from "@/components/shared/SharedBalanceChart";
import { useSharedFinances } from "@/hooks/useSharedFinances";
import { useMonth } from "@/contexts/MonthContext";
import { startOfMonth, endOfMonth, subMonths, format as formatDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useTransactionModal } from "@/hooks/useTransactionModal";

export function Reports() {
  const { currentDate } = useMonth();
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();
  
  const { data: allTransactions = [], isLoading } = useTransactions();
  const { data: familyMembers = [] } = useFamilyMembers();
  const { invoices } = useSharedFinances({ activeTab: 'REGULAR', currentDate });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  // Filtrar transações do período selecionado
  const periodTransactions = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    
    return allTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= start && txDate <= end;
    });
  }, [allTransactions, currentDate]);

  // Calcular totais do período
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const income = periodTransactions
      .filter(t => t.type === "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expense = periodTransactions
      .filter(t => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
    };
  }, [periodTransactions]);

  // Gastos por categoria
  const categoryData = useMemo(() => {
    const categoryMap: Record<string, { value: number; count: number }> = {};
    
    periodTransactions
      .filter(t => t.type === "EXPENSE")
      .forEach(tx => {
        const catName = tx.category?.name || "Sem categoria";
        if (!categoryMap[catName]) {
          categoryMap[catName] = { value: 0, count: 0 };
        }
        categoryMap[catName].value += Number(tx.amount);
        categoryMap[catName].count += 1;
      });
    
    const total = Object.values(categoryMap).reduce((sum, c) => sum + c.value, 0);
    
    return Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        value: data.value,
        count: data.count,
        percent: total > 0 ? Math.round((data.value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 categorias
  }, [periodTransactions]);

  // Gastos por pessoa
  const personData = useMemo(() => {
    const personMap: Record<string, { 
      name: string;
      spent: number; 
      received: number;
      balance: number;
      count: number;
    }> = {};
    
    // Processar transações compartilhadas
    periodTransactions.forEach(tx => {
      if (tx.is_shared && tx.transaction_splits) {
        tx.transaction_splits.forEach(split => {
          const member = familyMembers.find(m => m.id === split.member_id);
          const memberName = member?.name || 'Desconhecido';
          
          if (!personMap[memberName]) {
            personMap[memberName] = { name: memberName, spent: 0, received: 0, balance: 0, count: 0 };
          }
          
          // Se a pessoa pagou
          if (tx.payer_id === split.member_id) {
            personMap[memberName].spent += Number(tx.amount);
          } else {
            // Se a pessoa deve
            personMap[memberName].received += Number(split.amount);
          }
          
          personMap[memberName].count += 1;
        });
      }
    });
    
    // Calcular balanço
    Object.values(personMap).forEach(person => {
      person.balance = person.spent - person.received;
    });
    
    return Object.values(personMap)
      .sort((a, b) => b.spent - a.spent);
  }, [periodTransactions, familyMembers]);

  // Evolução mensal (últimos 6 meses)
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      
      const monthTxs = allTransactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= start && txDate <= end;
      });
      
      const income = monthTxs
        .filter(t => t.type === "INCOME")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expense = monthTxs
        .filter(t => t.type === "EXPENSE")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      months.push({
        month: formatDate(monthDate, "MMM", { locale: ptBR }),
        income,
        expense,
      });
    }
    return months;
  }, [allTransactions]);

  // Resumo por pessoa (membros da família)
  const peopleData = useMemo(() => {
    const people = familyMembers.map(member => {
      // Transações do membro
      const memberTxs = periodTransactions.filter(tx => 
        tx.user_id === member.user_id || tx.user_id === member.linked_user_id
      );
      
      const income = memberTxs
        .filter(t => t.type === "INCOME")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expense = memberTxs
        .filter(t => t.type === "EXPENSE")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      return {
        name: member.name,
        income,
        expense,
        balance: income - expense,
      };
    });
    
    // Adicionar "Eu" se não estiver na lista
    const hasCurrentUser = people.length > 0;
    if (!hasCurrentUser) {
      people.push({
        name: "Eu",
        income: totalIncome,
        expense: totalExpense,
        balance,
      });
    }
    
    return people.filter(p => p.income > 0 || p.expense > 0);
  }, [familyMembers, periodTransactions, totalIncome, totalExpense, balance]);

  const maxMonthValue = Math.max(...monthlyData.flatMap(m => [m.income, m.expense]), 1);
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">
            Análise das suas finanças - {formatDate(currentDate, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4 text-positive" />
            Entradas
          </div>
          <p className="font-mono text-2xl font-bold text-positive">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="p-5 rounded-xl border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <TrendingDown className="h-4 w-4 text-negative" />
            Saídas
          </div>
          <p className="font-mono text-2xl font-bold text-negative">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="p-5 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground mb-2">Resultado</p>
          <p className={cn(
            "font-mono text-2xl font-bold",
            balance >= 0 ? "text-positive" : "text-negative"
          )}>
            {balance >= 0 ? "+" : ""}{formatCurrency(balance)}
          </p>
        </div>
        <div className="p-5 rounded-xl bg-foreground text-background">
          <p className="text-sm opacity-70 mb-2">Taxa de Economia</p>
          <p className="font-display text-3xl font-bold">
            {savingsRate.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Gráfico de Evolução de Saldo */}
      <section className="p-6 rounded-xl border border-border">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">
          Evolução do Saldo
        </h2>
        <SharedBalanceChart 
          transactions={allTransactions} 
          invoices={invoices} 
          currentDate={currentDate} 
        />
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Evolution */}
        <section className="p-6 rounded-xl border border-border">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">
            Evolução Mensal
          </h2>
          {monthlyData.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum dado disponível
            </div>
          ) : (
            <div className="space-y-4">
              {monthlyData.map((month) => (
                <div key={month.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium w-10">{month.month}</span>
                    <div className="flex-1 mx-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-positive rounded-full transition-all"
                            style={{ width: `${(month.income / maxMonthValue) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-positive w-20 text-right">
                          {formatCurrency(month.income)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-negative rounded-full transition-all"
                            style={{ width: `${(month.expense / maxMonthValue) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-negative w-20 text-right">
                          {formatCurrency(month.expense)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-positive" />
              <span className="text-xs text-muted-foreground">Entradas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-negative" />
              <span className="text-xs text-muted-foreground">Saídas</span>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="p-6 rounded-xl border border-border">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">
            Gastos por Categoria
          </h2>
          {categoryData.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma despesa registrada
            </div>
          ) : (
            <div className="space-y-3">
              {categoryData.map((cat, index) => (
                <div key={cat.category} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate flex-1">{cat.category}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono">{formatCurrency(cat.value)}</span>
                      <span className="text-xs text-muted-foreground w-10 text-right">{cat.percent}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-foreground rounded-full transition-all"
                      style={{ 
                        width: `${cat.percent}%`,
                        opacity: 1 - (index * 0.08)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* By Person */}
        {personData.length > 0 && (
          <section className="p-6 rounded-xl border border-border lg:col-span-2">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">
              Gastos por Pessoa
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-muted-foreground font-medium">Pessoa</th>
                    <th className="text-right py-3 px-4 text-xs uppercase tracking-widest text-muted-foreground font-medium">Pagou</th>
                    <th className="text-right py-3 px-4 text-xs uppercase tracking-widest text-muted-foreground font-medium">Deve</th>
                    <th className="text-right py-3 px-4 text-xs uppercase tracking-widest text-muted-foreground font-medium">Saldo</th>
                    <th className="text-right py-3 px-4 text-xs uppercase tracking-widest text-muted-foreground font-medium">Transações</th>
                  </tr>
                </thead>
                <tbody>
                  {personData.map((person) => (
                    <tr key={person.name} className="border-b border-border last:border-0">
                      <td className="py-3 px-4 font-medium">{person.name}</td>
                      <td className="py-3 px-4 text-right font-mono text-positive">
                        {formatCurrency(person.spent)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-negative">
                        {formatCurrency(person.received)}
                      </td>
                      <td className={cn(
                        "py-3 px-4 text-right font-mono font-semibold",
                        person.balance >= 0 ? "text-positive" : "text-negative"
                      )}>
                        {person.balance >= 0 ? "+" : ""}{formatCurrency(person.balance)}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {person.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        open={showTransactionModal}
        onOpenChange={setShowTransactionModal}
      />
    </div>
  );
}
