import { NewCardDialog } from "@/components/credit-cards/NewCardDialog";
import { ImportBillsDialog } from "@/components/credit-cards/ImportBillsDialog";
import { PayInvoiceDialog } from "@/components/credit-cards/PayInvoiceDialog";
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { TransactionModal } from "@/components/modals/TransactionModal";
import {
  CreditCard,
  Plus,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Download,
  Wallet,
  Calendar,
  DollarSign,
  X,
  Save,
  Globe,
  MoreHorizontal,
  Pencil,
  Trash2,
  Settings,
  Archive,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { banks, cardBrands, getBankById, internationalBanks } from "@/lib/banks";
import { BankIcon, CardBrandIcon } from "@/components/financial/BankIcon";
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useArchiveAccount, useArchivedAccounts, useUnarchiveAccount } from "@/hooks/useAccounts";
import { useTransactions, useCreateTransaction, useDeleteTransaction } from "@/hooks/useTransactions";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getInvoiceData, getTargetDate, formatCycleRange, formatLocalDate } from "@/lib/invoiceUtils";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";

// Lista de moedas para cartões internacionais
const currencies = [
  { value: "USD", label: "USD - Dólar Americano", symbol: "$" },
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "GBP", label: "GBP - Libra Esterlina", symbol: "£" },
  { value: "CAD", label: "CAD - Dólar Canadense", symbol: "C$" },
  { value: "AUD", label: "AUD - Dólar Australiano", symbol: "A$" },
  { value: "JPY", label: "JPY - Iene Japonês", symbol: "¥" },
  { value: "CHF", label: "CHF - Franco Suíço", symbol: "CHF" },
];

type CardView = "list" | "detail";

interface CreditCardAccount {
  id: string;
  name: string;
  bank_id: string | null;
  credit_limit: number | null;
  balance: number;
  closing_day: number | null;
  due_day: number | null;
}

