import { moneyUtils } from "@/utils/money";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
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
import { Download, Globe, TrendingUp, Calendar, Tag, Target, Search, Edit2, Info, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Users, Layers, SlidersHorizontal, HelpCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
import { SharedBalanceChart } from "@/components/shared/SharedBalanceChart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSharedFinances } from "@/hooks/useSharedFinances";
import { useMonth } from "@/contexts/MonthContext";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { getCurrencySymbol } from "@/services/exchangeCalculations";

// Modular Components
import { ReportSummary } from "@/components/reports/ReportSummary";
import { CategoryDistribution } from "@/components/reports/CategoryDistribution";
import { MonthlyEvolution } from "@/components/reports/MonthlyEvolution";
import { AccountingDRE } from "@/components/settings/AccountingDRE";
import { useToast } from "@/hooks/use-toast";
import { exportMonthlyReport } from "@/services/exportService";
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
  const { toast } = useToast();
  const [selectedCurrency, setSelectedCurrency] = useState<string>("BRL");

  const [viewType, setViewType] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [txSearch, setTxSearch] = useState<string>("");
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  
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

  const formatTxDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return dateFns.format(new Date(year, month, day), 'dd/MM/yyyy');
      }
      return dateFns.format(dateFns.parseISO(dateStr), 'dd/MM/yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  const getAccountBadge = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return null;
    const isCard = acc.type === 'CREDIT_CARD';
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border/50">
        {isCard ? <CreditCard className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}
        {acc.name}
      </span>
    );
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
          .reduce((sum: number, s: any) => SafeFinancialCalculator.add(sum, Number(s.amount)), 0);

        // Custo líquido real = total pago − o que os outros já devolveram
        const netAmount = Math.max(0, SafeFinancialCalculator.subtract(Number(tx.amount), settledByOthers));
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
    return allCombinedTransactions.filter((tx: any) => {
      const creditCardIds = accounts.filter(a => a.type === 'CREDIT_CARD').map(a => a.id);
      const isCreditCard = tx.account_id && creditCardIds.includes(tx.account_id);
      
      const txDateStr = (isCreditCard && tx.competence_date) ? tx.competence_date : tx.date;
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
      
      const matchesCurrency = selectedCurrency === 'ALL' || txCurr === selectedCurrency;
      
      return matchesCurrency;
    });
  }, [allCombinedTransactions, safeCurrentDate, selectedCurrency, viewType, accounts]);

  const sharedPeriodTransactions = useMemo(() => {
    const targetYear = safeCurrentDate.getFullYear();
    const targetMonth = safeCurrentDate.getMonth();
    
    return sharedTransactions.filter((tx: any) => {
      const creditCardIds = accounts.filter(a => a.type === 'CREDIT_CARD').map(a => a.id);
      const isCreditCard = tx.account_id && creditCardIds.includes(tx.account_id);
      
      const txDateStr = (isCreditCard && tx.competence_date) ? tx.competence_date : tx.date;
      if (!txDateStr) return false;
      const parts = txDateStr.split('-');
      if (parts.length < 2) return false;
      const txYear = parseInt(parts[0], 10);
      const txMonth = parseInt(parts[1], 10) - 1;
      
      const isInPeriod = viewType === 'MONTH'
        ? txYear === targetYear && txMonth === targetMonth
        : txYear === targetYear;
        
      if (!isInPeriod) return false;
      const txCurr = getTransactionCurrency(tx);
      return selectedCurrency === 'ALL' || txCurr === selectedCurrency;
    });
  }, [sharedTransactions, safeCurrentDate, selectedCurrency, viewType, accounts]);

  const displayCurrency = selectedCurrency;

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const income = periodTransactions
      .filter(t => t.type === "INCOME" && !(t as any).is_refund)
      .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)), 0);
    const rawExpense = periodTransactions
      .filter(t => t.type === "EXPENSE")
      .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)), 0);
    const refunds = periodTransactions
      .filter(t => t.type === "INCOME" && (t as any).is_refund)
      .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)), 0);
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
      
      if (tx.category && tx.category.id && tx.category.name && tx.category.name !== "null" && tx.category.name !== "undefined") {
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

      // Limpeza de segurança final contra strings inválidas
      if (!categoryName || categoryName.trim() === "" || categoryName === "null" || categoryName === "undefined") {
        categoryName = "Sem categoria";
      }

      let finalAmount = Number(tx.amount || 0);
      if (tx.transaction_splits && Array.isArray(tx.transaction_splits)) {
        tx.transaction_splits.forEach((split: any) => {
          if (split.is_settled) {
            // Se já foi pago pelo devedor (acerto), subtrai da despesa para o relatório
            finalAmount = SafeFinancialCalculator.subtract(finalAmount, Number(split.amount || 0));
          }
        });
      }

      if (finalAmount > 0) {
        if (!map[categoryName]) map[categoryName] = { value: 0, count: 0 };
        map[categoryName].value = SafeFinancialCalculator.add(map[categoryName].value, finalAmount);
        map[categoryName].count += 1;
      }
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
        map[payerName].spent = SafeFinancialCalculator.add(map[payerName].spent, Number(tx.amount));
        involvedMembers.add(payerName);

        tx.transaction_splits.forEach((split: any) => {
          const member = familyMembers.find(m => m.id === split.member_id || m.linked_user_id === split.member_id);
          const name = member?.name || split.name || 'Desconhecido';
          
          if (!map[name]) {
            map[name] = { name, spent: 0, received: 0, balance: 0, count: 0 };
          }
          map[name].received = SafeFinancialCalculator.add(map[name].received, Number(split.amount));
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
        
        map[payerName].spent = SafeFinancialCalculator.add(map[payerName].spent, Number(tx.amount));
        map[receiverName].received = SafeFinancialCalculator.add(map[receiverName].received, Number(tx.amount));
        
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
          
          map[payerName].spent = SafeFinancialCalculator.add(map[payerName].spent, Number(tx.amount));
          map[receiverName].received = SafeFinancialCalculator.add(map[receiverName].received, Number(tx.amount));
          
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

    sharedTransactions.filter((tx: any) => tx.is_installment && tx.series_id && (selectedCurrency === 'ALL' || getTransactionCurrency(tx) === selectedCurrency)).forEach((tx: any) => {
      const creditCardIds = accounts.filter(a => a.type === 'CREDIT_CARD').map(a => a.id);
      const isCreditCard = tx.account_id && creditCardIds.includes(tx.account_id);
      const txDateStr = (isCreditCard && tx.competence_date) ? tx.competence_date : tx.date;
      
      if (!txDateStr) return;
      const parts = txDateStr.split('-');
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
          
          map[name].totalAmount = SafeFinancialCalculator.add(map[name].totalAmount, amt);
          
          if (isInPeriod) {
            map[name].periodAmount = SafeFinancialCalculator.add(map[name].periodAmount, amt);
          }

          const isRemaining = !split.is_settled;
          if (isRemaining) {
            map[name].remainingAmount = SafeFinancialCalculator.add(map[name].remainingAmount, amt);
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
    return Object.values(map).map(p => ({ ...p, seriesCount: p.series.size })).sort((a, b) => b.periodAmount - a.periodAmount);
  }, [sharedTransactions, familyMembers, safeCurrentDate, viewType, selectedCurrency, accounts]);

  // KPIs Financeiros Dinâmicos Avançados
  const largestExpense = useMemo(() => {
    const expenses = periodTransactions.filter(t => t.type === 'EXPENSE');
    if (expenses.length === 0) return null;
    return expenses.reduce((max, t) => Number(t.amount) > Number(max.amount) ? t : max, expenses[0]);
  }, [periodTransactions]);

  const dailyAverageExpense = useMemo(() => {
    if (totalExpense <= 0) return 0;
    const isYearly = viewType === 'YEAR';
    const days = isYearly ? 365 : dateFns.getDaysInMonth(safeCurrentDate);
    return moneyUtils.round(totalExpense / days);
  }, [totalExpense, viewType, safeCurrentDate]);

  const topCategory = useMemo(() => {
    if (categoryData.length === 0) return null;
    return categoryData[0]; // já vem ordenada por valor decrescente
  }, [categoryData]);

  const savingsGoalStatus = useMemo(() => {
    const rate = totalIncome > 0 ? ((balance / totalIncome) * 100) : 0;
    if (rate >= 20) return { text: "Excelente! (Economizou > 20%)", color: "text-green-500 bg-green-500/10 border-green-500/20" };
    if (rate >= 10) return { text: "No caminho! (Economizou > 10%)", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" };
    if (rate > 0) return { text: "Bom, mas tente poupar 10%", color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" };
    return { text: "Alerta: Gastos superaram receitas", color: "text-red-500 bg-red-500/10 border-red-500/20" };
  }, [totalIncome, balance]);

  const filteredTxList = useMemo(() => {
    return periodTransactions.filter(tx => {
      const matchesSearch = txSearch.trim() === "" || 
        tx.description?.toLowerCase().includes(txSearch.toLowerCase()) ||
        tx.category?.name?.toLowerCase().includes(txSearch.toLowerCase());
      
      const matchesType = txTypeFilter === 'ALL' || tx.type === txTypeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [periodTransactions, txSearch, txTypeFilter]);

  const handleExport = async (format: 'csv' | 'pdf', exportViewType: 'MONTH' | 'YEAR' = viewType) => {
    const { exportToCSV, exportToPDF } = await import("@/utils/exportData");
    if (format === 'csv') exportToCSV(filteredTxList, `relatorio-${exportViewType}`);
    else exportToPDF(filteredTxList, totalIncome, totalExpense, `relatorio-${exportViewType}`);
  };

  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handleExportFechamento = async () => {
    setIsExportingExcel(true);
    try {
      await exportMonthlyReport({
        month: safeCurrentDate,
        transactions: filteredTxList,
        sharedPurchases: sharedTransactions,
        debts: invoices,
        cashFlow: { totalIncome, totalExpense }
      });
      toast({
        title: "Sucesso!",
        description: "A planilha de fechamento foi exportada.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Não foi possível gerar a planilha. Verifique se o template existe.",
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

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
        const creditCardIds = accounts.filter(a => a.type === 'CREDIT_CARD').map(a => a.id);
        const isCreditCard = tx.account_id && creditCardIds.includes(tx.account_id);
        const txDateStr = (isCreditCard && tx.competence_date) ? tx.competence_date : tx.date;
        
        if (!txDateStr) return false;
        const parts = txDateStr.split('-');
        if (parts.length < 2) return false;
        const txYear = parseInt(parts[0], 10);
        const txMonth = parseInt(parts[1], 10) - 1;
        if (txYear !== year || txMonth !== month) return false;
        const txCurr = getTransactionCurrency(tx);
        return selectedCurrency === 'ALL' || txCurr === selectedCurrency;
      });

      const income = monthTxs
        .filter(t => t.type === 'INCOME' && !(t as any).is_refund)
        .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)), 0);
      const rawExpense = monthTxs
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)), 0);
      const refunds = monthTxs
        .filter(t => t.type === 'INCOME' && (t as any).is_refund)
        .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)), 0);
      const netExpense = moneyUtils.round(Math.max(0, rawExpense - refunds));

      months.push({
        month: dateFns.format(monthDate, 'MMM', { locale: ptBR }),
        income: moneyUtils.round(income),
        expense: netExpense,
        month_start: dateFns.format(monthDate, 'yyyy-MM-01'),
      });
    }
    return months;
  }, [allCombinedTransactions, safeCurrentDate, selectedCurrency, accounts]);

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
              {'Análise das suas finanças -'} {viewType === 'MONTH' 
                ? dateFns.format(safeCurrentDate, "MMMM yyyy", { locale: ptBR })
                : dateFns.format(safeCurrentDate, "yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex bg-muted/50 rounded-xl p-1 mr-2 border border-border/50 shadow-inner">
              <Button 
                variant={viewType === 'MONTH' ? 'default' : 'ghost'} 
                size="sm" 
                className={viewType === 'MONTH' ? "shadow-sm rounded-lg" : "rounded-lg"}
                onClick={() => setViewType('MONTH')}>
                {'Mensal'}
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

      <Tabs defaultValue="overview" className="space-y-6 w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold">Visão Geral</TabsTrigger>
          <TabsTrigger value="evolution" className="rounded-lg text-xs font-semibold">Evolução</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-lg text-xs font-semibold">Categorias</TabsTrigger>
          {/* <TabsTrigger value="dre" className="rounded-lg text-xs font-semibold">DRE & Balanço</TabsTrigger> */}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4 animate-in fade-in-50 duration-500">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <ReportSummary totalIncome={totalIncome} totalExpense={totalExpense} balance={balance} savingsRate={totalIncome > 0 ? ((balance / totalIncome) * 100) : 0} formatCurrency={formatCurrency} currency={displayCurrency} />
          </div>
          
          {/* KPIs Financeiros Avançados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gasto Médio Diário */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-border/50 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-inner flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Média Diária</p>
              <h3 className="text-xl font-black font-display tracking-tight mt-0.5 text-foreground">
                {formatCurrency(dailyAverageExpense, displayCurrency)}
              </h3>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5 font-medium">
            <Info className="h-3 w-3 text-muted-foreground/60" />
            Com base no período selecionado
          </p>
        </div>

        {/* Card 2: Maior Despesa Única */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-border/50 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Maior Despesa</p>
              <h3 className="text-xl font-black font-display tracking-tight mt-0.5 text-foreground truncate max-w-[150px]">
                {largestExpense ? formatCurrency(Number(largestExpense.amount), displayCurrency) : formatCurrency(0, displayCurrency)}
              </h3>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 truncate font-medium max-w-[200px]" title={largestExpense ? largestExpense.description : "Nenhum gasto"}>
            🎯 {largestExpense ? largestExpense.description : "Nenhum gasto no período"}
          </p>
        </div>

        {/* Card 3: Categoria Líder */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-border/50 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-inner flex items-center justify-center">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categoria Líder</p>
              <h3 className="text-xl font-black font-display tracking-tight mt-0.5 text-foreground truncate max-w-[150px]">
                {topCategory ? formatCurrency(topCategory.value, displayCurrency) : formatCurrency(0, displayCurrency)}
              </h3>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 truncate font-medium max-w-[200px]" title={topCategory ? topCategory.category : "Nenhum gasto"}>
            🏷️ {topCategory ? topCategory.category : "Nenhum gasto"}
          </p>
        </div>

        {/* Card 4: Meta de Economia */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-border/50 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner flex items-center justify-center">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Taxa de Poupança</p>
              <h3 className="text-xl font-black font-display tracking-tight mt-0.5 text-foreground">
                {totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : '0.0'}%
              </h3>
            </div>
          </div>
          <div className="mt-3">
            <span className={`inline-block px-2.5 py-1 rounded-xl text-[10px] font-semibold border leading-tight ${savingsGoalStatus.color}`}>
              {savingsGoalStatus.text}
            </span>
          </div>
        </div>
      </div>
      </TabsContent>

      <TabsContent value="evolution" className="space-y-6 mt-4 animate-in fade-in-50 duration-500">
        <section className="p-6 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Evolução do Saldo</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs space-y-2 p-3 bg-card text-card-foreground shadow-premium-sm border-border">
                  <p className="font-bold text-sm">O que é a Evolução do Saldo?</p>
                  <p className="text-xs text-muted-foreground">
                    Este gráfico cruza o seu saldo em caixa (contas bancárias) com todas as despesas e receitas futuras projetadas, incluindo faturas de cartão de crédito e parcelamentos ao longo do tempo. Ele mostra exatamente quanto dinheiro você terá nos próximos dias e meses!
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <SharedBalanceChart transactions={allTransactions} invoices={invoices} currentDate={safeCurrentDate} isGeneralReport={true} monthlyData={monthlyData} currency={displayCurrency} />
        </section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyEvolution data={monthlyData} formatCurrency={formatCurrency} currency={displayCurrency} />
        </div>
      </TabsContent>

      <TabsContent value="categories" className="space-y-6 mt-4 animate-in fade-in-50 duration-500">
        <div className="grid grid-cols-1 gap-6">
          <CategoryDistribution data={categoryData} formatCurrency={formatCurrency} currency={displayCurrency} />
        </div>
      </TabsContent>

      {/*
      <TabsContent value="dre" className="mt-4 animate-in fade-in-50 duration-500">
        <AccountingDRE />
      </TabsContent>
      */}
      </Tabs>


      <TransactionModal 
        isOpen={showTransactionModal || !!editingTransaction} 
        onClose={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null);
        }} 
        initialData={editingTransaction}
      />
    </div>
  );
}
