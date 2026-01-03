import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/ui/currency-input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Wallet, 
  Plus, 
  Landmark,
  PiggyBank,
  TrendingUp,
  Banknote,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { banks, internationalBanks, getBankById } from "@/lib/banks";
import { BankIcon } from "@/components/financial/BankIcon";
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { toast } from "sonner";

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

const internationalAccountTypes = [
  { value: "CHECKING", label: "Conta Global" },
];

const nationalAccountTypes = [
  { value: "CHECKING", label: "Conta Corrente" },
  { value: "SAVINGS", label: "Poupança" },
  { value: "INVESTMENT", label: "Investimento" },
  { value: "CASH", label: "Dinheiro" },
];

const currencies = [
  { value: "USD", label: "USD - Dólar Americano", symbol: "$" },
  { value: "CAD", label: "CAD - Dólar Canadense", symbol: "C$" },
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "GBP", label: "GBP - Libra Esterlina", symbol: "£" },
  { value: "JPY", label: "JPY - Iene Japonês", symbol: "¥" },
  { value: "AUD", label: "AUD - Dólar Australiano", symbol: "A$" },
  { value: "CHF", label: "CHF - Franco Suíço", symbol: "CHF" },
];

const getCurrencySymbol = (currency: string) => {
  const found = currencies.find(c => c.value === currency);
  return found?.symbol || currency;
};

