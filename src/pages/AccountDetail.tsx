import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Archive } from "lucide-react";
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
import { useAccounts, useDeleteAccount, useUpdateAccount, useArchiveAccount, useUnarchiveAccount, useAccountDependencies } from "@/hooks/useAccounts";
import { useAccountStatement, StatementPeriod, getPeriodDates } from "@/hooks/useAccountStatement";
import { useDeleteTransaction } from "@/hooks/useTransactions";
import { DeleteTransactionModal } from "@/components/modals/DeleteTransactionModal";
import { ArchiveConfirmModal } from "@/components/modals/ArchiveConfirmModal";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBankById } from "@/lib/banks";
import { TransferModal } from "@/components/accounts/TransferModal";
import { WithdrawalModal } from "@/components/accounts/WithdrawalModal";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { AccountHeader } from "@/components/accounts/AccountHeader";
import { AccountBalanceCard } from "@/components/accounts/AccountBalanceCard";
import { AccountStatement } from "@/components/accounts/AccountStatement";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import { toast } from "sonner";
import { moneyUtils } from "@/utils/money";

const PERIOD_LABELS: Record<StatementPeriod, string> = {
  "30d": "Últimos 30 dias",
  "90d": "Últimos 3 meses",
  "current_month": "Mês atual",
  "current_year": "Este ano",
  "all": "Todo o histórico",
};

