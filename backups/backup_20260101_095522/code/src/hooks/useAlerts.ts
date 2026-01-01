import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useMemo } from "react";

export type AlertType = 
  | "NEGATIVE_BALANCE"
  | "CREDIT_LIMIT_WARNING"
  | "DUPLICATE_TRANSACTION"
  | "BUDGET_WARNING"
  | "INSTALLMENT_DUE"
  | "RECURRING_PENDING";

export type AlertSeverity = "info" | "warning" | "error";

export interface FinancialAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export function useFinancialAlerts() {
  const { user } = useAuth();
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();

  const alerts = useMemo(() => {
    if (!user) return [];

    const alertList: FinancialAlert[] = [];

    // 1. Check negative balances
    accounts.forEach((account) => {
      if (account.type !== "CARTÃO DE CRÉDITO" && Number(account.balance) < 0) {
        alertList.push({
          id: `negative-${account.id}`,
          type: "NEGATIVE_BALANCE",
          severity: "error",
          title: "Saldo Negativo",
          message: `A conta "${account.name}" está com saldo negativo.`,
          metadata: { accountId: account.id, balance: account.balance },
          createdAt: new Date(),
        });
      }
    });

    // 2. Check credit card limits (>80%)
    accounts.forEach((account) => {
      if (account.type === "CARTÃO DE CRÉDITO" && account.credit_limit) {
        const used = Math.abs(Number(account.balance));
        const limit = Number(account.credit_limit);
        const percentage = (used / limit) * 100;

        if (percentage >= 80) {
          alertList.push({
            id: `credit-limit-${account.id}`,
            type: "CREDIT_LIMIT_WARNING",
            severity: percentage >= 95 ? "error" : "warning",
            title: "Limite do Cartão",
            message: `O cartão "${account.name}" está com ${percentage.toFixed(0)}% do limite utilizado.`,
            metadata: { accountId: account.id, percentage, used, limit },
            createdAt: new Date(),
          });
        }
      }
    });

    // 3. Check upcoming installments (next 7 days)
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    transactions.forEach((tx) => {
      if (tx.is_installment && tx.current_installment && tx.total_installments) {
        const txDate = new Date(tx.date);
        if (txDate >= today && txDate <= nextWeek) {
          alertList.push({
            id: `installment-${tx.id}`,
            type: "INSTALLMENT_DUE",
            severity: "info",
            title: "Parcela Próxima",
            message: `Parcela ${tx.current_installment}/${tx.total_installments} de "${tx.description}" vence em breve.`,
            metadata: { transactionId: tx.id },
            createdAt: new Date(),
          });
        }
      }
    });

    return alertList;
  }, [user, accounts, transactions]);

  return {
    alerts,
    hasAlerts: alerts.length > 0,
    errorCount: alerts.filter((a) => a.severity === "error").length,
    warningCount: alerts.filter((a) => a.severity === "warning").length,
    infoCount: alerts.filter((a) => a.severity === "info").length,
  };
}
