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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatExportMoney } from "@/utils/exportCurrency";
import { toast } from "sonner";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { logger } from '@/utils/logger';

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

  const handleExportPDF = () => {
    if (activeTab === 'DRE') {
      handleExportDREPDF();
    } else {
      handleExportBalanceSheetPDF();
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'DRE') {
      handleExportDRECSV();
    } else {
      handleExportBalanceSheetCSV();
    }
  };

  const handleExportDREPDF = () => {
    try {
      const doc = new jsPDF();
      const title = `DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO (DRE)`;
      const subtitle = viewType === 'MONTH' 
        ? `${months.find(m => m.value === selectedMonth)?.label} de ${selectedYear}`
        : `Ano de ${selectedYear}`;
      const criterion = dateCriterion === 'COMPETENCE' ? 'Regime de Competência (Data da Compra)' : 'Regime de Caixa (Vencimento da Fatura)';

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(5, 150, 105);
      doc.text("PÉ DE MEIA - CONTROLE FINANCEIRO", 105, 15, { align: "center" });
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text(title, 105, 22, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Período: ${subtitle} | Critério: ${criterion}`, 105, 27, { align: "center" });
      doc.setDrawColor(209, 213, 219);
      doc.line(15, 30, 195, 30);

      const tableData = [
        ["1. RECEITAS OPERACIONAIS BRUTAS", formatCurrency(dreData.grossRevenue), "100.00%"],
        ["   1.1 Receitas Operacionais", formatCurrency(dreData.lines.OPERATIONAL_INC.total), ""],
        ["   1.2 Receitas Financeiras / Investimentos", formatCurrency(dreData.lines.FINANCIAL_INC.total), ""],
        ["2. (-) ESTORNOS E DEDUÇÕES", formatNegativeCurrency(dreData.lines.DEDUCTION.total), ""],
        ["(=) RECEITA OPERACIONAL LÍQUIDA", formatCurrency(dreData.netRevenue), "100.00%"],
        ["3. (-) CUSTOS E CONSUMO VARIÁVEL", formatNegativeCurrency(dreData.lines.VARIABLE_EXP.total), `${dreData.netRevenue > 0 ? ((dreData.lines.VARIABLE_EXP.total / dreData.netRevenue) * 100).toFixed(1) + "%" : "0.0%"}`],
        ["(=) MARGEM DE CONTRIBUIÇÃO", formatCurrency(dreData.contributionMargin), ""],
        ["4. (-) DESPESAS DE ESTRUTURA FIXA", formatNegativeCurrency(dreData.lines.FIXED_EXP.total), `${dreData.netRevenue > 0 ? ((dreData.lines.FIXED_EXP.total / dreData.netRevenue) * 100).toFixed(1) + "%" : "0.0%"}`],
        ["(=) RESULTADO OPERACIONAL BRUTO (EBITDA)", formatCurrency(dreData.ebitda), ""],
        ["5. (-) TARIFAS E DESPESAS FINANCEIRAS", formatNegativeCurrency(dreData.lines.FINANCIAL_EXP.total), ""],
        ["(=) RESULTADO LÍQUIDO DO EXERCÍCIO", formatCurrency(dreData.netSavings), `${dreData.netRevenue > 0 ? ((dreData.netSavings / dreData.netRevenue) * 100).toFixed(1) + "%" : "0.0%"}`]
      ];

      autoTable(doc, {
        startY: 35,
        head: [["Descrição Contábil", `Valor (${selectedCurrency})`, "Vertical %"]],
        body: tableData,
        theme: "plain",
        headStyles: {
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
          halign: "left"
        },
        columnStyles: {
          0: { cellWidth: 110, halign: "left" },
          1: { cellWidth: 45, halign: "right" },
          2: { cellWidth: 25, halign: "right" }
        },
        didParseCell: (data) => {
          const rowText = data.row.cells[0].text[0];
          if (rowText.startsWith("(=)") || rowText.startsWith("1. RECEITAS") || rowText.startsWith("2.") || rowText.startsWith("3.") || rowText.startsWith("4.") || rowText.startsWith("5.")) {
            data.cell.styles.fontStyle = "bold";
            if (rowText.startsWith("(=)")) {
              data.cell.styles.textColor = [5, 150, 105];
            }
          }
        }
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Demonstrativo gerado em: ${new Date().toLocaleDateString('pt-BR')} - Pé de Meia`, 105, 285, { align: "center" });
      }

      doc.save(`DRE-${selectedYear}-${viewType === 'MONTH' ? selectedMonth + 1 : 'ANUAL'}.pdf`);
      toast.success("DRE exportada com sucesso em PDF!");
    } catch (error) {
      logger.error(error);
      toast.error("Erro ao gerar PDF da DRE.");
    }
  };

  const handleExportDRECSV = () => {
    try {
      const today = new Date().toLocaleDateString('pt-BR');
      const periodLabel = viewType === 'MONTH' 
        ? `${months.find(m => m.value === selectedMonth)?.label} de ${selectedYear}`
        : `Ano de ${selectedYear}`;
      const criterionLabel = dateCriterion === 'COMPETENCE' ? 'Regime de Competência (Compra)' : 'Regime de Caixa (Vencimento)';

      let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>DRE Contábil</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          td, th { border: 1px solid #cbd5e1; padding: 10px 14px; font-size: 11px; }
          .brand-title { background-color: #0f172a; color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; height: 38px; }
          .brand-subtitle { background-color: #1e293b; color: #38bdf8; font-size: 10px; text-align: center; height: 22px; }
          .brand-info { background-color: #f8fafc; color: #64748b; font-size: 10px; text-align: center; height: 28px; border-bottom: 2px solid #cbd5e1; font-weight: bold; }
          .th-premium { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 11px; height: 32px; text-align: left; }
          .text-cell { mso-number-format:"\\@"; text-align: left; }
          .number-cell { mso-number-format:"\\#\\,\\#\\#0\\.00"; text-align: right; }
          .bold-row { font-weight: bold; background-color: #f1f5f9; color: #0f172a; }
          .formula-row { font-weight: bold; background-color: #f0fdf4; color: #166534; border-top: 1.5px solid #16a34a; border-bottom: 4px double #16a34a; }
          .sub-header-row { font-weight: bold; background-color: #f8fafc; color: #334155; }
          .subcategory-row { color: #64748b; font-style: italic; background-color: #ffffff; }
          .green-text { color: #166534; font-weight: bold; }
          .red-text { color: #991b1b; font-weight: bold; }
          .net-savings-row { font-weight: 900; font-size: 12px; background-color: #dcfce7; color: #14532d; border-top: 2px solid #15803d; border-bottom: 5px double #15803d; height: 38px; }
        </style>
        </head>
        <body>
        <table>
          <!-- Título Principal -->
          <tr>
            <th colspan="3" class="brand-title">CONTROLE FINANCEIRO</th>
          </tr>
          <tr>
            <th colspan="3" class="brand-subtitle">DRE — DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO</th>
          </tr>
          <tr>
            <th colspan="3" class="brand-info">
              Período: ${periodLabel} | Critério: ${criterionLabel} | Emitido em ${today}
            </th>
          </tr>
          <tr><td colspan="3" style="border:none; height: 10px;"></td></tr>

          <!-- Cabeçalho das Colunas -->
          <tr>
            <th class="th-premium text-cell" style="width: 350px; padding-left: 14px;">Descrição das Contas Contábeis</th>
            <th class="th-premium number-cell" style="width: 160px; text-align: right; padding-right: 14px;">Valor Consolidado (${selectedCurrency})</th>
            <th class="th-premium text-cell" style="width: 100px; text-align: right; padding-right: 14px;">AV %</th>
          </tr>
      `;

      // Helper para renderizar subcategorias em HTML
      const getSubcategoriesHtml = (lineType: DRELineType, isExpense: boolean) => {
        const sub = dreData.lines[lineType].subcategories;
        let subHtml = "";
        const parentTotal = dreData.lines[lineType].total;
        
        Object.entries(sub).forEach(([name, val]) => {
          const subPercent = parentTotal > 0 ? `${((val / parentTotal) * 100).toFixed(1)}%` : "0.0%";
          const displayVal = isExpense ? -val : val;
          const valClass = isExpense ? "red-text" : "green-text";
          subHtml += `
            <tr class="subcategory-row">
              <td class="text-cell" style="padding-left: 30px;">&nbsp;&nbsp;&nbsp;&nbsp;• ${name}</td>
              <td class="number-cell ${valClass}">${displayVal}</td>
              <td class="text-cell" style="text-align: right; padding-right: 14px;">${subPercent}</td>
            </tr>
          `;
        });
        return subHtml;
      };

      // 1. Receitas
      html += `
        <tr class="bold-row">
          <td class="text-cell" style="padding-left: 14px;">1. RECEITAS OPERACIONAIS BRUTAS</td>
          <td class="number-cell green-text">${dreData.grossRevenue}</td>
          <td class="text-cell" style="text-align: right; font-weight: bold; padding-right: 14px;">100.0%</td>
        </tr>
        <tr class="sub-header-row">
          <td class="text-cell" style="padding-left: 20px;">&nbsp;&nbsp;1.1 Receitas de Trabalho / Pró-labore</td>
          <td class="number-cell green-text">${dreData.lines.OPERATIONAL_INC.total}</td>
          <td class="text-cell"></td>
        </tr>
      `;
      html += getSubcategoriesHtml('OPERATIONAL_INC', false);

      html += `
        <tr class="sub-header-row">
          <td class="text-cell" style="padding-left: 20px;">&nbsp;&nbsp;1.2 Receitas Financeiras / Investimentos</td>
          <td class="number-cell green-text">${dreData.lines.FINANCIAL_INC.total}</td>
          <td class="text-cell"></td>
        </tr>
      `;
      html += getSubcategoriesHtml('FINANCIAL_INC', false);

      // 2. Deduções
      html += `
        <tr class="bold-row">
          <td class="text-cell" style="padding-left: 14px;">2. (-) ESTORNOS E DEDUÇÕES DO EXERCÍCIO</td>
          <td class="number-cell red-text">${-dreData.lines.DEDUCTION.total}</td>
          <td class="text-cell"></td>
        </tr>
      `;
      html += getSubcategoriesHtml('DEDUCTION', false);

      // Receita Líquida
      html += `
        <tr class="formula-row">
          <td class="text-cell" style="padding-left: 14px;">(=) RECEITA OPERACIONAL LÍQUIDA</td>
          <td class="number-cell">${dreData.netRevenue}</td>
          <td class="text-cell" style="text-align: right; font-weight: bold; padding-right: 14px;">100.0%</td>
        </tr>
      `;

      // 3. Custos Variáveis
      const variableAV = dreData.netRevenue > 0 ? ((dreData.lines.VARIABLE_EXP.total / dreData.netRevenue) * 100).toFixed(1) + "%" : "0.0%";
      html += `
        <tr class="bold-row">
          <td class="text-cell" style="padding-left: 14px;">3. (-) CUSTOS OPERACIONAIS E CONSUMO VARIÁVEL</td>
          <td class="number-cell red-text">${-dreData.lines.VARIABLE_EXP.total}</td>
          <td class="text-cell" style="text-align: right; font-weight: bold; padding-right: 14px;">${variableAV}</td>
        </tr>
      `;
      html += getSubcategoriesHtml('VARIABLE_EXP', true);

      // Margem de Contribuição
      html += `
        <tr class="formula-row">
          <td class="text-cell" style="padding-left: 14px;">(=) MARGEM DE CONTRIBUIÇÃO OPERACIONAL</td>
          <td class="number-cell">${dreData.contributionMargin}</td>
          <td class="text-cell"></td>
        </tr>
      `;

      // 4. Estrutura Fixa
      const fixedAV = dreData.netRevenue > 0 ? ((dreData.lines.FIXED_EXP.total / dreData.netRevenue) * 100).toFixed(1) + "%" : "0.0%";
      html += `
        <tr class="bold-row">
          <td class="text-cell" style="padding-left: 14px;">4. (-) DESPESAS ADMINISTRATIVAS E ESTRUTURA FIXA</td>
          <td class="number-cell red-text">${-dreData.lines.FIXED_EXP.total}</td>
          <td class="text-cell" style="text-align: right; font-weight: bold; padding-right: 14px;">${fixedAV}</td>
        </tr>
      `;
      html += getSubcategoriesHtml('FIXED_EXP', true);

      // EBITDA
      html += `
        <tr class="formula-row">
          <td class="text-cell" style="padding-left: 14px;">(=) RESULTADO OPERACIONAL BRUTO (EBITDA)</td>
          <td class="number-cell">${dreData.ebitda}</td>
          <td class="text-cell"></td>
        </tr>
      `;

      // 5. Financeiras
      html += `
        <tr class="bold-row">
          <td class="text-cell" style="padding-left: 14px;">5. (-) TARIFAS E DESPESAS FINANCEIRAS / TRIBUTOS</td>
          <td class="number-cell red-text">${-dreData.lines.FINANCIAL_EXP.total}</td>
          <td class="text-cell"></td>
        </tr>
      `;
      html += getSubcategoriesHtml('FINANCIAL_EXP', true);

      // Resultado Líquido
      const netAV = dreData.netRevenue > 0 ? ((dreData.netSavings / dreData.netRevenue) * 100).toFixed(1) + "%" : "0.0%";
      html += `
        <tr class="net-savings-row">
          <td class="text-cell" style="text-transform: uppercase; padding-left: 14px;">(=) RESULTADO LÍQUIDO DO EXERCÍCIO (Economia Real)</td>
          <td class="number-cell">${dreData.netSavings}</td>
          <td class="text-cell" style="text-align: right; padding-right: 14px;">${netAV}</td>
        </tr>
      `;

      html += `
        </table>
        </body>
        </html>
      `;

      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `DRE-${selectedYear}-${viewType === 'MONTH' ? selectedMonth + 1 : 'ANUAL'}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("DRE exportada com sucesso em Excel formatado!");
    } catch (error) {
      logger.error(error);
      toast.error("Erro ao gerar Excel da DRE.");
    }
  };

  const handleExportBalanceSheetPDF = () => {
    try {
      const doc = new jsPDF();
      const title = `BALANÇO PATRIMONIAL CONTÁBIL (ATIVOS, PASSIVOS E PL)`;
          doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(5, 150, 105);
      doc.text("PÉ DE MEIA - CONTROLE FINANCEIRO", 105, 15, { align: "center" });
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text(title, 105, 22, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Posição Contábil Consolidada em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 27, { align: "center" });
      doc.setDrawColor(209, 213, 219);
      doc.line(15, 30, 195, 30);

      const tableData = [
        ["1. ATIVOS (Bens e Direitos)", formatCurrency(b.totalAssets), "100.00%"],
        ["   1.1 Ativo Circulante (Disponibilidades)", formatCurrency(b.assetCirculante), `${b.totalAssets > 0 ? ((b.assetCirculante / b.totalAssets) * 100).toFixed(1) + "%" : ""}`],
        ["       1.1.1 Contas Correntes / Caixa", formatCurrency(b.checkingChecking), ""],
        ["       1.1.2 Poupança e Liquidez Diária", formatCurrency(b.checkingSavings), ""],
        ["   1.2 Ativo Não Circulante (Bens e Investimentos)", formatCurrency(b.assetNaoCirculante), `${b.totalAssets > 0 ? ((b.assetNaoCirculante / b.totalAssets) * 100).toFixed(1) + "%" : ""}`],
        ["       1.2.1 Contas de Investimentos", formatCurrency(b.currentInvestments), ""],
        ["       1.2.2 Bens e Ativos Cadastrados", formatCurrency(b.physicalAssets), ""],
        ["2. PASSIVOS (Obrigações e Dívidas)", formatNegativeCurrency(b.totalLiabilities), "100.00%"],
        ["   2.1 Passivo Circulante (Curto Prazo)", formatNegativeCurrency(b.totalLiabilities), "100.00%"],
        ["       2.1.1 Cartões de Crédito (Saldo Devedor)", formatNegativeCurrency(b.totalLiabilities), ""],
        ["(=) PATRIMÔNIO LÍQUIDO", formatCurrency(b.netWorth), `${b.totalAssets > 0 ? ((b.netWorth / b.totalAssets) * 100).toFixed(1) + "%" : ""}`]
      ];

      autoTable(doc, {
        startY: 35,
        head: [["Grupo Contábil", `Valor Consolidado (${selectedCurrency})`, "Proporção %"]],
        body: tableData,
        theme: "plain",
        headStyles: {
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
          halign: "left"
        },
        columnStyles: {
          0: { cellWidth: 110, halign: "left" },
          1: { cellWidth: 45, halign: "right" },
          2: { cellWidth: 25, halign: "right" }
        },
        didParseCell: (data) => {
          const rowText = data.row.cells[0].text[0];
          if (rowText.startsWith("(=)") || rowText.startsWith("1. ATIVOS") || rowText.startsWith("2. PASSIVOS") || rowText.startsWith("   1.") || rowText.startsWith("   2.")) {
            data.cell.styles.fontStyle = "bold";
            if (rowText.startsWith("(=)")) {
              data.cell.styles.textColor = [5, 150, 105];
            }
          }
        }
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Demonstrativo gerado em: ${new Date().toLocaleDateString('pt-BR')} - Pé de Meia`, 105, 285, { align: "center" });
      }

      doc.save(`Balanco-Patrimonial-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Balanço Patrimonial exportado com sucesso em PDF!");
    } catch (error) {
      logger.error(error);
      toast.error("Erro ao gerar PDF do Balanço Patrimonial.");
    }
  };

  const handleExportBalanceSheetCSV = () => {
    try {
      const b = balanceSheetData;
      const today = new Date().toLocaleDateString('pt-BR');

      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Balanço Patrimonial</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          td, th { border: 1px solid #cbd5e1; padding: 10px 14px; font-size: 11px; }
          .brand-title { background-color: #0f172a; color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; height: 38px; }
          .brand-subtitle { background-color: #1e293b; color: #38bdf8; font-size: 10px; text-align: center; height: 22px; }
          .brand-info { background-color: #f8fafc; color: #64748b; font-size: 10px; text-align: center; height: 28px; border-bottom: 2px solid #cbd5e1; font-weight: bold; }
          .th-premium { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 11px; height: 32px; text-align: left; }
          .text-cell { mso-number-format:"\\@"; text-align: left; }
          .number-cell { mso-number-format:"\\#\\,\\#\\#0\\.00"; text-align: right; }
          .bold-row { font-weight: bold; background-color: #f1f5f9; color: #0f172a; }
          .formula-row { font-weight: bold; background-color: #f0fdf4; color: #166534; border-top: 1.5px solid #16a34a; border-bottom: 4px double #16a34a; }
          .sub-header-row { font-weight: bold; background-color: #f8fafc; color: #334155; }
          .subcategory-row { color: #64748b; font-style: italic; background-color: #ffffff; }
          .green-text { color: #166534; font-weight: bold; }
          .red-text { color: #991b1b; font-weight: bold; }
          .net-savings-row { font-weight: 900; font-size: 12px; background-color: #dcfce7; color: #14532d; border-top: 2px solid #15803d; border-bottom: 5px double #15803d; height: 38px; }
        </style>
        </head>
        <body>
        <table>
          <!-- Título Principal -->
          <tr>
            <th colspan="3" class="brand-title">CONTROLE FINANCEIRO</th>
          </tr>
          <tr>
            <th colspan="3" class="brand-subtitle">BALANÇO PATRIMONIAL CONTÁBIL</th>
          </tr>
          <tr>
            <th colspan="3" class="brand-info">
              Posição Contábil Consolidada em ${today}
            </th>
          </tr>
          <tr><td colspan="3" style="border:none; height: 10px;"></td></tr>

          <!-- Indicadores de Saúde Contábil em Excel -->
          <tr>
            <td colspan="3" style="background-color: #f8fafc; border: 1px solid #cbd5e1; font-size: 10px; font-weight: bold; color: #334155; height: 32px; vertical-align: middle;">
              &nbsp;&nbsp;INDICADORES DE SAÚDE PATRIMONIAL:
              &nbsp;&nbsp;&nbsp;&nbsp;• Liquidez Corrente: ${b.liquidityRatio === 999 ? "Infinito" : b.liquidityRatio.toFixed(2)}
              &nbsp;&nbsp;&nbsp;&nbsp;• Grau de Endividamento: ${b.debtRatio.toFixed(1)}%
              &nbsp;&nbsp;&nbsp;&nbsp;• Status Patrimônio: ${b.netWorth >= 0 ? "EXCELENTE" : "ATENÇÃO CRÍTICA"}
            </td>
          </tr>
          <tr><td colspan="3" style="border:none; height: 10px;"></td></tr>

          <!-- Cabeçalho das Colunas -->
          <tr>
            <th class="th-premium text-cell" style="width: 350px; padding-left: 14px;">Grupo Patrimonial (Contas do Balanço)</th>
            <th class="th-premium number-cell" style="width: 160px; text-align: right; padding-right: 14px;">Saldo Consolidado (${selectedCurrency})</th>
            <th class="th-premium text-cell" style="width: 100px; text-align: right; padding-right: 14px;">AV %</th>
          </tr>

          <!-- 1. ATIVOS -->
          <tr class="bold-row">
            <td class="text-cell" style="padding-left: 14px;">1. ATIVOS (Bens e Direitos)</td>
            <td class="number-cell green-text">${b.totalAssets}</td>
            <td class="text-cell" style="text-align: right; font-weight: bold; padding-right: 14px;">100.0%</td>
          </tr>

          <tr class="sub-header-row">
            <td class="text-cell" style="padding-left: 20px;">&nbsp;&nbsp;1.1 Ativo Circulante (Disponibilidades)</td>
            <td class="number-cell">${b.assetCirculante}</td>
            <td class="text-cell" style="text-align: right; padding-right: 14px;">
              ${b.totalAssets > 0 ? ((b.assetCirculante / b.totalAssets) * 100).toFixed(1) + "%" : "0.0%"}
            </td>
          </tr>

          <tr class="subcategory-row">
            <td class="text-cell" style="padding-left: 30px;">&nbsp;&nbsp;&nbsp;&nbsp;• 1.1.1 Saldos em Conta Corrente / Carteira</td>
            <td class="number-cell">${b.checkingChecking}</td>
            <td class="text-cell" style="text-align: right; padding-right: 14px;">
              ${b.assetCirculante > 0 ? ((b.checkingChecking / b.assetCirculante) * 100).toFixed(1) + "%" : "0.0%"}
            </td>
          </tr>

          <tr class="subcategory-row">
            <td class="text-cell" style="padding-left: 30px;">&nbsp;&nbsp;&nbsp;&nbsp;• 1.1.2 Investimentos de Liquidez Diária / Poupança</td>
            <td class="number-cell">${b.checkingSavings}</td>
            <td class="text-cell" style="text-align: right; padding-right: 14px;">
              ${b.assetCirculante > 0 ? ((b.checkingSavings / b.assetCirculante) * 100).toFixed(1) + "%" : "0.0%"}
            </td>
          </tr>

          <tr class="sub-header-row">
            <td class="text-cell" style="padding-left: 20px;">&nbsp;&nbsp;1.2 Ativo Não Circulante (Bens e Investimentos)</td>
            <td class="number-cell">${b.assetNaoCirculante}</td>
            <td class="text-cell" style="text-align: right; padding-right: 14px;">
              ${b.totalAssets > 0 ? ((b.assetNaoCirculante / b.totalAssets) * 100).toFixed(1) + "%" : "0.0%"}
            </td>
          </tr>

          <tr class="subcategory-row">
            <td class="text-cell" style="padding-left: 30px;">&nbsp;&nbsp;&nbsp;&nbsp;• 1.2.1 Contas de Investimento / Aplicações</td>
            <td class="number-cell">${b.currentInvestments}</td>
            <td class="text-cell" style="text-align: right; padding-right: 14px;">
              ${b.assetNaoCirculante > 0 ? ((b.currentInvestments / b.assetNaoCirculante) * 100).toFixed(1) + "%" : "0.0%"}
            </td>
          </tr>

          <tr class="subcategory-row">
            <td class="text-cell" style="padding-left: 30px;">&nbsp;&nbsp;&nbsp;&nbsp;• 1.2.2 Bens e Ativos de Investimentos Cadastrados</td>
            <td class="number-cell">${b.physicalAssets}</td>
            <td class="text-cell" style="text-align: right; padding-right: 14px;">
              ${b.assetNaoCirculante > 0 ? ((b.physicalAssets / b.assetNaoCirculante) * 100).toFixed(1) + "%" : "0.0%"}
            </td>
          </tr>

          <!-- 2. PASSIVOS -->
          <tr class="bold-row">
            <td class="text-cell" style="padding-left: 14px;">2. PASSIVOS (Dívidas e Obrigações)</td>
            <td class="number-cell red-text">${-b.totalLiabilities}</td>
            <td class="text-cell" style="text-align: right; font-weight: bold; padding-right: 14px;">100.0%</td>
          </tr>

          <tr class="sub-header-row">
            <td class="text-cell" style="padding-left: 20px;">&nbsp;&nbsp;2.1 Passivo Circulante (Curto Prazo)</td>
            <td class="number-cell red-text">${-b.totalLiabilities}</td>
            <td class="text-cell" style="text-align: right; font-weight: bold; padding-right: 14px;">100.0%</td>
          </tr>

          <tr class="subcategory-row">
            <td class="text-cell" style="padding-left: 30px;">&nbsp;&nbsp;&nbsp;&nbsp;• 2.1.1 Fatura Acumulada em Cartão de Crédito e Contas Negativas</td>
            <td class="number-cell red-text">${-b.totalLiabilities}</td>
            <td class="text-cell" style="text-align: right; padding-right: 14px;">100.0%</td>
          </tr>

          <!-- PATRIMÔNIO LÍQUIDO -->
          <tr class="net-savings-row">
            <td class="text-cell" style="text-transform: uppercase; padding-left: 14px;">(=) PATRIMÔNIO LÍQUIDO (Capital Líquido Consolidado)</td>
            <td class="number-cell">${b.netWorth}</td>
            <td class="text-cell" style="text-align: right; padding-right: 14px;">
              ${b.totalAssets > 0 ? ((b.netWorth / b.totalAssets) * 100).toFixed(1) + "%" : "0.0%"}
            </td>
          </tr>
        </table>
        </body>
        </html>
      `;

      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `Balanco-Patrimonial-${new Date().toISOString().split('T')[0]}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Balanço Patrimonial exportado com sucesso em Excel formatado!");
    } catch (error) {
      logger.error(error);
      toast.error("Erro ao gerar Excel do Balanço Patrimonial.");
    }
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
