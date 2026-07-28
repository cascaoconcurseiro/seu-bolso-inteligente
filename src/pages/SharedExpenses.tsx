import { useState, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plane, History, Undo2, Layers, CheckCircle2, Download } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useFamilyMembers } from "@/hooks/useFamily";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useTrips } from "@/hooks/useTrips";
import { useSharedExpensesActions } from "@/hooks/useSharedExpensesActions";
import { useSharedFinances } from "@/hooks/useSharedFinances";
import { InvoiceItem } from "@/utils/sharedFinanceCalculations";
import { useMonth } from "@/contexts/MonthContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { useTransactionSync } from "@/hooks/useTransactionSync";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";

import { SharedRegularList } from "@/components/shared/SharedRegularList";
import { SharedTravelList } from "@/components/shared/SharedTravelList";
import { SharedSummarySection } from "@/components/shared/SharedSummarySection";
import { SharedSettleDialog } from "@/components/shared/SharedSettleDialog";
import { useSharedExpensesState } from "./shared-expenses/useSharedExpensesState";
import { useSharedExpensesTotals } from "./shared-expenses/useSharedExpensesTotals";
import { SharedExpensesDialogs } from "./shared-expenses/SharedExpensesDialogs";

const SharedBalanceChart = lazy(() =>
  import("@/components/shared/SharedBalanceChart").then((m) => ({ default: m.SharedBalanceChart }))
);
const SharedInstallmentImport = lazy(() =>
  import("@/components/shared/SharedInstallmentImport").then((m) => ({
    default: m.SharedInstallmentImport,
  }))
);
const AnticipateInstallmentsDialog = lazy(() =>
  import("@/components/dialogs/AnticipateInstallmentsDialog").then((m) => ({
    default: m.AnticipateInstallmentsDialog,
  }))
);

type SharedTab = "REGULAR" | "TRAVEL" | "HISTORY";

