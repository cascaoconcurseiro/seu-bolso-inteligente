import { useMemo, useState } from "react";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import { useAuth } from "@/contexts/AuthContext";
import { useMonth } from "@/contexts/MonthContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useSharedFinances } from "@/hooks/useSharedFinances";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { useToast } from "@/hooks/use-toast";
import { exportMonthlyReport } from "@/services/exportService";

import { Globe, TrendingUp, Calendar, Tag, Target, Search, Info, HelpCircle, BarChart2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { ReportSummary } from "@/components/reports/ReportSummary";
import { CategoryDistribution } from "@/components/reports/CategoryDistribution";
import { MonthlyEvolution } from "@/components/reports/MonthlyEvolution";
import { CategoryTrend } from "@/components/reports/CategoryTrend";
import { SharedBalanceChart } from "@/components/shared/SharedBalanceChart";
import { TransactionModal } from "@/components/modals/TransactionModal";

import { useReportsData } from "./reports/useReportsData";
import { ReportsHeader } from "./reports/ReportsHeader";

export function Reports() {
  const { currentDate } = useMonth();
  const safeCurrentDate = useMemo(() => {
    if (!currentDate || isNaN(currentDate.getTime())) {
      return new Date();
    }
    return currentDate;
  }, [currentDate]);

  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();
  const { toast } = useToast();
  const [selectedCurrency, setSelectedCurrency] = useState<string>("BRL");
  const [viewType, setViewType] = useState<"MONTH" | "YEAR">("MONTH");
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [txSearch, setTxSearch] = useState<string>("");
  const [txTypeFilter, setTxTypeFilter] = useState<string>("ALL");

  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const reportStartDate = `${currentYear - 1}-01-01`;
  const reportEndDate = `${currentYear}-12-31`;
  
  const { data: allTransactions = [], isLoading } = useTransactions({
    startDate: reportStartDate,
    endDate: reportEndDate,
  });
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: familyMembers = [] } = useFamilyMembers();
  const { invoices, transactions: sharedTransactions } = useSharedFinances({
    activeTab: "REGULAR",
    currentDate: safeCurrentDate,
  });

  const myMember = useMemo(() => {
    if (!user || !familyMembers) return null;
    return familyMembers.find((m) => m.linked_user_id === user.id);
  }, [user, familyMembers]);
  const myMemberId = myMember?.id;

  const data = useReportsData({
    viewType,
    txSearch,
    txTypeFilter,
    selectedCurrency,
    allTransactions,
    sharedTransactions,
    categories,
    accounts,
    familyMembers,
    safeCurrentDate,
    myMemberId,
    user,
  });

  const formatCurrency = (value: number, currency: string = "BRL") => {
    if (currency === "BRL")
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    return `${getCurrencySymbol(currency)} ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleExport = async (format: "csv" | "pdf", exportViewType: "MONTH" | "YEAR" = viewType) => {
    const { exportToCSV, exportToPDF } = await import("@/utils/exportData");
    if (format === "csv") exportToCSV(data.filteredTxList, `relatorio-${exportViewType}`);
    else exportToPDF(data.filteredTxList, data.totalIncome, data.totalExpense, `relatorio-${exportViewType}`);
  };

  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handleExportFechamento = async () => {
    setIsExportingExcel(true);
    try {
      await exportMonthlyReport({
        month: safeCurrentDate,
        transactions: data.filteredTxList,
        sharedPurchases: sharedTransactions,
        debts: invoices,
        cashFlow: { totalIncome: data.totalIncome, totalExpense: data.totalExpense },
      });
      toast({
        title: "Sucesso!",
        description: "A planilha de fechamento foi exportada.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Não foi possível gerar a planilha. Verifique se o template existe.",
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  if (isLoading)
    return (
      <div className="space-y-5 animate-fade-in pb-20">
        <div className="relative overflow-hidden rounded-2xl p-4 md:p-5 border border-border/50 bg-card/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="skeleton h-10 w-40 rounded-xl" />
              <div className="skeleton h-4 w-64 rounded-lg" />
            </div>
            <div className="flex gap-2">
              <div className="skeleton h-10 w-32 rounded-xl" />
              <div className="skeleton h-10 w-28 rounded-xl" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-52 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-5 animate-fade-in pb-20">
      <ReportsHeader
        viewType={viewType}
        setViewType={setViewType}
        safeCurrentDate={safeCurrentDate}
        availableCurrencies={data.availableCurrencies}
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
        handleExport={handleExport}
      />

      {data.availableCurrencies.length > 1 && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-accent/20 bg-accent/5 dark:bg-accent/10">
          <Globe className="h-4 w-4 text-accent" />
          <span className="text-sm text-accent">Exibindo relatórios para {selectedCurrency}</span>
        </div>
      )}

      {data.periodTransactions.length === 0 ? (
        <EmptyState
          icon={BarChart2}
          title="Nenhum dado neste período"
          description="Seus relatórios ganham vida quando você adiciona transações. Mude o mês ou ano selecionado para explorar seus dados."
          action={
            <Button
              onClick={() => setViewType("YEAR")}
              variant="outline"
              className="h-12 px-8 rounded-full shadow-sm hover:shadow-md transition-all"
            >
              <Search className="w-4 h-4 mr-2" />
              Ver Ano Completo
            </Button>
          }
        />
      ) : (
        <Tabs defaultValue="overview" className="space-y-6 w-full">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex min-w-full bg-card/60 backdrop-blur-md p-1.5 rounded-3xl border border-border/40 shadow-inner">
              <TabsTrigger
                value="overview"
                className="rounded-2xl text-sm font-bold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-primary/30 transition-all duration-300 whitespace-nowrap flex-1"
              >
                Visão Geral
              </TabsTrigger>
              <TabsTrigger
                value="evolution"
                className="rounded-2xl text-sm font-bold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-primary/30 transition-all duration-300 whitespace-nowrap flex-1"
              >
                Evolução
              </TabsTrigger>
              <TabsTrigger
                value="categories"
                className="rounded-2xl text-sm font-bold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-primary/30 transition-all duration-300 whitespace-nowrap flex-1"
              >
                Categorias
              </TabsTrigger>
              <TabsTrigger
                value="trend"
                className="rounded-2xl text-sm font-bold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-primary/30 transition-all duration-300 whitespace-nowrap flex-1"
              >
                Tendências
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6 mt-4 animate-in fade-in-50 duration-500">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <ReportSummary
                totalIncome={data.totalIncome}
                totalExpense={data.totalExpense}
                balance={data.balance}
                savingsRate={data.totalIncome > 0 ? (data.balance / data.totalIncome) * 100 : 0}
                formatCurrency={formatCurrency}
                currency={selectedCurrency}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative overflow-hidden rounded-2xl p-5 border border-border/50 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20 shadow-inner flex items-center justify-center">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Média Diária</p>
                    <h3 className="text-base font-black font-display tracking-tight mt-0.5 text-foreground">
                      {formatCurrency(data.dailyAverageExpense, selectedCurrency)}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2 font-medium">
                  <Info className="h-3 w-3 text-muted-foreground/60" />
                  Com base no período selecionado
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl p-5 border border-border/50 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-warning/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-warning/10 text-warning border border-warning/20 shadow-inner flex items-center justify-center">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Maior Despesa</p>
                    <h3 className="text-base font-black font-display tracking-tight mt-0.5 text-foreground truncate max-w-[150px]">
                      {data.largestExpense ? formatCurrency(Number(data.largestExpense.amount), selectedCurrency) : formatCurrency(0, selectedCurrency)}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3 truncate font-medium max-w-[200px]" title={data.largestExpense ? data.largestExpense.description : "Nenhum gasto"}>
                  {data.largestExpense ? data.largestExpense.description : "Nenhum gasto no período"}
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl p-5 border border-border/50 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-destructive/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 shadow-inner flex items-center justify-center">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Categoria Líder</p>
                    <h3 className="text-base font-black font-display tracking-tight mt-0.5 text-foreground truncate max-w-[150px]">
                      {data.topCategory ? formatCurrency(data.topCategory.value, selectedCurrency) : formatCurrency(0, selectedCurrency)}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3 truncate font-medium max-w-[200px]" title={data.topCategory ? data.topCategory.category : "Nenhum gasto"}>
                  🏷️ {data.topCategory ? data.topCategory.category : "Nenhum gasto"}
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl p-5 border border-border/50 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-success/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-success/10 text-success border border-success/20 shadow-inner flex items-center justify-center">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Taxa de Poupança</p>
                    <h3 className="text-base font-black font-display tracking-tight mt-0.5 text-foreground">
                      {data.totalIncome > 0 ? ((data.balance / data.totalIncome) * 100).toFixed(1) : "0.0"}%
                    </h3>
                  </div>
                </div>
                <div className="mt-3">
                  <span className={`inline-block px-3 py-1 rounded-xl text-xs font-semibold border leading-tight ${data.savingsGoalStatus.color}`}>
                    {data.savingsGoalStatus.text}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="evolution" className="space-y-6 mt-4 animate-in fade-in-50 duration-500">
            <section className="p-6 rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-medium">Evolução do Saldo</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs space-y-2 p-3 bg-card text-card-foreground shadow-premium-sm border-border">
                      <p className="font-bold text-sm">O que é a Evolução do Saldo?</p>
                      <p className="text-sm text-muted-foreground">Este gráfico cruza o seu saldo em caixa (contas bancárias) com todas as despesas e receitas futuras projetadas, incluindo faturas de cartão de crédito e parcelamentos ao longo do tempo. Ele mostra exatamente quanto dinheiro você terá nos próximos dias e meses!</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <SharedBalanceChart
                transactions={data.allCombinedTransactions}
                invoices={invoices}
                currentDate={safeCurrentDate}
                isGeneralReport={true}
                monthlyData={data.monthlyData}
                currency={selectedCurrency}
              />
            </section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MonthlyEvolution
                data={data.monthlyData}
                formatCurrency={formatCurrency}
                currency={selectedCurrency}
              />
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6 mt-4 animate-in fade-in-50 duration-500">
            <div className="grid grid-cols-1 gap-6">
              <CategoryDistribution
                data={data.categoryData}
                formatCurrency={formatCurrency}
                currency={selectedCurrency}
              />
            </div>
          </TabsContent>

          <TabsContent value="trend" className="space-y-6 mt-4 animate-in fade-in-50 duration-500">
            <CategoryTrend
              transactions={data.allCombinedTransactions}
              categories={categories}
              formatCurrency={(v) => formatCurrency(v, selectedCurrency)}
            />
          </TabsContent>
        </Tabs>
      )}

      <TransactionModal
        isOpen={showTransactionModal || !!editingTransaction}
        onClose={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null);
        }}
        initialData={editingTransaction}
      />
    </div>
  );
}
