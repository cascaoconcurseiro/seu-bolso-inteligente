import { useState } from "react";
import { Link } from "react-router-dom";
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
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { banks, internationalBanks, getBankById } from "@/lib/banks";
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

// Tipos de conta para contas internacionais (usam os mesmos tipos válidos)
const internationalAccountTypes = [
  { value: "CHECKING", label: "Conta Corrente / Global" },
  { value: "SAVINGS", label: "Poupança" },
  { value: "INVESTMENT", label: "Investimento" },
  { value: "CASH", label: "Carteira Digital / Dinheiro" },
];

// Tipos de conta para contas nacionais
const nationalAccountTypes = [
  { value: "CHECKING", label: "Conta Corrente" },
  { value: "SAVINGS", label: "Poupança" },
  { value: "INVESTMENT", label: "Investimento" },
  { value: "CASH", label: "Dinheiro" },
];

// Lista expandida de moedas
const currencies = [
  // Américas
  { value: "USD", label: "USD - Dólar Americano", symbol: "$" },
  { value: "CAD", label: "CAD - Dólar Canadense", symbol: "C$" },
  { value: "MXN", label: "MXN - Peso Mexicano", symbol: "MX$" },
  { value: "ARS", label: "ARS - Peso Argentino", symbol: "AR$" },
  { value: "CLP", label: "CLP - Peso Chileno", symbol: "CL$" },
  { value: "COP", label: "COP - Peso Colombiano", symbol: "CO$" },
  { value: "PEN", label: "PEN - Sol Peruano", symbol: "S/" },
  { value: "UYU", label: "UYU - Peso Uruguaio", symbol: "UY$" },
  // Europa
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "GBP", label: "GBP - Libra Esterlina", symbol: "£" },
  { value: "CHF", label: "CHF - Franco Suíço", symbol: "CHF" },
  { value: "SEK", label: "SEK - Coroa Sueca", symbol: "kr" },
  { value: "NOK", label: "NOK - Coroa Norueguesa", symbol: "kr" },
  { value: "DKK", label: "DKK - Coroa Dinamarquesa", symbol: "kr" },
  { value: "PLN", label: "PLN - Zloty Polonês", symbol: "zł" },
  { value: "CZK", label: "CZK - Coroa Tcheca", symbol: "Kč" },
  { value: "HUF", label: "HUF - Florim Húngaro", symbol: "Ft" },
  { value: "TRY", label: "TRY - Lira Turca", symbol: "₺" },
  // Ásia e Oceania
  { value: "JPY", label: "JPY - Iene Japonês", symbol: "¥" },
  { value: "CNY", label: "CNY - Yuan Chinês", symbol: "¥" },
  { value: "HKD", label: "HKD - Dólar de Hong Kong", symbol: "HK$" },
  { value: "SGD", label: "SGD - Dólar de Singapura", symbol: "S$" },
  { value: "KRW", label: "KRW - Won Sul-Coreano", symbol: "₩" },
  { value: "INR", label: "INR - Rupia Indiana", symbol: "₹" },
  { value: "THB", label: "THB - Baht Tailandês", symbol: "฿" },
  { value: "AUD", label: "AUD - Dólar Australiano", symbol: "A$" },
  { value: "NZD", label: "NZD - Dólar Neozelandês", symbol: "NZ$" },
  // Oriente Médio e África
  { value: "AED", label: "AED - Dirham dos Emirados", symbol: "د.إ" },
  { value: "SAR", label: "SAR - Rial Saudita", symbol: "﷼" },
  { value: "ILS", label: "ILS - Shekel Israelense", symbol: "₪" },
  { value: "ZAR", label: "ZAR - Rand Sul-Africano", symbol: "R" },
  { value: "EGP", label: "EGP - Libra Egípcia", symbol: "E£" },
];

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
  const [isInternational, setIsInternational] = useState(false);
  const [currency, setCurrency] = useState("USD");

  // Atualizar tipo padrão quando mudar entre nacional/internacional
  const handleInternationalChange = (checked: boolean) => {
    setIsInternational(checked);
    setBankId(""); // Reset bank selection
    setType("CHECKING"); // Tipo padrão para ambos
  };

  // Filter only non-credit card accounts
  const regularAccounts = accounts.filter(a => a.type !== "CREDIT_CARD");
  const nationalAccounts = regularAccounts.filter(a => !a.is_international);
  const internationalAccounts = regularAccounts.filter(a => a.is_international);

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

  const resetForm = () => {
    setName("");
    setType("CHECKING");
    setBankId("");
    setBalance("");
    setIsInternational(false);
    setCurrency("USD");
  };

  const handleCreate = async () => {
    const bank = bankId ? getBankById(bankId) : null;
    
    // Gera nome automaticamente baseado no banco e tipo
    const accountName = bank 
      ? `${bank.name} - ${accountTypeLabels[type as keyof typeof accountTypeLabels] || type}` 
      : accountTypeLabels[type as keyof typeof accountTypeLabels] || type;
    
    await createAccount.mutateAsync({
      name: accountName,
      type: type as any,
      bank_id: bankId || null,
      bank_logo: null,
      bank_color: bank?.color || null,
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
  const totalInternationalBalance = internationalAccounts.reduce((sum, a) => sum + Number(a.balance), 0);

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
            <p className="text-sm text-muted-foreground mb-2">Saldo Total (BRL)</p>
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
            <Button variant="outline" onClick={() => { setIsInternational(true); setShowAddDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar conta internacional
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {internationalAccounts.map((account) => {
              const Icon = accountTypeIcons[account.type as keyof typeof accountTypeIcons] || Wallet;
              const lastTransactions = getLastTransactions(account.id, 3);
              const currencySymbol = account.currency === 'USD' ? '$' : account.currency === 'EUR' ? '€' : account.currency;
              
              return (
                <Link
                  key={account.id}
                  to={`/contas/${account.id}`}
                  className="group flex flex-col p-5 rounded-xl border border-blue-200 dark:border-blue-800 
                             hover:border-blue-400 transition-all duration-200 hover:shadow-md bg-blue-50/30 dark:bg-blue-950/20"
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
                        <div className="flex items-center gap-2">
                          <p className="font-display font-semibold text-base">{account.name}</p>
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                            {account.currency} 🌍
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Icon className="h-3 w-3" />
                          {accountTypeLabels[account.type as keyof typeof accountTypeLabels] || account.type}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="mb-4 pb-4 border-b border-blue-200 dark:border-blue-800">
                    <p className={cn(
                      "font-mono text-2xl font-bold",
                      Number(account.balance) >= 0 ? "text-foreground" : "text-negative"
                    )}>
                      {currencySymbol} {Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                              {isIncome ? "+" : "-"}{currencySymbol}{Math.abs(Number(tx.amount)).toFixed(2)}
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
      </div>

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova conta</DialogTitle>
            <DialogDescription>Adicione uma conta bancária</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Toggle Internacional */}
            <div className="p-4 rounded-xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Conta Internacional</p>
                    <p className="text-sm text-muted-foreground">Nomad, Wise, etc.</p>
                  </div>
                </div>
                <Switch 
                  checked={isInternational} 
                  onCheckedChange={handleInternationalChange} 
                />
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
                    // Bancos internacionais
                    Object.values(internationalBanks).map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: bank.color, color: bank.textColor }}
                          >
                            {bank.icon}
                          </div>
                          <span>{bank.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    // Bancos nacionais
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

            {/* Moeda (apenas para internacional) */}
            {isInternational && (
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {currencies.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs w-6">{curr.symbol}</span>
                          <span>{curr.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Saldo inicial {isInternational && `(${currency})`}</Label>
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
