import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plane, History, Undo2, Layers, CheckCircle2, Download, Settings } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import * as dateFns from "date-fns";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { useTransactionSync } from "@/hooks/useTransactionSync";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import { SharedCycleSettingsModal } from "@/components/shared/SharedCycleSettingsModal";
import { SharedRegularList } from "@/components/shared/SharedRegularList";
import { SharedTravelList } from "@/components/shared/SharedTravelList";
import { SharedSummarySection } from "@/components/shared/SharedSummarySection";
import { SharedSettleDialog } from "@/components/shared/SharedSettleDialog";

import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { SettlementConfirmationDialog } from "@/components/shared/SettlementConfirmationDialog";
// Lazy-loaded heavy components — carregados apenas quando necessário
const SharedBalanceChart = lazy(() =>
  import("@/components/shared/SharedBalanceChart").then(m => ({ default: m.SharedBalanceChart }))
);
const SharedInstallmentImport = lazy(() =>
  import("@/components/shared/SharedInstallmentImport").then(m => ({ default: m.SharedInstallmentImport }))
);
const AnticipateInstallmentsDialog = lazy(() =>
  import("@/components/dialogs/AnticipateInstallmentsDialog").then(m => ({ default: m.AnticipateInstallmentsDialog }))
);

type SharedTab = "REGULAR" | "TRAVEL" | "HISTORY";

