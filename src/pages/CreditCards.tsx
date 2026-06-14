import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, CreditCard, Trash2, Archive, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMonth } from "@/contexts/MonthContext";
import { exportCardsToCSV, exportCardsToPDF } from "@/utils/exportData";
import { getBankById } from "@/lib/banks";
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useArchiveAccount, useArchivedAccounts, useUnarchiveAccount, useCreditCardInvoice, useAccountDependencies } from "@/hooks/useAccounts";
import { useTransactions, useCreateTransaction, useDeleteTransaction, useBulkCreateTransactions } from "@/hooks/useTransactions";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { getInvoiceData, getTargetDate, formatCycleRange } from "@/lib/invoiceUtils";
import { formatLocalDate, getMonthDateRange } from "@/utils/dateUtils";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";

import { TransactionModal } from "@/components/modals/TransactionModal";
import { DeleteTransactionModal, CascadeDeleteType } from "@/components/modals/DeleteTransactionModal";

// Modular Components
import { CreditCardItem } from "@/components/credit-cards/CreditCardItem";
import { CreditCardDetailView } from "@/components/credit-cards/CreditCardDetailView";
import { NewCardDialog } from "@/components/credit-cards/NewCardDialog";
import { ImportBillsDialog } from "@/components/credit-cards/ImportBillsDialog";
import { PayInvoiceDialog } from "@/components/credit-cards/PayInvoiceDialog";
import { CreditCardSummary } from "@/components/credit-cards/CreditCardSummary";
import { ArchivedCardsSection } from "@/components/credit-cards/ArchivedCardsSection";

type CardView = "list" | "detail";

interface CreditCardAccount {
  id: string;
  name: string;
  bank_id: string | null;
  credit_limit: number | null;
  balance: number;
  closing_day: number | null;
  due_day: number | null;
  currency?: string;
  is_international?: boolean;
}

