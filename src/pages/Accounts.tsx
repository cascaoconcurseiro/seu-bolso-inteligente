import { useState } from "react";
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
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { banks, getBankById } from "@/lib/banks";
import { BankIcon } from "@/components/financial/BankIcon";
import { useAccounts, useCreateAccount, useDeleteAccount } from "@/hooks/useAccounts";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { TransactionModal } from "@/components/modals/TransactionModal";

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

      {/* Summary */}
      <div className="p-6 rounded-2xl border border-border">
        <p className="text-sm text-muted-foreground mb-1">Saldo total</p>
        <p className={cn(
          "font-mono text-3xl font-bold",
          totalBalance >= 0 ? "text-positive" : "text-negative"
        )}>
          {formatCurrency(totalBalance)}
        </p>
      </div>

      {/* Accounts List */}
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
        <div className="space-y-2">
          {regularAccounts.map((account) => {
            const Icon = accountTypeIcons[account.type as keyof typeof accountTypeIcons] || Wallet;
            
            return (
              <div
                key={account.id}
                className="group flex items-center justify-between p-4 rounded-xl border border-border 
                           hover:border-foreground/20 transition-all duration-200 hover:shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <BankIcon 
                    bankId={account.bank_id} 
                    size="lg"
                    className="transition-transform duration-200 group-hover:scale-110" 
                  />
                  <div>
                    <p className="font-display font-semibold text-lg">{account.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      {accountTypeLabels[account.type as keyof typeof accountTypeLabels] || account.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className={cn(
                    "font-mono text-xl font-bold",
                    Number(account.balance) >= 0 ? "text-foreground" : "text-negative"
                  )}>
                    {formatCurrency(Number(account.balance))}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(account.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
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
