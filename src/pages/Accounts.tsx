import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ArchivedAccountsSection } from "@/components/accounts/ArchivedAccountsSection";
import {
  Dialog,
  DialogContent,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, Plus, Globe, Download } from "lucide-react";
import { banks, internationalBanks, getBankById } from "@/lib/banks";
import { BankIcon } from "@/components/financial/BankIcon";
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, Account } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useMonth } from "@/contexts/MonthContext";
import { exportAccountsToCSV, exportAccountsToPDF } from "@/utils/exportData";
import * as dateFns from "date-fns";

// Modular Components
import { AccountCard } from "@/components/accounts/AccountCard";
import { AccountSummary } from "@/components/accounts/AccountSummary";

const accountTypeLabels: Record<string, string> = {
  CHECKING: "Conta Corrente", SAVINGS: "Poupança", INVESTMENT: "Investimento", CASH: "Dinheiro", EMERGENCY_FUND: "Reserva de Emergência", GLOBAL_ACCOUNT: "Conta Global",
};

const currencies = [
  { value: "USD", label: "USD - Dólar Americano", symbol: "$" }, { value: "EUR", label: "EUR - Euro", symbol: "€" }, { value: "GBP", label: "GBP - Libra Esterlina", symbol: "£" }, { value: "CAD", label: "CAD - Dólar Canadense", symbol: "C$" }, { value: "AUD", label: "AUD - Dólar Australiano", symbol: "A$" }, { value: "JPY", label: "JPY - Iene Japonês", symbol: "¥" }, { value: "CHF", label: "CHF - Franco Suíço", symbol: "CHF" }, { value: "CNY", label: "CNY - Yuan Chinês", symbol: "¥" }, { value: "MXN", label: "MXN - Peso Mexicano", symbol: "$" }, { value: "ARS", label: "ARS - Peso Argentino", symbol: "$" }, { value: "CLP", label: "CLP - Peso Chileno", symbol: "$" }, { value: "COP", label: "COP - Peso Colombiano", symbol: "$" }, { value: "PEN", label: "PEN - Sol Peruano", symbol: "S/" }, { value: "UYU", label: "UYU - Peso Uruguaio", symbol: "$" }, { value: "NZD", label: "NZD - Dólar Neozelandês", symbol: "NZ$" }, { value: "SGD", label: "SGD - Dólar de Singapura", symbol: "S$" }, { value: "HKD", label: "HKD - Dólar de Hong Kong", symbol: "HK$" }, { value: "KRW", label: "KRW - Won Sul-Coreano", symbol: "₩" }, { value: "INR", label: "INR - Rúpia Indiana", symbol: "₹" }, { value: "THB", label: "THB - Baht Tailandês", symbol: "฿" }, { value: "ZAR", label: "ZAR - Rand Sul-Africano", symbol: "R" }, { value: "TRY", label: "TRY - Lira Turca", symbol: "₺" }, { value: "RUB", label: "RUB - Rublo Russo", symbol: "₽" }, { value: "PLN", label: "PLN - Zloty Polonês", symbol: "zł" }, { value: "SEK", label: "SEK - Coroa Sueca", symbol: "kr" }, { value: "NOK", label: "NOK - Coroa Norueguesa", symbol: "kr" }, { value: "DKK", label: "DKK - Coroa Dinamarquesa", symbol: "kr" }, { value: "CZK", label: "CZK - Coroa Tcheca", symbol: "Kč" }, { value: "HUF", label: "HUF - Forint Húngaro", symbol: "Ft" }, { value: "ILS", label: "ILS - Shekel Israelense", symbol: "₪" }, { value: "AED", label: "AED - Dirham dos Emirados", symbol: "د.إ" }, { value: "SAR", label: "SAR - Riyal Saudita", symbol: "﷼" },
];

const getCurrencySymbol = (currency: string) => currencies.find(c => c.value === currency)?.symbol || currency;

