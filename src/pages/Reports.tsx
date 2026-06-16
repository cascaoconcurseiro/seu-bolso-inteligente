import { moneyUtils } from "@/utils/money";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Globe, TrendingUp, Calendar, Tag, Target, Search, Edit2, Info, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Users, Layers, SlidersHorizontal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
import { SharedBalanceChart } from "@/components/shared/SharedBalanceChart";
import { useSharedFinances } from "@/hooks/useSharedFinances";
import { useMonth } from "@/contexts/MonthContext";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { getCurrencySymbol } from "@/services/exchangeCalculations";

// Modular Components
import { ReportSummary } from "@/components/reports/ReportSummary";
import { CategoryDistribution } from "@/components/reports/CategoryDistribution";
import { MonthlyEvolution } from "@/components/reports/MonthlyEvolution";
import { AccountingDRE } from "@/components/settings/AccountingDRE";
import { useToast } from "@/hooks/use-toast";
import { exportMonthlyReport } from "@/services/exportService";
const getTransactionCurrency = (tx: any): string => {
  if (tx.currency && tx.currency !== 'BRL') return tx.currency;
  if (Array.isArray(tx.account) && tx.account.length > 0 && tx.account[0].currency) return tx.account[0].currency;
  if (tx.account && !Array.isArray(tx.account) && tx.account.currency) return tx.account.currency;
  return 'BRL';
};

import { useReports } from './useReports';

