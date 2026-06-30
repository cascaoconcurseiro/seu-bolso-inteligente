import { useState, useEffect, useMemo } from "react";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { useLocation } from "react-router-dom";
import { Clock, CalendarClock, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransactions, useDeleteTransaction, Transaction } from "@/hooks/useTransactions";
import {
  DeleteTransactionModal,
  CascadeDeleteType,
} from "@/components/modals/DeleteTransactionModal";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
import { useMonth } from "@/contexts/MonthContext";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { AdvanceInstallmentsDialog } from "@/components/transactions/AdvanceInstallmentsDialog";
import { TransactionDetailsModal } from "@/components/transactions/TransactionDetailsModal";
import { useUnconfirmScheduledBill } from "@/hooks/useScheduledBills";
import { OFXImportModal } from "@/components/modals/OFXImportModal";
import { TransactionHeader } from "@/components/transactions/TransactionHeader";
import { TransactionSummary } from "@/components/transactions/TransactionSummary";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionList } from "@/components/transactions/TransactionList";
import { UpcomingTransactions } from "@/components/transactions/UpcomingTransactions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTransactionCurrency, groupTransactionsByDay } from "@/utils/transactionUtils";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTransactionSync } from "@/hooks/useTransactionSync";
import { haptics } from "@/utils/haptics";