export function SharedExpenses() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { currentDate } = useMonth();

  const state = useSharedExpensesState();
  const {
    selectedItems,
    setSelectedItems,
    showSettleDialog,
    setShowSettleDialog,
    showImportDialog,
    setShowImportDialog,
    selectedMember,
    setSelectedMember,
    settleAmount,
    setSettleAmount,
    settleAccountId,
    setSettleAccountId,
    settleDate,
    setSettleDate,
    settleType,
    setSettleType,
    isSettling,
    setIsSettling,
    settlingMode,
    setSettlingMode,
    undoConfirm,
    setUndoConfirm,
    deleteConfirm,
    setDeleteConfirm,
    deleteSeriesConfirm,
    setDeleteSeriesConfirm,
    undoAllConfirm,
    setUndoAllConfirm,
    isUndoingAll,
    setIsUndoingAll,
    anticipateDialog,
    setAnticipateDialog,
  } = state;

  const [activeTab, setActiveTab] = useState<SharedTab>(
    (searchParams.get("tab") as SharedTab) || "REGULAR"
  );

  const {
    invoices,
    getFilteredInvoice,
    getTotals,
    isLoading: sharedLoading,
    refetch,
    transactions,
  } = useSharedFinances({ currentDate, activeTab });

  const { data: members = [], isLoading: membersLoading } = useFamilyMembers(true);
  const { data: profile } = useUserProfile();
  const { data: accounts = [] } = useAccounts();
  const { data: trips = [] } = useTrips();
  const createTransaction = useCreateTransaction();
  const { invalidateRelated, syncAllShared } = useTransactionSync();
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();
  const queryClient = useQueryClient();

  const { totalsByCurrency, travelTotalsByCurrency } = useSharedExpensesTotals({
    members,
    invoices,
    currentDate,
  });

  const formatCurrency = (val: number, cur: string = "BRL") =>
    cur === "BRL"
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
      : `${getCurrencySymbol(cur)} ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const {
    handleSettle,
    handleUndoSettlement,
    handleDeleteTransaction,
    handleDeleteSeries,
    handleUndoAll,
  } = useSharedExpensesActions({
    queryClient,
    selectedMember,
    settleAccountId,
    settleType,
    settleAmount,
    selectedItems,
    settleDate,
    members,
    getFilteredInvoice,
    createTransaction,
    user,
    invalidateRelated,
    refetch,
    undoConfirm,
    setUndoConfirm,
    deleteConfirm,
    setDeleteConfirm,
    deleteSeriesConfirm,
    setDeleteSeriesConfirm,
    setIsUndoingAll,
    setUndoAllConfirm,
    setIsSettling,
    setShowSettleDialog,
    setSelectedMember,
    setSettleAmount,
    setSettleAccountId,
    setSelectedItems,
    formatCurrency,
    accounts,
  });

  const handleExportShared = async (formatType: "PDF" | "CSV", period: "MONTH" | "YEAR") => {
    const { exportSharedToCSV, exportSharedToPDF } = await import("@/utils/exportData");
    const allItems: InvoiceItem[] = Object.values(invoices).flat();
    let filteredItems = allItems;
    let periodLabel = `${currentDate.getFullYear()}`;

    if (period === "MONTH") {
      filteredItems = allItems.filter((item) => {
        if (!item.date) return false;
        const [y, m] = item.date.split("-").map(Number);
        return y === currentDate.getFullYear() && m - 1 === currentDate.getMonth();
      });
      const monthNames = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
      ];
      periodLabel = `${monthNames[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
    } else {
      filteredItems = allItems.filter((item) => {
        if (!item.date) return false;
        const [y] = item.date.split("-").map(Number);
        return y === currentDate.getFullYear();
      });
      periodLabel = `Ano ${currentDate.getFullYear()}`;
    }

    if (formatType === "PDF") {
      exportSharedToPDF(filteredItems, periodLabel, totalsByCurrency);
    } else {
      exportSharedToCSV(filteredItems, periodLabel);
    }
  };

  const handleSettleClick = (
    id: string,
    type: "PAY" | "RECEIVE",
    amt: number,
    specificItem?: InvoiceItem
  ) => {
    setSelectedMember(id);
    setSettleType(type);
    if (specificItem) {
      setSelectedItems([specificItem.id]);
      setSettleAmount(Math.abs(amt).toFixed(2).replace(".", ","));
      setSettlingMode("SINGLE");
    } else {
      const pending = getFilteredInvoice(id).filter((i) => !i.isPaid);
      setSelectedItems(pending.map((i) => i.id));
      setSettleAmount(Math.abs(amt).toFixed(2).replace(".", ","));
      setSettlingMode("ALL");
    }
    setShowSettleDialog(true);
  };

  const handleSettleTripClick = (
    id: string,
    type: "PAY" | "RECEIVE",
    amt: number,
    specificItem: InvoiceItem | undefined,
    tripId: string
  ) => {
    setSelectedMember(id);
    setSettleType(type);
    if (specificItem) {
      setSelectedItems([specificItem.id]);
      setSettleAmount(Math.abs(amt).toFixed(2).replace(".", ","));
      setSettlingMode("SINGLE");
    } else {
      const pending = getFilteredInvoice(id).filter((i) => !i.isPaid && i.tripId === tripId);
      setSelectedItems(pending.map((i) => i.id));
      setSettleAmount(Math.abs(amt).toFixed(2).replace(".", ","));
      setSettlingMode("ALL");
    }
    setShowSettleDialog(true);
  };

  const hasData = members.length > 0 && Object.keys(invoices).length > 0;
  const isInitialLoading = (membersLoading || sharedLoading) && !hasData;

  if (isInitialLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="h-12 w-48 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="border-b border-border pb-5 md:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-primary">Vida compartilhada</p>
            <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Compartilhados
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Valores divididos, pagamentos e pendências entre pessoas
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto mt-4 sm:mt-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="default" variant="outline" className="h-11 w-full gap-2 sm:w-auto">
                  <Download className="h-5 w-5" />
                  <span>Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem onClick={() => handleExportShared("PDF", "MONTH")}>
                  Mensal em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportShared("CSV", "MONTH")}>
                  Mensal em Excel (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportShared("PDF", "YEAR")}>
                  Anual em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportShared("CSV", "YEAR")}>
                  Anual em Excel (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="default"
              variant="default"
              className="h-11 w-full gap-2 font-medium sm:w-auto"
              onClick={() => setShowImportDialog(true)}
            >
              <Layers className="h-5 w-5" />
              <span>Importar Parcelas</span>
            </Button>
          </div>
        </div>
      </header>

      <Suspense fallback={null}>
        <SharedBalanceChart
          transactions={transactions}
          invoices={invoices}
          currentDate={currentDate}
        />
      </Suspense>
      <SharedSummarySection
        totalsByCurrency={totalsByCurrency}
        travelTotalsByCurrency={travelTotalsByCurrency}
        formatCurrency={formatCurrency}
        activeTab={activeTab}
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as SharedTab)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 w-full h-auto p-1.5 bg-secondary/30 rounded-2xl mb-8 shadow-inner border border-border/40">
          <TabsTrigger
            value="REGULAR"
            className="rounded-xl py-3 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300"
          >
            <div className="flex flex-col items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Regular</span>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="TRAVEL"
            className="rounded-xl py-3 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300"
          >
            <div className="flex flex-col items-center gap-2">
              <Plane className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Viagens</span>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="HISTORY"
            className="rounded-xl py-3 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300"
          >
            <div className="flex flex-col items-center gap-2">
              <History className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Histórico</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum membro ativo"
              description="Convide membros da sua família para começar a dividir despesas e gerenciar orçamentos compartilhados."
              action={
                <Button
                  onClick={() => navigate("/familia")}
                  variant="outline"
                  className="h-12 px-8 rounded-2xl gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary hover:border-primary/40 transition-all font-semibold"
                >
                  <Users className="h-4 w-4" />
                  Convidar Membros
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {activeTab === "HISTORY" &&
                members.some((m) => getFilteredInvoice(m.id).some((i) => i.isPaid)) && (
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setUndoAllConfirm(true)}
                      className="gap-2"
                    >
                      <Undo2 className="h-4 w-4" /> Desfazer Tudo
                    </Button>
                  </div>
                )}
              {activeTab !== "TRAVEL" ? (
                <SharedRegularList
                  members={members}
                  user={user}
                  activeTab={activeTab}
                  getFilteredInvoice={getFilteredInvoice}
                  getTotals={getTotals}
                  formatCurrency={formatCurrency}
                  onSettle={handleSettleClick}
                  onUndo={(i) => setUndoConfirm({ isOpen: true, item: i })}
                  onDelete={(i) => setDeleteConfirm({ isOpen: true, item: i })}
                  onAnticipate={(i) =>
                    setAnticipateDialog({
                      isOpen: true,
                      seriesId: i.seriesId ?? null,
                      currentInstallment: i.installmentNumber ?? 0,
                      totalInstallments: i.totalInstallments ?? 0,
                    })
                  }
                />
              ) : (
                <SharedTravelList
                  trips={trips}
                  members={members}
                  user={user}
                  getFilteredInvoice={getFilteredInvoice}
                  getTotals={getTotals}
                  formatCurrency={formatCurrency}
                  onSettle={handleSettleTripClick}
                  onUndo={(i) => setUndoConfirm({ isOpen: true, item: i })}
                  onDelete={(i) => setDeleteConfirm({ isOpen: true, item: i })}
                  onDeleteSeries={(i) => setDeleteSeriesConfirm({ isOpen: true, item: i })}
                  onAnticipate={(i) =>
                    setAnticipateDialog({
                      isOpen: true,
                      seriesId: i.seriesId ?? null,
                      currentInstallment: i.installmentNumber ?? 0,
                      totalInstallments: i.totalInstallments ?? 0,
                    })
                  }
                />
              )}
              {(activeTab === "TRAVEL"
                ? trips.filter((t) =>
                    members.some((m) => getFilteredInvoice(m.id).some((i) => i.tripId === t.id))
                  ).length === 0
                : members
                    .filter((m) => m.linked_user_id !== user?.id)
                    .every((m) => getFilteredInvoice(m.id).length === 0)) && (
                <EmptyState
                  icon={CheckCircle2}
                  title="Tudo em dia!"
                  description="Nenhuma despesa compartilhada pendente neste período."
                  variant="success"
                />
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SharedSettleDialog
        isOpen={showSettleDialog}
        onOpenChange={setShowSettleDialog}
        selectedMember={selectedMember}
        members={members}
        pendingMemberItems={
          selectedMember ? getFilteredInvoice(selectedMember).filter((i) => !i.isPaid) : []
        }
        selectedItems={selectedItems}
        onToggleItem={(id) =>
          setSelectedItems((prev) => {
            const ni = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            if (selectedMember) {
              const items = getFilteredInvoice(selectedMember);
              const tot = items
                .filter((i) => ni.includes(i.id))
                .reduce(
                  (s, x) =>
                    x.type === "CREDIT"
                      ? SafeFinancialCalculator.add(s, x.amount)
                      : SafeFinancialCalculator.subtract(s, x.amount),
                  SafeFinancialCalculator.ZERO
                )
                .toNumber();
              setSettleAmount(Math.abs(tot).toFixed(2).replace(".", ","));
              setSettleType(tot >= 0 ? "RECEIVE" : "PAY");
            }
            return ni;
          })
        }
        onSelectAll={() => {
          if (!selectedMember) return;
          const items = getFilteredInvoice(selectedMember).filter((i) => !i.isPaid);
          if (selectedItems.length === items.length) {
            setSelectedItems([]);
            setSettleAmount("0,00");
            setSettleType("PAY");
          } else {
            setSelectedItems(items.map((i) => i.id));
            const tot = items
              .reduce(
                (s, x) =>
                  x.type === "CREDIT"
                    ? SafeFinancialCalculator.add(s, x.amount)
                    : SafeFinancialCalculator.subtract(s, x.amount),
                SafeFinancialCalculator.ZERO
              )
              .toNumber();
            setSettleAmount(Math.abs(tot).toFixed(2).replace(".", ","));
            setSettleType(tot >= 0 ? "RECEIVE" : "PAY");
          }
        }}
        settleType={settleType}
        settleAmount={settleAmount}
        settleDate={settleDate}
        setSettleDate={setSettleDate}
        settleAccountId={settleAccountId}
        setSettleAccountId={setSettleAccountId}
        accounts={accounts}
        trips={trips}
        profile={profile}
        user={user}
        onSettle={handleSettle}
        isSettling={isSettling}
        settlingMode={settlingMode}
      />

      <SharedExpensesDialogs
        undoConfirm={undoConfirm}
        setUndoConfirm={setUndoConfirm}
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        deleteSeriesConfirm={deleteSeriesConfirm}
        setDeleteSeriesConfirm={setDeleteSeriesConfirm}
        undoAllConfirm={undoAllConfirm}
        setUndoAllConfirm={setUndoAllConfirm}
        isUndoingAll={isUndoingAll}
        handleUndoSettlement={handleUndoSettlement}
        handleDeleteTransaction={handleDeleteTransaction}
        handleDeleteSeries={handleDeleteSeries}
        handleUndoAll={handleUndoAll}
      />

      <Suspense fallback={null}>
        <SharedInstallmentImport
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          members={members}
          onSuccess={() => refetch()}
        />
      </Suspense>

      <TransactionModal open={showTransactionModal} onOpenChange={setShowTransactionModal} />

      <Suspense fallback={null}>
        {anticipateDialog.seriesId && (
          <AnticipateInstallmentsDialog
            isOpen={anticipateDialog.isOpen}
            onClose={() => setAnticipateDialog((prev) => ({ ...prev, isOpen: false }))}
            seriesId={anticipateDialog.seriesId}
            currentInstallment={anticipateDialog.currentInstallment}
            totalInstallments={anticipateDialog.totalInstallments}
            onSuccess={() => {
              refetch();
              syncAllShared();
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
