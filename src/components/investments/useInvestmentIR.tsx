import React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Asset } from '@/types/database';
import { getAssetTransactions, getPositionAtDate, getIRDetails } from '@/utils/investmentExport';
import { formatCurrency } from '@/utils/currencyFormatter';
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  Calendar, 
  Briefcase, 
  Coins, 
  Percent, 
  TrendingUp,
  Download,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { exportToIRPDF, exportToIRExcel } from '@/utils/investmentExport';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InvestmentIRPanelProps {
  assets: Asset[];
}



export function useInvestmentIR({ assets }: InvestmentIRPanelProps) {

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear - 1);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Anos disponíveis para declaração
  const availableYears = [currentYear - 1, currentYear - 2, currentYear - 3];

  // 1. Query para carregar as transações de ativos (compra/venda) da tabela asset_transactions
  const { data: assetTransactions, isLoading: isLoadingAssetTxs } = useQuery({
    queryKey: ['asset-transactions-ir', selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_transactions')
        .select('*')
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Erro ao buscar transações de ativos para IR:", error);
        throw error;
      }
      return data || [];
    }
  });

  // 2. Query para carregar transações financeiras gerais (proventos e dividendos) do ano-calendário
  const { data: financeTransactions, isLoading: isLoadingFinanceTxs } = useQuery({
    queryKey: ['finance-transactions-ir', selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(id, name, parent_category_id)
        `)
        .eq('type', 'INCOME')
        .gte('date', `${selectedYear}-01-01`)
        .lte('date', `${selectedYear}-12-31`);

      if (error) {
        console.error("Erro ao buscar proventos para IR:", error);
        throw error;
      }
      return data || [];
    }
  });

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const allTxs = assetTransactions || [];
  const incomeTxs = financeTransactions || [];

  // --- 1. LÓGICA DE BENS E DIREITOS ---
  const bensEDireitosList = assets
    .map(asset => {
      const posAnt = getPositionAtDate(asset, allTxs, `${selectedYear - 1}-12-31`);
      const posAtu = getPositionAtDate(asset, allTxs, `${selectedYear}-12-31`);

      return {
        asset,
        posAnt,
        posAtu,
        irDetails: getIRDetails(asset, selectedYear, posAnt.totalCost, posAtu.totalCost, posAtu.quantity, posAtu.avgPrice)
      };
    })
    .filter(item => item.posAnt.quantity > 0 || item.posAtu.quantity > 0);

  // --- 2. LÓGICA DE RENDIMENTOS ISENTOS ---
  // Mapear transações financeiras de INCOME de subcategorias isentas
  // Subcategorias isentas comuns: Dividendos, Fundos Imobiliários, Rendimento Poupança
  const isentosMap: Record<string, {
    codigo: string;
    tipo: string;
    cnpj: string;
    fontePagadora: string;
    valor: number;
    detalhes: string[];
  }> = {};

  // Dicionário de CNPJs de ativos para auto-resolução de proventos
  const cnpjMap: Record<string, string> = {
    'PETR4': '33.000.167/0001-01', 'PETR3': '33.000.167/0001-01',
    'VALE3': '33.592.510/0001-54', 'ITUB4': '60.872.504/0001-23',
    'ITUB3': '60.872.504/0001-23', 'BBDC4': '60.746.948/0001-12',
    'BBDC3': '60.746.948/0001-12', 'BBAS3': '00.000.000/0001-91',
    'MGLU3': '47.960.950/0001-21', 'ABEV3': '07.526.557/0001-00',
    'WEGE3': '84.429.695/0001-11', 'B3SA3': '09.346.601/0001-25',
    'ITSA4': '17.217.989/0001-04', 'ITSA3': '17.217.989/0001-04',
    'MXRF11': '12.006.126/0001-60', 'HGLG11': '11.728.847/0001-70',
    'XPML11': '28.757.540/0001-48', 'KNIP11': '23.223.940/0001-38',
    'XPLG11': '26.685.992/0001-24', 'KNRI11': '12.005.956/0001-65',
    'HGRE11': '09.072.068/0001-16', 'VISC11': '18.860.759/0001-30'
  };

  // Helper para tentar achar o ativo e CNPJ a partir da descrição
  const resolveFontePagadora = (description: string) => {
    const descUpper = description.toUpperCase();
    const matchedAsset = assets.find(a => {
      const ticker = (a.ticker || '').toUpperCase();
      return ticker && descUpper.includes(ticker);
    });

    if (matchedAsset) {
      const ticker = (matchedAsset.ticker || '').toUpperCase();
      const cnpj = cnpjMap[ticker] || '';
      return {
        cnpj,
        razaoSocial: matchedAsset.name,
        ticker
      };
    }

    // Tenta encontrar algum ticker do mapa de CNPJ diretamente na descrição
    for (const ticker of Object.keys(cnpjMap)) {
      if (descUpper.includes(ticker)) {
        return {
          cnpj: cnpjMap[ticker],
          razaoSocial: `${ticker} - EMISSORA CONFORME TBL B3`,
          ticker
        };
      }
    }

    return { cnpj: '', razaoSocial: 'Outros Rendimentos / Proventos', ticker: '' };
  };

  incomeTxs.forEach(tx => {
    const catName = tx.category?.name || '';
    const amount = Number(tx.amount || 0);
    const desc = tx.description || '';
    const { cnpj, razaoSocial, ticker } = resolveFontePagadora(desc);

    const keyPrefix = ticker || razaoSocial;

    if (catName === 'Dividendos' || desc.toLowerCase().includes('dividendo') || desc.toLowerCase().includes('prov.')) {
      const code = '09';
      const key = `${code}-${keyPrefix}`;
      if (!isentosMap[key]) {
        isentosMap[key] = {
          codigo: '09 - Lucros e dividendos recebidos',
          tipo: 'Lucros e Dividendos',
          cnpj,
          fontePagadora: razaoSocial,
          valor: 0,
          detalhes: []
        };
      }
      isentosMap[key].valor = SafeFinancialCalculator.add(isentosMap[key].valor, amount);
      isentosMap[key].detalhes.push(`${tx.date.split('-').reverse().slice(0, 2).join('/')}: R$ ${amount.toFixed(2)} (${desc})`);
    } 
    else if (catName === 'Fundos Imobiliários' || desc.toLowerCase().includes('fii') || desc.toLowerCase().includes('rend. fii')) {
      const code = '26';
      const key = `${code}-${keyPrefix}`;
      if (!isentosMap[key]) {
        isentosMap[key] = {
          codigo: '26 - Outros (Rendimentos de Fundos Imobiliários Isentos)',
          tipo: 'Rendimento de FII (Isento)',
          cnpj,
          fontePagadora: razaoSocial,
          valor: 0,
          detalhes: []
        };
      }
      isentosMap[key].valor = SafeFinancialCalculator.add(isentosMap[key].valor, amount);
      isentosMap[key].detalhes.push(`${tx.date.split('-').reverse().slice(0, 2).join('/')}: R$ ${amount.toFixed(2)} (${desc})`);
    }
    else if (catName === 'Rendimento Poupança' || desc.toLowerCase().includes('poupança') || desc.toLowerCase().includes('lci') || desc.toLowerCase().includes('lca')) {
      const code = '12';
      const key = `${code}-${keyPrefix}`;
      if (!isentosMap[key]) {
        isentosMap[key] = {
          codigo: '12 - Rendimentos de cadernetas de poupança, letras de crédito (LCI, LCA, CRI, CRA, etc.)',
          tipo: 'Rendimento de Renda Fixa Isenta',
          cnpj,
          fontePagadora: razaoSocial,
          valor: 0,
          detalhes: []
        };
      }
      isentosMap[key].valor = SafeFinancialCalculator.add(isentosMap[key].valor, amount);
      isentosMap[key].detalhes.push(`${tx.date.split('-').reverse().slice(0, 2).join('/')}: R$ ${amount.toFixed(2)} (${desc})`);
    }
  });

  // --- 3. LÓGICA DE TRIBUTAÇÃO EXCLUSIVA ---
  const tributacaoExclusivaMap: Record<string, {
    codigo: string;
    tipo: string;
    cnpj: string;
    fontePagadora: string;
    valor: number;
    detalhes: string[];
  }> = {};

  incomeTxs.forEach(tx => {
    const catName = tx.category?.name || '';
    const amount = Number(tx.amount || 0);
    const desc = tx.description || '';
    const { cnpj, razaoSocial, ticker } = resolveFontePagadora(desc);

    const keyPrefix = ticker || razaoSocial;

    if (catName === 'Juros' || desc.toLowerCase().includes('jcp') || desc.toLowerCase().includes('juros sobre capital') || desc.toLowerCase().includes('juros s/')) {
      const code = '10';
      const key = `${code}-${keyPrefix}`;
      if (!tributacaoExclusivaMap[key]) {
        tributacaoExclusivaMap[key] = {
          codigo: '10 - Juros sobre capital próprio (JCP)',
          tipo: 'Juros sobre Capital Próprio',
          cnpj,
          fontePagadora: razaoSocial,
          valor: 0,
          detalhes: []
        };
      }
      tributacaoExclusivaMap[key].valor = SafeFinancialCalculator.add(tributacaoExclusivaMap[key].valor, amount);
      tributacaoExclusivaMap[key].detalhes.push(`${tx.date.split('-').reverse().slice(0, 2).join('/')}: R$ ${amount.toFixed(2)} (${desc})`);
    }
    else if (catName === 'Rendimento CDB' || desc.toLowerCase().includes('cdb') || desc.toLowerCase().includes('tesouro direto') || desc.toLowerCase().includes('rdb')) {
      const code = '06';
      const key = `${code}-${keyPrefix}`;
      if (!tributacaoExclusivaMap[key]) {
        tributacaoExclusivaMap[key] = {
          codigo: '06 - Rendimentos de aplicações financeiras (CDB, RDB, Tesouro Direto, Debêntures Comuns)',
          tipo: 'Rendimento de Aplicação Tributada',
          cnpj,
          fontePagadora: razaoSocial,
          valor: 0,
          detalhes: []
        };
      }
      tributacaoExclusivaMap[key].valor = SafeFinancialCalculator.add(tributacaoExclusivaMap[key].valor, amount);
      tributacaoExclusivaMap[key].detalhes.push(`${tx.date.split('-').reverse().slice(0, 2).join('/')}: R$ ${amount.toFixed(2)} (${desc})`);
    }
  });

  // --- 4. LÓGICA DE RENDA VARIÁVEL / OPERAÇÕES MÊS A MÊS ---
  // Coletar as transações ocorridas no ano selecionado
  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;

  const operationsOfYear = allTxs.filter(tx => tx.date >= yearStart && tx.date <= yearEnd);

  // Mapear operações mês a mês
  const monthlyResumo: Record<number, {
    month: number;
    compras: number;
    vendas: number;
    vendasAcoes: number; // Para controle do limite de 20k
    lucroVendaAcoes: number;
    prejuizoAcumulado: number;
    txsCount: number;
    lucroEstimado: number;
  }> = {};

  // Inicializar os 12 meses
  for (let m = 0; m < 12; m++) {
    monthlyResumo[m] = {
      month: m,
      compras: 0,
      vendas: 0,
      vendasAcoes: 0,
      lucroVendaAcoes: 0,
      prejuizoAcumulado: 0,
      txsCount: 0,
      lucroEstimado: 0
    };
  }

  // Lógica exata para cálculo de PnL de Vendas
  operationsOfYear.forEach(tx => {
    const txDate = new Date(tx.date);
    const m = txDate.getUTCMonth();
    const amount = Number(tx.quantity) * Number(tx.price);
    const asset = assets.find(a => a.id === tx.asset_id);

    monthlyResumo[m].txsCount++;

    if (tx.type === 'BUY') {
      monthlyResumo[m].compras = SafeFinancialCalculator.add(monthlyResumo[m].compras, amount);
    } else if (tx.type === 'SELL') {
      monthlyResumo[m].vendas = SafeFinancialCalculator.add(monthlyResumo[m].vendas, amount);

      // Calcular o lucro/prejuízo matemático dessa venda com custo médio ponderado
      if (asset) {
        // Obter todas as transações deste ativo ordenadas
        const assetTxs = allTxs.filter(t => t.asset_id === asset.id);
        
        // Obter transações anteriores a esta venda
        const priorTxs = assetTxs.filter(t => t.date < tx.date || (t.date === tx.date && t.id !== tx.id && t.created_at < tx.created_at));

        let qty = 0;
        let totalCost = 0;
        
        priorTxs.forEach(t => {
          const tQty = Number(t.quantity);
          const tPrice = Number(t.price);
          if (t.type === 'BUY') {
            totalCost = SafeFinancialCalculator.add(totalCost, SafeFinancialCalculator.multiply(tQty, tPrice));
            qty = SafeFinancialCalculator.add(qty, tQty);
          } else if (t.type === 'SELL') {
            if (qty > 0) {
              const currentAvg = SafeFinancialCalculator.divide(totalCost, qty);
              const soldQty = Math.min(tQty, qty);
              qty = SafeFinancialCalculator.subtract(qty, soldQty);
              totalCost = SafeFinancialCalculator.multiply(qty, currentAvg);
            }
          }
        });

        const avgPrice = qty > 0 ? SafeFinancialCalculator.divide(totalCost, qty) : Number(asset.purchase_price || 0);
        const salePrice = Number(tx.price);
        const saleQty = Number(tx.quantity);
        const profit = SafeFinancialCalculator.multiply(SafeFinancialCalculator.subtract(salePrice, avgPrice), saleQty);

        monthlyResumo[m].lucroEstimado = SafeFinancialCalculator.add(monthlyResumo[m].lucroEstimado, profit);

        if (asset.type === 'STOCK') {
          monthlyResumo[m].vendasAcoes = SafeFinancialCalculator.add(monthlyResumo[m].vendasAcoes, amount);
          if (profit > 0) {
            monthlyResumo[m].lucroVendaAcoes = SafeFinancialCalculator.add(monthlyResumo[m].lucroVendaAcoes, profit);
          } else {
            monthlyResumo[m].prejuizoAcumulado = SafeFinancialCalculator.add(monthlyResumo[m].prejuizoAcumulado, Math.abs(profit)); // Salva como positivo
          }
        }
      }
    }
  });

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];


  return {
    currentYear,
    selectedYear, setSelectedYear,
    copiedField, setCopiedField,
    availableYears,
    assetTransactions, isLoadingAssetTxs,
    bensEDireitosList,
    isentosMap,
    tributacaoExclusivaMap,
    monthlyResumo,
    copyToClipboard: handleCopy,
    handleExportPDF: exportToIRPDF,
    handleExportExcel: exportToIRExcel,
    monthNames
  };
}