export function Accounts() {
  const { data: accounts = [], isLoading, refetch } = useAccounts();
  const { data: allTransactions = [] } = useTransactions();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [type, setType] = useState<string>("CHECKING");
  const [bankId, setBankId] = useState("");
  const [balance, setBalance] = useState("");
  const [isInternational, setIsInternational] = useState(false);
  const [currency, setCurrency] = useState("USD");

  const handleInternationalChange = (checked: boolean) => {
    setIsInternational(checked);
    setBankId("");
    setType("CHECKING");
  };

  const regularAccounts = (accounts || []).filter(a => a.type !== "CREDIT_CARD");
  const nationalAccounts = (regularAccounts || []).filter(a => !a.is_international);
  const internationalAccounts = (regularAccounts || []).filter(a => a.is_international);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getLastTransactions = (accountId: string, limit: number = 3) => {
    return allTransactions
      .filter(t => t.account_id === accountId || t.destination_account_id === accountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  };

  const resetForm = () => {
    setType("CHECKING");
    setBankId("");
    setBalance("");
    setIsInternational(false);
    setCurrency("USD");
  };

  const handleCreate = async () => {
    const bank = bankId ? getBankById(bankId) : null;
    const accountName = bank 
      ? `${bank.name} - ${accountTypeLabels[type as keyof typeof accountTypeLabels] || type}` 
      : accountTypeLabels[type as keyof typeof accountTypeLabels] || type;
    
    await createAccount.mutateAsync({
      name: accountName,
      type: type as any,
      bank_id: bankId || null,
      balance: parseFloat(balance) || 0,
      is_international: isInternational,
      currency: isInternational ? currency : 'BRL',
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

  const totalBalance = nationalAccounts.reduce((sum, a) => sum + Number(a.balance), 0);

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
        <Button size="lg" onClick={() => setShowAddDialog(true)} className="group h-12 md:h-11">
          <Plus className="h-5 w-5 mr-2" />
          <span className="hidden sm:inline">Nova conta</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      {/* Summary Card */}
      <div className="p-8 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Saldo Total (BRL)</p>
            <p className={cn("font-mono text-4xl font-bold", totalBalance >= 0 ? "text-positive" : "text-negative")}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-2">Contas Ativas</p>
            <p className="font-mono text-3xl font-bold">{regularAccounts.length}</p>
          </div>
        </div>
      </div>

      {/* National Accounts */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Contas Nacionais ({nationalAccounts.length})
        </h2>
        
        {nationalAccounts.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-xl">
            <Wallet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma conta nacional cadastrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nationalAccounts.map((account) => {
              const Icon = accountTypeIcons[account.type as keyof typeof accountTypeIcons] || Wallet;
              const lastTransactions = getLastTransactions(account.id, 3);
              const bank = getBankById(account.bank_id);
              
              return (
                <div
                  key={account.id}
                  className="group flex flex-col rounded-xl border border-border hover:border-foreground/20 transition-all duration-200 hover:shadow-md overflow-hidden relative"
                >
                  <div className="absolute top-2 right-2 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 bg-white/20 hover:bg-white/40"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" style={{ color: bank.textColor }} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setEditingAccount(account);
                          setEditName(account.name);
                          setEditBalance(String(account.balance));
                          setShowEditDialog(true);
                        }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(account.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Link to={`/contas/${account.id}`} className="flex flex-col flex-1">
                    <div className="p-4" style={{ backgroundColor: bank.color }}>
                      <div className="flex items-center gap-3">
                        <BankIcon bankId={account.bank_id} size="md" />
                        <div>
                          <p className="font-display font-semibold text-base" style={{ color: bank.textColor }}>
                            {account.name}
                          </p>
                          <p className="text-xs opacity-80" style={{ color: bank.textColor }}>
                            {accountTypeLabels[account.type as keyof typeof accountTypeLabels] || account.type}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-xs opacity-70" style={{ color: bank.textColor }}>Saldo</p>
                        <p className="font-mono text-2xl font-bold" style={{ color: bank.textColor }}>
                          {formatCurrency(Number(account.balance))}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 space-y-2 flex-1 bg-background">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Últimas transações</p>
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
                              <span className={cn("font-mono font-medium ml-2 flex-shrink-0", isIncome ? "text-positive" : "text-negative")}>
                                {isIncome ? "+" : "-"}{formatCurrency(Math.abs(Number(tx.amount)))}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* International Accounts */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Contas Internacionais ({internationalAccounts.length})
        </h2>
        
        {internationalAccounts.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-xl bg-blue-50/50 dark:bg-blue-950/20">
            <Globe className="h-10 w-10 mx-auto mb-3 text-blue-500" />
            <p className="text-muted-foreground mb-4">Nenhuma conta internacional cadastrada</p>
            <Button variant="outline" onClick={() => { setIsInternational(true); setShowAddDialog(true); }} className="h-11 md:h-9">
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Adicionar conta internacional</span>
              <span className="md:hidden">Adicionar</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {internationalAccounts.map((account) => {
              const lastTransactions = getLastTransactions(account.id, 3);
              const currencySymbol = getCurrencySymbol(account.currency || 'USD');
              const bank = getBankById(account.bank_id);
              
              return (
                <div
                  key={account.id}
                  className="group flex flex-col rounded-xl border border-border hover:border-foreground/20 transition-all duration-200 hover:shadow-md overflow-hidden relative"
                >
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-medium flex items-center gap-1" style={{ color: bank.textColor }}>
                      <Globe className="h-3 w-3" />
                      {account.currency}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 bg-white/20 hover:bg-white/40"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3 w-3" style={{ color: bank.textColor }} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setEditingAccount(account);
                          setEditName(account.name);
                          setEditBalance(String(account.balance));
                          setShowEditDialog(true);
                        }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(account.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Link to={`/contas/${account.id}`} className="flex flex-col flex-1">
                    <div className="p-4 relative" style={{ backgroundColor: bank.color }}>
                      <div className="flex items-center gap-3">
                        <BankIcon bankId={account.bank_id} size="md" />
                        <div>
                          <p className="font-display font-semibold text-base" style={{ color: bank.textColor }}>
                            {account.name}
                          </p>
                          <p className="text-xs opacity-80" style={{ color: bank.textColor }}>Conta Global</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-xs opacity-70" style={{ color: bank.textColor }}>Saldo</p>
                        <p className="font-mono text-2xl font-bold" style={{ color: bank.textColor }}>
                          {currencySymbol} {Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 space-y-2 flex-1 bg-background">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Últimas transações</p>
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
                              <span className={cn("font-mono font-medium ml-2 flex-shrink-0", isIncome ? "text-positive" : "text-negative")}>
                                {isIncome ? "+" : "-"}{currencySymbol}{Math.abs(Number(tx.amount)).toFixed(2)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova conta</DialogTitle>
            <DialogDescription>Adicione uma conta bancária</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Conta Internacional</p>
                    <p className="text-sm text-muted-foreground">Nomad, Wise, etc.</p>
                  </div>
                </div>
                <Switch checked={isInternational} onCheckedChange={handleInternationalChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isInternational ? 'Instituição' : 'Banco'}</Label>
              <Select value={bankId || undefined} onValueChange={(value) => setBankId(value || "")}>
                <SelectTrigger>
                  <SelectValue placeholder={isInternational ? "Selecione a instituição" : "Selecione o banco"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {isInternational ? (
                    Object.values(internationalBanks).map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: bank.color, color: bank.textColor }}>
                            {bank.icon}
                          </div>
                          <span>{bank.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    Object.values(banks).filter(b => b.id !== 'default').map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div className="flex items-center gap-3">
                          <BankIcon bankId={bank.id} size="sm" />
                          <span>{bank.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {isInternational && (
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        <span className="font-mono text-xs mr-2">{curr.symbol}</span>
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  💡 A conta será criada em <strong>{currency}</strong>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(isInternational ? internationalAccountTypes : nationalAccountTypes).map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Saldo inicial {isInternational && `(${currency})`}</Label>
              <CurrencyInput 
                placeholder="0,00" 
                value={balance} 
                onChange={setBalance}
                currency={isInternational ? currency : "BRL"}
              />
              {!isInternational && (
                <p className="text-xs text-muted-foreground">
                  💡 Conta nacional em BRL (Real Brasileiro)
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!bankId || createAccount.isPending}>
              {createAccount.isPending ? "Criando..." : "Criar conta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar conta</DialogTitle>
            <DialogDescription>Altere os dados da conta</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da conta</Label>
              <Input 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
                placeholder="Nome da conta"
              />
            </div>
            <div className="space-y-2">
              <Label>Saldo atual</Label>
              <CurrencyInput 
                value={editBalance} 
                onChange={setEditBalance} 
                placeholder="0,00"
                currency={editingAccount?.currency || "BRL"}
              />
              <p className="text-xs text-muted-foreground">
                Ajuste o saldo se necessário. Isso não cria transação.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
            <Button 
              onClick={async () => {
                if (editingAccount) {
                  await updateAccount.mutateAsync({
                    id: editingAccount.id,
                    name: editName,
                    balance: parseFloat(editBalance) || 0,
                  });
                  setShowEditDialog(false);
                  setEditingAccount(null);
                }
              }} 
              disabled={!editName || updateAccount.isPending}
            >
              {updateAccount.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TransactionModal open={showTransactionModal} onOpenChange={setShowTransactionModal} />
    </div>
  );
}