export function Transactions() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"lancadas" | "proximas">(
    (location.state as any)?.tab === "proximas" ? "proximas" : "lancadas"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    transaction: Transaction | null;
  }>({ isOpen: false, transaction: null });
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editTransactionData, setEditTransactionData] = useState<Transaction | null>(null);

  const [detailsTransaction, setDetailsTransaction] = useState<Transaction | null>(null);
  const [advanceSeriesId, setAdvanceSeriesId] = useState<string | null>(null);
  const [advanceDescription, setAdvanceDescription] = useState<string>("");
  const [showOfxModal, setShowOfxModal] = useState(false);

  const { user } = useAuth();
  const { currentDate } = useMonth();
  const { data: transactions, isLoading, isError, refetch } = useTransactions();
  const { data: annualTransactions = [] } = useTransactions({
    startDate: `${currentDate.getFullYear()}-01-01`,
    endDate: `${currentDate.getFullYear()}-12-31`,
  });
  const { data: familyMembers = [] } = useFamilyMembers();
  const deleteTransaction = useDeleteTransaction();
  const unconfirmTransaction = useUnconfirmScheduledBill();
  const { invalidateRelated } = useTransactionSync();

  useEffect(() => {
    const handleOpenModal = () => setShowTransactionModal(true);
    window.addEventListener("openTransactionModal", handleOpenModal);
    return () => window.removeEventListener("openTransactionModal", handleOpenModal);
  }, []);

  const formatCurrency = (value: number, currency: string = "BRL") => {
    if (currency !== "BRL") {
      const symbol = getCurrencySymbol(currency);
      return `${symbol} ${Math.abs(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Math.abs(value));
  };

  const [selectedCurrency, setSelectedCurrency] = useState<string>("BRL");

  const { categories, accounts, availableCurrencies } = useMemo(() => {
    const catMap = new Map<string, { id: string; name: string; icon: string }>();
    const accMap = new Map<string, { id: string; name: string }>();
    const currencySet = new Set<string>();

    (transactions || []).forEach((t) => {
      if (t.category?.id && t.category?.name) {
        catMap.set(t.category.id, {
          id: t.category.id,
          name: t.category.name,
          icon: t.category.icon || "📁",
        });
      }
      if (t.account?.id && t.account?.name) {
        accMap.set(t.account.id, { id: t.account.id, name: t.account.name });
      }
      currencySet.add(getTransactionCurrency(t));
    });

    return {
      categories: Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      accounts: Array.from(accMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      availableCurrencies: Array.from(currencySet).sort(),
    };
  }, [transactions]);

  const getPeriodDates = (period: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (period) {
      case "today":
        return { start: today, end: today };
      case "week": {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return { start: weekStart, end: today };
      }
      case "month":
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: today };
      case "lastMonth":
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0),
        };
      default:
        return null;
    }
  };

  const filteredTransactions = useMemo(() => {
    const periodDates = getPeriodDates(selectedPeriod);
    return (transactions || []).filter((t) => {
      const txCurrency = getTransactionCurrency(t);
      if (selectedCurrency !== "all" && txCurrency !== selectedCurrency) return false;

      if (t.source_transaction_id && t.source_transaction_id !== null && selectedAccount === "all")
        return false;
      if (t.is_shared === true) {
        const isCreator = t.creator_user_id === user?.id;
        const myFamilyMember = familyMembers.find((m) => m.linked_user_id === user?.id);
        const isPayer = myFamilyMember && t.payer_id === myFamilyMember.id;
        if (!isCreator && !isPayer) return false;
      }
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        selectedType === "all" ||
        t.type === selectedType ||
        (selectedType === "EXPENSE" &&
          t.type === "TRANSFER" &&
          (selectedAccount === "all" || t.account_id === selectedAccount)) ||
        (selectedType === "INCOME" &&
          t.type === "TRANSFER" &&
          t.destination_account_id === selectedAccount);
      const matchesCategory = selectedCategory === "all" || t.category?.id === selectedCategory;
      const matchesAccount = selectedAccount === "all" || t.account?.id === selectedAccount;
      let matchesPeriod = true;
      if (periodDates) {
        const txDate = new Date(t.date + "T12:00:00");
        matchesPeriod =
          txDate >= periodDates.start &&
          txDate <= new Date(periodDates.end.getTime() + 86400000 - 1);
      }
      return matchesSearch && matchesType && matchesCategory && matchesAccount && matchesPeriod;
    });
  }, [
    transactions,
    searchQuery,
    selectedType,
    selectedCategory,
    selectedAccount,
    selectedPeriod,
    selectedCurrency,
    user,
    familyMembers,
  ]);

  const filteredAnnualTransactions = useMemo(() => {
    return (annualTransactions || []).filter((t) => {
      const txCurrency = getTransactionCurrency(t);
      if (selectedCurrency !== "all" && txCurrency !== selectedCurrency) return false;

      if (t.source_transaction_id && t.source_transaction_id !== null && selectedAccount === "all")
        return false;
      if (t.is_shared === true) {
        const isCreator = t.creator_user_id === user?.id;
        const myFamilyMember = familyMembers.find((m) => m.linked_user_id === user?.id);
        const isPayer = myFamilyMember && t.payer_id === myFamilyMember.id;
        if (!isCreator && !isPayer) return false;
      }
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        selectedType === "all" ||
        t.type === selectedType ||
        (selectedType === "EXPENSE" &&
          t.type === "TRANSFER" &&
          (selectedAccount === "all" || t.account_id === selectedAccount)) ||
        (selectedType === "INCOME" &&
          t.type === "TRANSFER" &&
          t.destination_account_id === selectedAccount);
      const matchesCategory = selectedCategory === "all" || t.category?.id === selectedCategory;
      const matchesAccount = selectedAccount === "all" || t.account?.id === selectedAccount;
      return matchesSearch && matchesType && matchesCategory && matchesAccount;
    });
  }, [
    annualTransactions,
    searchQuery,
    selectedType,
    selectedCategory,
    selectedAccount,
    selectedCurrency,
    user,
    familyMembers,
  ]);

  const isSearchingHistory = searchQuery.trim().length > 0;
  const displayTransactions = isSearchingHistory
    ? filteredAnnualTransactions
    : filteredTransactions;
  const dayGroups = useMemo(
    () => groupTransactionsByDay(displayTransactions),
    [displayTransactions]
  );
  const totalIncome = filteredTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)), 0);
  const totalExpense = filteredTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)), 0);

  const currencySummaries = useMemo(() => {
    if (selectedCurrency !== "all") return null;
    const map: Record<string, { income: number; expense: number }> = {};
    filteredTransactions.forEach((t) => {
      const cur = getTransactionCurrency(t);
      if (!map[cur]) map[cur] = { income: 0, expense: 0 };
      if (t.type === "INCOME") map[cur].income += Number(t.amount);
      if (t.type === "EXPENSE") map[cur].expense += Number(t.amount);
    });
    return Object.entries(map).filter(([, v]) => v.income > 0 || v.expense > 0);
  }, [filteredTransactions, selectedCurrency]);
  const hasFilters =
    selectedType !== "all" ||
    selectedCategory !== "all" ||
    selectedAccount !== "all" ||
    selectedPeriod !== "all";

  const clearFilters = () => {
    setSelectedType("all");
    setSelectedCategory("all");
    setSelectedAccount("all");
    setSelectedPeriod("all");
  };

  const handleDelete = async (cascadeType: CascadeDeleteType) => {
    if (!deleteConfirm.transaction) return;

    const tx = deleteConfirm.transaction;

    if (tx.is_shared && isFullySettled(tx)) {
      toast.error("Transação acertada não pode ser excluída");
      setDeleteConfirm({ isOpen: false, transaction: null });
      return;
    }

    try {
      await deleteTransaction.mutateAsync({ id: tx.id, cascadeType });
    } catch {
      /* onError do hook já trata */
    }
    if (tx.is_shared) await invalidateRelated(tx.id);

    haptics.heavy();
    setDeleteConfirm({ isOpen: false, transaction: null });
    setDetailsTransaction(null);
  };

  const handleAdvance = (transaction: Transaction) => {
    if (transaction.series_id) {
      setAdvanceSeriesId(transaction.series_id);
      setAdvanceDescription(transaction.description.replace(/\s*\(\d+\/\d+\)$/, ""));
    }
  };

  const handleUnconfirm = (transaction: Transaction) => {
    unconfirmTransaction.mutate({ id: transaction.id });
    setDetailsTransaction(null);
  };

  const getCreatorName = (transaction: Transaction) => {
    if (!transaction.creator_user_id) return null;
    if (transaction.creator_user_id === user?.id) return "Você";
    const member = familyMembers.find(
      (m) =>
        m.user_id === transaction.creator_user_id ||
        m.linked_user_id === transaction.creator_user_id
    );
    return member?.name || "Outro membro";
  };

  const handleEdit = (transaction: Transaction) => {
    setEditTransactionData(transaction);
    setShowTransactionModal(true);
    if (detailsTransaction) {
      setDetailsTransaction(null);
    }
  };

  const getPayerInfo = (transaction: Transaction) => {
    if (!transaction.is_shared) return null;
    const myFamilyMemberId = familyMembers.find((m) => m.linked_user_id === user?.id)?.id;
    if (
      !transaction.payer_id ||
      transaction.payer_id === user?.id ||
      transaction.payer_id === myFamilyMemberId
    )
      return { label: "Você pagou", isMe: true };
    const payer = familyMembers.find((m) => m.id === transaction.payer_id);
    return payer ? { label: `Pago por ${payer.name}`, isMe: false } : null;
  };

  const hasPendingSplits = (transaction: Transaction) =>
    !!(
      transaction.is_shared &&
      (transaction.transaction_splits?.some((s: any) => !s.is_settled) || false)
    );
  const isFullySettled = (transaction: Transaction) =>
    !!(
      transaction.is_shared &&
      transaction.transaction_splits &&
      transaction.transaction_splits.length > 0 &&
      transaction.transaction_splits.every((s: any) => s.is_settled)
    );

  if (isLoading)
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="relative overflow-hidden rounded-2xl p-6 border border-border/50 bg-card/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="skeleton h-10 w-44 rounded-xl" />
              <div className="skeleton h-4 w-24 rounded-lg" />
            </div>
            <div className="flex gap-2">
              <div className="skeleton h-10 w-32 rounded-xl" />
              <div className="skeleton h-10 w-28 rounded-xl" />
            </div>
          </div>
        </div>
        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
        {/* List skeleton */}
        <div className="space-y-2">
          <div className="skeleton h-4 w-32 rounded-lg" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  if (isError)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-background border border-border rounded-2xl">
        <div className="w-16 h-16 bg-negative/10 text-negative rounded-full flex items-center justify-center mb-4">
          <Clock className="h-8 w-8 opacity-50" />
        </div>
        <h2 className="text-xl font-bold mb-2">Erro ao carregar transações</h2>
        <Button onClick={() => refetch()} variant="outline">
          Tentar novamente
        </Button>
      </div>
    );

  return (
    <PullToRefresh queryKeys={[["transactions"], ["scheduled-bills"]]}>
      <div className="space-y-6 animate-fade-in">
        <TransactionHeader
          count={displayTransactions.length}
          filteredTransactions={displayTransactions}
          filteredAnnualTransactions={filteredAnnualTransactions}
          onImportOFX={() => setShowOfxModal(true)}
        />

        {/* Tabs: Lançadas / Próximas */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border/50">
          <button
            onClick={() => setActiveTab("lancadas")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
              activeTab === "lancadas"
                ? "bg-card shadow-sm text-foreground border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-4 w-4" />
            Lançadas
          </button>
          <button
            onClick={() => setActiveTab("proximas")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
              activeTab === "proximas"
                ? "bg-card shadow-sm text-foreground border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarClock className="h-4 w-4" />
            Próximas
          </button>
        </div>

        {activeTab === "proximas" ? (
          <UpcomingTransactions />
        ) : (
          <>
            {availableCurrencies.length > 1 && (
              <div className="flex justify-end">
                <div className="w-32">
                  <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                    <SelectTrigger className="h-10 bg-muted/50 border-border/50">
                      <SelectValue placeholder="Moeda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="font-medium">
                        Todas
                      </SelectItem>
                      {availableCurrencies.map((c) => (
                        <SelectItem key={c} value={c} className="font-medium">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedCurrency !== "all" ? (
              <TransactionSummary
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                formatCurrency={(v) => formatCurrency(v, selectedCurrency)}
              />
            ) : currencySummaries && currencySummaries.length > 0 ? (
              <div className="space-y-2">
                {currencySummaries.map(([cur, { income, expense }]) => (
                  <div
                    key={cur}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-card text-sm"
                  >
                    <span className="font-bold text-xs uppercase tracking-widest text-muted-foreground w-10 shrink-0">
                      {cur}
                    </span>
                    <span className="text-positive font-mono font-bold tabular-nums">
                      +{formatCurrency(income, cur)}
                    </span>
                    <span className="text-muted-foreground mx-1">·</span>
                    <span className="text-negative font-mono font-bold tabular-nums">
                      -{formatCurrency(expense, cur)}
                    </span>
                    <span className="text-muted-foreground mx-1">·</span>
                    <span
                      className={cn(
                        "font-mono font-bold tabular-nums ml-auto",
                        income - expense >= 0 ? "text-primary" : "text-warning"
                      )}
                    >
                      {income - expense >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(income - expense), cur)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <TransactionFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedType={selectedType}
              setSelectedType={setSelectedType}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedAccount={selectedAccount}
              setSelectedAccount={setSelectedAccount}
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              categories={categories}
              accounts={accounts}
              hasFilters={hasFilters}
              clearFilters={clearFilters}
            />
            {isSearchingHistory && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary font-medium -mt-1">
                <Clock className="h-4 w-4 shrink-0" />
                Buscando em todo o ano · {displayTransactions.length} resultado
                {displayTransactions.length !== 1 ? "s" : ""}
              </div>
            )}

            <TransactionList
              dayGroups={dayGroups}
              user={user}
              familyMembers={familyMembers}
              formatCurrency={formatCurrency}
              onDetails={setDetailsTransaction}
              onSettlement={() => {}}
              onAdvance={handleAdvance}
              onEdit={handleEdit}
              onDelete={(tx) => setDeleteConfirm({ isOpen: true, transaction: tx })}
              isFullySettled={isFullySettled}
              hasPendingSplits={hasPendingSplits}
              getCreatorName={getCreatorName}
              getPayerInfo={getPayerInfo}
              selectedAccount={selectedAccount}
              hasActiveFilter={
                searchQuery.trim().length > 0 ||
                selectedType !== "all" ||
                selectedCategory !== "all" ||
                selectedAccount !== "all"
              }
            />
          </>
        )}

        {/* Alert Dialogs & Modals */}
        <DeleteTransactionModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, transaction: null })}
          onConfirm={handleDelete}
          transaction={deleteConfirm.transaction}
          isDeleting={deleteTransaction.isPending}
        />

        <AdvanceInstallmentsDialog
          open={!!advanceSeriesId}
          onOpenChange={(open) => {
            if (!open) {
              setAdvanceSeriesId(null);
              setAdvanceDescription("");
            }
          }}
          seriesId={advanceSeriesId || ""}
          transactionDescription={advanceDescription}
        />
        <TransactionDetailsModal
          open={!!detailsTransaction}
          onOpenChange={(open) => {
            if (!open) setDetailsTransaction(null);
          }}
          transaction={detailsTransaction}
          onDelete={() =>
            detailsTransaction &&
            setDeleteConfirm({ isOpen: true, transaction: detailsTransaction })
          }
          onAdvance={() => detailsTransaction && handleAdvance(detailsTransaction)}
          onEdit={() => detailsTransaction && handleEdit(detailsTransaction)}
          onUnconfirm={() => detailsTransaction && handleUnconfirm(detailsTransaction)}
        />
        <TransactionModal
          isOpen={showTransactionModal}
          onClose={() => {
            setShowTransactionModal(false);
            setEditTransactionData(null);
          }}
          initialData={editTransactionData}
        />
        <OFXImportModal isOpen={showOfxModal} onClose={() => setShowOfxModal(false)} />
      </div>
    </PullToRefresh>
  );
}
