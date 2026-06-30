import { useState, useMemo } from "react";
import { showActionFeedback } from "@/components/ui/ActionFeedback";
import { Button } from "@/components/ui/button";
import { ArchivedAccountsSection } from "@/components/accounts/ArchivedAccountsSection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, Plus, Globe, Download, Loader2, Edit, Archive, AlertCircle } from "lucide-react";
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useArchiveAccount,
} from "@/hooks/useAccounts";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useMonth } from "@/contexts/MonthContext";
import * as dateFns from "date-fns";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";

// Modular Components
import { AccountCard } from "@/components/accounts/AccountCard";
import { AccountSummary } from "@/components/accounts/AccountSummary";
import { AccountFormModal } from "@/components/accounts/AccountFormModal";
import { logger } from "@/utils/logger";
import { EmptyState } from "@/components/ui/empty-state";

const accountTypeLabels: Record<string, string> = {
  CHECKING: "Conta Corrente",
  SAVINGS: "Poupança",
  CREDIT_CARD: "Cartão de Crédito",
  INVESTMENT: "Investimento",
  CASH: "Dinheiro",
  EMERGENCY_FUND: "Reserva de Emergência",
  GLOBAL_ACCOUNT: "Conta Global",
};

const currencies = [
  { value: "USD", label: "USD - Dólar Americano", symbol: "$" },
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "GBP", label: "GBP - Libra Esterlina", symbol: "£" },
  { value: "CAD", label: "CAD - Dólar Canadense", symbol: "C$" },
  { value: "AUD", label: "AUD - Dólar Australiano", symbol: "A$" },
  { value: "JPY", label: "JPY - Iene Japonês", symbol: "¥" },
  { value: "CHF", label: "CHF - Franco Suíço", symbol: "CHF" },
  { value: "CNY", label: "CNY - Yuan Chinês", symbol: "¥" },
  { value: "MXN", label: "MXN - Peso Mexicano", symbol: "$" },
  { value: "ARS", label: "ARS - Peso Argentino", symbol: "$" },
  { value: "CLP", label: "CLP - Peso Chileno", symbol: "$" },
  { value: "COP", label: "COP - Peso Colombiano", symbol: "$" },
  { value: "PEN", label: "PEN - Sol Peruano", symbol: "S/" },
  { value: "UYU", label: "UYU - Peso Uruguaio", symbol: "$" },
  { value: "NZD", label: "NZD - Dólar Neozelandês", symbol: "NZ$" },
  { value: "SGD", label: "SGD - Dólar de Singapura", symbol: "S$" },
  { value: "HKD", label: "HKD - Dólar de Hong Kong", symbol: "HK$" },
  { value: "KRW", label: "KRW - Won Sul-Coreano", symbol: "₩" },
  { value: "INR", label: "INR - Rúpia Indiana", symbol: "₹" },
  { value: "THB", label: "THB - Baht Tailandês", symbol: "฿" },
  { value: "ZAR", label: "ZAR - Rand Sul-Africano", symbol: "R" },
  { value: "TRY", label: "TRY - Lira Turca", symbol: "₺" },
  { value: "RUB", label: "RUB - Rublo Russo", symbol: "₽" },
  { value: "PLN", label: "PLN - Zloty Polonês", symbol: "zł" },
  { value: "SEK", label: "SEK - Coroa Sueca", symbol: "kr" },
  { value: "NOK", label: "NOK - Coroa Norueguesa", symbol: "kr" },
  { value: "DKK", label: "DKK - Coroa Dinamarquesa", symbol: "kr" },
  { value: "CZK", label: "CZK - Coroa Tcheca", symbol: "Kč" },
  { value: "HUF", label: "HUF - Forint Húngaro", symbol: "Ft" },
  { value: "ILS", label: "ILS - Shekel Israelense", symbol: "₪" },
  { value: "AED", label: "AED - Dirham dos Emirados", symbol: "د.إ" },
  { value: "SAR", label: "SAR - Riyal Saudita", symbol: "﷼" },
];

