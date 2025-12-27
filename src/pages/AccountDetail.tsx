import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useAccounts, useDeleteAccount } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBankById } from "@/lib/banks";

export function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: accounts = [] } = useAccounts();
  const { data: allTransactions = [] } = useTransactions();
  const deleteAccount = useDeleteAccount();

  const account = accounts.find(a => a.id === id);
  
  // Filtrar transações desta conta
  const transactions = allTransactions.filter(
    t => t.account_id === id || t.destination_account_id === id
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Saldo */}
      <div className="p-6 rounded-xl border border-border" style={{ backgroundColor: bank?.color || "#000", color: bank?.textColor || "#fff" }}>
        <p className="text-sm opacity-70 mb-2">Saldo {isCredit ? "Atual" : "Disponível"}</p>
        <p className="font-mono text-4xl font-bold">
          {formatCurrency(Number(account.balance))}
        </p>
        {isCredit && account.credit_limit && (
          <p className="text-sm opacity-70 mt-2">
            Limite: {formatCurrency(Number(account.credit_limit))}
          </p>
        )}
      </div>

      {/* Extrato */}
      <div className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Extrato
        </h2>
        
        {transactions.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">Nenhuma transação nesta conta</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx) => {
              const isIncome = tx.type === "INCOME" || tx.destination_account_id === id;
              const txDate = new Date(tx.date);
              
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      isIncome ? "bg-positive/10" : "bg-negative/10"
                    )}>
                      {isIncome ? (
                        <TrendingUp className="h-5 w-5 text-positive" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-negative" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(txDate, "dd MMM yyyy", { locale: ptBR })}
                        {tx.category?.name && ` • ${tx.category.name}`}
                      </p>
                    </div>
                  </div>
                  <p className={cn(
                    "font-mono font-semibold",
                    isIncome ? "text-positive" : "text-negative"
                  )}>
                    {isIncome ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
