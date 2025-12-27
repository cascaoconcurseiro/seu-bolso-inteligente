import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Wallet, 
  Plus, 
  Trash2, 
  Landmark,
  PiggyBank,
  TrendingUp,
  Banknote,
  Loader2,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { banks, getBankById } from "@/lib/banks";
import { BankIcon } from "@/components/financial/BankIcon";
import { useAccounts, useCreateAccount, useDeleteAccount } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const accountTypeIcons = {
  CHECKING: Landmark,
  SAVINGS: PiggyBank,
  INVESTMENT: TrendingUp,
  CASH: Banknote,
};

const accountTypeLabels = {
  CHECKING: "Conta Corrente",
  SAVINGS: "Poupança",
  INVESTMENT: "Investimento",
  CASH: "Dinheiro",
};

export function Accounts() {
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: allTransactions = [] } = useTransactions();
  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("CHECKING");
  const [bankId, setBankId] = useState("");
  const [balance, setBalance] = useState("");

  // Filter only non-credit card accounts
  const regularAccounts = accounts.filter(a => a.type !== "CREDIT_CARD");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  // Função para pegar últimas 3 transações de uma conta
  const getLastTransactions = (accountId: string, limit: number = 3) => {
    return allTransactions
      .filter(t => t.account_id === accountId || t.destination_account_id === accountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const resetForm = () => {
    setName("");
    setType("CHECKING");
    setBankId("");
    setBalance("");
  };

  const handleCreate = async () => {
    const bank = bankId ? getBankById(bankId) : null;
    
    // Gera nome automaticamente baseado no banco e tipo
    const typeNames = {
      CHECKING: 'Conta Corrente',
      SAVINGS: 'Poupança',
      INVESTMENT: 'Investimento',
      CASH: 'Dinheiro'
    };
    const accountName = bank ? `${bank.name} - ${typeNames[type as keyof typeof typeNames]}` : typeNames[type as keyof typeof typeNames];
    
    await createAccount.mutateAsync({
      name: accountName,
      type: type as any,
      bank_id: bankId || null,
      bank_logo: null,
      bank_color: bank?.color || null,
      balance: parseFloat(balance) || 0,
    });

    setShowAddDialog(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteAccount.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const totalBalance = regularAccounts.reduce((sum, a) => sum + Number(a.balance), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Contas</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas contas bancárias</p>
        </div>
        <Button
          size="lg"
          onClick={() => setShowAddDialog(true)}
          className="group transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-5 w-5 mr-2 transition-transform group-hover:rotate-90" />
          Nova conta
        </Button>
      </div>

      {/* Summary Card */}
      <div className="p-8 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Saldo Total</p>
            <p className={cn(
              "font-mono text-4xl font-bold",
              totalBalance >= 0 ? "text-positive" : "text-negative"
            )}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-2">Contas Ativas</p>
            <p className="font-mono text-3xl font-bold">{regularAccounts.length}</p>
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      {regularAccounts.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-xl">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="font-display font-semibold text-xl mb-2">Nenhuma conta cadastrada</h2>
          <p className="text-muted-foreground mb-6">Adicione sua primeira conta para começar</p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar conta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regularAccounts.map((account) => {
            const Icon = accountTypeIcons[account.type as keyof typeof accountTypeIcons] || Wallet;
            const lastTransactions = getLastTransactions(account.id, 3);
            
            return (
              <Link
                key={account.id}
                to={`/contas/${account.id}`}
                className="group flex flex-col p-5 rounded-xl border border-border 
                           hover:border-foreground/20 transition-all duration-200 hover:shadow-md"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <BankIcon 
                      bankId={account.bank_id} 
                      size="md"
                      className="transition-transform duration-200 group-hover:scale-110" 
                    />
                    <div>
                      <p className="font-display font-semibold text-base">{account.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        {accountTypeLabels[account.type as keyof typeof accountTypeLabels] || account.type}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Balance */}
                <div className="mb-4 pb-4 border-b border-border">
                  <p className={cn(
                    "font-mono text-2xl font-bold",
                    Number(account.balance) >= 0 ? "text-foreground" : "text-negative"
                  )}>
                    {formatCurrency(Number(account.balance))}
                  </p>
                </div>

                {/* Last Transactions */}
                <div className="space-y-2 flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    Últimas transações
                  </p>
                  {lastTransactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhuma transação</p>
                  ) : (
                    lastTransactions.map((tx) => {
                      const isIncome = tx.type === "INCOME" || tx.destination_account_id === account.id;
                      return (
                        <div key={tx.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isIncome ? (
                              <ArrowDownRight className="h-3 w-3 text-positive flex-shrink-0" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3 text-negative flex-shrink-0" />
                            )}
                            <span className="truncate text-muted-foreground">{tx.description}</span>
                          </div>
                          <span className={cn(
                            "font-mono font-medium ml-2 flex-shrink-0",
                            isIncome ? "text-positive" : "text-negative"
                          )}>
                            {isIncome ? "+" : "-"}{formatCurrency(Math.abs(Number(tx.amount)))}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova conta</DialogTitle>
            <DialogDescription>Adicione uma conta bancária</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Banco</Label>
              <Select value={bankId || undefined} onValueChange={(value) => setBankId(value || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.values(banks).filter(b => b.id !== 'default').map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-3">
                        <BankIcon bankId={bank.id} size="sm" />
                        <span>{bank.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHECKING">Conta Corrente</SelectItem>
                  <SelectItem value="SAVINGS">Poupança</SelectItem>
                  <SelectItem value="INVESTMENT">Investimento</SelectItem>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Saldo inicial</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!bankId || createAccount.isPending}>
              {createAccount.isPending ? "Criando..." : "Criar conta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A conta será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transaction Modal */}
      <TransactionModal
        open={showTransactionModal}
        onOpenChange={setShowTransactionModal}
      />
    </div>
  );
}