export function CreditCards() {
  const { currentDate } = useMonth();
  const [view, setView] = useState<CardView>("list");
  const [selectedCard, setSelectedCard] = useState<CreditCardAccount | null>(null);
  const urlParamsProcessed = useRef(false);
  const [showNewCardDialog, setShowNewCardDialog] = useState(false);
  const { data: exportTransactions = [] } = useTransactions({
    startDate: `${currentDate.getFullYear()}-01-01`,
    endDate: `${currentDate.getFullYear()}-12-31`
  });

  const handleExportCards = (formatType: 'PDF' | 'CSV', period: 'MONTH' | 'YEAR') => {
    let filteredTxs = exportTransactions;
    let periodLabel = `${currentDate.getFullYear()}`;

    if (period === 'MONTH') {
      const startOfM = dateFns.startOfMonth(currentDate);
      const endOfM = dateFns.endOfMonth(currentDate);
      filteredTxs = exportTransactions.filter(t => {
        const d = new Date(t.date);
        return d >= startOfM && d <= endOfM;
      });
      const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      periodLabel = `${monthNames[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
    } else {
      periodLabel = `Ano ${currentDate.getFullYear()}`;
    }

    const totalLimit = creditCards.reduce((sum, c) => sum + (Number(c.credit_limit) || 0), 0);
    const totalInvoicesVal = creditCards.reduce((sum, card) => sum + getCardInvoice(card).value, 0);

    if (formatType === 'PDF') {
      exportCardsToPDF(filteredTxs, creditCards, periodLabel, totalLimit, totalInvoicesVal);
    } else {
      exportCardsToCSV(filteredTxs, creditCards, periodLabel);
    }
  };
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  
  // New Card State
  const [newBankId, setNewBankId] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newCardName, setNewCardName] = useState("");
  const [newClosingDay, setNewClosingDay] = useState("");
  const [newDueDay, setNewDueDay] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [newIsInternational, setNewIsInternational] = useState(false);
  const [newCurrency, setNewCurrency] = useState("USD");

  const { data: accounts = [], isLoading, refetch: refetchAccounts } = useAccounts();
  
  const { startDay } = useMonth();
  // Expandir a janela de busca para garantir que compras de meses anteriores
  // que caem na fatura atual sejam incluídas no cálculo da lista de cartões.
  const { startDate, endDate } = getMonthDateRange(currentDate, startDay);
  const extendedStartDate = dateFns.subMonths(new Date(startDate), 2).toISOString();
  const extendedEndDate = dateFns.addMonths(new Date(endDate), 1).toISOString();

  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useTransactions({
    startDate: extendedStartDate,
    endDate: extendedEndDate,
    limit: 5000,
  });
  
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();
  const archiveAccountMutation = useArchiveAccount();
  const { data: archivedCards = [] } = useArchivedAccounts();
  const unarchiveAccountMutation = useUnarchiveAccount();
  const createTransaction = useCreateTransaction();
  const bulkCreateTransactions = useBulkCreateTransactions();
  const deleteTransaction = useDeleteTransaction();
  const { toast: toastHook } = useToast();

  const { data: deleteCardDeps } = useAccountDependencies(deleteCardConfirm.card?.id);
  const deleteCardHasTransactions = (deleteCardDeps?.total_transactions || 0) > 0;

  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; transaction: any | null }>({ isOpen: false, transaction: null });
  const [showEditCardDialog, setShowEditCardDialog] = useState(false);
  const [deleteCardConfirm, setDeleteCardConfirm] = useState<{ isOpen: boolean; card: CreditCardAccount | null }>({ isOpen: false, card: null });
  
  const [editCardName, setEditCardName] = useState("");
  const [editClosingDay, setEditClosingDay] = useState("");
  const [editDueDay, setEditDueDay] = useState("");
  const [editLimit, setEditLimit] = useState("");

  const creditCards = useMemo(() => (accounts || []).filter(acc => acc.type === "CREDIT_CARD") as CreditCardAccount[], [accounts]);

  useEffect(() => {
    if (selectedCard) {
      if (urlParamsProcessed.current) {
        urlParamsProcessed.current = false;
        return;
      }
      setSelectedDate(getTargetDate(new Date(), selectedCard.closing_day || 1));
    }
  }, [selectedCard?.id]);

  const { data: invoiceDataRPC, isFetching: invoiceFetching } = useCreditCardInvoice(
    selectedCard?.id || null,
    dateFns.format(dateFns.startOfMonth(selectedDate), "yyyy-MM-dd"),
    dateFns.format(dateFns.endOfMonth(selectedDate), "yyyy-MM-dd")
  );

  useEffect(() => {
    const cardId = searchParams.get("cardId");
    const invoiceDateParam = searchParams.get("invoiceDate") || searchParams.get("month");
    
    if (cardId && accounts.length > 0 && (!selectedCard || selectedCard.id !== cardId || invoiceDateParam)) {
      const card = accounts.find(a => a.id === cardId);
      if (card) {
        urlParamsProcessed.current = true;
        setSelectedCard(card as CreditCardAccount);
        setView("detail");
        
        // Se vier um mês de fatura específico na URL, navega para aquele mês
        if (invoiceDateParam) {
          const [year, month] = invoiceDateParam.split("-").map(Number);
          if (year && month) {
            setSelectedDate(new Date(year, month - 1, 1));
          }
        }
        
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, accounts, selectedCard]);

  const invoiceData = useMemo(() => {
    if (!selectedCard) return null;
    const baseData = getInvoiceData(selectedCard, transactions, selectedDate);
    if (invoiceDataRPC) {
      return { ...baseData, invoiceTotal: Number(invoiceDataRPC.total) || 0, transactions: invoiceDataRPC.transactions || [] };
    }
    return baseData;
  }, [selectedCard, invoiceDataRPC, transactions, selectedDate]);

    const getCardInvoice = (card: CreditCardAccount) => {
      const targetDate = getTargetDate(new Date(), card.closing_day || 1);
      const data = getInvoiceData(card, transactions, targetDate);
      
      if (data.status === 'OPEN') {
        const prevDate = dateFns.subMonths(targetDate, 1);
        const prevData = getInvoiceData(card, transactions, prevDate);
        if (prevData.status === 'CLOSED' && prevData.invoiceTotal > 0.01) {
          return { value: prevData.invoiceTotal, dueDate: prevData.dueDate, status: prevData.status };
        }
      }
      
      return { value: data.invoiceTotal, dueDate: data.dueDate, status: data.status };
    };

  const getCardInstallments = (invoiceTxs: any[]) => invoiceTxs.filter(t => t.is_installment).map(t => ({ id: t.id, description: t.description, current: t.current_installment || 1, total: t.total_installments || 1, value: t.amount }));

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getDaysUntilDue = (dueDate: Date) => Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const handleCreateCard = async () => {
    const bank = getBankById(newBankId);
    await createAccount.mutateAsync({ name: newCardName.trim() || bank.name, type: "CREDIT_CARD", bank_id: newBankId, credit_limit: parseFloat(newLimit) || 0, closing_day: parseInt(newClosingDay) || undefined, due_day: parseInt(newDueDay) || undefined, is_international: newIsInternational, currency: newIsInternational ? newCurrency : 'BRL' });
    setShowNewCardDialog(false);
    resetNewCardForm();
  };

  const resetNewCardForm = () => {
    setNewBankId(""); setNewBrand(""); setNewCardName(""); setNewClosingDay(""); setNewDueDay(""); setNewLimit(""); setNewIsInternational(false); setNewCurrency("USD");
  };

  const totalInvoices = useMemo(() => creditCards.reduce((sum, card) => sum + getCardInvoice(card).value, 0), [creditCards, transactions]);
  
  const totalDebt = useMemo(() => {
    // Usar o saldo consolidado da conta (card.balance) mantido pelo banco de dados (trigger sync_account_balance)
    // Se o saldo for negativo, representa uma dívida.
    return creditCards.reduce((accTotal, card) => {
      const balanceVal = Number(card.balance) || 0;
      return accTotal + (balanceVal < 0 ? Math.abs(balanceVal) : 0);
    }, 0);
  }, [creditCards]);
  const nextDueDate = useMemo(() => {
    if (creditCards.length === 0) return 0;
    return Math.min(...creditCards.map(card => getDaysUntilDue(getCardInvoice(card).dueDate)));
  }, [creditCards, transactions]);

  const handleDeleteTransaction = async (cascadeType: CascadeDeleteType) => {
    if (!deleteConfirm.transaction) return;
    await deleteTransaction.mutateAsync({ 
      id: deleteConfirm.transaction.id, 
      cascadeType 
    });
    toast.success("Transação(ões) excluída(s)!");
    setDeleteConfirm({ isOpen: false, transaction: null });
    refetchTransactions();
  };

  const handleEditCard = async () => {
    if (!selectedCard) return;
    await updateAccount.mutateAsync({ id: selectedCard.id, name: editCardName, closing_day: editClosingDay ? parseInt(editClosingDay) : null, due_day: editDueDay ? parseInt(editDueDay) : null, credit_limit: editLimit ? parseFloat(editLimit) : null });
    toast.success("Cartão atualizado!");
    setShowEditCardDialog(false);
    refetchAccounts();
  };

  if (isLoading) return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 border border-border/50 bg-card/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-10 w-36 rounded-xl" />
            <div className="skeleton h-4 w-52 rounded-lg" />
          </div>
          <div className="skeleton h-11 w-36 rounded-xl" />
        </div>
      </div>
      {/* Summary skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      {/* Cards list skeleton */}
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
    </div>
  );

  if (view === "detail" && selectedCard && invoiceData) {
    return (
      <>
        <CreditCardDetailView 
          selectedCard={selectedCard} goBack={() => { setView("list"); setSelectedCard(null); }}
          openEditCardDialog={(card) => { setEditCardName(card.name); setEditClosingDay(card.closing_day?.toString() || ""); setEditDueDay(card.due_day?.toString() || ""); setEditLimit(card.credit_limit?.toString() || ""); setShowEditCardDialog(true); }}
          setDeleteCardConfirm={setDeleteCardConfirm} selectedDate={selectedDate} changeMonth={(offset) => setSelectedDate(prev => dateFns.addMonths(prev, offset))}
          goToCurrentMonth={() => setSelectedDate(dateFns.startOfMonth(new Date()))} monthName={dateFns.format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
          cycleRange={formatCycleRange(invoiceData.startDate, invoiceData.closingDate)} invoiceFetching={invoiceFetching} invoiceData={invoiceData}
          formatCurrency={formatCurrency} daysUntilDue={getDaysUntilDue(invoiceData.dueDate)} usagePercent={selectedCard.credit_limit ? (invoiceData.invoiceTotal / selectedCard.credit_limit) * 100 : 0}
          bank={getBankById(selectedCard.bank_id)} setShowPayDialog={setShowPayDialog} setShowImportDialog={setShowImportDialog}
          handleEditTransaction={(tx) => { 
            setEditingTransaction({
              ...tx,
              category_id: tx.category_id || tx.category?.id,
              date: tx.date.includes('T') ? tx.date : `${tx.date}T00:00:00`
            }); 
            setShowTransactionModal(true); 
          }} setDeleteConfirm={setDeleteConfirm} installments={getCardInstallments(invoiceData.transactions)}
          allYearTransactions={exportTransactions}
        />

        <ImportBillsDialog isOpen={showImportDialog} onClose={() => setShowImportDialog(false)} account={selectedCard} onImport={async (txs) => { 
          await bulkCreateTransactions.mutateAsync(txs as any); 
          toastHook({ title: "Faturas importadas!" }); 
          setShowImportDialog(false); 
        }} />
        
        <PayInvoiceDialog 
          isOpen={showPayDialog} onClose={() => setShowPayDialog(false)} card={selectedCard} invoiceTotal={invoiceData.invoiceTotal} accounts={(accounts || []).filter(a => a.type !== 'CREDIT_CARD')}
          onPay={async (fromId, amt, rate) => {
            const debit = rate ? amt * rate : amt;
            const competenceFormatted = dateFns.format(selectedDate, "MMMM/yyyy", { locale: ptBR });
            const capitalizedCompetence = competenceFormatted.charAt(0).toUpperCase() + competenceFormatted.slice(1);
            
            await createTransaction.mutateAsync({
              amount: debit,
              description: `Pagamento Fatura ${selectedCard.name} - ${capitalizedCompetence}`,
              date: formatLocalDate(new Date()),
              competence_date: dateFns.format(selectedDate, "yyyy-MM-01"),
              type: "TRANSFER",
              account_id: fromId,
              destination_account_id: selectedCard.id,
              domain: "PERSONAL",
              currency: rate ? 'BRL' : (selectedCard.currency || 'BRL')
            });
            toastHook({ title: "Fatura paga!" });
            setShowPayDialog(false);
            refetchAccounts();
            refetchTransactions();
          }}
        />

        <TransactionModal isOpen={showTransactionModal} onClose={() => { setShowTransactionModal(false); setEditingTransaction(null); refetchTransactions(); }} initialData={editingTransaction} />

        <DeleteTransactionModal 
          isOpen={deleteConfirm.isOpen} 
          onClose={() => setDeleteConfirm({ isOpen: false, transaction: null })}
          onConfirm={handleDeleteTransaction}
          transaction={deleteConfirm.transaction}
        />

        <Dialog open={showEditCardDialog} onOpenChange={setShowEditCardDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Cartão</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={editCardName} onChange={(e) => setEditCardName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Fechamento</Label><Input type="number" value={editClosingDay} onChange={(e) => setEditClosingDay(e.target.value)} /></div><div className="space-y-2"><Label>Vencimento</Label><Input type="number" value={editDueDay} onChange={(e) => setEditDueDay(e.target.value)} /></div></div>
              <div className="space-y-2"><Label>Limite</Label><Input type="number" value={editLimit} onChange={(e) => setEditLimit(e.target.value)} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowEditCardDialog(false)}>Cancelar</Button><Button onClick={handleEditCard}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteCardConfirm.isOpen} onOpenChange={(open) => !open && setDeleteCardConfirm({ isOpen: false, card: null })}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Remover cartão "{deleteCardConfirm.card?.name}"?</AlertDialogTitle></AlertDialogHeader>
            <div className="flex flex-col gap-3 py-4">
               <Button variant="outline" className="justify-start gap-3" onClick={async () => { if (deleteCardConfirm.card) { await archiveAccountMutation.mutateAsync(deleteCardConfirm.card.id); setDeleteCardConfirm({ isOpen: false, card: null }); } }}><Archive className="h-4 w-4" /> Arquivar (Recomendado)</Button>
               {!deleteCardHasTransactions && (
                 <Button variant="destructive" className="justify-start gap-3" onClick={async () => { if (deleteCardConfirm.card) { await deleteAccountMutation.mutateAsync(deleteCardConfirm.card.id); setDeleteCardConfirm({ isOpen: false, card: null }); setView("list"); refetchAccounts(); } }}><Trash2 className="h-4 w-4" /> Excluir Permanentemente</Button>
               )}
            </div>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tighter">Cartões</h1>
            <p className="text-muted-foreground mt-1 font-medium">Gerencie faturas e limites</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="default" variant="outline" className="gap-2 shadow-sm border-border/80 w-full sm:w-auto h-11">
                  <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem onClick={() => handleExportCards('PDF', 'MONTH')}>
                  Mensal em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCards('CSV', 'MONTH')}>
                  Mensal em Excel (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCards('PDF', 'YEAR')}>
                  Anual em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCards('CSV', 'YEAR')}>
                  Anual em Excel (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="default" onClick={() => setShowNewCardDialog(true)} className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 group w-full sm:w-auto h-11 font-bold">
              <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" /> 
              Novo cartão
            </Button>
          </div>
        </div>
      </div>

      {creditCards.length > 0 ? (
        <>
          <CreditCardSummary totalInvoices={totalInvoices} totalDebt={totalDebt} nextDueDate={nextDueDate} formatCurrency={formatCurrency} onRefresh={() => { refetchAccounts(); refetchTransactions(); }} isLoading={isLoading || transactionsLoading} />
          <div className="space-y-3">
            {creditCards.map((card) => <CreditCardItem key={card.id} card={card} getCardInvoice={getCardInvoice} formatCurrency={formatCurrency} openCardDetail={(c) => { setSelectedCard(c); setView("detail"); }} />)}
          </div>
        </>
      ) : (
        <div className="py-16 text-center border border-dashed border-border rounded-xl">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-lg mb-2">Nenhum cartão cadastrado</h3>
          <Button onClick={() => setShowNewCardDialog(true)} className="mt-4"><Plus className="h-5 w-5 mr-2" /> Novo cartão</Button>
        </div>
      )}

      <ArchivedCardsSection archivedCards={archivedCards} formatCurrency={formatCurrency} onUnarchive={(id) => unarchiveAccountMutation.mutate(id)} isUnarchiving={unarchiveAccountMutation.isPending} />

      <NewCardDialog open={showNewCardDialog} onOpenChange={setShowNewCardDialog} onSubmit={handleCreateCard} isLoading={createAccount.isPending} bankId={newBankId} setBankId={setNewBankId} brand={newBrand} setBrand={setNewBrand} cardName={newCardName} setCardName={setNewCardName} closingDay={newClosingDay} setClosingDay={setNewClosingDay} dueDay={newDueDay} setDueDay={setNewDueDay} limit={newLimit} setLimit={setNewLimit} isInternational={newIsInternational} setIsInternational={setNewIsInternational} currency={newCurrency} setCurrency={setNewCurrency} />
    </div>
  );
}
