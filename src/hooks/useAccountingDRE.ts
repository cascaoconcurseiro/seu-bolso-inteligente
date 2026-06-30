import React from 'react';
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useAssets } from "@/hooks/useAssets";
import { Download, Printer, Eye, EyeOff, Scale, BadgePercent, Activity } from "lucide-react";
import * as dateFns from "date-fns";
import { formatExportMoney } from "@/utils/exportCurrency";
import { toast } from "sonner";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { logger } from '@/utils/logger';
import { useAccountingExport } from "@/hooks/useAccountingExport";

type DRELineType = 'OPERATIONAL_INC' | 'FINANCIAL_INC' | 'DEDUCTION' | 'VARIABLE_EXP' | 'FIXED_EXP' | 'FINANCIAL_EXP';



export function useAccountingDRE() {

  const [activeTab, setActiveTab] = useState<'DRE' | 'BALANCE_SHEET'>('DRE');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [viewType, setViewType] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [dateCriterion, setDateCriterion] = useState<'COMPETENCE' | 'DUE_DATE'>('COMPETENCE');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('BRL');
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({
    OPERATIONAL_INC: true,
    FINANCIAL_INC: true,
    DEDUCTION: true,
    VARIABLE_EXP: true,
    FIXED_EXP: true,
    FINANCIAL_EXP: true
  });

  const { data: allTransactions = [], isLoading: transactionsLoading } = useTransactions({ startDate: '2020-01-01', endDate: '2030-12-31' });
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { assets = [], isLoading: assetsLoading } = useAssets();

  const isLoading = transactionsLoading || assetsLoading;

  const toggleExpand = (line: string) => {
    setExpandedLines(prev => ({ ...prev, [line]: !prev[line] }));
  };

  const years = useMemo(() => {
    const list = new Set<number>([new Date().getFullYear()]);
    allTransactions.forEach(tx => {
      if (tx.date) {
        const y = parseInt(tx.date.split('-')[0], 10);
        if (!isNaN(y)) list.add(y);
      }
    });
    return Array.from(list).sort((a, b) => b - a);
  }, [allTransactions]);

  const availableCurrencies = useMemo(() => {
    const list = new Set<string>(['BRL']);
    allTransactions.forEach(tx => {
      let cur = 'BRL';
      if (tx.currency) cur = tx.currency;
      else if (tx.account_id) {
        const acc = accounts.find(a => a.id === tx.account_id);
        if (acc && acc.currency) cur = acc.currency;
      }
      list.add(cur);
    });
    accounts.forEach(acc => {
      if (acc.currency) list.add(acc.currency);
    });
    return Array.from(list);
  }, [allTransactions, accounts]);

  const months = [
    { value: 0, label: "Janeiro" },
    { value: 1, label: "Fevereiro" },
    { value: 2, label: "Março" },
    { value: 3, label: "Abril" },
    { value: 4, label: "Maio" },
    { value: 5, label: "Junho" },
    { value: 6, label: "Julho" },
    { value: 7, label: "Agosto" },
    { value: 8, label: "Setembro" },
    { value: 9, label: "Outubro" },
    { value: 10, label: "Novembro" },
    { value: 11, label: "Dezembro" }
  ];

  const classifyCategory = (catName: string): DRELineType => {
    const name = catName.toLowerCase();
    
    if (name.includes('invest') || name.includes('dividend') || name.includes('rendimento') || name.includes('juros')) {
      return 'FINANCIAL_INC';
    }
    if (name.includes('salário') || name.includes('salario') || name.includes('trabalho') || name.includes('freelance') || name.includes('receita') || name.includes('pró-labore') || name.includes('pro-labore')) {
      return 'OPERATIONAL_INC';
    }
    if (name.includes('moradia') || name.includes('aluguel') || name.includes('luz') || name.includes('água') || name.includes('agua') || name.includes('internet') || name.includes('condomínio') || name.includes('condominio') || name.includes('assinatura') || name.includes('mensalidade') || name.includes('educação') || name.includes('escola') || name.includes('faculdade') || name.includes('saúde') || name.includes('plano') || name.includes('seguro') || name.includes('imposto') || name.includes('tribut')) {
      return 'FIXED_EXP';
    }
    if (name.includes('tarifa') || name.includes('banco') || name.includes('multa') || name.includes('juros despesa')) {
      return 'FINANCIAL_EXP';
    }
    return 'VARIABLE_EXP';
  };

  const periodTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      let txDateStr = tx.date;
      
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
      
      const isTimeMatch = viewType === 'MONTH'
        ? txYear === selectedYear && txMonth === selectedMonth
        : txYear === selectedYear;
        
      if (!isTimeMatch) return false;
      
      let cur = 'BRL';
      if (tx.currency) cur = tx.currency;
      else if (tx.account_id) {
        const acc = accounts.find(a => a.id === tx.account_id);
        if (acc && acc.currency) cur = acc.currency;
      }
      
      return cur === selectedCurrency;
    });
  }, [allTransactions, selectedYear, selectedMonth, viewType, dateCriterion, accounts, selectedCurrency]);

  const dreData = useMemo(() => {
    const map: Record<DRELineType, { total: number; subcategories: Record<string, number> }> = {
      OPERATIONAL_INC: { total: 0, subcategories: {} },
      FINANCIAL_INC: { total: 0, subcategories: {} },
      DEDUCTION: { total: 0, subcategories: {} },
      VARIABLE_EXP: { total: 0, subcategories: {} },
      FIXED_EXP: { total: 0, subcategories: {} },
      FINANCIAL_EXP: { total: 0, subcategories: {} }
    };

    periodTransactions.forEach(tx => {
      const amount = Number(tx.amount || 0);
      let catName = "Sem categoria";
      
      if (tx.category) {
        const catInfo = categories.find(c => c.id === tx.category_id);
        if (catInfo) {
          catName = catInfo.name;
        }
      }

      if (tx.type === 'INCOME') {
        if ((tx as any).is_refund) {
          map.DEDUCTION.total = SafeFinancialCalculator.add(map.DEDUCTION.total, amount);
          map.DEDUCTION.subcategories[catName] = SafeFinancialCalculator.add(map.DEDUCTION.subcategories[catName] || 0, amount);
        } else {
          const classification = classifyCategory(catName);
          const target = classification === 'FINANCIAL_INC' ? 'FINANCIAL_INC' : 'OPERATIONAL_INC';
          map[target].total = SafeFinancialCalculator.add(map[target].total, amount);
          map[target].subcategories[catName] = SafeFinancialCalculator.add(map[target].subcategories[catName] || 0, amount);
        }
      } else if (tx.type === 'EXPENSE') {
        let finalAmount = amount;

        // Deduz a parte já paga (settled) pelos outros membros
        if (tx.transaction_splits && Array.isArray(tx.transaction_splits)) {
          tx.transaction_splits.forEach((split: any) => {
            if (split.is_settled) {
              finalAmount = SafeFinancialCalculator.subtract(finalAmount, Number(split.amount || 0));
            }
          });
        }

        const classification = classifyCategory(catName);
        let target: DRELineType = 'VARIABLE_EXP';
        if (classification === 'FIXED_EXP') target = 'FIXED_EXP';
        else if (classification === 'FINANCIAL_EXP') target = 'FINANCIAL_EXP';
        
        map[target].total = SafeFinancialCalculator.add(map[target].total, finalAmount);
        map[target].subcategories[catName] = SafeFinancialCalculator.add(map[target].subcategories[catName] || 0, finalAmount);
      }
    });

    const grossRevenue = SafeFinancialCalculator.add(map.OPERATIONAL_INC.total, map.FINANCIAL_INC.total);
    const netRevenue = SafeFinancialCalculator.subtract(grossRevenue, map.DEDUCTION.total);
    const contributionMargin = SafeFinancialCalculator.subtract(netRevenue, map.VARIABLE_EXP.total);
    const ebitda = SafeFinancialCalculator.subtract(contributionMargin, map.FIXED_EXP.total);
    const netSavings = SafeFinancialCalculator.subtract(ebitda, map.FINANCIAL_EXP.total);

    return {
      lines: map,
      grossRevenue,
      netRevenue,
      contributionMargin,
      ebitda,
      netSavings
    };
  }, [periodTransactions, categories]);

  const balanceSheetData = useMemo(() => {
    const checkingChecking = accounts
      .filter(a => (a.type === 'CHECKING' || a.type === 'CASH') && (a.currency || 'BRL') === selectedCurrency)
      .reduce((sum, a) => SafeFinancialCalculator.add(sum, Number(a.balance || 0)), 0);
      
    const checkingSavings = accounts
      .filter(a => a.type === 'SAVINGS' && (a.currency || 'BRL') === selectedCurrency)
      .reduce((sum, a) => SafeFinancialCalculator.add(sum, Number(a.balance || 0)), 0);

    const assetCirculante = SafeFinancialCalculator.add(checkingChecking, checkingSavings);

    const currentInvestments = accounts
      .filter(a => a.type === 'INVESTMENT' && (a.currency || 'BRL') === selectedCurrency)
      .reduce((sum, a) => SafeFinancialCalculator.add(sum, Number(a.balance || 0)), 0);

    const physicalAssets = assets
      .filter(a => (a.currency || 'BRL') === selectedCurrency)
      .reduce((sum, a) => {
      const price = Number(a.current_price !== undefined && a.current_price !== null ? a.current_price : a.purchase_price || 0);
      const qty = Number(a.quantity || 1);
      return SafeFinancialCalculator.add(sum, SafeFinancialCalculator.multiply(price, qty));
    }, 0);

    const assetNaoCirculante = SafeFinancialCalculator.add(currentInvestments, physicalAssets);
    const totalAssets = SafeFinancialCalculator.add(assetCirculante, assetNaoCirculante);

    const creditCardDebts = accounts
      .filter(a => a.type === 'CREDIT_CARD' && (a.currency || 'BRL') === selectedCurrency)
      .reduce((sum, a) => SafeFinancialCalculator.add(sum, Math.abs(Math.min(0, Number(a.balance || 0)))), 0);

    const negativeAccounts = accounts
      .filter(a => a.type !== 'CREDIT_CARD' && Number(a.balance || 0) < 0 && (a.currency || 'BRL') === selectedCurrency)
      .reduce((sum, a) => SafeFinancialCalculator.add(sum, Math.abs(Number(a.balance || 0))), 0);

    const totalLiabilities = SafeFinancialCalculator.add(creditCardDebts, negativeAccounts);

    const netWorth = SafeFinancialCalculator.subtract(totalAssets, totalLiabilities);

    const liquidityRatio = totalLiabilities > 0 ? (assetCirculante / totalLiabilities) : 999;
    const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

    return {
      checkingChecking,
      checkingSavings,
      assetCirculante,
      currentInvestments,
      physicalAssets,
      assetNaoCirculante,
      totalAssets,
      totalLiabilities,
      netWorth,
      liquidityRatio,
      debtRatio
    };
  }, [accounts, assets, selectedCurrency]);

  const formatCurrency = (val: number) => formatExportMoney(val, selectedCurrency);

  const formatNegativeCurrency = (val: number) => {
    if (val === 0) return formatCurrency(0);
    return `(${formatCurrency(val)})`;
  };

  const renderSubcategories = (lineType: DRELineType, isExpense: boolean) => {
    const sub = dreData.lines[lineType].subcategories;
    if (Object.keys(sub).length === 0) {
      return (
        <tr className="bg-muted/10 text-sm text-muted-foreground font-mono">
          <td className="pl-12 py-2 text-left italic">Nenhuma movimentação registrada</td>
          <td className="pr-6 py-2 text-right font-semibold">-</td>
          <td className="pr-6 py-2 text-right">-</td>
        </tr>
      );
    }
    return Object.entries(sub).map(([name, val]) => {
      const parentTotal = dreData.lines[lineType].total;
      const subPercent = parentTotal > 0 ? `${((val / parentTotal) * 100).toFixed(1)}%` : "0.0%";
      return (
        <tr key={name} className="hover:bg-muted/30 text-sm text-muted-foreground border-b border-border/10 font-mono transition-colors">
          <td className="pl-12 py-2 text-left">{name}</td>
          <td className="pr-6 py-2 text-right font-medium">{isExpense ? formatNegativeCurrency(val) : formatCurrency(val)}</td>
          <td className="pr-6 py-2 text-right text-sm">{subPercent}</td>
        </tr>
      );
    });
  };



  const { handleExportPDF, handleExportCSV } = useAccountingExport(dreData, balanceSheetData);
  const b = balanceSheetData;


  return {
    activeTab, setActiveTab,
    selectedYear, setSelectedYear,
    selectedMonth, setSelectedMonth,
    viewType, setViewType,
    dateCriterion, setDateCriterion,
    selectedCurrency, setSelectedCurrency,
    expandedLines, toggleExpand,
    years, availableCurrencies, months,
    dreData, balanceSheetData,
    isLoading,
    formatCurrency,
    formatNegativeCurrency,
    renderSubcategories,
    handleExportPDF,
    handleExportCSV
  };
}
