import React from 'react';
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
import { Download, Globe, TrendingUp, Calendar, Tag, Target, Search, Edit2, Info, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Users, Layers, SlidersHorizontal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

import { useReports } from './useReports';



export function useReports() {

  const {
    currentDate,
    safeCurrentDate,
    showTransactionModal, setShowTransactionModal,
    selectedCurrency, setSelectedCurrency,
    viewType, setViewType,
    dateCriterion, setDateCriterion,
    txSearch, setTxSearch,
    txTypeFilter, setTxTypeFilter,
    showOnlyCreditCards, setShowOnlyCreditCards,
    editingTransaction, setEditingTransaction,
    user,
    allTransactions, isLoading,
    categories,
    accounts,
    familyMembers,
    invoices, sharedTransactions,
    myMember, myMemberId,
    availableCurrencies,
    formatCurrency,
    formatTxDate,
    getAccountBadge,
    allCombinedTransactions,
    periodTransactions,
    sharedPeriodTransactions,
    displayCurrency,
    totalIncome, totalExpense, balance,
    categoryData,
    personData,
    installmentsByPerson,
    largestExpense,
    dailyAverageExpense,
    topCategory,
    savingsGoalStatus,
    filteredTxList,
    handleExport,
    isExportingExcel, setIsExportingExcel,
    handleExportFechamento,
    monthlyData,
    getTransactionCurrency
  } = useReports();


  return {
    currentDate,
    safeCurrentDate,
    showTransactionModal, setShowTransactionModal,
    selectedCurrency, setSelectedCurrency,
    viewType, setViewType,
    dateCriterion, setDateCriterion,
    txSearch, setTxSearch,
    txTypeFilter, setTxTypeFilter,
    showOnlyCreditCards, setShowOnlyCreditCards,
    editingTransaction, setEditingTransaction,
    user,
    allTransactions, isLoading,
    categories,
    accounts,
    familyMembers,
    invoices, sharedTransactions,
    myMember, myMemberId,
    availableCurrencies,
    formatCurrency,
    formatTxDate,
    getAccountBadge,
    allCombinedTransactions,
    periodTransactions,
    sharedPeriodTransactions,
    displayCurrency,
    totalIncome, totalExpense, balance,
    categoryData,
    personData,
    installmentsByPerson,
    largestExpense,
    dailyAverageExpense,
    topCategory,
    savingsGoalStatus,
    filteredTxList,
    handleExport,
    isExportingExcel, setIsExportingExcel,
    handleExportFechamento,
    monthlyData,
    getTransactionCurrency
  };
}
