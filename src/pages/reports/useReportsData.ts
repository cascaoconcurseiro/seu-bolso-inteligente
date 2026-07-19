import { useCallback, useMemo } from "react";
import { moneyUtils } from "@/utils/money";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { isInReportPeriod, type ReportViewType } from "./reportPeriod";

const getTransactionCurrency = (tx: any): string => {
  if (tx.currency && tx.currency !== "BRL") return tx.currency;
  if (Array.isArray(tx.account) && tx.account.length > 0 && tx.account[0].currency)
    return tx.account[0].currency;
  if (tx.account && !Array.isArray(tx.account) && tx.account.currency) return tx.account.currency;
  return "BRL";
};

interface UseReportsDataProps {
  viewType: ReportViewType;
  customStartDate: string;
  customEndDate: string;
  txSearch: string;
  txTypeFilter: string;
  selectedCurrency: string;
  allTransactions: any[];
  sharedTransactions: any[];
  categories: any[];
  accounts: any[];
  familyMembers: any[];
  safeCurrentDate: Date;
  myMemberId?: string;
  user: any;
}

export function useReportsData({
  viewType,
  customStartDate,
  customEndDate,
  txSearch,
  txTypeFilter,
  selectedCurrency,
  allTransactions,
  sharedTransactions,
  categories,
  accounts,
  familyMembers,
  safeCurrentDate,
  myMemberId,
  user,
}: UseReportsDataProps) {
  const reportPeriod = useMemo(
    () => ({ viewType, currentDate: safeCurrentDate, customStartDate, customEndDate }),
    [customEndDate, customStartDate, safeCurrentDate, viewType]
  );

  const getReportDate = useCallback(
    (tx: any) => {
      const isCreditCard =
        tx.account_id &&
        accounts.some((account) => account.id === tx.account_id && account.type === "CREDIT_CARD");
      return isCreditCard && tx.competence_date ? tx.competence_date : tx.date;
    },
    [accounts]
  );
  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>(["BRL"]);
    allTransactions.forEach((tx) => {
      const currency = getTransactionCurrency(tx);
      if (currency !== "BRL") currencies.add(currency);
    });

    // Moedas das transações compartilhadas envolvidas
    sharedTransactions.forEach((tx: any) => {
      const isMeThePayer =
        tx.user_id === user?.id || (tx.payer_id === myMemberId && tx.payer_id != null);

      let isMeInvolved = isMeThePayer;
      if (!isMeInvolved && tx.is_shared && tx.transaction_splits) {
        isMeInvolved = tx.transaction_splits.some((s: any) => s.member_id === myMemberId);
      }
      if (
        !isMeInvolved &&
        !tx.is_shared &&
        tx.domain === "SHARED" &&
        tx.related_member_id === myMemberId
      ) {
        isMeInvolved = true;
      }

      if (isMeInvolved) {
        const currency = tx.currency || "BRL";
        if (currency !== "BRL") currencies.add(currency);
      }
    });

    accounts.forEach((acc) => {
      if (acc.is_international && acc.currency) currencies.add(acc.currency);
    });
    return Array.from(currencies).sort();
  }, [allTransactions, sharedTransactions, accounts, myMemberId, user?.id]);

  const allCombinedTransactions = useMemo(() => {
    // 1. Processar transações onde o usuário logado é o pagador
    const processedOwn = allTransactions
      .map((tx) => {
        const isSettlement =
          (tx.description?.includes("Acerto") ||
            tx.description?.includes("acerto") ||
            (tx as any).is_settled) &&
          tx.domain === "SHARED";
        if (isSettlement) return null;

        if (tx.is_shared && tx.transaction_splits && tx.transaction_splits.length > 0) {
          const settledByOthers = (tx.transaction_splits as any[])
            .filter(
              (s: any) =>
                s.member_id !== myMemberId &&
                (s.is_settled === true || s.settled_by_debtor === true)
            )
            .reduce(
              (sum: number, s: any) =>
                SafeFinancialCalculator.add(sum, Number(s.amount)).toNumber(),
              0
            );

          const netAmount = Math.max(
            0,
            SafeFinancialCalculator.subtract(Number(tx.amount), settledByOthers).toNumber()
          );
          return { ...tx, amount: netAmount };
        }

        if (!tx.is_shared && tx.domain === "SHARED" && (tx as any).related_member_id) {
          if ((tx as any).related_member_id !== myMemberId) {
            if ((tx as any).is_settled === true) return { ...tx, amount: 0 };
            return tx;
          }
        }

        return tx;
      })
      .filter(Boolean) as any[];

    // 2. Processar despesas de terceiros onde O USUÁRIO LOGADO JÁ ACERTOU
    const processedOthers: any[] = [];
    sharedTransactions.forEach((tx: any) => {
      const isMeThePayer =
        tx.user_id === user?.id || (tx.payer_id === myMemberId && tx.payer_id != null);
      if (isMeThePayer) return;

      const isSettlement =
        (tx.description?.includes("Acerto") ||
          tx.description?.includes("acerto") ||
          tx.is_settled) &&
        tx.domain === "SHARED";
      if (isSettlement) return;

      if (tx.is_shared && tx.transaction_splits) {
        const mySettledSplit = tx.transaction_splits.find(
          (s: any) =>
            s.member_id === myMemberId && (s.is_settled === true || s.settled_by_debtor === true)
        );
        if (mySettledSplit) {
          processedOthers.push({
            ...tx,
            id: `${tx.id}-injected-settled-split`,
            amount: Number(mySettledSplit.amount),
            user_id: user?.id || tx.user_id,
          });
        }
      }

      if (!tx.is_shared && tx.domain === "SHARED" && tx.related_member_id === myMemberId) {
        if ((tx as any).is_settled === true) {
          processedOthers.push({
            ...tx,
            id: `${tx.id}-injected-direct-settled`,
            amount: Number(tx.amount),
            user_id: user?.id || tx.user_id,
          });
        }
      }
    });

    return [...processedOwn, ...processedOthers];
  }, [allTransactions, sharedTransactions, myMemberId, user?.id]);

  const periodTransactions = useMemo(() => {
    return allCombinedTransactions.filter((tx: any) => {
      const txDateStr = getReportDate(tx);
      if (!txDateStr || !isInReportPeriod(txDateStr, reportPeriod)) return false;
      const txCurr = getTransactionCurrency(tx);
      const matchesCurrency = selectedCurrency === "ALL" || txCurr === selectedCurrency;

      return matchesCurrency;
    });
  }, [allCombinedTransactions, getReportDate, reportPeriod, selectedCurrency]);

  const sharedPeriodTransactions = useMemo(() => {
    return sharedTransactions.filter((tx: any) => {
      const txDateStr = getReportDate(tx);
      if (!txDateStr || !isInReportPeriod(txDateStr, reportPeriod)) return false;
      const txCurr = getTransactionCurrency(tx);
      return selectedCurrency === "ALL" || txCurr === selectedCurrency;
    });
  }, [getReportDate, reportPeriod, selectedCurrency, sharedTransactions]);

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const income = periodTransactions
      .filter((t) => t.type === "INCOME" && !(t as any).is_refund)
      .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)), 0);
    const rawExpense = periodTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)), 0);
    const refunds = periodTransactions
      .filter((t) => t.type === "INCOME" && (t as any).is_refund)
      .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)), 0);
    const netExpense = Math.max(0, rawExpense - refunds);
    return {
      totalIncome: income,
      totalExpense: netExpense,
      balance: income - netExpense,
    };
  }, [periodTransactions]);

  const categoryData = useMemo(() => {
    const map: Record<string, { value: number; count: number }> = {};
    const expenses = periodTransactions.filter((t) => t.type === "EXPENSE");

    expenses.forEach((tx) => {
      let categoryName = "Sem categoria";

      if (
        tx.category &&
        tx.category.id &&
        tx.category.name &&
        tx.category.name !== "null" &&
        tx.category.name !== "undefined"
      ) {
        const catId = tx.category.id;
        const catInfo = categories.find((c) => c.id === catId);

        if (catInfo) {
          if (catInfo.parent_category_id) {
            const parentCat = categories.find((c) => c.id === catInfo.parent_category_id);
            if (parentCat) {
              categoryName =
                `${parentCat.icon || "🏷️"} ${parentCat.name} › ${catInfo.icon || "🏷️"} ${catInfo.name}`.trim();
            } else {
              categoryName = `${catInfo.icon || "🏷️"} ${catInfo.name}`.trim();
            }
          } else {
            categoryName = `${catInfo.icon || "🏷️"} ${catInfo.name}`.trim();
          }
        } else {
          categoryName = tx.category.icon
            ? `${tx.category.icon} ${tx.category.name}`
            : tx.category.name;
        }
      }

      if (
        !categoryName ||
        categoryName.trim() === "" ||
        categoryName === "null" ||
        categoryName === "undefined"
      ) {
        categoryName = "Sem categoria";
      }

      let finalAmount = Number(tx.amount || 0);
      if (tx.transaction_splits && Array.isArray(tx.transaction_splits)) {
        tx.transaction_splits.forEach((split: any) => {
          if (split.is_settled) {
            finalAmount = SafeFinancialCalculator.subtract(
              finalAmount,
              Number(split.amount || 0)
            ).toNumber();
          }
        });
      }

      if (finalAmount > 0) {
        if (!map[categoryName]) map[categoryName] = { value: 0, count: 0 };
        map[categoryName].value = SafeFinancialCalculator.add(
          map[categoryName].value,
          finalAmount
        ).toNumber();
        map[categoryName].count += 1;
      }
    });
    const total = SafeFinancialCalculator.safeSum(
      Object.values(map).map((c) => c.value)
    ).toNumber();
    return Object.entries(map)
      .map(([category, d]) => ({
        category,
        value: d.value,
        count: d.count,
        percent: total > 0 ? Math.round((d.value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [periodTransactions, categories]);

  const personData = useMemo(() => {
    const map: Record<string, any> = {};

    familyMembers.forEach((m) => {
      map[m.name] = { name: m.name, spent: 0, received: 0, balance: 0, count: 0 };
    });

    sharedPeriodTransactions.forEach((tx: any) => {
      if (tx.is_shared && tx.transaction_splits) {
        const involvedMembers = new Set<string>();

        let payerName = "Desconhecido";
        if (tx.payer_id) {
          const payerMember = familyMembers.find(
            (m) => m.id === tx.payer_id || m.linked_user_id === tx.payer_id
          );
          if (payerMember) payerName = payerMember.name;
        }
        if (payerName === "Desconhecido") {
          const creatorMember = familyMembers.find((m) => m.linked_user_id === tx.user_id);
          if (creatorMember) payerName = creatorMember.name;
        }

        if (!map[payerName]) {
          map[payerName] = { name: payerName, spent: 0, received: 0, balance: 0, count: 0 };
        }
        map[payerName].spent = SafeFinancialCalculator.add(map[payerName].spent, Number(tx.amount));
        involvedMembers.add(payerName);

        tx.transaction_splits.forEach((split: any) => {
          const member = familyMembers.find(
            (m) => m.id === split.member_id || m.linked_user_id === split.member_id
          );
          const name = member?.name || split.name || "Desconhecido";

          if (!map[name]) {
            map[name] = { name, spent: 0, received: 0, balance: 0, count: 0 };
          }
          map[name].received = SafeFinancialCalculator.add(
            map[name].received,
            Number(split.amount)
          );
          involvedMembers.add(name);
        });

        involvedMembers.forEach((name) => {
          map[name].count += 1;
        });
      } else if (!tx.is_shared && tx.domain === "SHARED" && tx.related_member_id) {
        const creatorMember = familyMembers.find((m) => m.linked_user_id === tx.user_id);
        const receiverMember = familyMembers.find((m) => m.id === tx.related_member_id);

        const payerName = creatorMember?.name || "Desconhecido";
        const receiverName = receiverMember?.name || "Desconhecido";

        if (!map[payerName])
          map[payerName] = { name: payerName, spent: 0, received: 0, balance: 0, count: 0 };
        if (!map[receiverName])
          map[receiverName] = { name: receiverName, spent: 0, received: 0, balance: 0, count: 0 };

        map[payerName].spent = SafeFinancialCalculator.add(map[payerName].spent, Number(tx.amount));
        map[receiverName].received = SafeFinancialCalculator.add(
          map[receiverName].received,
          Number(tx.amount)
        );

        map[payerName].count += 1;
        if (payerName !== receiverName) {
          map[receiverName].count += 1;
        }
      } else if (
        !tx.is_shared &&
        tx.domain === "SHARED" &&
        (tx.description?.includes("Acerto") || tx.description?.includes("acerto") || tx.is_settled)
      ) {
        const creatorMember = familyMembers.find((m) => m.linked_user_id === tx.user_id);
        const otherMember = familyMembers.find((m) => m.linked_user_id !== tx.user_id);

        if (creatorMember && otherMember) {
          const payerName = tx.type === "EXPENSE" ? creatorMember.name : otherMember.name;
          const receiverName = tx.type === "EXPENSE" ? otherMember.name : creatorMember.name;

          if (!map[payerName])
            map[payerName] = { name: payerName, spent: 0, received: 0, balance: 0, count: 0 };
          if (!map[receiverName])
            map[receiverName] = { name: receiverName, spent: 0, received: 0, balance: 0, count: 0 };

          map[payerName].spent = SafeFinancialCalculator.add(
            map[payerName].spent,
            Number(tx.amount)
          );
          map[receiverName].received = SafeFinancialCalculator.add(
            map[receiverName].received,
            Number(tx.amount)
          );

          map[payerName].count += 1;
          map[receiverName].count += 1;
        }
      }
    });

    return Object.values(map)
      .map((p) => ({ ...p, balance: moneyUtils.round(p.spent - p.received) }))
      .sort((a, b) => b.spent - a.spent);
  }, [sharedPeriodTransactions, familyMembers]);

  const installmentsByPerson = useMemo(() => {
    const map: Record<string, any> = {};

    sharedTransactions
      .filter(
        (tx: any) =>
          tx.is_installment &&
          tx.series_id &&
          (selectedCurrency === "ALL" || getTransactionCurrency(tx) === selectedCurrency)
      )
      .forEach((tx: any) => {
        const txDateStr = getReportDate(tx);
        const isInPeriod = Boolean(txDateStr && isInReportPeriod(txDateStr, reportPeriod));

        if (tx.is_shared && tx.transaction_splits) {
          (tx as any).transaction_splits.forEach((split: any) => {
            const member = familyMembers.find(
              (m) => m.id === split.member_id || m.linked_user_id === split.member_id
            );
            const name = member?.name || split.name || "Desconhecido";
            if (!map[name])
              map[name] = {
                name,
                periodAmount: 0,
                totalAmount: 0,
                remainingAmount: 0,
                totalInstallments: 0,
                remainingInstallments: 0,
                series: new Set(),
              };

            map[name].series.add(tx.series_id!);
            const amt = Number(split.amount);

            map[name].totalAmount = SafeFinancialCalculator.add(map[name].totalAmount, amt);

            if (isInPeriod) {
              map[name].periodAmount = SafeFinancialCalculator.add(map[name].periodAmount, amt);
            }

            const isRemaining = !split.is_settled;
            if (isRemaining) {
              map[name].remainingAmount = SafeFinancialCalculator.add(
                map[name].remainingAmount,
                amt
              );
              map[name].remainingInstallments += 1;
            }
            map[name].totalInstallments += 1;
          });
        } else if (!tx.is_shared && tx.domain === "SHARED" && tx.related_member_id) {
          const member = familyMembers.find((m) => m.id === tx.related_member_id);
          const name = member?.name || "Desconhecido";
          if (!map[name])
            map[name] = {
              name,
              periodAmount: 0,
              totalAmount: 0,
              remainingAmount: 0,
              totalInstallments: 0,
              remainingInstallments: 0,
              series: new Set(),
            };

          map[name].series.add(tx.series_id!);
          const amt = Number(tx.amount);

          map[name].totalAmount = SafeFinancialCalculator.add(map[name].totalAmount, amt);

          if (isInPeriod) {
            map[name].periodAmount = SafeFinancialCalculator.add(map[name].periodAmount, amt);
          }

          const isRemaining = !tx.is_settled;
          if (isRemaining) {
            map[name].remainingAmount = SafeFinancialCalculator.add(map[name].remainingAmount, amt);
            map[name].remainingInstallments += 1;
          }
          map[name].totalInstallments += 1;
        }
      });
    return Object.values(map)
      .map((p) => ({ ...p, seriesCount: p.series.size }))
      .sort((a, b) => b.periodAmount - a.periodAmount);
  }, [familyMembers, getReportDate, reportPeriod, selectedCurrency, sharedTransactions]);

  const largestExpense = useMemo(() => {
    const expenses = periodTransactions.filter((t) => t.type === "EXPENSE");
    if (expenses.length === 0) return null;
    return expenses.reduce(
      (max, t) => (Number(t.amount) > Number(max.amount) ? t : max),
      expenses[0]
    );
  }, [periodTransactions]);

  const dailyAverageExpense = useMemo(() => {
    if (totalExpense <= 0) return 0;
    const days =
      viewType === "CUSTOM"
        ? Math.max(
            1,
            dateFns.differenceInCalendarDays(
              new Date(`${customEndDate}T12:00:00`),
              new Date(`${customStartDate}T12:00:00`)
            ) + 1
          )
        : viewType === "YEAR"
          ? 365
          : dateFns.getDaysInMonth(safeCurrentDate);
    return moneyUtils.round(totalExpense / days);
  }, [customEndDate, customStartDate, totalExpense, viewType, safeCurrentDate]);

  const topCategory = useMemo(() => {
    if (categoryData.length === 0) return null;
    return categoryData[0];
  }, [categoryData]);

  const savingsGoalStatus = useMemo(() => {
    const rate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
    if (rate >= 20)
      return {
        text: "Excelente! (Economizou > 20%)",
        color: "text-success bg-success/12 border-success/20",
      };
    if (rate >= 10)
      return {
        text: "No caminho! (Economizou > 10%)",
        color: "text-accent bg-accent/10 border-accent/20",
      };
    if (rate > 0)
      return {
        text: "Bom, mas tente poupar 10%",
        color: "text-warning bg-warning/12 border-warning/20",
      };
    return {
      text: "Alerta: Gastos superaram receitas",
      color: "text-destructive bg-destructive/12 border-destructive/20",
    };
  }, [totalIncome, balance]);

  const filteredTxList = useMemo(() => {
    return periodTransactions.filter((tx) => {
      const matchesSearch =
        txSearch.trim() === "" ||
        tx.description?.toLowerCase().includes(txSearch.toLowerCase()) ||
        tx.category?.name?.toLowerCase().includes(txSearch.toLowerCase());

      const matchesType = txTypeFilter === "ALL" || tx.type === txTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [periodTransactions, txSearch, txTypeFilter]);

  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = dateFns.subMonths(safeCurrentDate, i);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();

      const monthTxs = allCombinedTransactions.filter((tx) => {
        const creditCardIds = accounts.filter((a) => a.type === "CREDIT_CARD").map((a) => a.id);
        const isCreditCard = tx.account_id && creditCardIds.includes(tx.account_id);
        const txDateStr = isCreditCard && tx.competence_date ? tx.competence_date : tx.date;

        if (!txDateStr) return false;
        const parts = txDateStr.split("-");
        if (parts.length < 2) return false;
        const txYear = parseInt(parts[0], 10);
        const txMonth = parseInt(parts[1], 10) - 1;
        if (txYear !== year || txMonth !== month) return false;
        const txCurr = getTransactionCurrency(tx);
        return selectedCurrency === "ALL" || txCurr === selectedCurrency;
      });

      const income = monthTxs
        .filter((t) => t.type === "INCOME" && !(t as any).is_refund)
        .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)), 0);
      const rawExpense = monthTxs
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)), 0);
      const refunds = monthTxs
        .filter((t) => t.type === "INCOME" && (t as any).is_refund)
        .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)), 0);
      const netExpense = moneyUtils.round(Math.max(0, rawExpense - refunds));

      months.push({
        month: dateFns.format(monthDate, "MMM", { locale: ptBR }),
        income: moneyUtils.round(income),
        expense: netExpense,
        month_start: dateFns.format(monthDate, "yyyy-MM-01"),
      });
    }
    return months;
  }, [allCombinedTransactions, safeCurrentDate, selectedCurrency, accounts]);

  return {
    availableCurrencies,
    allCombinedTransactions,
    periodTransactions,
    sharedPeriodTransactions,
    totalIncome,
    totalExpense,
    balance,
    categoryData,
    personData,
    installmentsByPerson,
    largestExpense,
    dailyAverageExpense,
    topCategory,
    savingsGoalStatus,
    filteredTxList,
    monthlyData,
  };
}
