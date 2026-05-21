import { moneyUtils } from "@/utils/money";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Globe } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
import { SharedBalanceChart } from "@/components/shared/SharedBalanceChart";
import { useSharedFinances } from "@/hooks/useSharedFinances";
import { useMonth } from "@/contexts/MonthContext";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import { exportToCSV, exportToPDF } from "@/utils/exportData";

// Modular Components
import { ReportSummary } from "@/components/reports/ReportSummary";
import { CategoryDistribution } from "@/components/reports/CategoryDistribution";
import { MonthlyEvolution } from "@/components/reports/MonthlyEvolution";
import { SharedFinancesTable } from "@/components/reports/SharedFinancesTable";
import { InstallmentsTable } from "@/components/reports/InstallmentsTable";

const getTransactionCurrency = (tx: any): string => {
  if (tx.currency && tx.currency !== 'BRL') return tx.currency;
  if (Array.isArray(tx.account) && tx.account.length > 0 && tx.account[0].currency) return tx.account[0].currency;
  if (tx.account && !Array.isArray(tx.account) && tx.account.currency) return tx.account.currency;
  return 'BRL';
};

export function Reports() {
  const { currentDate } = useMonth();
  const safeCurrentDate = useMemo(() => {
    if (!currentDate || isNaN(currentDate.getTime())) {
      return new Date();
    }
    return currentDate;
  }, [currentDate]);

  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();
  const [selectedCurrency, setSelectedCurrency] = useState<string>("BRL");
  const [viewType, setViewType] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [dateCriterion, setDateCriterion] = useState<'COMPETENCE' | 'DUE_DATE'>('COMPETENCE');
  
  const { user } = useAuth();
  const { data: allTransactions = [], isLoading } = useTransactions({ startDate: '2020-01-01', endDate: '2030-12-31' });
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: familyMembers = [] } = useFamilyMembers();
  const { invoices, transactions: sharedTransactions } = useSharedFinances({ activeTab: 'REGULAR', currentDate: safeCurrentDate });

  const myMember = useMemo(() => {
    if (!user || !familyMembers) return null;
    return familyMembers.find(m => m.linked_user_id === user.id);
  }, [user, familyMembers]);
  const myMemberId = myMember?.id;

  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>(['BRL']);
    allTransactions.forEach(tx => {
      const currency = getTransactionCurrency(tx);
      if (currency !== 'BRL') currencies.add(currency);
    });

    // Moedas das transações compartilhadas envolvidas
    sharedTransactions.forEach((tx: any) => {
      const isMeThePayer = tx.user_id === user?.id || (tx.payer_id === myMemberId && tx.payer_id != null);
      
      let isMeInvolved = isMeThePayer;
      if (!isMeInvolved && tx.is_shared && tx.transaction_splits) {
        isMeInvolved = tx.transaction_splits.some((s: any) => s.member_id === myMemberId);
      }
      if (!isMeInvolved && !tx.is_shared && tx.domain === 'SHARED' && tx.related_member_id === myMemberId) {
        isMeInvolved = true;
      }

      if (isMeInvolved) {
        const currency = tx.currency || 'BRL';
        if (currency !== 'BRL') currencies.add(currency);
      }
    });

    accounts.forEach(acc => { if (acc.is_international && acc.currency) currencies.add(acc.currency); });
    return Array.from(currencies).sort();
  }, [allTransactions, sharedTransactions, accounts, myMemberId, user?.id]);

  const formatCurrency = (value: number, currency: string = 'BRL') => {
    if (currency === 'BRL') return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    return `${getCurrencySymbol(currency)} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const allCombinedTransactions = useMemo(() => {
    // ─── REGRA FINANCEIRA CENTRAL ───────────────────────────────────────────────
    // Despesa só existe quando o dinheiro sai da conta.
    // • PAGADOR (Wesley): vê o valor TOTAL que saiu do bolso dele. Quando outro
    //   membro acerta (reembolsa), o valor é reduzido em tempo real.
    // • DEVEDOR (Fran): NENHUMA despesa aparece até ela fazer o acerto. Só após
    //   o acerto (dinheiro saindo da conta dela) a despesa entra no relatório.
    // ────────────────────────────────────────────────────────────────────────────

    // 1. Processar transações onde o usuário logado é o pagador
    const processedOwn = allTransactions.map(tx => {
      // Pular acertos de contas (settlements) no domínio SHARED
      const isSettlement =
        (tx.description?.includes('Acerto') || tx.description?.includes('acerto') || (tx as any).is_settled)
        && tx.domain === 'SHARED';
      if (isSettlement) return null;

      // Transação compartilhada via splits:
      // Wesley vê o valor TOTAL que pagou, mas abatemos o que outros já ressarciram
      if (tx.is_shared && tx.transaction_splits && tx.transaction_splits.length > 0) {
        const settledByOthers = (tx.transaction_splits as any[])
          .filter((s: any) => s.member_id !== myMemberId && (s.is_settled === true || s.settled_by_debtor === true))
          .reduce((sum: number, s: any) => moneyUtils.round(sum + Number(s.amount)), 0);

        // Custo líquido real = total pago − o que os outros já devolveram
        const netAmount = moneyUtils.round(Math.max(0, Number(tx.amount) - settledByOthers));
        return { ...tx, amount: netAmount };
      }

      // Atribuição direta 100% a outro membro (related_member_id)
      if (!tx.is_shared && tx.domain === 'SHARED' && (tx as any).related_member_id) {
        if ((tx as any).related_member_id !== myMemberId) {
          // Se o outro já acertou, o Wesley foi reembolsado → custo real = 0
          if ((tx as any).is_settled === true) return { ...tx, amount: 0 };
          // Ainda não acertado: Wesley carrega o valor integral no relatório
          return tx;
        }
      }

      return tx;
    }).filter(Boolean) as any[];

    // 2. Processar despesas de terceiros onde O USUÁRIO LOGADO JÁ ACERTOU
    // Fran só vê o gasto depois que o dinheiro saiu da conta dela (split.is_settled)
    const processedOthers: any[] = [];
    sharedTransactions.forEach((tx: any) => {
      // Ignorar se o usuário logado é o pagador (já processado acima)
      const isMeThePayer = tx.user_id === user?.id || (tx.payer_id === myMemberId && tx.payer_id != null);
      if (isMeThePayer) return;

      // Ignorar acertos
      const isSettlement =
        (tx.description?.includes('Acerto') || tx.description?.includes('acerto') || tx.is_settled)
        && tx.domain === 'SHARED';
      if (isSettlement) return;

      // Splits: injetar SOMENTE o split que o usuário já liquidou (acertou)
      if (tx.is_shared && tx.transaction_splits) {
        const mySettledSplit = tx.transaction_splits.find(
          (s: any) => s.member_id === myMemberId && (s.is_settled === true || s.settled_by_debtor === true)
        );
        if (mySettledSplit) {
          processedOthers.push({
            ...tx,
            id: `${tx.id}-injected-settled-split`,
            amount: Number(mySettledSplit.amount), // Valor que realmente saiu da conta
            user_id: user?.id || tx.user_id,
          });
        }
        // Split ainda não acertado → não aparece no relatório de Fran
      }

      // Atribuição direta 100%: só injetar se já foi acertada
      if (!tx.is_shared && tx.domain === 'SHARED' && tx.related_member_id === myMemberId) {
        if ((tx as any).is_settled === true) {
          processedOthers.push({
            ...tx,
            id: `${tx.id}-injected-direct-settled`,
            amount: Number(tx.amount),
            user_id: user?.id || tx.user_id,
          });
        }
        // Não acertado → não aparece no relatório de Fran
      }
    });

    return [...processedOwn, ...processedOthers];
  }, [allTransactions, sharedTransactions, myMemberId, user?.id]);

  const periodTransactions = useMemo(() => {
    console.log('🟡 [DEBUG periodTransactions] allCombinedTransactions length:', allCombinedTransactions?.length, 'selectedCurrency:', selectedCurrency);
    return allCombinedTransactions.filter(tx => {
      let txDateStr = tx.date;
      
      // Se for regime de vencimento e for despesa em cartão, usar data de vencimento da fatura
      if (dateCriterion === 'DUE_DATE' && tx.type === 'EXPENSE' && tx.account_id) {
        const acc = accounts.find(a => a.id === tx.account_id);
        if (acc && acc.type === 'CREDIT_CARD') {
          const compDate = tx.competence_date ? dateFns.parseISO(tx.competence_date) : dateFns.parseISO(tx.date);
          const dueDay = acc.due_day || 10;
          const closingDay = acc.closing_day || 1;
          
          let dueMonthDate = compDate;
          if (dueDay <= closingDay) {
            dueMonthDate = dateFns.addMonths(compDate, 1);
          }
          
          txDateStr = dateFns.format(dueMonthDate, 'yyyy-MM-dd');
        }
      }

      if (!txDateStr) return false;
      const parts = txDateStr.split('-');
      if (parts.length < 2) return false;
      const txYear = parseInt(parts[0], 10);
      const txMonth = parseInt(parts[1], 10) - 1;
      
      const targetYear = safeCurrentDate.getFullYear();
      const targetMonth = safeCurrentDate.getMonth();
      
      const isInPeriod = viewType === 'MONTH'
        ? txYear === targetYear && txMonth === targetMonth
        : txYear === targetYear;
        
      if (!isInPeriod) return false;
      const txCurr = getTransactionCurrency(tx);
      if (txCurr === 'EUR') {
        console.log('🟢 [DEBUG periodTransactions] Found EUR transaction in period:', tx.description, tx.amount, 'txCurr:', txCurr, 'selected:', selectedCurrency, 'tx.currency:', tx.currency, 'tx.account:', tx.account);
      }
      return selectedCurrency === 'ALL' || txCurr === selectedCurrency;
    });
  }, [allCombinedTransactions, safeCurrentDate, selectedCurrency, viewType, dateCriterion, accounts]);

  const sharedPeriodTransactions = useMemo(() => {
    const targetYear = safeCurrentDate.getFullYear();
    const targetMonth = safeCurrentDate.getMonth();
    
    return sharedTransactions.filter((tx: any) => {
      if (!tx.date) return false;
      const parts = tx.date.split('-');
      if (parts.length < 2) return false;
      const txYear = parseInt(parts[0], 10);
      const txMonth = parseInt(parts[1], 10) - 1;
      
      const isInPeriod = viewType === 'MONTH'
        ? txYear === targetYear && txMonth === targetMonth
        : txYear === targetYear;
        
      if (!isInPeriod) return false;
      if (!isInPeriod) return false;
      return (tx.currency || 'BRL') === selectedCurrency;
    });
  }, [sharedTransactions, safeCurrentDate, selectedCurrency, viewType]);

  const displayCurrency = selectedCurrency;

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const income = periodTransactions
      .filter(t => t.type === "INCOME" && !(t as any).is_refund)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const rawExpense = periodTransactions
      .filter(t => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const refunds = periodTransactions
      .filter(t => t.type === "INCOME" && (t as any).is_refund)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const netExpense = Math.max(0, rawExpense - refunds);
    return { 
      totalIncome: income, 
      totalExpense: netExpense, 
      balance: income - netExpense 
    };
  }, [periodTransactions]);

  const categoryData = useMemo(() => {
    const map: Record<string, { value: number; count: number }> = {};
    const expenses = periodTransactions.filter(t => t.type === "EXPENSE");
    
    expenses.forEach(tx => {
      let categoryName = "Sem categoria";
      
      if (tx.category) {
        const catId = tx.category.id;
        const catInfo = categories.find(c => c.id === catId);
        
        if (catInfo) {
          if (catInfo.parent_category_id) {
            const parentCat = categories.find(c => c.id === catInfo.parent_category_id);
            if (parentCat) {
              categoryName = `${parentCat.icon || "🏷️"} ${parentCat.name} › ${catInfo.icon || "🏷️"} ${catInfo.name}`.trim();
            } else {
              categoryName = `${catInfo.icon || "🏷️"} ${catInfo.name}`.trim();
            }
          } else {
            categoryName = `${catInfo.icon || "🏷️"} ${catInfo.name}`.trim();
          }
        } else {
          categoryName = tx.category.icon ? `${tx.category.icon} ${tx.category.name}` : tx.category.name;
        }
      }

      if (!map[categoryName]) map[categoryName] = { value: 0, count: 0 };
      map[categoryName].value += Number(tx.amount);
      map[categoryName].count += 1;
    });
    const total = Object.values(map).reduce((sum, c) => sum + c.value, 0);
    return Object.entries(map)
      .map(([category, d]) => ({ 
        category, 
        value: d.value, 
        count: d.count, 
        percent: total > 0 ? Math.round((d.value / total) * 100) : 0 
      }))
      .sort((a, b) => b.value - a.value);
  }, [periodTransactions, categories]);

  const personData = useMemo(() => {
    const map: Record<string, any> = {};
    
    familyMembers.forEach(m => {
      map[m.name] = { name: m.name, spent: 0, received: 0, balance: 0, count: 0 };
    });

    sharedPeriodTransactions.forEach((tx: any) => {
      // 1. SPLIT TRANSACTIONS (Divididas)
      if (tx.is_shared && tx.transaction_splits) {
        const involvedMembers = new Set<string>();
        
        let payerName = 'Desconhecido';
        if (tx.payer_id) {
          const payerMember = familyMembers.find(m => m.id === tx.payer_id || m.linked_user_id === tx.payer_id);
          if (payerMember) payerName = payerMember.name;
        }
        if (payerName === 'Desconhecido') {
          const creatorMember = familyMembers.find(m => m.linked_user_id === tx.user_id);
          if (creatorMember) payerName = creatorMember.name;
        }
        
        if (!map[payerName]) {
          map[payerName] = { name: payerName, spent: 0, received: 0, balance: 0, count: 0 };
        }
        map[payerName].spent = moneyUtils.round(map[payerName].spent + Number(tx.amount));
        involvedMembers.add(payerName);

        tx.transaction_splits.forEach((split: any) => {
          const member = familyMembers.find(m => m.id === split.member_id || m.linked_user_id === split.member_id);
          const name = member?.name || split.name || 'Desconhecido';
          
          if (!map[name]) {
            map[name] = { name, spent: 0, received: 0, balance: 0, count: 0 };
          }
          map[name].received = moneyUtils.round(map[name].received + Number(split.amount));
          involvedMembers.add(name);
        });

        involvedMembers.forEach(name => {
          map[name].count += 1;
        });
      }
      
      // 2. ATRIBUIÇÃO DIRETA (100% para outro membro)
      else if (!tx.is_shared && tx.domain === 'SHARED' && tx.related_member_id) {
        const creatorMember = familyMembers.find(m => m.linked_user_id === tx.user_id);
        const receiverMember = familyMembers.find(m => m.id === tx.related_member_id);
        
        const payerName = creatorMember?.name || 'Desconhecido';
        const receiverName = receiverMember?.name || 'Desconhecido';
        
        if (!map[payerName]) map[payerName] = { name: payerName, spent: 0, received: 0, balance: 0, count: 0 };
        if (!map[receiverName]) map[receiverName] = { name: receiverName, spent: 0, received: 0, balance: 0, count: 0 };
        
        map[payerName].spent = moneyUtils.round(map[payerName].spent + Number(tx.amount));
        map[receiverName].received = moneyUtils.round(map[receiverName].received + Number(tx.amount));
        
        map[payerName].count += 1;
        if (payerName !== receiverName) {
          map[receiverName].count += 1;
        }
      }
      
      // 3. ACERTOS PUROS (Settlements)
      else if (!tx.is_shared && tx.domain === 'SHARED' && (tx.description?.includes('Acerto') || tx.description?.includes('acerto') || tx.is_settled)) {
        const creatorMember = familyMembers.find(m => m.linked_user_id === tx.user_id);
        const otherMember = familyMembers.find(m => m.linked_user_id !== tx.user_id);
        
        if (creatorMember && otherMember) {
          const payerName = tx.type === 'EXPENSE' ? creatorMember.name : otherMember.name;
          const receiverName = tx.type === 'EXPENSE' ? otherMember.name : creatorMember.name;
          
          if (!map[payerName]) map[payerName] = { name: payerName, spent: 0, received: 0, balance: 0, count: 0 };
          if (!map[receiverName]) map[receiverName] = { name: receiverName, spent: 0, received: 0, balance: 0, count: 0 };
          
          map[payerName].spent = moneyUtils.round(map[payerName].spent + Number(tx.amount));
          map[receiverName].received = moneyUtils.round(map[receiverName].received + Number(tx.amount));
          
          map[payerName].count += 1;
          map[receiverName].count += 1;
        }
      }
    });

    return Object.values(map)
      .map(p => ({ ...p, balance: moneyUtils.round(p.spent - p.received) }))
      .sort((a, b) => b.spent - a.spent);
  }, [sharedPeriodTransactions, familyMembers]);

  const installmentsByPerson = useMemo(() => {
    console.log('🔴 [DEBUG Reports] Starting installmentsByPerson calculation. sharedTransactions:', sharedTransactions.length);
    const map: Record<string, any> = {};
    const targetYear = safeCurrentDate.getFullYear();
    const targetMonth = safeCurrentDate.getMonth();

    sharedTransactions.filter((tx: any) => tx.is_installment && tx.series_id).forEach((tx: any) => {
      if (!tx.date) return;
      const parts = tx.date.split('-');
      if (parts.length < 2) return;
      const txYear = parseInt(parts[0], 10);
      const txMonth = parseInt(parts[1], 10) - 1;
      
      const isInPeriod = viewType === 'MONTH'
        ? txYear === targetYear && txMonth === targetMonth
        : txYear === targetYear;

      // 1. Splits divididos
      if (tx.is_shared && tx.transaction_splits) {
        (tx as any).transaction_splits.forEach((split: any) => {
          const member = familyMembers.find(m => m.id === split.member_id || m.linked_user_id === split.member_id);
          const name = member?.name || split.name || 'Desconhecido';
          if (!map[name]) map[name] = { 
            name, 
            periodAmount: 0, 
            totalAmount: 0, 
            remainingAmount: 0, 
            totalInstallments: 0, 
            remainingInstallments: 0, 
            series: new Set() 
          };
          
          map[name].series.add(tx.series_id!);
          const amt = Number(split.amount);
          
          map[name].totalAmount = moneyUtils.round(map[name].totalAmount + amt);
          
          if (isInPeriod) {
            map[name].periodAmount = moneyUtils.round(map[name].periodAmount + amt);
          }

          const isRemaining = !split.is_settled;
          if (isRemaining) {
            map[name].remainingAmount = moneyUtils.round(map[name].remainingAmount + amt);
            map[name].remainingInstallments += 1;
          }
          map[name].totalInstallments += 1;
        });
      }
      // 2. Não-dividido mas atribuído diretamente
      else if (!tx.is_shared && tx.domain === 'SHARED' && tx.related_member_id) {
        const member = familyMembers.find(m => m.id === tx.related_member_id);
        const name = member?.name || 'Desconhecido';
        if (!map[name]) map[name] = { 
          name, 
          periodAmount: 0, 
          totalAmount: 0, 
          remainingAmount: 0, 
          totalInstallments: 0, 
          remainingInstallments: 0, 
          series: new Set() 
        };
        
        map[name].series.add(tx.series_id!);
        const amt = Number(tx.amount);
        
        map[name].totalAmount = moneyUtils.round(map[name].totalAmount + amt);
        
        if (isInPeriod) {
          map[name].periodAmount = moneyUtils.round(map[name].periodAmount + amt);
        }

        const isRemaining = !tx.is_settled;
        if (isRemaining) {
          map[name].remainingAmount = moneyUtils.round(map[name].remainingAmount + amt);
          map[name].remainingInstallments += 1;
        }
        map[name].totalInstallments += 1;
      }
    });
    return Object.values(map).map(p => ({ ...p, seriesCount: p.series.size })).sort((a, b) => b.periodAmount - a.periodAmount);
  }, [sharedTransactions, familyMembers, safeCurrentDate, viewType]);

  // monthlyData: calculado localmente a partir de allCombinedTransactions
  // Garante harmonia matemática com os totais do período e respeita a regra
  // de liquidação (settlements). Cobre os últimos 6 meses.
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = dateFns.subMonths(safeCurrentDate, i);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();

      const monthTxs = allCombinedTransactions.filter(tx => {
        if (!tx.date) return false;
        const parts = tx.date.split('-');
        if (parts.length < 2) return false;
        const txYear = parseInt(parts[0], 10);
        const txMonth = parseInt(parts[1], 10) - 1;
        if (txYear !== year || txMonth !== month) return false;
        const txCurr = getTransactionCurrency(tx);
        return selectedCurrency === 'ALL' || txCurr === selectedCurrency;
      });

      const income = monthTxs
        .filter(t => t.type === 'INCOME' && !(t as any).is_refund)
        .reduce((sum, t) => moneyUtils.round(sum + Number(t.amount)), 0);
      const rawExpense = monthTxs
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => moneyUtils.round(sum + Number(t.amount)), 0);
      const refunds = monthTxs
        .filter(t => t.type === 'INCOME' && (t as any).is_refund)
        .reduce((sum, t) => moneyUtils.round(sum + Number(t.amount)), 0);
      const netExpense = moneyUtils.round(Math.max(0, rawExpense - refunds));

      months.push({
        month: dateFns.format(monthDate, 'MMM', { locale: ptBR }),
        income: moneyUtils.round(income),
        expense: netExpense,
        month_start: dateFns.format(monthDate, 'yyyy-MM-01'),
      });
    }
    return months;
  }, [allCombinedTransactions, safeCurrentDate, selectedCurrency]);

  if (isLoading) return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 border border-border/50 bg-card/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-10 w-40 rounded-xl" />
            <div className="skeleton h-4 w-64 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-9 w-32 rounded-xl" />
            <div className="skeleton h-9 w-28 rounded-xl" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="skeleton h-52 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tighter">Relatórios</h1>
            <p className="text-muted-foreground mt-1 font-medium">
              Análise das suas finanças - {viewType === 'MONTH' 
                ? dateFns.format(safeCurrentDate, "MMMM yyyy", { locale: ptBR })
                : dateFns.format(safeCurrentDate, "yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select 
              value={dateCriterion} 
              onValueChange={(value: 'COMPETENCE' | 'DUE_DATE') => setDateCriterion(value)}
            >
              <SelectTrigger className="w-[180px] bg-muted/30 border-border/50 rounded-xl">
                <SelectValue placeholder="Visualizar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPETENCE">
                  <span className="flex items-center gap-2">📅 Data da Compra</span>
                </SelectItem>
                <SelectItem value="DUE_DATE">
                  <span className="flex items-center gap-2">💳 Vencimento Fatura</span>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex bg-muted/50 rounded-xl p-1 mr-2 border border-border/50 shadow-inner">
              <Button 
                variant={viewType === 'MONTH' ? 'default' : 'ghost'} 
                size="sm" 
                className={viewType === 'MONTH' ? "shadow-sm rounded-lg" : "rounded-lg"}
                onClick={() => setViewType('MONTH')}
              >
                Mensal
              </Button>
              <Button 
                variant={viewType === 'YEAR' ? 'default' : 'ghost'} 
                size="sm" 
                className={viewType === 'YEAR' ? "shadow-sm rounded-lg" : "rounded-lg"}
                onClick={() => setViewType('YEAR')}
              >
                Anual
              </Button>
            </div>
          {availableCurrencies.length > 1 && (
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="w-[140px]"><SelectValue><span className="flex items-center gap-2"><span className="font-mono">{getCurrencySymbol(selectedCurrency)}</span>{selectedCurrency}</span></SelectValue></SelectTrigger>
              <SelectContent>{availableCurrencies.map(currency => <SelectItem key={currency} value={currency}><span className="flex items-center gap-2"><span className="font-mono w-6">{getCurrencySymbol(currency)}</span>{currency}</span></SelectItem>)}</SelectContent>
            </Select>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => exportToPDF(
                  periodTransactions, 
                  totalIncome, 
                  totalExpense, 
                  `relatorio-${dateFns.format(safeCurrentDate, viewType === 'MONTH' ? 'yyyy-MM' : 'yyyy')}.pdf`
                )}
              >
                Exportar em PDF
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => exportToCSV(
                  periodTransactions, 
                  `relatorio-${dateFns.format(safeCurrentDate, viewType === 'MONTH' ? 'yyyy-MM' : 'yyyy')}.csv`
                )}
              >
                Exportar em Excel (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      </div>

      {availableCurrencies.length > 1 && <div className="flex items-center gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20"><Globe className="h-4 w-4 text-blue-500" /><span className="text-sm text-blue-600 dark:text-blue-400">Exibindo relatórios para {selectedCurrency}</span></div>}

      <ReportSummary totalIncome={totalIncome} totalExpense={totalExpense} balance={balance} savingsRate={totalIncome > 0 ? ((balance / totalIncome) * 100) : 0} formatCurrency={formatCurrency} currency={displayCurrency} />

      <section className="p-6 rounded-xl border border-border"><h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">Evolução do Saldo</h2><SharedBalanceChart transactions={allTransactions} invoices={invoices} currentDate={safeCurrentDate} isGeneralReport={true} monthlyData={monthlyData} currency={displayCurrency} /></section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyEvolution data={monthlyData} formatCurrency={formatCurrency} currency={displayCurrency} />
        <CategoryDistribution data={categoryData} formatCurrency={formatCurrency} currency={displayCurrency} />
        <SharedFinancesTable data={personData} formatCurrency={formatCurrency} currency={displayCurrency} />
        <InstallmentsTable data={installmentsByPerson} formatCurrency={formatCurrency} currency={displayCurrency} />
      </div>

      <TransactionModal isOpen={showTransactionModal} onClose={() => setShowTransactionModal(false)} />
    </div>
  );
}
