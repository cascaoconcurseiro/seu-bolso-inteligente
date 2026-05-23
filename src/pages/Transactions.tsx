import { useState, useEffect, useMemo } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransactions, useDeleteTransaction, useDeleteInstallmentSeries, Transaction } from "@/hooks/useTransactions";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
import { useMonth } from "@/contexts/MonthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { AdvanceInstallmentsDialog } from "@/components/transactions/AdvanceInstallmentsDialog";
import { TransactionDetailsModal } from "@/components/transactions/TransactionDetailsModal";
import { OFXImportModal } from "@/components/modals/OFXImportModal";
import { TransactionHeader } from "@/components/transactions/TransactionHeader";
import { TransactionSummary } from "@/components/transactions/TransactionSummary";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTransactionCurrency, groupTransactionsByDay } from "@/utils/transactionUtils";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import { toast } from "sonner";
import { useTransactionSync } from "@/hooks/useTransactionSync";

export function Transactions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteSeriesId, setDeleteSeriesId] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [detailsTransaction, setDetailsTransaction] = useState<Transaction | null>(null);
  const [advanceSeriesId, setAdvanceSeriesId] = useState<string | null>(null);
  const [advanceDescription, setAdvanceDescription] = useState<string>("");
  const [showOfxModal, setShowOfxModal] = useState(false);

  const { user } = useAuth();
  const { currentDate } = useMonth();
  const { data: transactions, isLoading, isError, refetch } = useTransactions();
  const { data: annualTransactions = [] } = useTransactions({
    startDate: `${currentDate.getFullYear()}-01-01`,
    endDate: `${currentDate.getFullYear()}-12-31`
  });
  const { data: familyMembers = [] } = useFamilyMembers();
  const deleteTransaction = useDeleteTransaction();
  const deleteInstallmentSeries = useDeleteInstallmentSeries();
  const { invalidateRelated } = useTransactionSync();

  useEffect(() => {
    const handleOpenModal = () => setShowTransactionModal(true);
    window.addEventListener('openTransactionModal', handleOpenModal);
    return () => window.removeEventListener('openTransactionModal', handleOpenModal);
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
    
    (transactions || []).forEach(t => {
      if (t.category?.id && t.category?.name) {
        catMap.set(t.category.id, { id: t.category.id, name: t.category.name, icon: t.category.icon || "📁" });
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
      case "today": return { start: today, end: today };
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return { start: weekStart, end: today };
      case "month": return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: today };
      case "lastMonth": return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0) };
      default: return null;
    }
  };

  const filteredTransactions = useMemo(() => {
    const periodDates = getPeriodDates(selectedPeriod);
    return (transactions || []).filter((t) => {
      const txCurrency = getTransactionCurrency(t);
      if (selectedCurrency !== 'all' && txCurrency !== selectedCurrency) return false;
      
      if (t.source_transaction_id && t.source_transaction_id !== null && selectedAccount === "all") return false;
      if (t.is_shared === true) {
        const isCreator = t.creator_user_id === user?.id;
        const myFamilyMember = familyMembers.find(m => m.linked_user_id === user?.id);
        const isPayer = myFamilyMember && t.payer_id === myFamilyMember.id;
        if (!isCreator && !isPayer) return false;
      }
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "all" || t.type === selectedType || (selectedType === "EXPENSE" && t.type === "TRANSFER" && (selectedAccount === "all" || t.account_id === selectedAccount)) || (selectedType === "INCOME" && t.type === "TRANSFER" && t.destination_account_id === selectedAccount);
      const matchesCategory = selectedCategory === "all" || t.category?.id === selectedCategory;
      const matchesAccount = selectedAccount === "all" || t.account?.id === selectedAccount;
      let matchesPeriod = true;
      if (periodDates) {
        const txDate = new Date(t.date + "T12:00:00");
        matchesPeriod = txDate >= periodDates.start && txDate <= new Date(periodDates.end.getTime() + 86400000 - 1);
      }
      return matchesSearch && matchesType && matchesCategory && matchesAccount && matchesPeriod;
    });
  }, [transactions, searchQuery, selectedType, selectedCategory, selectedAccount, selectedPeriod, selectedCurrency, user, familyMembers]);

  const filteredAnnualTransactions = useMemo(() => {
    return (annualTransactions || []).filter((t) => {
      const txCurrency = getTransactionCurrency(t);
      if (selectedCurrency !== 'all' && txCurrency !== selectedCurrency) return false;
      
      if (t.source_transaction_id && t.source_transaction_id !== null && selectedAccount === "all") return false;
      if (t.is_shared === true) {
        const isCreator = t.creator_user_id === user?.id;
        const myFamilyMember = familyMembers.find(m => m.linked_user_id === user?.id);
        const isPayer = myFamilyMember && t.payer_id === myFamilyMember.id;
        if (!isCreator && !isPayer) return false;
      }
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "all" || t.type === selectedType || (selectedType === "EXPENSE" && t.type === "TRANSFER" && (selectedAccount === "all" || t.account_id === selectedAccount)) || (selectedType === "INCOME" && t.type === "TRANSFER" && t.destination_account_id === selectedAccount);
      const matchesCategory = selectedCategory === "all" || t.category?.id === selectedCategory;
      const matchesAccount = selectedAccount === "all" || t.account?.id === selectedAccount;
      return matchesSearch && matchesType && matchesCategory && matchesAccount;
    });
  }, [annualTransactions, searchQuery, selectedType, selectedCategory, selectedAccount, selectedCurrency, user, familyMembers]);

  const dayGroups = useMemo(() => groupTransactionsByDay(filteredTransactions), [filteredTransactions]);
  const totalIncome = filteredTransactions.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = filteredTransactions.filter((t) => t.type === "EXPENSE").reduce((sum, t) => sum + Number(t.amount), 0);
  const hasFilters = selectedType !== "all" || selectedCategory !== "all" || selectedAccount !== "all" || selectedPeriod !== "all";

  const clearFilters = () => {
    setSelectedType("all");
    setSelectedCategory("all");
    setSelectedAccount("all");
    setSelectedPeriod("all");
  };

  const handleDelete = async () => {
    if (deleteId) {
      const transaction = transactions?.find(t => t.id === deleteId);
      if (transaction?.is_shared && isFullySettled(transaction)) {
        toast.error("Transação acertada não pode ser excluída");
        setDeleteId(null);
        return;
      }
      await deleteTransaction.mutateAsync(deleteId);
      if (transaction?.is_shared) await invalidateRelated(deleteId);
      setDeleteId(null);
    }
  };

  const handleDeleteSeries = async () => {
    if (deleteSeriesId) {
      const seriesTransactions = transactions?.filter(t => t.series_id === deleteSeriesId) || [];
      if (seriesTransactions.some(t => t.is_shared && isFullySettled(t))) {
        toast.error("Série contém parcelas acertadas");
        setDeleteSeriesId(null);
        return;
      }
      await deleteInstallmentSeries.mutateAsync(deleteSeriesId);
      const first = seriesTransactions[0];
      if (first?.is_shared && first?.id) await invalidateRelated(first.id);
      setDeleteSeriesId(null);
    }
  };

  const handleAdvance = (transaction: Transaction) => {
    if (transaction.series_id) {
      setAdvanceSeriesId(transaction.series_id);
      setAdvanceDescription(transaction.description.replace(/\s*\(\d+\/\d+\)$/, ''));
    }
  };

  const handleEdit = (transaction: Transaction) => {
    if (transaction.is_shared && isFullySettled(transaction)) {
      toast.error("Transação acertada não pode ser editada");
      return;
    }
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const getCreatorName = (transaction: Transaction) => {
    if (!transaction.creator_user_id) return null;
    if (transaction.creator_user_id === user?.id) return 'Você';
    const member = familyMembers.find(m => m.user_id === transaction.creator_user_id || m.linked_user_id === transaction.creator_user_id);
    return member?.name || 'Outro membro';
  };

  const getPayerInfo = (transaction: Transaction) => {
    if (!transaction.is_shared) return null;
    if (!transaction.payer_id || transaction.payer_id === user?.id) return { label: 'Você pagou', isMe: true };
    const payer = familyMembers.find(m => m.id === transaction.payer_id);
    return payer ? { label: `Pago por ${payer.name}`, isMe: false } : null;
  };

  const hasPendingSplits = (transaction: Transaction) => !!(transaction.is_shared && (transaction.transaction_splits?.some((s: any) => !s.is_settled) || false));
  const isFullySettled = (transaction: Transaction) => !!(transaction.is_shared && transaction.transaction_splits && transaction.transaction_splits.length > 0 && transaction.transaction_splits.every((s: any) => s.is_settled));

  if (isLoading) return (
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
        {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
      </div>
      {/* List skeleton */}
      <div className="space-y-2">
        <div className="skeleton h-4 w-32 rounded-lg" />
        {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
      </div>
    </div>
  );
  if (isError) return <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-background border border-border rounded-2xl"><div className="w-16 h-16 bg-negative/10 text-negative rounded-full flex items-center justify-center mb-4"><Clock className="h-8 w-8 opacity-50" /></div><h2 className="text-xl font-bold mb-2">Erro ao carregar transações</h2><Button onClick={() => refetch()} variant="outline">Tentar novamente</Button></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <TransactionHeader count={filteredTransactions.length} filteredTransactions={filteredTransactions} filteredAnnualTransactions={filteredAnnualTransactions} onImportOFX={() => setShowOfxModal(true)} />
      
      {availableCurrencies.length > 1 && (
        <div className="flex justify-end">
          <div className="w-32">
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="h-9 bg-muted/50 border-border/50">
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
      
      {selectedCurrency !== 'all' ? (
        <TransactionSummary totalIncome={totalIncome} totalExpense={totalExpense} formatCurrency={(v) => formatCurrency(v, selectedCurrency)} />
      ) : (
        <div className="p-4 rounded-xl border border-border bg-card text-center text-muted-foreground text-sm">
          Selecione uma moeda específica para ver o resumo de receitas e despesas.
        </div>
      )}
      <TransactionFilters
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        selectedType={selectedType} setSelectedType={setSelectedType}
        selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
        selectedAccount={selectedAccount} setSelectedAccount={setSelectedAccount}
        selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod}
        showFilters={showFilters} setShowFilters={setShowFilters}
        categories={categories} accounts={accounts}
        hasFilters={hasFilters} clearFilters={clearFilters}
      />
      <TransactionList
        dayGroups={dayGroups} user={user} familyMembers={familyMembers} formatCurrency={formatCurrency}
        onDetails={setDetailsTransaction}
        onAdvance={handleAdvance}
        onEdit={handleEdit}
        onDelete={(tx) => tx.is_installment && tx.series_id ? setDeleteSeriesId(tx.series_id) : setDeleteId(tx.id)}
        isFullySettled={isFullySettled} hasPendingSplits={hasPendingSplits}
        getCreatorName={getCreatorName} getPayerInfo={getPayerInfo}
        selectedAccount={selectedAccount}
      />

      {/* Alert Dialogs & Modals */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSeriesId} onOpenChange={() => setDeleteSeriesId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir parcelas?</AlertDialogTitle>
            <AlertDialogDescription>Esta é uma transação parcelada. Deseja excluir toda a série de parcelas? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSeries} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir toda a série</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdvanceInstallmentsDialog open={!!advanceSeriesId} onOpenChange={(open) => { if (!open) { setAdvanceSeriesId(null); setAdvanceDescription(""); } }} seriesId={advanceSeriesId || ""} transactionDescription={advanceDescription} />
      <TransactionDetailsModal open={!!detailsTransaction} onOpenChange={(open) => { if (!open) setDetailsTransaction(null); }} transaction={detailsTransaction} onEdit={() => detailsTransaction && handleEdit(detailsTransaction)} onDelete={() => detailsTransaction && (detailsTransaction.is_installment && detailsTransaction.series_id ? setDeleteSeriesId(detailsTransaction.series_id) : setDeleteId(detailsTransaction.id))} onAdvance={() => detailsTransaction && handleAdvance(detailsTransaction)} />
      <TransactionModal isOpen={showTransactionModal} onClose={() => { setShowTransactionModal(false); setEditingTransaction(null); }} initialData={editingTransaction} />
      <OFXImportModal isOpen={showOfxModal} onClose={() => setShowOfxModal(false)} />
    </div>
  );
}
