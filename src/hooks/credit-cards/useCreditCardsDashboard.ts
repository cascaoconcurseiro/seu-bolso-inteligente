import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useMonth } from "@/contexts/MonthContext";
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useArchiveAccount,
  useArchivedAccounts,
  useUnarchiveAccount,
  useCreditCardInvoice,
  useAccountDependencies,
  useCreditCardClosingOverride,
} from "@/hooks/useAccounts";
import { useDependentTransactions } from "@/hooks/transactions/useDependentTransactions";
import {
  useTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  useBulkCreateTransactions,
} from "@/hooks/useTransactions";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { getInvoiceData, getTargetDate, formatCycleRange } from "@/lib/invoiceUtils";
import { formatDateISO, getMonthDateRange } from "@/utils/dateUtils";
import { getInvoiceData as getInvoiceDataNew } from "@/utils/credit-cards/invoiceData";
import { showActionFeedback } from "@/components/ui/ActionFeedback";
import { useAuth } from "@/contexts/AuthContext";
import { getBankById } from "@/lib/banks";
import { moneyUtils } from "@/utils/money";
import { CascadeDeleteType } from "@/components/modals/DeleteTransactionModal";
import { toast } from "sonner";

export type CardView = "list" | "detail";

export interface CreditCardAccount {
  id: string;
  name: string;
  bank_id: string | null;
  credit_limit: number | null;
  balance: number;
  closing_day: number | null;
  due_day: number | null;
  currency?: string;
  is_international?: boolean;
  user_id?: string;
  is_shared_with_me?: boolean;
}