export function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: accounts = [] } = useAccounts();

  // Período do extrato — padrão: todo o histórico (como conta bancária real)
  const [statementPeriod, setStatementPeriod] = useState<StatementPeriod>("all");

  const { data: statementData, refetch: refetchStatement } = useAccountStatement({
    accountId: id || "",
    period: statementPeriod,
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

  const [editAccountName, setEditAccountName] = useState("");
  const [editHideBalance, setEditHideBalance] = useState(false);
  const [editYieldType, setEditYieldType] = useState<string>("NONE");
  const [editYieldRate, setEditYieldRate] = useState<string>("100");
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; transaction: any | null }>({
    isOpen: false,
    transaction: null,
  });

  const account = accounts.find((a) => a.id === id);
  const transactions = statementData?.transactions || [];
  const openingBalance = statementData?.openingBalance ?? 0;

  const groupedTransactions = transactions.reduce((groups, tx) => {
    const date = dateFns.startOfDay(new Date(tx.date)).toISOString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(tx);
    return groups;
  }, {} as Record<string, typeof transactions>);

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  const formatCurrency = (value: number, currency: string = "BRL") => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol} ${Math.abs(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    await deleteAccount.mutateAsync(id!);
    navigate("/contas");
  };

  const handleConfirmArchive = async () => {
    try {
      await archiveAccount.mutateAsync(id || "");
      toast.success("Conta arquivada com sucesso!");
      setShowArchiveConfirmModal(false);
      navigate("/");
    } catch (error) {
      toast.error("Erro ao arquivar a conta.");
    }
  };

  const handleUnarchive = async () => {
    try {
      await unarchiveAccount.mutateAsync(id || "");
      toast.success("Conta desarquivada com sucesso!");
    } catch (error) {
      toast.error("Erro ao desarquivar a conta.");
    }
  };

  const handleEditAccount = () => {
    if (!account) return;
    setEditAccountName(account.name);
    setEditHideBalance(account.hide_balance || false);
    setEditYieldType(account.yield_type || "NONE");
    setEditYieldRate(account.yield_rate ? account.yield_rate.toString() : "100");
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!account || !editAccountName.trim()) return;
    const yRate = editYieldType !== "NONE" ? moneyUtils.parse(editYieldRate) : null;
    const yType = editYieldType !== "NONE" ? editYieldType : null;
    await updateAccount.mutateAsync({
      id: account.id,
      name: editAccountName.trim(),
      hide_balance: editHideBalance,
      yield_type: yType,
      yield_rate: yRate,
    });
    setShowEditDialog(false);
  };

  const handleDeleteTransaction = async (cascadeType: "NONE" | "NEXT" | "ALL") => {
    const tx = deleteConfirm.transaction;
    if (!tx) return;

    try {
      await deleteTransaction.mutateAsync({ id: tx.id, cascadeType });
      toast.success("Transação excluída com sucesso!");
      setDeleteConfirm({ isOpen: false, transaction: null });
      refetchStatement();
    } catch (error) {
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
  const showOpeningBalance = statementPeriod !== "all" && openingBalance !== 0;

  return (
    <div className="space-y-8 animate-fade-in">
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
        onEdit={handleEditAccount}
        onDelete={() => setShowDeleteConfirmDialog(true)}
        onArchive={() => setShowArchiveConfirmModal(true)}
        onUnarchive={handleUnarchive}
      />

      {/* Seletor de período do extrato */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Extrato
        </h2>
        <Select value={statementPeriod} onValueChange={(v) => setStatementPeriod(v as StatementPeriod)}>
          <SelectTrigger className="w-auto min-w-[180px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(PERIOD_LABELS) as [StatementPeriod, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AccountStatement
        transactions={transactions}
        sortedDates={sortedDates}
        groupedTransactions={groupedTransactions}
        getDateLabel={getDateLabel}
        formatCurrency={formatCurrency}
        accountCurrency={accountCurrency}
        openingBalance={openingBalance}
        showOpeningBalance={showOpeningBalance}
        onDeleteTransaction={(tx) => setDeleteConfirm({ isOpen: true, transaction: tx })}
      />

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
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          refetchStatement();
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

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
            <DialogDescription>Altere o nome da conta</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Nome da Conta</Label>
              <Input
                id="account-name"
                value={editAccountName}
                onChange={(e) => setEditAccountName(e.target.value)}
                placeholder="Digite o nome da conta"
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-xl">
              <div className="space-y-0.5">
                <Label>Ocultar Saldo</Label>
                <p className="text-xs text-muted-foreground">O valor ficará desfocado no painel.</p>
              </div>
              <Switch checked={editHideBalance} onCheckedChange={setEditHideBalance} />
            </div>

            {(account?.type === "INVESTMENT" || account?.type === "EMERGENCY_FUND") && !account?.is_international && (
              <div className="space-y-4 p-4 border rounded-xl bg-muted/20">
                <div className="space-y-2">
                  <Label>Rendimento Automático Diário</Label>
                  <Select value={editYieldType} onValueChange={setEditYieldType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Nenhum</SelectItem>
                      <SelectItem value="CDI">CDI (% do CDI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editYieldType === "CDI" && (
                  <div className="space-y-2">
                    <Label>Taxa (%)</Label>
                    <Input type="number" value={editYieldRate} onChange={(e) => setEditYieldRate(e.target.value)} placeholder="Ex: 100" />
                    <p className="text-xs text-muted-foreground">O rendimento será calculado sobre a taxa global de CDI definida nas Configurações.</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={!editAccountName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover conta "{account?.name}"?</DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p className="text-sm">Escolha como deseja remover esta conta:</p>
              <div className="space-y-3">
                <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-start gap-3">
                    <Archive className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium text-sm text-blue-900 dark:text-blue-100">Arquivar (Recomendado)</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        • A conta não aparecerá mais nos formulários<br />
                        • Todas as transações serão preservadas<br />
                        • Histórico mantido para relatórios
                      </p>
                    </div>
                  </div>
                </div>
                {canDelete && (
                  <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-start gap-3">
                      <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium text-sm text-red-900 dark:text-red-100">Excluir Permanentemente</p>
                        <p className="text-xs text-red-700 dark:text-red-300">
                          • A conta será removida do sistema<br />
                          • Todas as transações serão deletadas<br />
                          • Esta ação não pode ser desfeita
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirmDialog(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button variant="outline" onClick={() => { setShowDeleteConfirmDialog(false); handleConfirmArchive(); }} className="w-full sm:w-auto gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/20">
              <Archive className="h-4 w-4" /> Arquivar
            </Button>
            {canDelete && (
              <Button variant="destructive" onClick={() => { setShowDeleteConfirmDialog(false); handleConfirmDelete(); }} className="w-full sm:w-auto gap-2">
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