export function CreditCards() {
  const [view, setView] = useState<CardView>("list");
  const [selectedCard, setSelectedCard] = useState<CreditCardAccount | null>(null);
  const [showNewCardDialog, setShowNewCardDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();
  
  // Invoice navigation
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  
  // Form state
  const [newBankId, setNewBankId] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newCardName, setNewCardName] = useState("");
  const [newClosingDay, setNewClosingDay] = useState("");
  const [newDueDay, setNewDueDay] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [newIsInternational, setNewIsInternational] = useState(false);
  const [newCurrency, setNewCurrency] = useState("USD");

  const { data: accounts = [], isLoading, refetch: refetchAccounts } = useAccounts();
  const { data: transactions = [], refetch: refetchTransactions } = useTransactions();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();
  const archiveAccountMutation = useArchiveAccount();
  const { data: archivedCards = [] } = useArchivedAccounts();
  const unarchiveAccountMutation = useUnarchiveAccount();
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const { toast: toastHook } = useToast();

  // Edit/Delete transaction state
  const [editingTransaction, setEditingTransaction] = useState<unknown>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; transaction: unknown | null }>({
    isOpen: false,
    transaction: null,
  });

  // Edit/Delete card state
  const [showEditCardDialog, setShowEditCardDialog] = useState(false);
  const [deleteCardConfirm, setDeleteCardConfirm] = useState<{ isOpen: boolean; card: CreditCardAccount | null }>({
    isOpen: false,
    card: null,
  });
  const [editCardName, setEditCardName] = useState("");
  const [editClosingDay, setEditClosingDay] = useState("");
  const [editDueDay, setEditDueDay] = useState("");
  const [editLimit, setEditLimit] = useState("");

  // Filter credit cards
  const creditCards = (accounts || []).filter(acc => acc.type === "CREDIT_CARD") as CreditCardAccount[];

  // Update selected date when card changes
  useEffect(() => {
    if (selectedCard) {
      setSelectedDate(getTargetDate(new Date(), selectedCard.closing_day || 1));
    }
  }, [selectedCard]);

  // Get invoice data for selected card
  const invoiceData = useMemo(() => {
    if (!selectedCard) return null;
    return getInvoiceData(selectedCard, transactions, selectedDate);
  }, [selectedCard, transactions, selectedDate]);

  // Get transactions for a specific card (for list view summary)
  const getCardTransactions = (cardId: string) => {
    return transactions.filter(t => t.account_id === cardId && t.type === "EXPENSE");
  };

  // Calculate current invoice for list view
  const getCardInvoice = (card: CreditCardAccount) => {
    const targetDate = getTargetDate(new Date(), card.closing_day || 1);
    const data = getInvoiceData(card, transactions, targetDate);
    return { value: data.invoiceTotal, dueDate: data.dueDate };
  };

  // Get installments for a card
  const getCardInstallments = (cardId: string) => {
    return transactions.filter(
      t => t.account_id === cardId && t.is_installment && t.total_installments
    ).map(t => ({
      id: t.id,
      description: t.description,
      current: t.current_installment || 1,
      total: t.total_installments || 1,
      value: t.amount,
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const openCardDetail = (card: CreditCardAccount) => {
    setSelectedCard(card);
    setView("detail");
  };

  const goBack = () => {
    setView("list");
    setSelectedCard(null);
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedDate(newDate);
  };

  const handleCreateCard = async () => {
    const bank = getBankById(newBankId);
    const cardName = newCardName.trim() || bank.name;
    await createAccount.mutateAsync({
      name: cardName,
      type: "CREDIT_CARD",
      bank_id: newBankId,
      credit_limit: parseFloat(newLimit) || 0,
      closing_day: parseInt(newClosingDay) || null,
      due_day: parseInt(newDueDay) || null,
      is_international: newIsInternational,
      currency: newIsInternational ? newCurrency : 'BRL',
    });
    setShowNewCardDialog(false);
    setNewBankId("");
    setNewBrand("");
    setNewCardName("");
    setNewClosingDay("");
    setNewDueDay("");
    setNewLimit("");
    setNewIsInternational(false);
    setNewCurrency("USD");
  };

  const totalInvoices = creditCards.reduce((sum, card) => sum + getCardInvoice(card).value, 0);
  const nextDueDate = creditCards.length > 0 
    ? Math.min(...creditCards.map(card => getDaysUntilDue(getCardInvoice(card).dueDate)))
    : 0;

  // Edit/Delete handlers
  const handleEditTransaction = (tx: unknown) => {
    setEditingTransaction(tx);
    setShowTransactionModal(true);
  };

  const handleDeleteTransaction = async () => {
    const tx = deleteConfirm.transaction;
    if (!tx) return;

    try {
      await deleteTransaction.mutateAsync(tx.id);
      toast.success("Transação excluída com sucesso!");
      setDeleteConfirm({ isOpen: false, transaction: null });
      refetchTransactions();
    } catch (error) {
      toast.error("Erro ao excluir transação");
    }
  };

  // Card edit/delete handlers
  const openEditCardDialog = (card: CreditCardAccount) => {
    setEditCardName(card.name);
    setEditClosingDay(card.closing_day?.toString() || "");
    setEditDueDay(card.due_day?.toString() || "");
    setEditLimit(card.credit_limit?.toString() || "");
    setShowEditCardDialog(true);
  };

  const handleEditCard = async () => {
    if (!selectedCard) return;

    try {
      await updateAccount.mutateAsync({
        id: selectedCard.id,
        name: editCardName,
        closing_day: editClosingDay ? parseInt(editClosingDay) : null,
        due_day: editDueDay ? parseInt(editDueDay) : null,
        credit_limit: editLimit ? parseFloat(editLimit) : null,
      });
      toast.success("Cartão atualizado com sucesso!");
      setShowEditCardDialog(false);
      refetchAccounts();
      // Atualizar o cartão selecionado
      setSelectedCard(prev => prev ? {
        ...prev,
        name: editCardName,
        closing_day: editClosingDay ? parseInt(editClosingDay) : null,
        due_day: editDueDay ? parseInt(editDueDay) : null,
        credit_limit: editLimit ? parseFloat(editLimit) : null,
      } : null);
    } catch (error) {
      toast.error("Erro ao atualizar cartão");
    }
  };

  const handleDeleteCard = async () => {
    const card = deleteCardConfirm.card;
    if (!card) return;

    try {
      await deleteAccountMutation.mutateAsync(card.id);
      toast.success("Cartão excluído com sucesso!");
      setDeleteCardConfirm({ isOpen: false, card: null });
      goBack();
      refetchAccounts();
    } catch (error: unknown) {
      toast.error(error.message || "Erro ao excluir cartão");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="h-12 w-48 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Detail View
  if (view === "detail" && selectedCard && invoiceData) {
    const daysUntilDue = getDaysUntilDue(invoiceData.dueDate);
    const usagePercent = selectedCard.credit_limit 
      ? (invoiceData.invoiceTotal / selectedCard.credit_limit) * 100 
      : 0;
    const bank = getBankById(selectedCard.bank_id);
    const installments = getCardInstallments(selectedCard.id);
    const monthName = format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });
    const cycleRange = formatCycleRange(invoiceData.startDate, invoiceData.closingDate);

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goBack} 
            className="rounded-full transition-transform hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4 flex-1">
            <BankIcon bankId={selectedCard.bank_id} accountName={selectedCard.name} size="lg" />
            <div>
              <h1 className="font-display font-bold text-2xl tracking-tight">{selectedCard.name}</h1>
            </div>
          </div>
          {/* Menu de ações do cartão */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditCardDialog(selectedCard)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar Cartão
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setDeleteCardConfirm({ isOpen: true, card: selectedCard })}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Cartão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => changeMonth(-1)}
            className="rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h3 className="font-display font-semibold text-lg capitalize">
              Fatura de {monthName}
            </h3>
            <p className="text-sm text-muted-foreground">Ciclo: {cycleRange}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => changeMonth(1)}
            className="rounded-full"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Current Invoice Card */}
        <div 
          className="p-6 rounded-2xl text-white transition-all hover:shadow-lg relative overflow-hidden"
          style={{ backgroundColor: bank.color }}
        >
          {/* Status Bar */}
          <div className={cn(
            "absolute top-0 left-0 right-0 h-1",
            invoiceData.status === 'CLOSED' ? "bg-red-500" : "bg-blue-400"
          )} />
          
          <div className="flex items-start justify-between mb-4">
            <span className={cn(
              "text-xs px-2 py-1 rounded-full font-medium",
              invoiceData.status === 'CLOSED' 
                ? "bg-red-500/30 text-red-100" 
                : "bg-blue-400/30 text-blue-100"
            )}>
              {invoiceData.status === 'CLOSED' ? '🔴 FECHADA' : '🔵 ABERTA'}
            </span>
          </div>
          
          <p className="text-sm opacity-80 mb-1">Valor da Fatura</p>
          <p className="font-display font-bold text-4xl tracking-tight">
            {formatCurrency(invoiceData.invoiceTotal)}
          </p>
          
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm opacity-80">
              {invoiceData.status === 'OPEN' 
                ? `Fecha em ${invoiceData.daysToClose} dias`
                : `Vence ${format(invoiceData.dueDate, "dd 'de' MMMM", { locale: ptBR })}`
              }
            </p>
            <span className="text-xs px-2 py-1 rounded-full bg-white/20">
              {daysUntilDue > 0 ? `${daysUntilDue} dias` : "Vencida"}
            </span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => setShowPayDialog(true)}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Pagar Fatura
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => setShowImportDialog(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </div>
        </div>

        {/* Limit Usage */}
        {selectedCard.credit_limit && selectedCard.credit_limit > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Limite utilizado</span>
              <span className="font-mono">{usagePercent.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(usagePercent, 100)}%`,
                  backgroundColor: usagePercent > 80 
                    ? 'hsl(var(--negative))' 
                    : usagePercent > 50 
                      ? 'hsl(var(--warning))' 
                      : bank.color 
                }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatCurrency(invoiceData.invoiceTotal)} usado</span>
              <span>{formatCurrency(selectedCard.credit_limit)} limite</span>
            </div>
          </div>
        )}

        {/* Transactions List */}
        {invoiceData.transactions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Lançamentos ({invoiceData.transactions.length})
            </h2>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {invoiceData.transactions.map((tx, index) => (
                <div 
                  key={tx.id} 
                  className={cn(
                    "group flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors",
                    index !== invoiceData.transactions.length - 1 && "border-b border-border"
                  )}
                >
                  {/* Ícone da categoria */}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0",
                    tx.type === "INCOME" ? "bg-positive/10" : "bg-muted"
                  )}>
                    {tx.category?.icon || (tx.type === "INCOME" ? "💰" : "💸")}
                  </div>
                  
                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{tx.description}</p>
                      {tx.is_installment && tx.current_installment && tx.total_installments && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-medium">
                          {tx.current_installment}/{tx.total_installments}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap mt-1">
                      <span className="truncate">{tx.category?.name || "Sem categoria"}</span>
                      <span>·</span>
                      <span>{format(new Date(tx.date + 'T00:00:00'), "dd/MM/yyyy")}</span>
                    </div>
                  </div>
                  
                  {/* Valor e ações */}
                  <div className="flex items-start gap-3 shrink-0 pt-0.5">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={cn(
                        "font-mono font-medium text-right whitespace-nowrap",
                        tx.type === "INCOME" ? "text-positive" : "text-negative"
                      )}>
                        {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                        tx.type === "INCOME" ? "text-positive" : "text-negative"
                      )}>
                        {tx.type === "INCOME" ? "Crédito" : "Débito"}
                      </span>
                    </div>
                    
                    {/* Menu de ações */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTransaction(tx)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteConfirm({ isOpen: true, transaction: tx })}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {invoiceData.transactions.length === 0 && (
          <div className="py-12 text-center border border-dashed border-border rounded-xl">
            <CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum lançamento nesta fatura</p>
          </div>
        )}

        {/* Installments */}
        {installments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Parcelas ativas ({installments.length})
            </h2>
            <div className="space-y-3">
              {installments.map((inst) => (
                <div 
                  key={inst.id} 
                  className="p-4 rounded-xl border border-border transition-all duration-200 hover:border-foreground/20"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium">{inst.description}</p>
                    <span className="font-mono text-sm">{formatCurrency(inst.value)}/mês</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(inst.current / inst.total) * 100}%`,
                          backgroundColor: bank.color 
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {inst.current}/{inst.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card Info */}
        <div className="p-4 rounded-xl border border-border">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">
            Informações
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Fechamento</p>
              <p className="font-medium">Dia {selectedCard.closing_day || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Vencimento</p>
              <p className="font-medium">Dia {selectedCard.due_day || "-"}</p>
            </div>
          </div>
        </div>

        {/* Import Dialog */}
        <ImportBillsDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          account={selectedCard}
          onImport={async (txs) => {
            for (const tx of txs) {
              await createTransaction.mutateAsync(tx as unknown);
            }
            toastHook({ title: "Faturas importadas com sucesso!" });
            setShowImportDialog(false);
          }}
        />

        {/* Pay Invoice Dialog */}
        <PayInvoiceDialog
          isOpen={showPayDialog}
          onClose={() => setShowPayDialog(false)}
          card={selectedCard}
          invoiceTotal={invoiceData.invoiceTotal}
          accounts={(accounts || []).filter(a => a.type !== 'CREDIT_CARD')}
          onPay={async (fromAccountId) => {
            await createTransaction.mutateAsync({
              amount: invoiceData.invoiceTotal,
              description: `Pagamento Fatura - ${format(selectedDate, "MMMM yyyy", { locale: ptBR })}`,
              date: formatLocalDate(new Date()),
              type: "TRANSFER",
              account_id: fromAccountId,
              destination_account_id: selectedCard.id,
              domain: "PERSONAL",
            });
            toastHook({ title: "Fatura paga com sucesso!" });
            setShowPayDialog(false);
          }}
        />

        {/* Transaction Modal for editing */}
        <TransactionModal
          isOpen={showTransactionModal}
          onClose={() => {
            setShowTransactionModal(false);
            setEditingTransaction(null);
            refetchTransactions();
          }}
          initialData={editingTransaction}
        />

        {/* Delete Transaction Confirm */}
        <AlertDialog open={deleteConfirm.isOpen} onOpenChange={(open) => !open && setDeleteConfirm({ isOpen: false, transaction: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{deleteConfirm.transaction?.description}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTransaction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Card Dialog */}
        <Dialog open={showEditCardDialog} onOpenChange={setShowEditCardDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Cartão</DialogTitle>
              <DialogDescription>Altere as informações do cartão</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do cartão</Label>
                <Input 
                  value={editCardName}
                  onChange={(e) => setEditCardName(e.target.value)}
                  placeholder="Nome do cartão"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dia de Fechamento</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={31}
                    value={editClosingDay}
                    onChange={(e) => setEditClosingDay(e.target.value)}
                    placeholder="20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dia de Vencimento</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={31}
                    value={editDueDay}
                    onChange={(e) => setEditDueDay(e.target.value)}
                    placeholder="28"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Limite</Label>
                <Input 
                  type="number"
                  value={editLimit}
                  onChange={(e) => setEditLimit(e.target.value)}
                  placeholder="10000"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditCardDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditCard} disabled={updateAccount.isPending}>
                {updateAccount.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Card Confirm */}
        <Dialog open={deleteCardConfirm.isOpen} onOpenChange={(open) => !open && setDeleteCardConfirm({ isOpen: false, card: null })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Remover cartão "{deleteCardConfirm.card?.name}"?</DialogTitle>
              <DialogDescription className="space-y-4 pt-4">
                <p className="text-sm">
                  Escolha como deseja remover este cartão:
                </p>
                
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-start gap-3">
                      <Archive className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                          Arquivar (Recomendado)
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          • O cartão não aparecerá mais nos formulários<br />
                          • Todas as transações serão preservadas<br />
                          • Histórico mantido para relatórios
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-start gap-3">
                      <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium text-sm text-red-900 dark:text-red-100">
                          Excluir Permanentemente
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300">
                          • O cartão será removido do sistema<br />
                          • Todas as transações serão deletadas<br />
                          • Esta ação não pode ser desfeita
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setDeleteCardConfirm({ isOpen: false, card: null })}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                variant="outline"
                onClick={async () => {
                  if (deleteCardConfirm.card) {
                    await archiveAccountMutation.mutateAsync(deleteCardConfirm.card.id);
                    setDeleteCardConfirm({ isOpen: false, card: null });
                  }
                }}
                className="w-full sm:w-auto gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/20"
                disabled={archiveAccountMutation.isPending}
              >
                <Archive className="h-4 w-4" />
                {archiveAccountMutation.isPending ? "Arquivando..." : "Arquivar"}
              </Button>
              <Button 
                variant="destructive"
                onClick={async () => {
                  await handleDeleteCard();
                  setDeleteCardConfirm({ isOpen: false, card: null });
                }}
                className="w-full sm:w-auto gap-2"
                disabled={deleteAccountMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                {deleteAccountMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Empty State
  if (creditCards.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl tracking-tight">Cartões</h1>
            <p className="text-muted-foreground mt-1">Gerencie faturas e parcelas</p>
          </div>
        </div>

        <div className="py-16 text-center border border-dashed border-border rounded-xl">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-lg mb-2">Nenhum cartão cadastrado</h3>
          <p className="text-muted-foreground mb-6">Adicione seu primeiro cartão de crédito</p>
          <Button onClick={() => setShowNewCardDialog(true)} className="h-11 md:h-10">
            <Plus className="h-5 w-5 md:mr-2" />
            <span className="hidden md:inline">Novo cartão</span>
            <span className="md:hidden">Novo</span>
          </Button>
        </div>

        <NewCardDialog
          open={showNewCardDialog}
          onOpenChange={setShowNewCardDialog}
          onSubmit={handleCreateCard}
          isLoading={createAccount.isPending}
          bankId={newBankId}
          setBankId={setNewBankId}
          brand={newBrand}
          setBrand={setNewBrand}
          cardName={newCardName}
          setCardName={setNewCardName}
          closingDay={newClosingDay}
          setClosingDay={setNewClosingDay}
          dueDay={newDueDay}
          setDueDay={setNewDueDay}
          limit={newLimit}
          setLimit={setNewLimit}
          isInternational={newIsInternational}
          setIsInternational={setNewIsInternational}
          currency={newCurrency}
          setCurrency={setNewCurrency}
        />
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Cartões</h1>
          <p className="text-muted-foreground mt-1">Gerencie faturas e parcelas</p>
        </div>
        <Button 
          size="lg" 
          onClick={() => setShowNewCardDialog(true)}
          className="group transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-5 w-5 mr-2 transition-transform group-hover:rotate-90" />
          Novo cartão
        </Button>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-8 py-4 border-y border-border">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Faturas abertas</p>
          <p className="font-mono text-2xl font-bold">{formatCurrency(totalInvoices)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Próximo venc.</p>
          <p className="font-display text-lg font-semibold">
            {nextDueDate > 0 ? `${nextDueDate} dias` : "Hoje"}
          </p>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {creditCards.map((card) => {
          const invoice = getCardInvoice(card);
          const daysUntilDue = getDaysUntilDue(invoice.dueDate);
          const installments = getCardInstallments(card.id);
          const bank = getBankById(card.bank_id);
          // Simulated last 4 digits - in production would come from database
          const last4Digits = "4532";
          // Simulated brand - in production would come from database
          const cardBrand = card.bank_id === "nubank" || card.bank_id === "inter" ? "mastercard" : "visa";
          
          return (
            <div
              key={card.id}
              onClick={() => openCardDetail(card)}
              className="group p-5 rounded-xl border border-border hover:border-foreground/20 
                         transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <BankIcon 
                    bankId={card.bank_id}
                    accountName={card.name}
                    size="lg" 
                    className="transition-transform duration-200 group-hover:scale-110" 
                  />
                  <div>
                    <p className="font-display font-semibold text-lg">{card.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>•••• {last4Digits}</span>
                      <CardBrandIcon brand={cardBrand} size="sm" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono font-semibold">{formatCurrency(invoice.value)}</p>
                    <p className="text-xs text-muted-foreground">
                      {daysUntilDue > 0 ? `${daysUntilDue} dias` : "Vencida"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground 
                                           transition-all group-hover:translate-x-1" />
                </div>
              </div>
              
              {installments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
                  <span className="text-primary">{installments.length} parcelas ativas</span>
                  <span className="font-mono text-primary">
                    {formatCurrency(installments.reduce((sum, i) => sum + i.value, 0))}/mês
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Archived Cards Section */}
      {archivedCards.filter(c => c.type === 'CREDIT_CARD').length > 0 && (
        <div className="space-y-4">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Cartões Arquivados ({archivedCards.filter(c => c.type === 'CREDIT_CARD').length})
              </span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              {archivedCards.filter(c => c.type === 'CREDIT_CARD').map((card) => {
                const bank = getBankById(card.bank_id);
                return (
                  <div
                    key={card.id}
                    className="p-4 rounded-xl border border-border bg-muted/30"
                    style={{ borderColor: bank.color + '40' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <BankIcon bankId={card.bank_id} accountName={card.name} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{card.name}</p>
                          <p className="text-xs text-muted-foreground">Cartão de Crédito</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Saldo:</span>
                        <span className="font-mono text-sm font-semibold text-destructive">
                          {formatCurrency(Math.abs(Number(card.balance)))}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unarchiveAccountMutation.mutate(card.id)}
                        disabled={unarchiveAccountMutation.isPending}
                        className="w-full gap-2"
                      >
                        <RotateCcw className="h-3 w-3" />
                        {unarchiveAccountMutation.isPending ? "Desarquivando..." : "Desarquivar"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </div>
      )}

      <NewCardDialog
        open={showNewCardDialog}
        onOpenChange={setShowNewCardDialog}
        onSubmit={handleCreateCard}
        isLoading={createAccount.isPending}
        bankId={newBankId}
        setBankId={setNewBankId}
        brand={newBrand}
        setBrand={setNewBrand}
        cardName={newCardName}
        setCardName={setNewCardName}
        closingDay={newClosingDay}
        setClosingDay={setNewClosingDay}
        dueDay={newDueDay}
        setDueDay={setNewDueDay}
        limit={newLimit}
        setLimit={setNewLimit}
        isInternational={newIsInternational}
        setIsInternational={setNewIsInternational}
        currency={newCurrency}
        setCurrency={setNewCurrency}
      />
    </div>
  );
}

