import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { BankIcon } from "@/components/financial/BankIcon";
import { useArchivedAccounts, useUnarchiveAccount } from "@/hooks/useAccounts";

const accountTypeLabels = {
  CHECKING: "Conta Corrente",
  SAVINGS: "Poupança",
  CREDIT_CARD: "Cartão de Crédito",
  INVESTMENT: "Investimento",
  CASH: "Dinheiro",
  EMERGENCY_FUND: "Reserva de Emergência",
};

export function ArchivedAccountsSection() {
  const { data: archivedAccounts = [] } = useArchivedAccounts();
  const unarchiveAccount = useUnarchiveAccount();
  const [isExpanded, setIsExpanded] = useState(false);

  if (archivedAccounts.length === 0) {
    return null;
  }

  const formatCurrency = (value: number, currency: string = "BRL") => {
    if (currency === "BRL") {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    }
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'CHF',
    };
    const symbol = symbols[currency] || currency;
    return `${symbol} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between hover:bg-muted/50"
      >
        <span className="text-sm font-medium text-muted-foreground">
          Contas Arquivadas ({archivedAccounts.length})
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {archivedAccounts.map((account) => (
            <div
              key={account.id}
              className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <BankIcon 
                    bankId={account.bank_id} 
                    accountName={account.name}
                    size="md" 
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {accountTypeLabels[account.type as keyof typeof accountTypeLabels]}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Saldo:</span>
                  <span className={cn(
                    "font-mono text-sm font-semibold",
                    Number(account.balance) >= 0 ? "text-foreground" : "text-destructive"
                  )}>
                    {formatCurrency(Number(account.balance), account.currency)}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unarchiveAccount.mutate(account.id)}
                  disabled={unarchiveAccount.isPending}
                  className="w-full gap-2"
                >
                  <RotateCcw className="h-3 w-3" />
                  {unarchiveAccount.isPending ? "Desarquivando..." : "Desarquivar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
