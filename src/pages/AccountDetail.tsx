import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2, TrendingUp, TrendingDown, ArrowLeftRight, Banknote } from "lucide-react";
import { useAccounts, useDeleteAccount } from "@/hooks/useAccounts";
import { useAccountStatement } from "@/hooks/useAccountStatement";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBankById } from "@/lib/banks";
import { TransferModal } from "@/components/accounts/TransferModal";
import { WithdrawalModal } from "@/components/accounts/WithdrawalModal";
import { getCurrencySymbol } from "@/services/exchangeCalculations";

export function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: accounts = [] } = useAccounts();
  const { data: statementData } = useAccountStatement({ accountId: id || "" });
  const deleteAccount = useDeleteAccount();

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  const account = accounts.find(a => a.id === id);
  
  // Usar transações do extrato (inclui transferências corretamente)
  const transactions = statementData?.transactions || [];

  // Agrupar transações por data
  const groupedTransactions = transactions.reduce((groups, tx) => {
    const date = startOfDay(new Date(tx.date)).toISOString();
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
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  const handleDelete = async () => {
    if (!account) return;
    if (confirm(`Tem certeza que deseja excluir a conta "${account.name}"?`)) {
      await deleteAccount.mutateAsync(id!);
      navigate("/contas");
    }
  };

  if (!account) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contas")} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display font-bold text-2xl">Conta não encontrada</h1>
        </div>
      </div>
    );
  }

  const bank = account.bank_id ? getBankById(account.bank_id) : null;
  const isCredit = account.type === "CREDIT_CARD";
  const userAccounts = accounts.filter(a => a.id !== id && a.type !== "CREDIT_CARD");

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/contas")} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-2xl tracking-tight">{account.name}</h1>
          <p className="text-muted-foreground text-sm">
            {account.type === "CHECKING" && "Conta Corrente"}
            {account.type === "SAVINGS" && "Poupança"}
            {account.type === "CREDIT_CARD" && "Cartão de Crédito"}
            {account.type === "INVESTMENT" && "Investimento"}
            {account.type === "CASH" && "Dinheiro"}
          </p>
        </div>
      </div>

      {/* Saldo Card */}
      <div 
        className="p-8 rounded-2xl border border-border"
        style={{ backgroundColor: bank?.color || '#6366f1' }}
      >
        <p className="text-sm mb-2" style={{ color: bank?.textColor || '#fff', opacity: 0.8 }}>
          Saldo {isCredit ? "Atual" : "Disponível"}
        </p>
        <p 
          className="font-mono text-5xl font-bold mb-6"
          style={{ color: bank?.textColor || '#fff' }}
        >
          {Number(account.balance) >= 0 ? "" : "-"}{formatCurrency(Number(account.balance), accountCurrency)}
        </p>
        {isCredit && account.credit_limit && (
          <p className="text-sm" style={{ color: bank?.textColor || '#fff', opacity: 0.8 }}>
            Limite: {formatCurrency(Number(account.credit_limit), accountCurrency)}
          </p>
        )}
        {account.is_international && (
          <p className="text-xs mt-2" style={{ color: bank?.textColor || '#fff', opacity: 0.8 }}>
            🌍 Conta Internacional ({accountCurrency})
          </p>
        )}

        {/* Action Buttons */}
        {!isCredit && (
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
            <Button
              onClick={() => setShowTransferModal(true)}
              className="flex-1 gap-2"
              variant="outline"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transferir
            </Button>
            <Button
              onClick={() => setShowWithdrawalModal(true)}
              className="flex-1 gap-2"
              variant="outline"
            >
              <Banknote className="h-4 w-4" />
              Sacar
            </Button>
            <Button
              variant="outline"
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        )}
      </div>

      {/* Extrato */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Extrato
        </h2>
        
        {transactions.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">Nenhuma transação nesta conta</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((dateStr) => {
              const dayTransactions = groupedTransactions[dateStr];
              
              return (
                <div key={dateStr} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground px-2">
                    {getDateLabel(dateStr)}
                  </h3>
                  <div className="rounded-xl border border-border overflow-hidden">
                    {dayTransactions.map((tx, idx) => {
                      const isIncome = tx.isIncoming;
                      const txDate = new Date(tx.date);
                      
                      // Descrição especial para transferências
                      let description = tx.description;
                      if (tx.type === "TRANSFER") {
                        if (tx.isIncoming) {
                          description = `Transferência recebida - ${tx.description}`;
                        } else {
                          description = `Transferência enviada - ${tx.description}`;
                        }
                      }
                      
                      return (
                        <div
                          key={tx.id}
                          className={cn(
                            "flex items-center justify-between p-4 hover:bg-muted/50 transition-colors",
                            idx !== dayTransactions.length - 1 && "border-b border-border"
                          )}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                              isIncome ? "bg-positive/10" : "bg-negative/10"
                            )}>
                              {isIncome ? (
                                <TrendingUp className="h-5 w-5 text-positive" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-negative" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{description}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(txDate, "HH:mm", { locale: ptBR })}
                                {tx.category?.name && ` • ${tx.category.name}`}
                                {tx.is_installment && tx.current_installment && tx.total_installments && (
                                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted">
                                    {tx.current_installment}/{tx.total_installments}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className={cn(
                              "font-mono text-lg font-semibold",
                              isIncome ? "text-positive" : "text-negative"
                            )}>
                              {isIncome ? "+" : "-"}{formatCurrency(Math.abs(Number(tx.amount)), tx.currency || accountCurrency)}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              Saldo: {tx.runningBalance >= 0 ? "" : "-"}{formatCurrency(tx.runningBalance, accountCurrency)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      <TransferModal
        open={showTransferModal}
        onOpenChange={setShowTransferModal}
        fromAccountId={id!}
        fromAccountName={account.name}
        fromAccountBalance={Number(account.balance)}
        fromAccountCurrency={account.currency || "BRL"}
      />

      {/* Withdrawal Modal */}
      <WithdrawalModal
        open={showWithdrawalModal}
        onOpenChange={setShowWithdrawalModal}
        accountId={id!}
        accountName={account.name}
        accountBalance={Number(account.balance)}
      />
    </div>
  );
}
