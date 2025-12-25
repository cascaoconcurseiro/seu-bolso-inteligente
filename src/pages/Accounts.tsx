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
  CreditCard, 
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

const accountTypeIcons = {
  CHECKING: Landmark,
  SAVINGS: PiggyBank,
  CREDIT_CARD: CreditCard,
  INVESTMENT: TrendingUp,
  CASH: Banknote,
};

const accountTypeLabels = {
  CHECKING: "Conta Corrente",
  SAVINGS: "Poupança",
  CREDIT_CARD: "Cartão de Crédito",
  INVESTMENT: "Investimento",
  CASH: "Dinheiro",
};

export function Accounts() {
  const { data: accounts = [], isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("CHECKING");
  const [bankId, setBankId] = useState("");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const resetForm = () => {
    setName("");
    setType("CHECKING");
    setBankId("");
    setBalance("");
    setCreditLimit("");
    setClosingDay("");
    setDueDay("");
  };

  const handleCreate = async () => {
    const bank = bankId ? getBankById(bankId) : null;
    
    await createAccount.mutateAsync({
      name,
      type: type as any,
      bank_id: bankId || null,
      bank_logo: null,
      bank_color: bank?.color || null,
      balance: parseFloat(balance) || 0,
      credit_limit: type === "CREDIT_CARD" ? (parseFloat(creditLimit) || null) : null,
      closing_day: type === "CREDIT_CARD" ? (parseInt(closingDay) || null) : null,
      due_day: type === "CREDIT_CARD" ? (parseInt(dueDay) || null) : null,
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

  const totalBalance = accounts
    .filter(a => a.type !== "CREDIT_CARD")
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalCreditUsed = accounts
    .filter(a => a.type === "CREDIT_CARD")
    .reduce((sum, a) => sum + Math.abs(Number(a.balance)), 0);

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
          <p className="text-muted-foreground mt-1">Gerencie suas contas e cartões</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl border border-border">
          <p className="text-sm text-muted-foreground mb-1">Saldo disponível</p>
          <p className={cn(
            "font-mono text-3xl font-bold",
            totalBalance >= 0 ? "text-positive" : "text-negative"
          )}>
            {formatCurrency(totalBalance)}
          </p>
        </div>
        <div className="p-6 rounded-2xl border border-border">
          <p className="text-sm text-muted-foreground mb-1">Crédito utilizado</p>
          <p className="font-mono text-3xl font-bold text-warning">
            {formatCurrency(totalCreditUsed)}
          </p>
        </div>
      </div>

      {/* Accounts List */}
      {accounts.length === 0 ? (
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
        <div className="space-y-6">
          {/* Regular Accounts */}
          {accounts.filter(a => a.type !== "CREDIT_CARD").length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Contas ({accounts.filter(a => a.type !== "CREDIT_CARD").length})
              </h2>
              <div className="space-y-2">
                {accounts
                  .filter(a => a.type !== "CREDIT_CARD")
                  .map((account) => {
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
                              {accountTypeLabels[account.type as keyof typeof accountTypeLabels]}
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
            </div>
          )}

          {/* Credit Cards */}
          {accounts.filter(a => a.type === "CREDIT_CARD").length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Cartões de Crédito ({accounts.filter(a => a.type === "CREDIT_CARD").length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts
                  .filter(a => a.type === "CREDIT_CARD")
                  .map((card) => {
                    const usedPercent = card.credit_limit 
                      ? (Math.abs(Number(card.balance)) / Number(card.credit_limit)) * 100 
                      : 0;
                    
                    return (
                      <div
                        key={card.id}
                        className="group relative p-6 rounded-2xl border border-border 
                                   hover:border-foreground/20 transition-all duration-200 hover:shadow-md
                                   overflow-hidden"
                        style={{ 
                          background: card.bank_color 
                            ? `linear-gradient(135deg, ${card.bank_color}15, ${card.bank_color}05)` 
                            : undefined 
                        }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <BankIcon 
                            bankId={card.bank_id} 
                            size="lg"
                            className="transition-transform duration-200 group-hover:scale-110" 
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                            onClick={() => setDeleteId(card.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <p className="font-display font-semibold text-lg mb-1">{card.name}</p>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Fatura atual</p>
                            <p className="font-mono text-2xl font-bold text-warning">
                              {formatCurrency(Math.abs(Number(card.balance)))}
                            </p>
                          </div>
                          
                          {card.credit_limit && (
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Limite usado</span>
                                <span className="font-medium">{usedPercent.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-500 rounded-full",
                                    usedPercent > 80 ? "bg-negative" : usedPercent > 50 ? "bg-warning" : "bg-positive"
                                  )}
                                  style={{ width: `${Math.min(usedPercent, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Limite: {formatCurrency(Number(card.credit_limit))}
                              </p>
                            </div>
                          )}
                          
                          {(card.closing_day || card.due_day) && (
                            <div className="flex gap-4 text-xs">
                              {card.closing_day && (
                                <span className="text-muted-foreground">
                                  Fecha dia <span className="font-medium text-foreground">{card.closing_day}</span>
                                </span>
                              )}
                              {card.due_day && (
                                <span className="text-muted-foreground">
                                  Vence dia <span className="font-medium text-foreground">{card.due_day}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova conta</DialogTitle>
            <DialogDescription>Adicione uma conta bancária ou cartão</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da conta</Label>
              <Input
                placeholder="Ex: Nubank, Itaú, Carteira"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
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
                  <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                  <SelectItem value="INVESTMENT">Investimento</SelectItem>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Banco (opcional)</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {Object.values(banks).filter(b => b.id !== 'default').map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: bank.color }}
                        />
                        {bank.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{type === "CREDIT_CARD" ? "Fatura atual" : "Saldo inicial"}</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </div>

            {type === "CREDIT_CARD" && (
              <>
                <div className="space-y-2">
                  <Label>Limite de crédito</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 5000"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dia de fechamento</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 15"
                      min="1"
                      max="31"
                      value={closingDay}
                      onChange={(e) => setClosingDay(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dia de vencimento</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 25"
                      min="1"
                      max="31"
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!name || createAccount.isPending}>
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
    </div>
  );
}