export function Reports() {
  const {
    currentDate,
    safeCurrentDate,
    showTransactionModal, setShowTransactionModal,
    selectedCurrency, setSelectedCurrency,
    viewType, setViewType,
    dateCriterion, setDateCriterion,
    txSearch, setTxSearch,
    txTypeFilter, setTxTypeFilter,
    showOnlyCreditCards, setShowOnlyCreditCards,
    editingTransaction, setEditingTransaction,
    user,
    allTransactions, isLoading,
    categories,
    accounts,
    familyMembers,
    invoices, sharedTransactions,
    myMember, myMemberId,
    availableCurrencies,
    formatCurrency,
    formatTxDate,
    getAccountBadge,
    allCombinedTransactions,
    periodTransactions,
    sharedPeriodTransactions,
    displayCurrency,
    totalIncome, totalExpense, balance,
    categoryData,
    personData,
    installmentsByPerson,
    largestExpense,
    dailyAverageExpense,
    topCategory,
    savingsGoalStatus,
    filteredTxList,
    handleExport,
    isExportingExcel, setIsExportingExcel,
    handleExportFechamento,
    monthlyData,
    getTransactionCurrency
  } = useReports();

  if (isLoading) return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 border border-border/50 bg-card/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-10 w-40 rounded-xl" />
            <div className="skeleton h-4 w-64 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-9 w-32 rounded-xl" />
            <div className="skeleton h-9 w-28 rounded-xl" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="skeleton h-52 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tighter">Relatórios</h1>
            <p className="text-muted-foreground mt-1 font-medium">
              Análise das suas finanças - {viewType === 'MONTH' 
                ? dateFns.format(safeCurrentDate, "MMMM yyyy", { locale: ptBR })
                : dateFns.format(safeCurrentDate, "yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {!showOnlyCreditCards ? (
              <Select 
                value={dateCriterion} 
                onValueChange={(value: 'COMPETENCE' | 'DUE_DATE') => setDateCriterion(value)}
              >
                <SelectTrigger className="w-[180px] bg-muted/30 border-border/50 rounded-xl">
                  <SelectValue placeholder="Visualizar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPETENCE">
                    <span className="flex items-center gap-2">📅 Data da Compra</span>
                  </SelectItem>
                  <SelectItem value="DUE_DATE">
                    <span className="flex items-center gap-2">💳 Vencimento Fatura</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm font-medium shadow-sm">
                <CreditCard className="h-4 w-4" />
                <span>Ciclo de Fatura</span>
              </div>
            )}

            <div className="flex bg-muted/50 rounded-xl p-1 mr-2 border border-border/50 shadow-inner">
              <Button 
                variant={viewType === 'MONTH' ? 'default' : 'ghost'} 
                size="sm" 
                className={viewType === 'MONTH' ? "shadow-sm rounded-lg" : "rounded-lg"}
                onClick={() => setViewType('MONTH')}
              >
                Mensal
              </Button>
              <Button 
                variant={viewType === 'YEAR' ? 'default' : 'ghost'} 
                size="sm" 
                className={viewType === 'YEAR' ? "shadow-sm rounded-lg" : "rounded-lg"}
                onClick={() => setViewType('YEAR')}
              >
                Anual
              </Button>
            </div>

            <Button
              variant={showOnlyCreditCards ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyCreditCards(!showOnlyCreditCards)}
              className={showOnlyCreditCards ? "bg-primary text-primary-foreground shadow-sm" : ""}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Cartões
            </Button>
          {availableCurrencies.length > 1 && (
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="w-[140px]"><SelectValue><span className="flex items-center gap-2"><span className="font-mono">{getCurrencySymbol(selectedCurrency)}</span>{selectedCurrency}</span></SelectValue></SelectTrigger>
              <SelectContent>{availableCurrencies.map(currency => <SelectItem key={currency} value={currency}><span className="flex items-center gap-2"><span className="font-mono w-6">{getCurrencySymbol(currency)}</span>{currency}</span></SelectItem>)}</SelectContent>
            </Select>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('pdf')}>Exportar em PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>Exportar em Excel (CSV)</DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      </div>

      {availableCurrencies.length > 1 && <div className="flex items-center gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20"><Globe className="h-4 w-4 text-blue-500" /><span className="text-sm text-blue-600 dark:text-blue-400">Exibindo relatórios para {selectedCurrency}</span></div>}

      <Tabs defaultValue="overview" className="space-y-6 w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold">Visão Geral</TabsTrigger>
          <TabsTrigger value="evolution" className="rounded-lg text-xs font-semibold">Evolução</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-lg text-xs font-semibold">Categorias</TabsTrigger>
          <TabsTrigger value="dre" className="rounded-lg text-xs font-semibold">DRE & Balanço</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4 animate-in fade-in-50 duration-500">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <ReportSummary totalIncome={totalIncome} totalExpense={totalExpense} balance={balance} savingsRate={totalIncome > 0 ? ((balance / totalIncome) * 100) : 0} formatCurrency={formatCurrency} currency={displayCurrency} />
          </div>
          
          {/* KPIs Financeiros Avançados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gasto Médio Diário */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-border/50 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-inner flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Média Diária</p>
              <h3 className="text-xl font-black font-display tracking-tight mt-0.5 text-foreground">
                {formatCurrency(dailyAverageExpense, displayCurrency)}
              </h3>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5 font-medium">
            <Info className="h-3 w-3 text-muted-foreground/60" />
            Com base no período selecionado
          </p>
        </div>

        {/* Card 2: Maior Despesa Única */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-border/50 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Maior Despesa</p>
              <h3 className="text-xl font-black font-display tracking-tight mt-0.5 text-foreground truncate max-w-[150px]">
                {largestExpense ? formatCurrency(Number(largestExpense.amount), displayCurrency) : formatCurrency(0, displayCurrency)}
              </h3>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 truncate font-medium max-w-[200px]" title={largestExpense ? largestExpense.description : "Nenhum gasto"}>
            🎯 {largestExpense ? largestExpense.description : "Nenhum gasto no período"}
          </p>
        </div>

        {/* Card 3: Categoria Líder */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-border/50 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-inner flex items-center justify-center">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categoria Líder</p>
              <h3 className="text-xl font-black font-display tracking-tight mt-0.5 text-foreground truncate max-w-[150px]">
                {topCategory ? formatCurrency(topCategory.value, displayCurrency) : formatCurrency(0, displayCurrency)}
              </h3>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 truncate font-medium max-w-[200px]" title={topCategory ? topCategory.category : "Nenhum gasto"}>
            🏷️ {topCategory ? topCategory.category : "Nenhum gasto"}
          </p>
        </div>

        {/* Card 4: Meta de Economia */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-border/50 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner flex items-center justify-center">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Taxa de Poupança</p>
              <h3 className="text-xl font-black font-display tracking-tight mt-0.5 text-foreground">
                {totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : '0.0'}%
              </h3>
            </div>
          </div>
          <div className="mt-3">
            <span className={`inline-block px-2.5 py-1 rounded-xl text-[10px] font-semibold border leading-tight ${savingsGoalStatus.color}`}>
              {savingsGoalStatus.text}
            </span>
          </div>
        </div>
      </div>
      </TabsContent>

      <TabsContent value="evolution" className="space-y-6 mt-4 animate-in fade-in-50 duration-500">
        <section className="p-6 rounded-xl border border-border"><h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">Evolução do Saldo</h2><SharedBalanceChart transactions={allTransactions} invoices={invoices} currentDate={safeCurrentDate} isGeneralReport={true} monthlyData={monthlyData} currency={displayCurrency} /></section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyEvolution data={monthlyData} formatCurrency={formatCurrency} currency={displayCurrency} />
        </div>
      </TabsContent>

      <TabsContent value="categories" className="space-y-6 mt-4 animate-in fade-in-50 duration-500">
        <div className="grid grid-cols-1 gap-6">
          <CategoryDistribution data={categoryData} formatCurrency={formatCurrency} currency={displayCurrency} />
        </div>
      </TabsContent>

      <TabsContent value="dre" className="mt-4 animate-in fade-in-50 duration-500">
        <AccountingDRE />
      </TabsContent>
      </Tabs>

      
              </tbody>
            </table>
          </div>
        )}
      </section>
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
