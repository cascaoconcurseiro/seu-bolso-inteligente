import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  useAccounts,
  useDeleteAccount,
  useUpdateAccount,
  useArchiveAccount,
  useUnarchiveAccount,
  useAccountDependencies,
} from "@/hooks/useAccounts";
import { useAccountStatement } from "@/hooks/useAccountStatement";
import { useDeleteTransaction } from "@/hooks/useTransactions";
import { DeleteTransactionModal } from "@/components/modals/DeleteTransactionModal";
import { ArchiveConfirmModal } from "@/components/modals/ArchiveConfirmModal";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBankById } from "@/lib/banks";
import { TransferModal } from "@/components/accounts/TransferModal";
import { WithdrawalModal } from "@/components/accounts/WithdrawalModal";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { AccountDeleteArchiveModal } from "@/components/modals/AccountDeleteArchiveModal";
import { AccountFormModal } from "@/components/accounts/AccountFormModal";
import { AccountHeader } from "@/components/accounts/AccountHeader";
import { AccountBalanceCard } from "@/components/accounts/AccountBalanceCard";
import { AccountStatement } from "@/components/accounts/AccountStatement";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { showActionFeedback } from "@/components/ui/ActionFeedback";
import { useMonth } from "@/contexts/MonthContext";
import { format } from "date-fns";
import { logger } from "@/utils/logger";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";