const getCurrencySymbol = (currency: string) =>
  currencies.find((c) => c.value === currency)?.symbol || currency;

export function Accounts() {
  const { currentDate } = useMonth();
  const { data: accounts = [], isLoading, isError, refetch } = useAccounts();
  const { data: allTransactions = [] } = useTransactions({ limit: 50 });
  const { data: exportTransactions = [] } = useTransactions({
    startDate: `${currentDate.getFullYear()}-01-01`,
    endDate: `${currentDate.getFullYear()}-12-31`,
  });
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const archiveAccount = useArchiveAccount();
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();

  const [editAccount, setEditAccount] = useState<(typeof accounts)[0] | null>(null);

  const regularAccounts = useMemo(() => {
    const endOfCurrentMonth = dateFns.endOfMonth(currentDate);
    return (accounts || []).filter((a) => {
      if (a.type === "CREDIT_CARD") return false;
      const createdDate = new Date(a.created_at);
      return createdDate <= endOfCurrentMonth;
    });
  }, [accounts, currentDate]);

  const balancesByCurrency = useMemo(() => {
    const map = new Map<string, { balance: number; symbol: string }>();
    regularAccounts.forEach((a) => {
      const c = a.currency || "BRL";
      const existing = map.get(c) || { balance: 0, symbol: getCurrencySymbol(c) };
      existing.balance = SafeFinancialCalculator.add(existing.balance, Number(a.balance || 0));
      map.set(c, existing);
    });
    return Array.from(map.entries())
      .map(([currency, data]) => ({
        currency,
        ...data,
      }))
      .sort((a, b) => (a.currency === "BRL" ? -1 : 1));
  }, [regularAccounts]);

  const totalBalanceBRL = balancesByCurrency.find((b) => b.currency === "BRL")?.balance || 0;

  const [isExporting, setIsExporting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleExportAccounts = async (formatType: "PDF" | "CSV", period: "MONTH" | "YEAR") => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { exportAccountsToCSV, exportAccountsToPDF } = await import("@/utils/exportData");
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

      if (formatType === "PDF") {
        exportAccountsToPDF(filteredTxs, regularAccounts, periodLabel, totalBalanceBRL);
      } else {
        exportAccountsToCSV(filteredTxs, regularAccounts, periodLabel);
      }
    } catch (err) {
      logger.error("Erro ao exportar contas", err);
    } finally {
      setIsExporting(false);
    }
  };

  const nationalAccounts = useMemo(
    () => (regularAccounts || []).filter((a) => !a.is_international),
    [regularAccounts]
  );
  const internationalAccounts = useMemo(
    () => (regularAccounts || []).filter((a) => a.is_international),
    [regularAccounts]
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  const getLastTransactions = (accountId: string) =>
    allTransactions
      .filter((t) => t.account_id === accountId || t.destination_account_id === accountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

  const handleCreateSubmit = async (data: any) => {
    showActionFeedback("success");
    setTimeout(() => setShowAddDialog(false), 80);
    try {
      createAccount.mutate(data);
    } catch {
      /* onError do hook já mostra toast */
    }
  };

  const handleEditSubmit = async (data: any) => {
    if (!editAccount) return;
    showActionFeedback("success");
    setTimeout(() => setEditAccount(null), 80);
    try {
      updateAccount.mutate({ id: editAccount.id, ...data });
    } catch {
      /* erro tratado no hook */
    }
  };

  if (isLoading)
    return (
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
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-36 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );

  if (isError)
    return (
      <EmptyState
        icon={AlertCircle}
        title="Erro ao carregar contas"
        description="Não foi possível buscar suas contas. Verifique sua conexão e tente novamente."
        variant="danger"
        action={
          <Button onClick={() => refetch()} variant="outline" className="h-12 px-8 rounded-full">
            Tentar novamente
          </Button>
        }
      />
    );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-4 md:p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-2xl md:text-4xl tracking-tighter">
              Contas
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base font-medium">
              Gerencie suas contas bancárias
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="default"
                  variant="outline"
                  disabled={isExporting}
                  className="gap-2 shadow-sm border-border/80 w-full sm:w-auto h-10 md:h-12 px-2"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="text-xs md:text-sm">
                    {isExporting ? "Exportando..." : "Exportar"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem
                  disabled={isExporting}
                  onClick={() => handleExportAccounts("PDF", "MONTH")}
                >
                  Mensal em PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isExporting}
                  onClick={() => handleExportAccounts("CSV", "MONTH")}
                >
                  Mensal em Excel (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isExporting}
                  onClick={() => handleExportAccounts("PDF", "YEAR")}
                >
                  Anual em PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isExporting}
                  onClick={() => handleExportAccounts("CSV", "YEAR")}
                >
                  Anual em Excel (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="default"
              onClick={() => setShowAddDialog(true)}
              className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 group w-full sm:w-auto h-10 md:h-12 font-bold px-2"
            >
              <Plus className="h-4 w-4 mr-1 md:mr-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs md:text-sm">Nova conta</span>
            </Button>
          </div>
        </div>
      </div>

      <AccountSummary
        balancesByCurrency={balancesByCurrency}
        activeAccountsCount={regularAccounts.length}
      />

      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Contas Nacionais ({nationalAccounts.length})
        </h2>
        {nationalAccounts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nenhuma conta cadastrada"
            description="Adicione sua primeira conta corrente, poupança ou carteira para começar a acompanhar seu saldo."
            action={
              <Button
                onClick={() => setShowAddDialog(true)}
                className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Conta
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nationalAccounts.map((acc) => (
              <SwipeableRow
                key={acc.id}
                className="rounded-2xl"
                leftAction={{
                  icon: <Edit className="w-5 h-5" />,
                  color: "bg-primary",
                  label: "Editar",
                  onClick: () => setEditAccount(acc),
                }}
                rightAction={{
                  icon: <Archive className="w-5 h-5" />,
                  color: "bg-muted-foreground",
                  label: "Arquivar",
                  onClick: () => archiveAccount.mutate(acc.id),
                }}
              >
                <AccountCard
                  account={acc}
                  lastTransactions={getLastTransactions(acc.id)}
                  formatCurrency={formatCurrency}
                  getCurrencySymbol={getCurrencySymbol}
                  accountTypeLabels={accountTypeLabels}
                />
              </SwipeableRow>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Contas Internacionais ({internationalAccounts.length})
        </h2>
        {internationalAccounts.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="Nenhuma conta global"
            description="Adicione contas em dólar, euro ou outras moedas para acompanhar seu patrimônio internacional."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {internationalAccounts.map((acc) => (
              <SwipeableRow
                key={acc.id}
                className="rounded-2xl"
                leftAction={{
                  icon: <Edit className="w-5 h-5" />,
                  color: "bg-primary",
                  label: "Editar",
                  onClick: () => setEditAccount(acc),
                }}
                rightAction={{
                  icon: <Archive className="w-5 h-5" />,
                  color: "bg-muted-foreground",
                  label: "Arquivar",
                  onClick: () => archiveAccount.mutate(acc.id),
                }}
              >
                <AccountCard
                  account={acc}
                  lastTransactions={getLastTransactions(acc.id)}
                  formatCurrency={formatCurrency}
                  getCurrencySymbol={getCurrencySymbol}
                  accountTypeLabels={accountTypeLabels}
                />
              </SwipeableRow>
            ))}
          </div>
        )}
      </div>

      <AccountFormModal
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSubmit={handleCreateSubmit}
        mode="create"
        isLoading={createAccount.isPending}
      />

      <AccountFormModal
        isOpen={!!editAccount}
        onClose={() => setEditAccount(null)}
        onSubmit={handleEditSubmit}
        mode="edit"
        initialData={editAccount}
        isLoading={updateAccount.isPending}
      />

      <ArchivedAccountsSection />
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
      />
    </div>
  );
}