export function SharedExpenses() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { currentDate } = useMonth();
  const [activeTab, setActiveTab] = useState<SharedTab>(
    (searchParams.get("tab") as SharedTab) || "REGULAR"
  );

  const handleExportShared = async (formatType: 'PDF' | 'CSV', period: 'MONTH' | 'YEAR') => {
    const { exportSharedToCSV, exportSharedToPDF } = await import("@/utils/exportData");
    const allItems: InvoiceItem[] = Object.values(invoices).flat();
    let filteredItems = allItems;
    let periodLabel = `${currentDate.getFullYear()}`;

    if (period === 'MONTH') {
      filteredItems = allItems.filter(item => {
        const [y, m] = item.date.split('-').map(Number);
        return y === currentDate.getFullYear() && (m - 1) === currentDate.getMonth();
      });
      const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      periodLabel = `${monthNames[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
    } else {
      filteredItems = allItems.filter(item => {
        const [y] = item.date.split('-').map(Number);
        return y === currentDate.getFullYear();
      });
      periodLabel = `Ano ${currentDate.getFullYear()}`;
    }

    if (formatType === 'PDF') {
      exportSharedToPDF(filteredItems, periodLabel, totalsByCurrency);
    } else {
      exportSharedToCSV(filteredItems, periodLabel);
    }
  };

  const { invoices, getFilteredInvoice, getTotals, isLoading: sharedLoading, refetch, transactions } = useSharedFinances({ currentDate, activeTab });
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  const { data: profile } = useUserProfile();
  const { data: accounts = [] } = useAccounts();
  const { data: trips = [] } = useTrips();
  const createTransaction = useCreateTransaction();
  const { invalidateRelated, syncAllShared } = useTransactionSync();
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();
  const queryClient = useQueryClient();

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleAccountId, setSettleAccountId] = useState("");
  const [settleDate, setSettleDate] = useState(dateFns.format(new Date(), 'yyyy-MM-dd'));
  const [settleType, setSettleType] = useState<"PAY" | "RECEIVE">("PAY");
  const [isSettling, setIsSettling] = useState(false);
  const [settlingMode, setSettlingMode] = useState<"ALL" | "SINGLE">("ALL");

  const [confirmReceiptDialog, setConfirmReceiptDialog] = useState<{ isOpen: boolean; items: InvoiceItem[] }>({ isOpen: false, items: [] });
  const [confirmPaymentDialog, setConfirmPaymentDialog] = useState<{ isOpen: boolean; items: InvoiceItem[] }>({ isOpen: false, items: [] });
  const [undoConfirm, setUndoConfirm] = useState<{ isOpen: boolean; item: InvoiceItem | null }>({ isOpen: false, item: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: InvoiceItem | null }>({ isOpen: false, item: null });
  const [deleteSeriesConfirm, setDeleteSeriesConfirm] = useState<{ isOpen: boolean; item: InvoiceItem | null }>({ isOpen: false, item: null });
  const [undoAllConfirm, setUndoAllConfirm] = useState(false);
  const [isUndoingAll, setIsUndoingAll] = useState(false);
  const [anticipateDialog, setAnticipateDialog] = useState<{ isOpen: boolean; seriesId: string | null; currentInstallment: number; totalInstallments: number }>({ isOpen: false, seriesId: null, currentInstallment: 0, totalInstallments: 0 });
  const [rejectDialog, setRejectDialog] = useState<{ isOpen: boolean; item: InvoiceItem | null; reason: string }>({ isOpen: false, item: null, reason: "Valor divergente ou não recebido." });

  const formatCurrency = (val: number, cur: string = "BRL") => cur === "BRL" ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val) : `${getCurrencySymbol(cur)} ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const { 
    handleSettle, 
    handleUndoSettlement, 
    handleDeleteTransaction, 
    handleDeleteSeries, 
    handleUndoAll, 
    handleConfirmReceipt, 
    handleRejectSettlement,
    handleConfirmPayment,
    handleRejectDebtorSettlement
  } = useSharedExpensesActions({ queryClient, selectedMember, settleAccountId, settleType, settleAmount, selectedItems, settleDate, members, getFilteredInvoice, createTransaction, user, invalidateRelated, refetch, undoConfirm, setUndoConfirm, deleteConfirm, setDeleteConfirm, deleteSeriesConfirm, setDeleteSeriesConfirm, setIsUndoingAll, setUndoAllConfirm, setIsSettling, setShowSettleDialog, setSelectedMember, setSettleAmount, setSettleAccountId, setSelectedItems, formatCurrency, accounts });

  const handleSettleClick = (id: string, type: "PAY" | "RECEIVE", amt: number, specificItem?: InvoiceItem) => {
    setSelectedMember(id);
    setSettleType(type);
    if (specificItem) {
      setSelectedItems([specificItem.id]);
      setSettleAmount(Math.abs(amt).toFixed(2).replace(".", ","));
      setSettlingMode("SINGLE");
    } else {
      const pending = getFilteredInvoice(id).filter(i => !i.isPaid);
      setSelectedItems(pending.map(i => i.id));
      setSettleAmount(Math.abs(amt).toFixed(2).replace(".", ","));
      setSettlingMode("ALL");
    }
    setShowSettleDialog(true);
  };

  const handleSettleTripClick = (id: string, type: "PAY" | "RECEIVE", amt: number, specificItem: InvoiceItem | undefined, tripId: string) => {
    setSelectedMember(id);
    setSettleType(type);
    if (specificItem) {
      setSelectedItems([specificItem.id]);
      setSettleAmount(Math.abs(amt).toFixed(2).replace(".", ","));
      setSettlingMode("SINGLE");
    } else {
      const pending = getFilteredInvoice(id).filter(i => !i.isPaid && i.tripId === tripId);
      setSelectedItems(pending.map(i => i.id));
      setSettleAmount(Math.abs(amt).toFixed(2).replace(".", ","));
      setSettlingMode("ALL");
    }
    setShowSettleDialog(true);
  };

  useEffect(() => {
    const tabParam = searchParams.get("tab") as SharedTab;
    if (tabParam && ["REGULAR", "TRAVEL", "HISTORY"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    
    const splitIdsParam = searchParams.get("confirmSettlement");
    if (splitIdsParam && invoices && !sharedLoading) {
      const splitIds = splitIdsParam.split(",");
      const allItems = Object.values(invoices).flat();
      
      const itemsToConfirm = allItems.filter(i => 
        splitIds.includes(i.splitId || "") && !i.isPaid
      );
      
      if (itemsToConfirm.length > 0) {
        setConfirmReceiptDialog({ isOpen: true, items: itemsToConfirm });
        // Só limpar o parâmetro da URL se conseguimos identificar itens
        navigate({ search: "" }, { replace: true });
      }
    }
  }, [searchParams, invoices, sharedLoading, navigate]);

  useEffect(() => {
    const splitIdsParam = searchParams.get("confirmPaymentSplit");
    if (splitIdsParam && invoices && !sharedLoading) {
      const splitIds = splitIdsParam.split(",");
      const allItems = Object.values(invoices).flat();
      
      const itemsToConfirm = allItems.filter(i => 
        splitIds.includes(i.splitId || "") && !i.isPaid
      );
      
      if (itemsToConfirm.length > 0) {
        setConfirmPaymentDialog({ isOpen: true, items: itemsToConfirm });
        navigate({ search: "" }, { replace: true });
      }
    }
  }, [searchParams, invoices, sharedLoading, navigate]);

  const totalsByCurrency: Record<string, any> = {};
  const travelTotalsByCurrency: Record<string, any> = {};

  members.forEach(m => {
    const allItems = invoices[m.id] || [];
    
    // 1. Filtro de escopo do membro
    let scopeFilteredItems = allItems;
    if (m.sharing_scope !== 'all') {
      scopeFilteredItems = allItems.filter(item => {
        switch (m.sharing_scope) {
          case 'trips_only':
            return !!item.tripId;
          case 'date_range': {
            if (!m.scope_start_date && !m.scope_end_date) return true;
            const itemDate = new Date(item.date);
            const startDate = m.scope_start_date ? new Date(m.scope_start_date) : null;
            const endDate = m.scope_end_date ? new Date(m.scope_end_date) : null;
            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;
            return true;
          }
          case 'specific_trip':
            return item.tripId === m.scope_trip_id;
          default:
            return true;
        }
      });
    }

    // 2. Classificar e acumular os totais
    scopeFilteredItems.forEach(item => {
      const cur = item.currency || 'BRL';
      
      if (item.tripId) {
        // Viagens (todos os itens de viagem)
        if (!travelTotalsByCurrency[cur]) {
          travelTotalsByCurrency[cur] = { owedToMe: 0, iOwe: 0, balance: 0, settled: 0 };
        }
        
        if (item.isPaid) {
          travelTotalsByCurrency[cur].settled += item.amount;
        } else if (item.type === 'CREDIT') {
          travelTotalsByCurrency[cur].owedToMe += item.amount;
        } else {
          travelTotalsByCurrency[cur].iOwe += item.amount;
        }
      } else {
        // Regular (limite pelo mês atual para itens pagos, e menor/igual para pendentes)
        const [year, month] = item.date.split('-').map(Number);
        const itemDateObj = new Date(year, month - 1, 1);
        const currentViewDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        
        if (item.isPaid) {
          // Histórico pago: apenas no mês atual selecionado
          const isCurrentMonth = year === currentDate.getFullYear() && (month - 1) === currentDate.getMonth();
          if (isCurrentMonth) {
            if (!totalsByCurrency[cur]) {
              totalsByCurrency[cur] = { owedToMe: 0, iOwe: 0, balance: 0, settled: 0 };
            }
            totalsByCurrency[cur].settled += item.amount;
          }
        } else {
          // Pendente: mostrar se for do mês atual ou de meses passados
          if (itemDateObj <= currentViewDate) {
            if (!totalsByCurrency[cur]) {
              totalsByCurrency[cur] = { owedToMe: 0, iOwe: 0, balance: 0, settled: 0 };
            }
            if (item.type === 'CREDIT') {
              totalsByCurrency[cur].owedToMe += item.amount;
            } else {
              totalsByCurrency[cur].iOwe += item.amount;
            }
          }
        }
      }
    });
  });

  Object.values(totalsByCurrency).forEach(t => t.balance = t.owedToMe - t.iOwe);
  Object.values(travelTotalsByCurrency).forEach(t => t.balance = t.owedToMe - t.iOwe);

  // Renderizar o skeleton de carregamento apenas no carregamento inicial absoluto (sem dados no cache)
  const hasData = members.length > 0 && Object.keys(invoices).length > 0;
  const isInitialLoading = (membersLoading || sharedLoading) && !hasData;

  if (isInitialLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="h-12 w-48 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-4 md:p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-3xl tracking-tighter">Compartilhados</h1>
            <p className="text-muted-foreground text-sm font-medium">Despesas divididas com a família e amigos</p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto mt-4 sm:mt-0">
            <Button size="icon" variant="outline" className="shadow-sm border-border/80 h-12 w-12 shrink-0 bg-background/50 backdrop-blur-sm" onClick={() => setShowSettingsModal(true)} title="Configurações de Fechamento">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="default" variant="outline" className="gap-2 shadow-sm border-border/80 w-full sm:w-auto h-12">
                  <Download className="h-5 w-5" />
                  <span>Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem onClick={() => handleExportShared('PDF', 'MONTH')}>
                  Mensal em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportShared('CSV', 'MONTH')}>
                  Mensal em Excel (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportShared('PDF', 'YEAR')}>
                  Anual em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportShared('CSV', 'YEAR')}>
                  Anual em Excel (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="default" variant="default" className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 gap-2 w-full sm:w-auto h-12" onClick={() => setShowImportDialog(true)}>
              <Layers className="h-5 w-5" /> 
              <span>Importar Parcelas</span>
            </Button>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <SharedBalanceChart transactions={transactions} invoices={invoices} currentDate={currentDate} />
      </Suspense>
      <SharedSummarySection totalsByCurrency={totalsByCurrency} travelTotalsByCurrency={travelTotalsByCurrency} formatCurrency={formatCurrency} activeTab={activeTab} />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SharedTab)} className="w-full">
        <TabsList className="grid grid-cols-3 w-full h-auto p-1.5 bg-secondary/30 rounded-2xl mb-8 shadow-inner border border-border/40">
          <TabsTrigger value="REGULAR" className="rounded-xl py-3 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300">
            <div className="flex flex-col items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Regular</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="TRAVEL" className="rounded-xl py-3 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300">
            <div className="flex flex-col items-center gap-2">
              <Plane className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Viagens</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="HISTORY" className="rounded-xl py-3 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300">
            <div className="flex flex-col items-center gap-2">
              <History className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Histórico</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {members.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border/80 bg-card/20 rounded-xl space-y-4 max-w-md mx-auto">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/60" />
              <div className="space-y-2">
                <p className="text-muted-foreground font-semibold text-base">Nenhum membro ativo</p>
                <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto">
                  Convide membros da sua família para começar a dividir despesas e gerenciar orçamentos compartilhados.
                </p>
              </div>
              <Button 
                onClick={() => navigate("/familia")} 
                variant="outline" 
                size="sm" 
                className="gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary hover:border-primary/40 active:scale-95 transition-all mt-2"
              >
                <Users className="h-4 w-4" />
                Convidar Membros
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === 'HISTORY' && members.some(m => getFilteredInvoice(m.id).some(i => i.isPaid)) && <div className="flex justify-end"><Button variant="destructive" size="sm" onClick={() => setUndoAllConfirm(true)} className="gap-2"><Undo2 className="h-4 w-4" /> Desfazer Tudo</Button></div>}
              {activeTab !== 'TRAVEL' ? (
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
                  onConfirmReceipt={(i) => setConfirmReceiptDialog({ isOpen: true, items: [i] })}
                  onRejectSettlement={(i) => setRejectDialog({ isOpen: true, item: i, reason: "" })}
                  onAnticipate={(i) => setAnticipateDialog({ isOpen: true, seriesId: i.seriesId ?? null, currentInstallment: i.installmentNumber ?? 0, totalInstallments: i.totalInstallments ?? 0 })}
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
                  onConfirmReceipt={(i) => setConfirmReceiptDialog({ isOpen: true, items: [i] })}
                  onAnticipate={(i) => setAnticipateDialog({ isOpen: true, seriesId: i.seriesId ?? null, currentInstallment: i.installmentNumber ?? 0, totalInstallments: i.totalInstallments ?? 0 })}
                />
              )}
              {(activeTab === 'TRAVEL' ? trips.filter(t => members.some(m => getFilteredInvoice(m.id).some(i => i.tripId === t.id))).length === 0 : members.filter(m => m.linked_user_id !== user?.id).every(m => getFilteredInvoice(m.id).length === 0)) && <div className="py-12 text-center border border-dashed rounded-xl"><CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" /><p className="text-muted-foreground">Tudo em dia!</p></div>}
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
          selectedMember 
            ? getFilteredInvoice(selectedMember).filter(i => !i.isPaid) 
            : []
        }
        selectedItems={selectedItems}
        onToggleItem={(id) => setSelectedItems(prev => {
          const ni = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
          if (selectedMember) {
            const items = getFilteredInvoice(selectedMember);
            const tot = items.filter(i => ni.includes(i.id)).reduce((s, x) => x.type === "CREDIT" ? SafeFinancialCalculator.add(s, x.amount) : SafeFinancialCalculator.subtract(s, x.amount), 0);
            setSettleAmount(Math.abs(tot).toFixed(2).replace(".", ","));
            setSettleType(tot >= 0 ? "RECEIVE" : "PAY");
          }
          return ni;
        })}
        onSelectAll={() => {
          if (!selectedMember) return;
          const items = getFilteredInvoice(selectedMember).filter(i => !i.isPaid);
          if (selectedItems.length === items.length) {
            setSelectedItems([]);
            setSettleAmount("0,00");
            setSettleType("PAY");
          } else {
            setSelectedItems(items.map(i => i.id));
            const tot = items.reduce((s, x) => x.type === "CREDIT" ? SafeFinancialCalculator.add(s, x.amount) : SafeFinancialCalculator.subtract(s, x.amount), 0);
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
      
      <AlertDialog open={undoConfirm.isOpen} onOpenChange={(o) => !o && setUndoConfirm({ isOpen: false, item: null })}><AlertDialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden"><AlertDialogHeader><AlertDialogTitle>Desfazer Acerto</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleUndoSettlement}>Desfazer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={deleteConfirm.isOpen} onOpenChange={(o) => !o && setDeleteConfirm({ isOpen: false, item: null })}><AlertDialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden"><AlertDialogHeader><AlertDialogTitle>Excluir Transação</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTransaction} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={deleteSeriesConfirm.isOpen} onOpenChange={(o) => !o && setDeleteSeriesConfirm({ isOpen: false, item: null })}><AlertDialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden"><AlertDialogHeader><AlertDialogTitle>Excluir Série</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSeries} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={undoAllConfirm} onOpenChange={setUndoAllConfirm}><AlertDialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden"><AlertDialogHeader><AlertDialogTitle>Desfazer Tudo?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleUndoAll} className="bg-destructive" disabled={isUndoingAll}>{isUndoingAll ? "..." : "Sim"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={rejectDialog.isOpen} onOpenChange={(o) => setRejectDialog({ ...rejectDialog, isOpen: o })}><AlertDialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden"><AlertDialogHeader><AlertDialogTitle>Recusar Acerto</AlertDialogTitle></AlertDialogHeader><div className="py-4 space-y-2"><Label>Motivo</Label><Input value={rejectDialog.reason} onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })} /></div><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => {
        if (rejectDialog.item) {
          if (rejectDialog.item.settledByCreditor && !rejectDialog.item.settledByDebtor) {
            handleRejectDebtorSettlement([rejectDialog.item], rejectDialog.reason);
          } else {
            handleRejectSettlement(rejectDialog.item, rejectDialog.reason);
          }
        }
      }}>Recusar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <Suspense fallback={null}>
        <SharedInstallmentImport isOpen={showImportDialog} onClose={() => setShowImportDialog(false)} members={members} onSuccess={() => refetch()} />
      </Suspense>
      <TransactionModal isOpen={showTransactionModal} onClose={() => setShowTransactionModal(false)} />
      <SettlementConfirmationDialog isOpen={confirmReceiptDialog.isOpen} onOpenChange={(o) => setConfirmReceiptDialog({ ...confirmReceiptDialog, isOpen: o })} items={confirmReceiptDialog.items} isSettling={isSettling} onConfirm={handleConfirmReceipt} />
      <SettlementConfirmationDialog isOpen={confirmPaymentDialog.isOpen} onOpenChange={(o) => setConfirmPaymentDialog({ ...confirmPaymentDialog, isOpen: o })} items={confirmPaymentDialog.items} isSettling={isSettling} onConfirm={handleConfirmPayment} />
      <Suspense fallback={null}>
        {anticipateDialog.seriesId && <AnticipateInstallmentsDialog isOpen={anticipateDialog.isOpen} onClose={() => setAnticipateDialog(prev => ({ ...prev, isOpen: false }))} seriesId={anticipateDialog.seriesId} currentInstallment={anticipateDialog.currentInstallment} totalInstallments={anticipateDialog.totalInstallments} onSuccess={() => { refetch(); syncAllShared(); }} />}
      </Suspense>
      <SharedCycleSettingsModal isOpen={showSettingsModal} onOpenChange={setShowSettingsModal} />
    </div>
  );
}