export function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentDate } = useMonth();
  const { data: accounts = [] } = useAccounts();

  const { data: statementData, refetch: refetchStatement } = useAccountStatement({
    accountId: id || "",
  });

  const deleteAccount = useDeleteAccount();
  const archiveAccount = useArchiveAccount();
  const unarchiveAccount = useUnarchiveAccount();
  const updateAccount = useUpdateAccount();
  const deleteTransaction = useDeleteTransaction();
  const { data: dependencies } = useAccountDependencies(id);
  const canDelete = dependencies?.can_delete === true;

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showArchiveConfirmModal, setShowArchiveConfirmModal] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; transaction: any | null }>({
    isOpen: false,
    transaction: null,
  });

  const account = accounts.find((a) => a.id === id);
  const transactions = statementData?.transactions || [];
  const openingBalance = statementData?.openingBalance ?? 0;
  const closingBalance = statementData?.closingBalance ?? 0;

  const groupedTransactions = transactions.reduce(
    (groups, tx) => {
      const date = dateFns.startOfDay(new Date(tx.date)).toISOString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
      return groups;
    },
    {} as Record<string, typeof transactions>
  );

  const sortedDates = Object.keys(groupedTransactions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const formatCurrency = (value: number, currency: string = "BRL") => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol} ${Math.abs(value).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const accountCurrency = account?.currency || "BRL";

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (dateFns.isToday(date)) return "Hoje";
    if (dateFns.isYesterday(date)) return "Ontem";
    return dateFns.format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const handleConfirmDelete = async () => {
    if (!account) return;
    showActionFeedback("success");
    setTimeout(() => {
      navigate("/contas");
    }, 80);
    try {
      deleteAccount.mutate(id!);
    } catch (error) {
      logger.error("Erro ao excluir conta:", error);
    }
  };

  const handleConfirmArchive = async () => {
    showActionFeedback("success");
    setTimeout(() => {
      setShowArchiveConfirmModal(false);
      navigate("/");
    }, 80);
    try {
      archiveAccount.mutate(id || "");
    } catch (error) {
      toast.error("Erro ao arquivar a conta.");
    }
  };

  const handleUnarchive = async () => {
    try {
      await unarchiveAccount.mutateAsync(id || "");
      showActionFeedback("success");
    } catch (error) {
      showActionFeedback("error");
      toast.error("Erro ao desarquivar a conta.");
    }
  };

  const handleSaveEditAccountForm = async (data: any) => {
    if (!account) return;
    try {
      await updateAccount.mutateAsync({
        id: account.id,
        name: data.name,
        hide_balance: data.hide_balance,
        yield_type: data.yield_type,
        yield_rate: data.yield_rate,
      });
      showActionFeedback("success");
      setTimeout(() => setShowEditDialog(false), 80);
    } catch (error) {
      showActionFeedback("error");
      toast.error("Erro ao atualizar conta.");
    }
  };

  const handleDeleteTransaction = async (cascadeType: "NONE" | "NEXT" | "ALL") => {
    const tx = deleteConfirm.transaction;
    if (!tx) return;
    try {
      await deleteTransaction.mutateAsync({ id: tx.id, cascadeType });
      showActionFeedback("success");
      setTimeout(() => {
        setDeleteConfirm({ isOpen: false, transaction: null });
      }, 80);
      refetchStatement();
    } catch (error) {
      showActionFeedback("error");
      toast.error("Erro ao excluir transação");
    }
  };

  if (!account) {
    return (
      <div className="space-y-8 animate-fade-in">
        <Button variant="ghost" className="gap-2" onClick={() => navigate("/contas")}>
          Voltar para Contas
        </Button>
        <h1 className="font-display font-bold text-2xl">Conta não encontrada</h1>
      </div>
    );
  }

  const bank = account.bank_id ? getBankById(account.bank_id) : null;
  const isCredit = account.type === "CREDIT_CARD";
  const monthLabel = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  // Stats mensais calculados a partir das transações do extrato
  const monthIncome = transactions
    .filter((tx) => tx.isIncoming && !tx.isInitialBalance)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
  const monthExpense = transactions
    .filter((tx) => !tx.isIncoming && !tx.isInitialBalance)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-24 md:pb-8">
      <AccountHeader account={account} bank={bank} />

      <AccountBalanceCard
        account={account}
        bank={bank}
        isCredit={isCredit}
        canDelete={canDelete}
        formatCurrency={formatCurrency}
        accountCurrency={accountCurrency}
        onTransfer={() => setShowTransferModal(true)}
        onWithdrawal={() => setShowWithdrawalModal(true)}
        onEdit={() => setShowEditDialog(true)}
        onDelete={() => setShowDeleteConfirmDialog(true)}
        onArchive={() => setShowArchiveConfirmModal(true)}
        onUnarchive={handleUnarchive}
      />

      {/* Mini stats do mês */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-success/8 border border-success/20">
            <div className="p-2 rounded-lg bg-success/15">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-success/70 font-bold uppercase tracking-wider">Entradas</p>
              <p className="text-sm font-bold text-success">
                {formatCurrency(monthIncome, accountCurrency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/8 border border-destructive/20">
            <div className="p-2 rounded-lg bg-destructive/15">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-destructive/70 font-bold uppercase tracking-wider">
                Saídas
              </p>
              <p className="text-sm font-bold text-destructive">
                {formatCurrency(monthExpense, accountCurrency)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho do extrato com o mês sendo exibido */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Extrato
        </h2>
        <span className="text-xs text-muted-foreground capitalize">{monthLabel}</span>
      </div>

      <AccountStatement
        transactions={transactions}
        sortedDates={sortedDates}
        groupedTransactions={groupedTransactions}
        getDateLabel={getDateLabel}
        formatCurrency={formatCurrency}
        accountCurrency={accountCurrency}
        openingBalance={openingBalance}
        closingBalance={closingBalance}
        onDeleteTransaction={(tx) => setDeleteConfirm({ isOpen: true, transaction: tx })}
      />

      {/* FAB mobile para adicionar transação nesta conta */}
      <button
        onClick={() => setShowTransactionModal(true)}
        className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform"
        aria-label="Nova transação"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modals */}
      <TransferModal
        open={showTransferModal}
        onOpenChange={setShowTransferModal}
        fromAccountId={id!}
        fromAccountName={account.name}
        fromAccountBalance={Number(account.balance)}
        fromAccountCurrency={account.currency || "BRL"}
      />

      <WithdrawalModal
        open={showWithdrawalModal}
        onOpenChange={setShowWithdrawalModal}
        accountId={id!}
        accountName={account.name}
        accountBalance={Number(account.balance)}
      />

      <TransactionModal
        open={showTransactionModal}
        onOpenChange={(open) => {
          setShowTransactionModal(open);
          if (!open) refetchStatement();
        }}
      />

      <DeleteTransactionModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, transaction: null })}
        onConfirm={handleDeleteTransaction}
        transaction={deleteConfirm.transaction}
      />

      <ArchiveConfirmModal
        isOpen={showArchiveConfirmModal}
        onClose={() => setShowArchiveConfirmModal(false)}
        onConfirm={handleConfirmArchive}
        itemName={account.name}
        isArchiving={archiveAccount.isPending}
      />

      <AccountFormModal
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSubmit={handleSaveEditAccountForm}
        mode="edit"
        initialData={account}
        isLoading={updateAccount.isPending}
      />

      <AccountDeleteArchiveModal
        isOpen={showDeleteConfirmDialog}
        onClose={() => setShowDeleteConfirmDialog(false)}
        onArchive={handleConfirmArchive}
        onDelete={handleConfirmDelete}
        accountName={account?.name || ""}
        canDelete={canDelete}
      />
    </div>
  );
}