export function useCreditCardsDashboard() {
  const { user } = useAuth();
  const { currentDate, startDay } = useMonth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<CardView>("list");
  const [selectedCard, setSelectedCard] = useState<CreditCardAccount | null>(null);
  const [showArchiveConfirmModal, setShowArchiveConfirmModal] = useState(false);
  const urlParamsProcessed = useRef(false);
  const [showNewCardDialog, setShowNewCardDialog] = useState(false);

  const { data: exportTransactions = [] } = useTransactions({
    startDate: `${currentDate.getFullYear()}-01-01`,
    endDate: `${currentDate.getFullYear()}-12-31`,
  });

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [showSharingDialog, setShowSharingDialog] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // New Card State
  const [newBankId, setNewBankId] = useState("");
  const [newCustomBankName, setNewCustomBankName] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newCardName, setNewCardName] = useState("");
  const [newClosingDay, setNewClosingDay] = useState("");
  const [newDueDay, setNewDueDay] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [newIsInternational, setNewIsInternational] = useState(false);
  const [newCurrency, setNewCurrency] = useState("USD");

  const { data: accounts = [], isLoading, refetch: refetchAccounts } = useAccounts();

  // Expandir a janela de busca para garantir que compras de meses anteriores
  // que caem na fatura atual sejam incluídas no cálculo da lista de cartões.
  const { startDate, endDate } = getMonthDateRange(currentDate, startDay);
  const extendedStartDate = dateFns.subMonths(new Date(startDate), 2).toISOString();
  const extendedEndDate = dateFns.addMonths(new Date(endDate), 1).toISOString();

  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useTransactions({
    startDate: extendedStartDate,
    endDate: extendedEndDate,
    limit: 5000,
  });

  const creditCards = useMemo(
    () => (accounts || []).filter((acc) => acc.type === "CREDIT_CARD") as CreditCardAccount[],
    [accounts]
  );

  const ownedCardIds = useMemo(
    () => creditCards.filter((c) => !c.is_shared_with_me).map((c) => c.id),
    [creditCards]
  );
  const { data: dependentTransactions = [] } = useDependentTransactions({
    cardIds: ownedCardIds,
    startDate: extendedStartDate,
    endDate: extendedEndDate,
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

  const [deleteCardConfirm, setDeleteCardConfirm] = useState<{
    isOpen: boolean;
    card: CreditCardAccount | null;
  }>({ isOpen: false, card: null });

  const { data: deleteCardDeps } = useAccountDependencies(deleteCardConfirm.card?.id);
  const deleteCardCanDelete = deleteCardDeps?.can_delete === true;

  const { data: selectedCardDeps } = useAccountDependencies(selectedCard?.id);
  const selectedCardCanDelete = selectedCardDeps?.can_delete === true;

  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; transaction: any | null }>({
    isOpen: false,
    transaction: null,
  });
  const [showEditCardDialog, setShowEditCardDialog] = useState(false);

  const [editCardName, setEditCardName] = useState("");
  const [editCardColor, setEditCardColor] = useState("");
  const [editClosingDay, setEditClosingDay] = useState("");
  const [editDueDay, setEditDueDay] = useState("");
  const [editLimit, setEditLimit] = useState("");
  const [editBankId, setEditBankId] = useState("");
  const [editCustomBankName, setEditCustomBankName] = useState("");

  useEffect(() => {
    if (selectedCard) {
      if (urlParamsProcessed.current) {
        urlParamsProcessed.current = false;
        return;
      }
      setSelectedDate(getTargetDate(new Date(), selectedCard.closing_day || 1));
    }
  }, [selectedCard]);

  const { data: invoiceDataRPC, isFetching: invoiceFetching } = useCreditCardInvoice(
    selectedCard?.id || null,
    dateFns.format(dateFns.startOfMonth(selectedDate), "yyyy-MM-dd"),
    dateFns.format(dateFns.endOfMonth(selectedDate), "yyyy-MM-dd")
  );

  useEffect(() => {
    const cardId = searchParams.get("cardId");
    const invoiceDateParam = searchParams.get("invoiceDate") || searchParams.get("month");

    if (
      cardId &&
      accounts.length > 0 &&
      (!selectedCard || selectedCard.id !== cardId || invoiceDateParam)
    ) {
      const card = accounts.find((a) => a.id === cardId);
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
  }, [searchParams, accounts, selectedCard, setSearchParams]);

  const { data: closingOverride } = useCreditCardClosingOverride(
    selectedCard?.id || null,
    dateFns.format(dateFns.startOfMonth(selectedDate), "yyyy-MM-dd")
  );

  const invoiceData = useMemo(() => {
    if (!selectedCard) return null;
    const baseData = getInvoiceData(
      { ...selectedCard, closing_date_override: closingOverride },
      transactions,
      selectedDate
    );
    if (invoiceDataRPC) {
      return {
        ...baseData,
        invoiceTotal: Number(invoiceDataRPC.total) || 0,
        transactions: invoiceDataRPC.transactions || [],
      };
    }
    return baseData;
  }, [selectedCard, invoiceDataRPC, transactions, selectedDate, closingOverride]);

  const getCardInvoice = useCallback(
    (card: CreditCardAccount) => {
      const targetDate = getTargetDate(new Date(), card.closing_day || 1);
      const data = getInvoiceData(card, transactions, targetDate);

      if (data.status === "OPEN") {
        const prevDate = dateFns.subMonths(targetDate, 1);
        const prevData = getInvoiceData(card, transactions, prevDate);
        if (prevData.status === "CLOSED" && prevData.invoiceTotal > 0.01) {
          return {
            value: prevData.invoiceTotal,
            dueDate: prevData.dueDate,
            status: prevData.status,
          };
        }
      }

      return { value: data.invoiceTotal, dueDate: data.dueDate, status: data.status };
    },
    [transactions]
  );

  const getCardInstallments = (invoiceTxs: any[]) =>
    invoiceTxs
      .filter((t) => t.is_installment)
      .map((t) => ({
        id: t.id,
        description: t.description,
        current: t.current_installment || 1,
        total: t.total_installments || 1,
        value: t.amount,
      }));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getDaysUntilDue = (dueDate: Date) =>
    Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const handleCreateCard = async () => {
    if (!newCardName.trim()) {
      toast.error("O nome do cartão é obrigatório");
      return;
    }
    const isCustom =
      newBankId === "default" || newBankId === "default_international" || newBankId === "other";
    const finalBankId =
      isCustom && newCustomBankName.trim() ? `custom:${newCustomBankName.trim()}` : newBankId;

    await createAccount.mutateAsync({
      name: newCardName.trim(),
      type: "CREDIT_CARD",
      bank_id: finalBankId || null,
      credit_limit: moneyUtils.parse(newLimit) || 0,
      closing_day: parseInt(newClosingDay) || undefined,
      due_day: parseInt(newDueDay) || undefined,
      is_international: newIsInternational,
      currency: newIsInternational ? newCurrency : "BRL",
    });
    setShowNewCardDialog(false);
    resetNewCardForm();
  };

  const resetNewCardForm = () => {
    setNewBankId("");
    setNewCustomBankName("");
    setNewBrand("");
    setNewCardName("");
    setNewClosingDay("");
    setNewDueDay("");
    setNewLimit("");
    setNewIsInternational(false);
    setNewCurrency("USD");
  };

  const totalInvoices = useMemo(
    () => creditCards.reduce((sum, card) => sum + getCardInvoice(card).value, 0),
    [creditCards, getCardInvoice]
  );

  const totalDebt = useMemo(() => {
    return creditCards.reduce((accTotal, card) => {
      const balanceVal = Number(card.balance) || 0;
      return accTotal + (balanceVal < 0 ? Math.abs(balanceVal) : 0);
    }, 0);
  }, [creditCards]);

  const nextDueDate = useMemo(() => {
    if (creditCards.length === 0) return 0;
    return Math.min(...creditCards.map((card) => getDaysUntilDue(getCardInvoice(card).dueDate)));
  }, [creditCards, getCardInvoice]);

  const handleDeleteTransaction = async (cascadeType: CascadeDeleteType) => {
    if (!deleteConfirm.transaction) return;
    showActionFeedback("success");
    setTimeout(() => {
      setDeleteConfirm({ isOpen: false, transaction: null });
    }, 80);
    deleteTransaction.mutate({
      id: deleteConfirm.transaction.id,
      cascadeType,
    });
    refetchTransactions();
  };

  const handleEditCard = async () => {
    if (!selectedCard) return;
    const isCustom = editBankId === "default" || editBankId === "other";
    const finalBankId =
      isCustom && editCustomBankName.trim() ? `custom:${editCustomBankName.trim()}` : editBankId;

    showActionFeedback("success");
    setTimeout(() => {
      setShowEditCardDialog(false);
    }, 80);

    updateAccount.mutate({
      id: selectedCard.id,
      name: editCardName,
      closing_day: editClosingDay ? parseInt(editClosingDay) : null,
      due_day: editDueDay ? parseInt(editDueDay) : null,
      credit_limit: editLimit ? moneyUtils.parse(editLimit) : null,
      bank_color: editCardColor,
      bank_id: finalBankId || null,
    });
    refetchAccounts();
  };

  const handleExportCards = async (formatType: "PDF" | "CSV", period: "MONTH" | "YEAR") => {
    const { exportCardsToCSV, exportCardsToPDF } = await import("@/utils/exportData");
    let filteredTxs = exportTransactions;
    let periodLabel = `${currentDate.getFullYear()}`;

    if (period === "MONTH") {
      const startOfM = dateFns.startOfMonth(currentDate);
      const endOfM = dateFns.endOfMonth(currentDate);
      filteredTxs = exportTransactions.filter((t) => {
        const d = new Date(t.date);
        return d >= startOfM && d <= endOfM;
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
      periodLabel = `Ano ${currentDate.getFullYear()}`;
    }

    const totalLimit = creditCards.reduce((sum, c) => sum + (Number(c.credit_limit) || 0), 0);
    const totalInvoicesVal = creditCards.reduce((sum, card) => sum + getCardInvoice(card).value, 0);

    if (formatType === "PDF") {
      exportCardsToPDF(filteredTxs, creditCards, periodLabel, totalLimit, totalInvoicesVal);
    } else {
      exportCardsToCSV(filteredTxs, creditCards, periodLabel);
    }
  };

  const handlePayInvoice = async (fromId: string, amt: number, rate?: number): Promise<boolean> => {
    if (!selectedCard || !invoiceData) return false;
    const debit = rate ? amt * rate : amt;
    const competenceFormatted = dateFns.format(selectedDate, "MMMM/yyyy", { locale: ptBR });
    const capitalizedCompetence =
      competenceFormatted.charAt(0).toUpperCase() + competenceFormatted.slice(1);

    try {
      await createTransaction.mutateAsync({
        amount: debit,
        description: `Pagamento Fatura ${selectedCard.name} - ${capitalizedCompetence}`,
        date: formatDateISO(new Date()),
        competence_date: dateFns.format(selectedDate, "yyyy-MM-01"),
        type: "TRANSFER",
        account_id: fromId,
        destination_account_id: selectedCard.id,
        domain: "PERSONAL",
        currency: rate ? "BRL" : selectedCard.currency || "BRL",
      });

      // Rotative Logic (Partial Payment)
      const remaining = invoiceData.invoiceTotal - amt;
      if (remaining > 0.01) {
        const nextMonth = dateFns.addMonths(selectedDate, 1);

        await createTransaction.mutateAsync({
          amount: remaining,
          description: `Estorno Saldo Rotativo Fatura ${capitalizedCompetence}`,
          date: formatDateISO(new Date()),
          competence_date: dateFns.format(selectedDate, "yyyy-MM-01"),
          type: "TRANSFER",
          account_id: selectedCard.id,
          destination_account_id: selectedCard.id,
          domain: "PERSONAL",
          currency: selectedCard.currency || "BRL",
        });

        await createTransaction.mutateAsync({
          amount: remaining,
          description: `Saldo Rotativo Fatura Anterior (${capitalizedCompetence})`,
          date: formatDateISO(new Date()),
          competence_date: dateFns.format(nextMonth, "yyyy-MM-01"),
          type: "TRANSFER",
          account_id: selectedCard.id,
          destination_account_id: selectedCard.id,
          domain: "PERSONAL",
          currency: selectedCard.currency || "BRL",
        });
      }

      showActionFeedback("success");
      setShowPayDialog(false);
      refetchAccounts();
      refetchTransactions();
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      return true;
    } catch (err: any) {
      const msg = err?.message || "Erro desconhecido";
      toast.error(`Erro ao processar pagamento: ${msg}`);
      return false;
    }
  };

  return {
    user,
    accounts,
    view,
    setView,
    selectedCard,
    setSelectedCard,
    showArchiveConfirmModal,
    setShowArchiveConfirmModal,
    showNewCardDialog,
    setShowNewCardDialog,
    showImportDialog,
    setShowImportDialog,
    showPayDialog,
    setShowPayDialog,
    showSharingDialog,
    setShowSharingDialog,
    showTransactionModal,
    setShowTransactionModal,
    selectedDate,
    setSelectedDate,

    newBankId,
    setNewBankId,
    newCustomBankName,
    setNewCustomBankName,
    newBrand,
    setNewBrand,
    newCardName,
    setNewCardName,
    newClosingDay,
    setNewClosingDay,
    newDueDay,
    setNewDueDay,
    newLimit,
    setNewLimit,
    newIsInternational,
    setNewIsInternational,
    newCurrency,
    setNewCurrency,

    isLoading,
    transactionsLoading,
    creditCards,
    archivedCards,

    createAccount,
    archiveAccountMutation,
    unarchiveAccountMutation,
    deleteAccountMutation,
    bulkCreateTransactions,

    deleteCardConfirm,
    setDeleteCardConfirm,
    deleteCardCanDelete,
    selectedCardCanDelete,

    editingTransaction,
    setEditingTransaction,
    deleteConfirm,
    setDeleteConfirm,

    showEditCardDialog,
    setShowEditCardDialog,
    editCardName,
    setEditCardName,
    editCardColor,
    setEditCardColor,
    editClosingDay,
    setEditClosingDay,
    editDueDay,
    setEditDueDay,
    editLimit,
    setEditLimit,
    editBankId,
    setEditBankId,
    editCustomBankName,
    setEditCustomBankName,

    invoiceData,
    invoiceFetching,

    getCardInvoice,
    getCardInstallments,
    formatCurrency,
    getDaysUntilDue,

    handleCreateCard,
    handleDeleteTransaction,
    handleEditCard,
    handleExportCards,
    handlePayInvoice,

    totalInvoices,
    totalDebt,
    nextDueDate,
    exportTransactions,
    closingOverride,

    refetchAccounts,
    refetchTransactions,
  };
}