export function Accounts() {
  const { currentDate } = useMonth();
  const { data: accounts = [], isLoading, isError, refetch } = useAccounts();
  const { data: allTransactions = [] } = useTransactions({ limit: 50 });
  const { data: exportTransactions = [] } = useTransactions({
    startDate: `${currentDate.getFullYear()}-01-01`,
    endDate: `${currentDate.getFullYear()}-12-31`
  });
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();

  const regularAccounts = useMemo(() => (accounts || []).filter(a => a.type !== "CREDIT_CARD"), [accounts]);
  
  const balancesByCurrency = useMemo(() => {
    const map = new Map<string, { balance: number; symbol: string }>();
    regularAccounts.forEach(a => {
      const c = a.currency || 'BRL';
      const existing = map.get(c) || { balance: 0, symbol: getCurrencySymbol(c) };
      existing.balance += Number(a.balance || 0);
      map.set(c, existing);
    });
    return Array.from(map.entries()).map(([currency, data]) => ({
      currency,
      ...data
    })).sort((a, b) => a.currency === 'BRL' ? -1 : 1);
  }, [regularAccounts]);

  const totalBalanceBRL = balancesByCurrency.find(b => b.currency === 'BRL')?.balance || 0;

  const handleExportAccounts = (formatType: 'PDF' | 'CSV', period: 'MONTH' | 'YEAR') => {
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

    if (formatType === 'PDF') {
      exportAccountsToPDF(filteredTxs, regularAccounts, periodLabel, totalBalanceBRL);
    } else {
      exportAccountsToCSV(filteredTxs, regularAccounts, periodLabel);
    }
  };

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAccount] = useState<Account | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [type, setType] = useState<string>("CHECKING");
  const [bankId, setBankId] = useState("");
  const [balance, setBalance] = useState("");
  const [isInternational, setIsInternational] = useState(false);
  const [currency, setCurrency] = useState("USD");

  const nationalAccounts = useMemo(() => (regularAccounts || []).filter(a => !a.is_international), [regularAccounts]);
  const internationalAccounts = useMemo(() => (regularAccounts || []).filter(a => a.is_international), [regularAccounts]);

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  const getLastTransactions = (accountId: string) => allTransactions.filter(t => t.account_id === accountId || t.destination_account_id === accountId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);

  const handleCreate = async () => {
    const bank = bankId ? getBankById(bankId) : null;
    await createAccount.mutateAsync({ name: bank ? `${bank.name} - ${accountTypeLabels[type] || type}` : accountTypeLabels[type] || type, type: type as any, bank_id: bankId || null, balance: parseFloat(balance) || 0, is_international: isInternational, currency: isInternational ? currency : 'BRL' });
    setShowAddDialog(false);
    resetForm();
  };

  const resetForm = () => { setType("CHECKING"); setBankId(""); setBalance(""); setIsInternational(false); setCurrency("USD"); };

  if (isLoading) return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 border border-border/50 bg-card/50">
        <div className="space-y-3">
          <div className="skeleton h-10 w-40 rounded-xl" />
          <div className="skeleton h-4 w-64 rounded-lg" />
        </div>
      </div>
      <div className="skeleton h-24 rounded-2xl" />
      <div className="space-y-4">
        <div className="skeleton h-4 w-40 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
  if (isError) return <div className="text-center p-8 border rounded-2xl"><h2 className="text-xl font-bold mb-2">Erro ao carregar contas</h2><Button onClick={() => refetch()} variant="outline">Tentar novamente</Button></div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tighter">Contas</h1>
            <p className="text-muted-foreground mt-1 font-medium">Gerencie suas contas bancárias</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" variant="outline" className="gap-2 shadow-sm border-border/80">
                  <Download className="h-5 w-5" />
                  <span>Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem onClick={() => handleExportAccounts('PDF', 'MONTH')}>
                  Mensal em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportAccounts('CSV', 'MONTH')}>
                  Mensal em Excel (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportAccounts('PDF', 'YEAR')}>
                  Anual em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportAccounts('CSV', 'YEAR')}>
                  Anual em Excel (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="lg" onClick={() => setShowAddDialog(true)} className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 group">
              <Plus className="h-5 w-5 mr-2 transition-transform group-hover:rotate-90" /> 
              Nova conta
            </Button>
          </div>
        </div>
      </div>

      <AccountSummary balancesByCurrency={balancesByCurrency} activeAccountsCount={regularAccounts.length} />

      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Contas Nacionais ({nationalAccounts.length})</h2>
        {nationalAccounts.length === 0 ? <div className="py-12 text-center border border-dashed rounded-xl"><Wallet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" /><p className="text-muted-foreground">Nenhuma conta cadastrada</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{nationalAccounts.map(acc => <AccountCard key={acc.id} account={acc} lastTransactions={getLastTransactions(acc.id)} formatCurrency={formatCurrency} getCurrencySymbol={getCurrencySymbol} accountTypeLabels={accountTypeLabels} />)}</div>}
      </div>

      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium flex items-center gap-2"><Globe className="h-4 w-4" /> Contas Internacionais ({internationalAccounts.length})</h2>
        {internationalAccounts.length === 0 ? <div className="py-12 text-center border border-dashed rounded-xl bg-blue-50/20"><Globe className="h-10 w-10 mx-auto mb-3 text-blue-500" /><p className="text-muted-foreground mb-4">Nenhuma conta global</p><Button variant="outline" onClick={() => { setIsInternational(true); setShowAddDialog(true); }}>Adicionar</Button></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{internationalAccounts.map(acc => <AccountCard key={acc.id} account={acc} lastTransactions={getLastTransactions(acc.id)} formatCurrency={formatCurrency} getCurrencySymbol={getCurrencySymbol} accountTypeLabels={accountTypeLabels} />)}</div>}
      </div>

      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova conta</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 border rounded-xl">
              <div className="flex items-center gap-3"><Globe className="h-5 w-5 text-blue-500" /><div><p className="font-medium">Conta Internacional</p></div></div>
              <Switch checked={isInternational} onCheckedChange={(v) => { setIsInternational(v); setBankId(""); setType(v ? "GLOBAL_ACCOUNT" : "CHECKING"); }} />
            </div>
            <div className="space-y-2">
              <Label>{isInternational ? 'Instituição' : 'Banco'}</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">{isInternational ? Object.values(internationalBanks).map(b => <SelectItem key={b.id} value={b.id}><div className="flex items-center gap-2"><BankIcon bankId={b.id} size="sm" />{b.name}</div></SelectItem>) : Object.values(banks).filter(b => b.id !== 'default').map(b => <SelectItem key={b.id} value={b.id}><div className="flex items-center gap-2"><BankIcon bankId={b.id} size="sm" />{b.name}</div></SelectItem>)}</SelectContent>
              </Select>
            </div>
            {isInternational && <div className="space-y-2"><Label>Moeda</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{currencies.map(c => <SelectItem key={c.value} value={c.value}><span className="font-mono text-xs mr-2">{c.symbol}</span>{c.label}</SelectItem>)}</SelectContent></Select></div>}
            <div className="space-y-2"><Label>Tipo</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(isInternational ? [{v:"GLOBAL_ACCOUNT",l:"Conta Global"}] : [{v:"CHECKING",l:"Conta Corrente"},{v:"SAVINGS",l:"Poupança"},{v:"INVESTMENT",l:"Investimento"},{v:"CASH",l:"Dinheiro"},{v:"EMERGENCY_FUND",l:"Reserva de Emergência"}]).map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Saldo inicial</Label><CurrencyInput value={balance} onChange={setBalance} currency={isInternational ? currency : "BRL"} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button><Button onClick={handleCreate} disabled={!bankId || createAccount.isPending}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent><DialogHeader><DialogTitle>Editar conta</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Saldo atual</Label><CurrencyInput value={editBalance} onChange={setEditBalance} currency={editingAccount?.currency || "BRL"} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button><Button onClick={async () => { if (editingAccount) { await updateAccount.mutateAsync({ id: editingAccount.id, name: editName, balance: parseFloat(editBalance) || 0 }); setShowEditDialog(false); } }}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir conta?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={async () => { if (deleteId) { await deleteAccount.mutateAsync(deleteId); setDeleteId(null); } }} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <ArchivedAccountsSection />
      <TransactionModal isOpen={showTransactionModal} onClose={() => setShowTransactionModal(false)} />
    </div>
  );
}
