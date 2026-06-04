import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Asset } from '@/types/database';
import { formatCurrency } from './currencyFormatter';
import { supabase } from '@/integrations/supabase/client';

export interface AssetTransaction {
  id: string;
  asset_id: string;
  type: string;
  quantity: number | string;
  price: number | string;
  date: string;
  name?: string;
  ticker?: string;
  currency?: string;
}

const BRAND_COLOR: [number, number, number] = [5, 150, 105]; // Esmeralda / Verde Premium
const TEXT_COLOR: [number, number, number] = [31, 41, 55]; // Cinza Escuro

// Helper para invocar autoTable de forma resiliente diante de variações de bundler
const safeCallAutoTable = (doc: jsPDF, options: Record<string, unknown>) => {
  try {
    if (typeof autoTable === 'function') {
      autoTable(doc, options);
    } else if (autoTable && typeof (autoTable as any).default === 'function') {
      (autoTable as any).default(doc, options);
    } else if (typeof (doc as any).autoTable === 'function') {
      (doc as any).autoTable(options);
    } else {
      console.warn('Metodo autoTable não encontrado no escopo global ou local do jsPDF.');
    }
  } catch (error) {
    console.error('Erro ao renderizar autoTable no PDF:', error);
  }
};

const getNextStartY = (doc: jsPDF, fallbackY: number): number => {
  const lastAutoTable = (doc as any).lastAutoTable;
  if (lastAutoTable && typeof lastAutoTable.finalY === 'number') {
    return lastAutoTable.finalY + 12;
  }
  return fallbackY;
};

// Retorna as transações de um ativo (reais do banco ou seed virtual)
export const getAssetTransactions = (asset: Asset, realTransactions: AssetTransaction[]) => {
  const assetTxs = realTransactions.filter(tx => tx.asset_id === asset.id);
  if (assetTxs.length === 0) {
    // Se não há transações no banco, gera a transação virtual / seed baseada no ativo para retrocompatibilidade
    const pDate = asset.purchase_date ? asset.purchase_date.split('T')[0] : (asset.created_at || '').split('T')[0];
    return [{
      id: `virtual-${asset.id}`,
      asset_id: asset.id,
      type: 'BUY',
      quantity: Number(asset.quantity || 0),
      price: Number(asset.purchase_price || 0),
      date: pDate
    }];
  }
  return assetTxs;
};

export const getPositionAtDate = (asset: Asset, transactions: AssetTransaction[], cutoffDate: string) => {
  const assetTxs = getAssetTransactions(asset, transactions);
  
  let qty = 0;
  let totalCost = 0;
  let avgPrice = 0;
  
  for (const tx of assetTxs) {
    if (tx.date > cutoffDate) continue;
    
    const txQty = Number(tx.quantity);
    const txPrice = Number(tx.price);
    
    if (tx.type === 'BUY') {
      totalCost += txQty * txPrice;
      qty += txQty;
    } else if (tx.type === 'SELL') {
      if (qty > 0) {
        const currentAvg = totalCost / qty;
        const soldQty = Math.min(txQty, qty);
        qty -= soldQty;
        totalCost -= soldQty * currentAvg;
      }
    }
  }
  if (qty > 0) avgPrice = totalCost / qty;
  
  return { quantity: qty, totalCost: qty > 0 ? totalCost : 0, avgPrice: qty > 0 ? avgPrice : 0 };
};

export interface IRAssetDetails {
  grupo: string;
  codigo: string;
  cnpj: string;
  locationCode: string;
  discriminacao: string;
  situacaoAnterior: number;
  situacaoAtual: number;
}

/**
 * Mapeia e retorna os detalhes de imposto de renda (IR) de um ativo com base nos padrões da Receita Federal
 */
export const getIRDetails = (
  asset: Asset, 
  year: number,
  calculatedPosAntCost?: number,
  calculatedPosAtuCost?: number,
  calculatedQty?: number,
  calculatedAvgPrice?: number
): IRAssetDetails => {
  const ticker = (asset.ticker || '').toUpperCase().trim();
  const quantity = calculatedQty !== undefined ? calculatedQty : Number(asset.quantity || 0);
  const purchasePrice = calculatedAvgPrice !== undefined ? calculatedAvgPrice : Number(asset.purchase_price || 0);
  const totalCost = calculatedPosAtuCost !== undefined ? calculatedPosAtuCost : (quantity * purchasePrice);
  
  // Determina se foi comprado no ano atual
  let purchasedThisYear = false;
  if (asset.purchase_date) {
    try {
      const pYear = new Date(asset.purchase_date).getFullYear();
      if (pYear === year) {
        purchasedThisYear = true;
      }
    } catch (e) {}
  }
  
  const situacaoAnterior = calculatedPosAntCost !== undefined ? calculatedPosAntCost : (purchasedThisYear ? 0 : totalCost);
  const situacaoAtual = totalCost;

  // Código de localização no IR (105 é Brasil, 249 é EUA)
  const locationCode = asset.location === 'ABROAD' ? '249' : '105';

  // Base de CNPJs de ativos mais comuns da B3 para enriquecimento e efeito WOW na exportação do IR
  const cnpjMap: Record<string, { cnpj: string; razaoSocial: string }> = {
    'PETR4': { cnpj: '33.000.167/0001-01', razaoSocial: 'PETROLEO BRASILEIRO S.A. PETROBRAS' },
    'PETR3': { cnpj: '33.000.167/0001-01', razaoSocial: 'PETROLEO BRASILEIRO S.A. PETROBRAS' },
    'VALE3': { cnpj: '33.592.510/0001-54', razaoSocial: 'VALE S.A.' },
    'ITUB4': { cnpj: '60.872.504/0001-23', razaoSocial: 'ITAÚ UNIBANCO HOLDING S.A.' },
    'ITUB3': { cnpj: '60.872.504/0001-23', razaoSocial: 'ITAÚ UNIBANCO HOLDING S.A.' },
    'BBDC4': { cnpj: '60.746.948/0001-12', razaoSocial: 'BANCO BRADESCO S.A.' },
    'BBDC3': { cnpj: '60.746.948/0001-12', razaoSocial: 'BANCO BRADESCO S.A.' },
    'BBAS3': { cnpj: '00.000.000/0001-91', razaoSocial: 'BANCO DO BRASIL S.A.' },
    'MGLU3': { cnpj: '47.960.950/0001-21', razaoSocial: 'MAGAZINE LUIZA S.A.' },
    'ABEV3': { cnpj: '07.526.557/0001-00', razaoSocial: 'AMBEV S.A.' },
    'WEGE3': { cnpj: '84.429.695/0001-11', razaoSocial: 'WEG S.A.' },
    'B3SA3': { cnpj: '09.346.601/0001-25', razaoSocial: 'B3 S.A. - BRASIL, BOLSA, BALCÃO' },
    'ITSA4': { cnpj: '17.217.989/0001-04', razaoSocial: 'ITAÚSA S.A.' },
    'ITSA3': { cnpj: '17.217.989/0001-04', razaoSocial: 'ITAÚSA S.A.' },
    
    // FIIs comuns
    'MXRF11': { cnpj: '12.006.126/0001-60', razaoSocial: 'MAXI RENDA FUNDO DE INVESTIMENTO IMOBILIÁRIO - FII' },
    'HGLG11': { cnpj: '11.728.847/0001-70', razaoSocial: 'CSHG LOGÍSTICA - FUNDO DE INVESTIMENTO IMOBILIÁRIO - FII' },
    'XPML11': { cnpj: '28.757.540/0001-48', razaoSocial: 'XP MALLS FUNDO DE INVESTIMENTO IMOBILIÁRIO - FII' },
    'KNIP11': { cnpj: '23.223.940/0001-38', razaoSocial: 'KINEA ÍNDICES DE PREÇOS FUNDO DE INVESTIMENTO IMOBILIÁRIO - FII' },
    'XPLG11': { cnpj: '26.685.992/0001-24', razaoSocial: 'XP LOG - FUNDO DE INVESTIMENTO IMOBILIÁRIO - FII' },
    'KNRI11': { cnpj: '12.005.956/0001-65', razaoSocial: 'KINEA RENDA IMOBILIÁRIA FUNDO DE INVESTIMENTO IMOBILIÁRIO - FII' },
    'HGRE11': { cnpj: '09.072.068/0001-16', razaoSocial: 'CSHG REAL ESTATE - FUNDO DE INVESTIMENTO IMOBILIÁRIO - FII' },
    'VISC11': { cnpj: '18.860.759/0001-30', razaoSocial: 'VINCI SHOPPING CENTERS FUNDO DE INVESTIMENTO IMOBILIÁRIO - FII' },
  };

  const lookup = cnpjMap[ticker] || { cnpj: '', razaoSocial: asset.name };
  const cnpj = lookup.cnpj || '';
  const companyName = lookup.razaoSocial || asset.name;

  let grupo = '03 - Participações Societárias';
  let codigo = '01 - Ações (inclusive as listadas em bolsa)';
  let typeLabel = 'AÇÕES';

  switch (asset.type) {
    case 'STOCK':
      grupo = '03 - Participações Societárias';
      codigo = '01 - Ações (inclusive as listadas em bolsa)';
      typeLabel = 'AÇÕES ORDINÁRIAS/PREFERENCIAIS';
      break;
    case 'FII':
      grupo = '07 - Fundos';
      codigo = '03 - Fundo de Investimento Imobiliário (FII)';
      typeLabel = 'FUNDO DE INVESTIMENTO IMOBILIÁRIO';
      break;
    case 'ETF':
      grupo = '07 - Fundos';
      codigo = '09 - Outros fundos de índice (ETFs)';
      typeLabel = 'FUNDO DE ÍNDICE (ETF)';
      break;
    case 'REIT':
      grupo = '03 - Participações Societárias';
      codigo = '01 - Ações (inclusive as listadas em bolsa)';
      typeLabel = 'REIT (REAL ESTATE INVESTMENT TRUST)';
      break;
    case 'BOND':
      grupo = '04 - Aplicações e Investimentos';
      if (asset.name.toUpperCase().includes('POUPANÇA')) {
        codigo = '01 - Depósito em caderneta de poupança';
        typeLabel = 'CADERNETA DE POUPANÇA';
      } else if (asset.name.toUpperCase().includes('LCI') || asset.name.toUpperCase().includes('LCA') || asset.name.toUpperCase().includes('CRA') || asset.name.toUpperCase().includes('CRI')) {
        codigo = '03 - Títulos isentos de tributação (LCI, LCA, CRI, CRA, etc.)';
        typeLabel = 'RENDA FIXA ISENTA (LCI/LCA/CRI/CRA)';
      } else {
        codigo = '02 - Títulos públicos e privados sujeitos a tributação (Tesouro Direto, CDB, RDB, Debêntures)';
        typeLabel = 'RENDA FIXA TRIBUTADA (CDB/TESOURO DIRETO)';
      }
      break;
    case 'CRYPTO':
      grupo = '08 - Criptoativos';
      if (ticker === 'BTC' || ticker === 'BTCUSD' || asset.name.toUpperCase().includes('BITCOIN')) {
        codigo = '01 - Criptoativo Bitcoin (BTC)';
        typeLabel = 'CRIPTOATIVO BITCOIN (BTC)';
      } else if (ticker === 'ETH' || ticker === 'ETHUSD' || asset.name.toUpperCase().includes('ETHEREUM')) {
        codigo = '02 - Outros criptoativos, conhecidos como altcoins (ETH, SOL, etc.)';
        typeLabel = 'CRIPTOATIVO ALTCOIN (ETH)';
      } else if (ticker === 'USDT' || ticker === 'USDC' || asset.name.toUpperCase().includes('STABLECOIN')) {
        codigo = '03 - Criptoativos conhecidos como stablecoins (USDT, USDC, BUSD, etc.)';
        typeLabel = 'CRIPTOATIVO STABLECOIN';
      } else {
        codigo = '99 - Outros criptoativos';
        typeLabel = 'CRIPTOATIVO';
      }
      break;
    case 'FUND':
      grupo = '07 - Fundos';
      codigo = '99 - Outros fundos';
      typeLabel = 'FUNDO DE INVESTIMENTO';
      break;
    default:
      grupo = '99 - Outros Bens e Direitos';
      codigo = '99 - Outros bens e direitos';
      typeLabel = 'OUTRO ATIVO FINANCEIRO';
      break;
  }

  if (asset.location === 'ABROAD') {
    typeLabel += ' NO EXTERIOR';
  }

  const tickerStr = ticker ? ` (Ticker: ${ticker})` : '';
  const cnpjStr = cnpj ? ` CNPJ do emissor: ${cnpj}.` : '';
  const brokerName = asset.broker_name || 'Não informada';
  const currencySymbol = asset.currency === 'USD' ? 'US$' : asset.currency === 'EUR' ? '€' : 'R$';
  const originalCurrency = asset.currency || 'BRL';

  // Discriminação super detalhada aceita pela Receita Federal
  const discriminacao = `${typeLabel}${tickerStr} - ${companyName}.${cnpjStr} Quantidade consolidada em 31/12/${year}: ${quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 })}. Preço médio de aquisição: ${currencySymbol} ${purchasePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} (${originalCurrency}). Custodiado na instituição/corretora: ${brokerName}. Custo histórico total de aquisição: R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;

  return {
    grupo,
    codigo,
    cnpj,
    locationCode,
    discriminacao,
    situacaoAnterior,
    situacaoAtual
  };
};

export const exportPortfolioToPDF = (assets: Asset[]) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('pt-BR');
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 1. Cabeçalho e Branding Premium
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('controle financeiro', 14, 23);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Carteira de Investimentos Consolidada', 14, 31);
  
  doc.setFontSize(9);
  doc.text(`Emitido em: ${today} às ${now}`, 150, 23);

  // Totals Calculation
  const totalsByCurrency = assets.reduce<Record<string, { cost: number; current: number; pnl: number }>>((acc, asset) => {
    const currency = asset.currency || 'BRL';
    const cost = (asset.quantity || 0) * (asset.purchase_price || 0);
    const current = (asset.quantity || 0) * (asset.current_price || 0);
    if (!acc[currency]) acc[currency] = { cost: 0, current: 0, pnl: 0 };
    acc[currency].cost += cost;
    acc[currency].current += current;
    acc[currency].pnl += current - cost;
    return acc;
  }, {});

  // Executive Summary Card
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo do Patrimônio', 14, 52);

  safeCallAutoTable(doc, {
    head: [['Moeda', 'Custo', 'Valor Atual', 'Lucro/Prejuízo']],
    body: Object.entries(totalsByCurrency).map(([currency, total]) => [
      currency,
      formatCurrency(total.cost, currency),
      formatCurrency(total.current, currency),
      formatCurrency(total.pnl, currency),
    ]),
    startY: 56,
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: { 
      0: { fontStyle: 'bold', textColor: [100, 110, 120] },
      1: { fontStyle: 'bold', textColor: TEXT_COLOR },
      2: { fontStyle: 'bold', textColor: [100, 110, 120] },
      3: { fontStyle: 'bold' }
    }
  });

  const nextStartY = getNextStartY(doc, 80);

  // Assets Table
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalhamento de Ativos', 14, nextStartY);

  const tableData = assets.map(asset => {
    const cost = (asset.quantity || 0) * (asset.purchase_price || 0);
    const current = (asset.quantity || 0) * (asset.current_price || 0);
    const pnl = current - cost;
    const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;

    return [
      asset.ticker || asset.name,
      asset.type,
      asset.location === 'BR' ? 'Brasil' : 'Exterior',
      asset.quantity?.toFixed(4).replace(/\.?0+$/, '') || '0',
      formatCurrency(asset.purchase_price || 0, asset.currency || 'BRL'),
      formatCurrency(current, asset.currency || 'BRL'),
      `${pnl >= 0 ? '+' : ''}${formatCurrency(pnl, asset.currency || 'BRL')} (${pnlPercent.toFixed(2)}%)`
    ];
  });

  safeCallAutoTable(doc, {
    head: [['Ativo', 'Tipo', 'Local', 'Qtd', 'Preço Médio', 'Valor Atual', 'PnL Total']],
    body: tableData,
    startY: nextStartY + 5,
    theme: 'striped',
    headStyles: { fillColor: BRAND_COLOR, fontSize: 9.5, halign: 'center' },
    bodyStyles: { fontSize: 9, halign: 'center' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      6: { fontStyle: 'bold' }
    },
    // @ts-expect-error Pula checagem de tipagem de biblioteca externa não tipada
    didParseCell: (cellData: Record<string, any>) => {
      if (cellData.section === 'body' && cellData.column.index === 6) {
        const text = cellData.cell.text[0];
        if (text.startsWith('+')) cellData.cell.styles.textColor = [16, 185, 129];
        else if (text.startsWith('-')) cellData.cell.styles.textColor = [239, 68, 68];
      }
    }
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Gestão Financeira | Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
  }

  doc.save(`carteira_seu_bolso_inteligente_${today.replace(/\//g, '-')}.pdf`);
};

const downloadExcel = (htmlContent: string, filename: string) => {
  const safeFilename = filename.replace(/\.csv$/, '.xls');
  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', safeFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToCSV = (assets: Asset[]) => {
  const today = new Date().toLocaleDateString('pt-BR');
  
  const totalsByCurrency = assets.reduce<Record<string, { cost: number; current: number; pnl: number }>>((acc, asset) => {
    const currency = asset.currency || 'BRL';
    const cost = (asset.quantity || 0) * (asset.purchase_price || 0);
    const current = (asset.quantity || 0) * (asset.current_price || 0);
    if (!acc[currency]) acc[currency] = { cost: 0, current: 0, pnl: 0 };
    acc[currency].cost += cost;
    acc[currency].current += current;
    acc[currency].pnl += current - cost;
    return acc;
  }, {});
  const summaryText = (field: 'cost' | 'current' | 'pnl') =>
    Object.entries(totalsByCurrency).map(([currency, total]) => formatCurrency(total[field], currency)).join(' / ');

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
    <meta charset="utf-8" />
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Carteira Consolidada</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    <style>
      table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      td, th { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 11px; }
      .brand-title { background-color: #059669; color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; height: 35px; }
      .brand-subtitle { background-color: #047857; color: #ffffff; font-size: 10px; text-align: center; height: 20px; }
      .section-title { font-size: 12px; font-weight: bold; background-color: #f3f4f6; color: #1f2937; height: 25px; border-bottom: 2px solid #d1d5db; }
      .label-cell { font-weight: bold; color: #4b5563; background-color: #f9fafb; width: 130px; }
      .value-cell { font-weight: 500; color: #111827; }
      .th-premium { background-color: #059669; color: #ffffff; font-weight: bold; font-size: 10px; height: 25px; }
      .tr-zebra { background-color: #f9fafb; }
      .text-cell { mso-number-format:"\\@"; text-align: left; }
      .number-cell { mso-number-format:"\\#\\,\\#\\#0\\.00"; text-align: right; }
      .qty-cell { mso-number-format:"\\#\\,\\#\\#0\\.0000"; text-align: right; }
      .green-text { color: #059669; font-weight: bold; }
      .red-text { color: #dc2626; font-weight: bold; }
    </style>
    </head>
    <body>
    <table>
      <tr>
        <th colspan="12" class="brand-title">CONTROLE FINANCEIRO</th>
      </tr>
      <tr>
        <th colspan="12" class="brand-subtitle">Carteira de Investimentos Consolidada — Emitido em ${today}</th>
      </tr>
      <tr><td colspan="12" style="border:none; height: 10px;"></td></tr>

      <tr>
        <th colspan="12" class="section-title">1. RESUMO PATRIMONIAL CONSOLIDADO</th>
      </tr>
      <tr>
        <td class="label-cell">Patrimônio Total:</td>
        <td colspan="2" class="value-cell text-cell green-text">${summaryText('current')}</td>
        <td class="label-cell">Lucro/Prejuízo Total:</td>
        <td colspan="2" class="value-cell text-cell">${summaryText('pnl')}</td>
        <td class="label-cell">Custo Total:</td>
        <td colspan="2" class="value-cell text-cell">${summaryText('cost')}</td>
        <td class="label-cell">Moedas:</td>
        <td colspan="2" class="value-cell text-cell">${Object.keys(totalsByCurrency).join(' / ')}</td>
      </tr>
      <tr><td colspan="12" style="border:none; height: 15px;"></td></tr>

      <tr>
        <th colspan="12" class="section-title">2. DETALHAMENTO DE ATIVOS NA CARTEIRA</th>
      </tr>
      <tr>
        <th class="th-premium text-cell">Ticker/Nome</th>
        <th class="th-premium text-cell">Tipo</th>
        <th class="th-premium text-cell">Local</th>
        <th class="th-premium qty-cell">Quantidade</th>
        <th class="th-premium number-cell">Preço Médio</th>
        <th class="th-premium number-cell">Preço Atual</th>
        <th class="th-premium number-cell">Valor Total Atual</th>
        <th class="th-premium text-cell">Moeda</th>
        <th class="th-premium number-cell">PnL</th>
        <th class="th-premium number-cell">PnL %</th>
        <th class="th-premium text-cell">Setor</th>
        <th class="th-premium text-cell">Corretora</th>
      </tr>
  `;

  assets.forEach((asset, index) => {
    const zebraClass = index % 2 === 1 ? 'class="tr-zebra"' : '';
    const cost = (asset.quantity || 0) * (asset.purchase_price || 0);
    const currentValue = (asset.quantity || 0) * (asset.current_price || 0);
    const pnl = currentValue - cost;
    const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;

    html += `
      <tr ${zebraClass}>
        <td class="text-cell" style="font-weight: bold;">${asset.ticker || asset.name}</td>
        <td class="text-cell">${asset.type}</td>
        <td class="text-cell">${asset.location === 'BR' ? 'Brasil' : 'Exterior'}</td>
        <td class="qty-cell">${asset.quantity || 0}</td>
        <td class="number-cell">${asset.purchase_price || 0}</td>
        <td class="number-cell">${asset.current_price || 0}</td>
        <td class="number-cell" style="font-weight: bold;">${currentValue}</td>
        <td class="text-cell">${asset.currency || 'BRL'}</td>
        <td class="number-cell ${pnl >= 0 ? 'green-text' : 'red-text'}">${pnl}</td>
        <td class="number-cell ${pnl >= 0 ? 'green-text' : 'red-text'}">${pnlPercent.toFixed(2)}%</td>
        <td class="text-cell">${asset.sector || ''}</td>
        <td class="text-cell">${asset.broker_name || ''}</td>
      </tr>
    `;
  });

  html += `
    </table>
    </body>
    </html>
  `;

  downloadExcel(html, `investimentos_seu_bolso_inteligente_${today.replace(/\//g, '-')}.xls`);
};

/**
 * Exporta os ativos no formato PDF padrão da Receita Federal para declaração de Bens e Direitos do IR
 */
export const exportToIRPDF = async (assets: Asset[]) => {
  if (!assets || assets.length === 0) return;
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('pt-BR');
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const year = new Date().getFullYear();

  // Buscar todas as transações de ativos para os ativos em questão no Supabase
  const { data: transactions, error } = await supabase
    .from('asset_transactions')
    .select('*')
    .in('asset_id', assets.map(a => a.id))
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Erro ao buscar transações de ativos para IR PDF:", error);
  }

  const allTxs = transactions || [];

  // 1. Cabeçalho e Branding Premium
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('controle financeiro', 14, 23);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Auxiliar de Imposto de Renda — Ano-Calendário ${year - 1}`, 14, 31);
  
  doc.setFontSize(9);
  doc.text(`Emitido em: ${today} às ${now}`, 150, 23);

  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Declaração de Bens e Direitos - Posição em 31/12/${year - 1}`, 14, 50);
  
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120);
  doc.text('AVISO: Este relatório é um demonstrativo auxiliar e informativo com base no custo histórico de aquisição. Use os informes oficiais.', 14, 55);

  let currentY = 62;
  let declaredCount = 0;

  assets.forEach((asset) => {
    const posAnt = getPositionAtDate(asset, allTxs, `${year - 2}-12-31`);
    const posAtu = getPositionAtDate(asset, allTxs, `${year - 1}-12-31`);
    
    // Se a quantidade consolidada no final de ambos os anos for zero, não declaramos esse ativo na ficha de Bens e Direitos para não poluir
    if (posAnt.quantity === 0 && posAtu.quantity === 0) {
      return;
    }

    declaredCount++;
    const ir = getIRDetails(asset, year - 1, posAnt.totalCost, posAtu.totalCost, posAtu.quantity, posAtu.avgPrice);
    
    // Verifica espaço na página
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    // Card background
    doc.setFillColor(249, 250, 251);
    doc.rect(14, currentY, 182, 45, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(14, currentY, 182, 45, 'S');
    
    // Título / Ticker
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text(`${declaredCount}. ${asset.ticker || asset.name} (${asset.type})`, 18, currentY + 7);
    
    // Grupo e Código
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 110, 120);
    doc.text(`GRUPO: ${ir.grupo}   |   CÓDIGO: ${ir.codigo}   |   LOCAL: ${ir.locationCode}`, 18, currentY + 12);
    
    // Discriminação
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
    const splitDescription = doc.splitTextToSize(ir.discriminacao, 174);
    doc.text(splitDescription, 18, currentY + 17);
    
    // Situações Financeiras
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
    doc.text(`Situação em 31/12/${year - 2}: R$ ${ir.situacaoAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, currentY + 40);
    doc.text(`Situação em 31/12/${year - 1}: R$ ${ir.situacaoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 105, currentY + 40);
    
    currentY += 50;
  });

  if (declaredCount === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nenhum ativo com saldo para declarar nesta ficha no período selecionado.', 14, currentY + 10);
    currentY += 20;
  }

  // --- OPERATIONS SECTION (RENDA VARIÁVEL / GANHOS DE CAPITAL) ---
  doc.addPage();
  
  // Cabeçalho da página de operações
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('controle financeiro', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Demonstrativo de Operações de Ativos — Ano-Calendário ${year - 1}`, 14, 19);

  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Histórico de Compras e Vendas (01/01/${year - 1} a 31/12/${year - 1})`, 14, 38);
  
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120);
  doc.text('Utilize esta tabela para auxiliar no preenchimento de suas declarações mensais ou anuais de Renda Variável.', 14, 43);

  // Coletar transações ocorridas no ano-calendário
  // Se a tabela de transações reais estava vazia para um ativo, nós incluímos o seed virtual dele na listagem se a data for no ano
  const yearStart = `${year - 1}-01-01`;
  const yearEnd = `${year - 1}-12-31`;
  
  const allTxsForListing: AssetTransaction[] = [];
  assets.forEach(asset => {
    const txs = getAssetTransactions(asset, allTxs);
    txs.forEach(tx => {
      if (tx.date >= yearStart && tx.date <= yearEnd) {
        allTxsForListing.push({
          ...tx,
          ticker: asset.ticker || asset.name,
          name: asset.name,
          currency: asset.currency || 'BRL'
        });
      }
    });
  });

  // Ordenar por data
  allTxsForListing.sort((a, b) => a.date.localeCompare(b.date));

  if (allTxsForListing.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nenhuma operação realizada de compra ou venda identificada para este ano-calendário.', 14, 53);
  } else {
    const opsData = allTxsForListing.map(tx => {
      const total = Number(tx.quantity) * Number(tx.price);
      const typeStr = tx.type === 'BUY' ? 'COMPRA' : 'VENDA';
      const dateStr = tx.date.split('-').reverse().join('/');
      return [
        dateStr,
        (tx.ticker || '').toUpperCase(),
        tx.name || '',
        typeStr,
        Number(tx.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 8 }),
        formatCurrency(Number(tx.price), tx.currency),
        formatCurrency(total, tx.currency)
      ];
    });

    safeCallAutoTable(doc, {
      head: [['Data', 'Ticker', 'Nome do Ativo', 'Operação', 'Quantidade', 'Preço Unit.', 'Valor Total']],
      body: opsData,
      startY: 48,
      theme: 'striped',
      headStyles: { fillColor: BRAND_COLOR, fontSize: 9, halign: 'center' },
      bodyStyles: { fontSize: 8, halign: 'center' },
      columnStyles: {
        2: { halign: 'left' },
        3: { fontStyle: 'bold' }
      },
      // @ts-expect-error Pula checagem de tipagem de biblioteca externa não tipada
      didParseCell: (cellData: Record<string, any>) => {
        if (cellData.section === 'body' && cellData.column.index === 3) {
          const val = cellData.cell.text[0];
          if (val === 'COMPRA') cellData.cell.styles.textColor = [16, 185, 129];
          else if (val === 'VENDA') cellData.cell.styles.textColor = [239, 68, 68];
        }
      }
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Gestão Financeira | Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
  }

  doc.save(`auxiliar_ir_seu_bolso_inteligente_${year - 1}.pdf`);
};

/**
 * Exporta os ativos no formato Excel padrão da Receita Federal para declaração de Bens e Direitos do IR
 */
export const exportToIRExcel = async (assets: Asset[]) => {
  if (!assets || assets.length === 0) return;
  const year = new Date().getFullYear();
  const today = new Date().toLocaleDateString('pt-BR');

  // Buscar transações
  const { data: transactions, error } = await supabase
    .from('asset_transactions')
    .select('*')
    .in('asset_id', assets.map(a => a.id))
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Erro ao buscar transações de ativos para IR Excel:", error);
  }

  const allTxs = transactions || [];

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
    <meta charset="utf-8" />
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Auxiliar IR</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    <style>
      table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      td, th { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 11px; }
      .brand-title { background-color: #059669; color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; height: 35px; }
      .brand-subtitle { background-color: #047857; color: #ffffff; font-size: 10px; text-align: center; height: 20px; }
      .section-title { font-size: 12px; font-weight: bold; background-color: #f3f4f6; color: #1f2937; height: 25px; border-bottom: 2px solid #d1d5db; }
      .label-cell { font-weight: bold; color: #4b5563; background-color: #f9fafb; width: 140px; }
      .value-cell { font-weight: 500; color: #111827; }
      .th-premium { background-color: #059669; color: #ffffff; font-weight: bold; font-size: 10px; height: 25px; }
      .tr-zebra { background-color: #f9fafb; }
      .text-cell { mso-number-format:"\\@"; text-align: left; }
      .number-cell { mso-number-format:"\\#\\,\\#\\#0\\.00"; text-align: right; }
      .qty-cell { mso-number-format:"\\#\\,\\#\\#0\\.0000"; text-align: right; }
      .green-text { color: #059669; font-weight: bold; }
      .red-text { color: #dc2626; font-weight: bold; }
    </style>
    </head>
    <body>
    <table>
      <tr>
        <th colspan="11" class="brand-title">CONTROLE FINANCEIRO</th>
      </tr>
      <tr>
        <th colspan="11" class="brand-subtitle">Demonstrativo Auxiliar de Imposto de Renda — Ano-Calendário ${year - 1} — Emitido em ${today}</th>
      </tr>
      <tr><td colspan="11" style="border:none; height: 10px;"></td></tr>

      <tr>
        <th colspan="11" class="section-title">1. DECLARAÇÃO DE BENS E DIREITOS (AUXILIAR IRPF)</th>
      </tr>
      <tr>
        <td class="label-cell">Ano-Calendário:</td>
        <td colspan="2" class="value-cell text-cell">${year - 1}</td>
        <td class="label-cell">Total de Ativos Declarados:</td>
        <td colspan="2" class="value-cell text-cell" id="declared-count-placeholder">---</td>
        <td colspan="5" class="value-cell text-cell" style="color: #6b7280; font-style: italic;">Demonstrativo elaborado com base no custo histórico de aquisição.</td>
      </tr>
      <tr><td colspan="11" style="border:none; height: 15px;"></td></tr>

      <tr>
        <th colspan="11" class="section-title">2. DETALHAMENTO DOS INVESTIMENTOS (PADRÃO RECEITA FEDERAL)</th>
      </tr>
      <tr>
        <th class="th-premium text-cell" style="width: 140px;">Grupo</th>
        <th class="th-premium text-cell" style="width: 140px;">Código</th>
        <th class="th-premium text-cell" style="width: 60px;">Local</th>
        <th class="th-premium text-cell" style="width: 100px;">CNPJ Emissor</th>
        <th class="th-premium text-cell" style="width: 60px;">Ticker</th>
        <th class="th-premium text-cell" style="width: 120px;">Nome do Ativo</th>
        <th class="th-premium text-cell" style="width: 400px;">Discriminação Oficial Receita Federal</th>
        <th class="th-premium qty-cell" style="width: 80px;">Qtd consolidada</th>
        <th class="th-premium number-cell" style="width: 90px;">Preço Médio</th>
        <th class="th-premium number-cell" style="width: 110px;">Posição em 31/12/${year - 2}</th>
        <th class="th-premium number-cell" style="width: 110px;">Posição em 31/12/${year - 1}</th>
      </tr>
  `;

  let declaredCount = 0;
  assets.forEach((asset) => {
    const posAnt = getPositionAtDate(asset, allTxs, `${year - 2}-12-31`);
    const posAtu = getPositionAtDate(asset, allTxs, `${year - 1}-12-31`);
    
    // Filtro para não poluir Bens e Direitos com ativos de saldo zero em ambos os marcos
    if (posAnt.quantity === 0 && posAtu.quantity === 0) {
      return;
    }

    declaredCount++;
    const zebraClass = declaredCount % 2 === 1 ? 'class="tr-zebra"' : '';
    const ir = getIRDetails(asset, year - 1, posAnt.totalCost, posAtu.totalCost, posAtu.quantity, posAtu.avgPrice);

    html += `
      <tr ${zebraClass}>
        <td class="text-cell">${ir.grupo}</td>
        <td class="text-cell">${ir.codigo}</td>
        <td class="text-cell">${ir.locationCode}</td>
        <td class="text-cell">${ir.cnpj || 'N/A'}</td>
        <td class="text-cell" style="font-weight: bold;">${(asset.ticker || '').toUpperCase()}</td>
        <td class="text-cell">${asset.name}</td>
        <td class="text-cell" style="font-size: 10px; color: #4b5563;">${ir.discriminacao}</td>
        <td class="qty-cell">${posAtu.quantity}</td>
        <td class="number-cell">${posAtu.avgPrice}</td>
        <td class="number-cell" style="font-weight: bold;">${posAnt.totalCost}</td>
        <td class="number-cell" style="font-weight: bold; color: #059669;">${posAtu.totalCost}</td>
      </tr>
    `;
  });

  // Atualizar contagem no HTML
  html = html.replace('id="declared-count-placeholder">---', `>${declaredCount} ativos declarados`);

  html += `
      <tr><td colspan="11" style="border:none; height: 20px;"></td></tr>
      <tr>
        <th colspan="11" class="section-title">3. MOVIMENTAÇÕES REALIZADAS NO ANO (RENDA VARIÁVEL / GANHOS DE CAPITAL)</th>
      </tr>
      <tr>
        <th class="th-premium text-cell" style="width: 100px;">Data</th>
        <th class="th-premium text-cell" style="width: 100px;">Ativo (Ticker)</th>
        <th class="th-premium text-cell" style="width: 150px;">Nome do Ativo</th>
        <th class="th-premium text-cell" style="width: 100px;">Operação</th>
        <th class="th-premium qty-cell" style="width: 100px;">Quantidade</th>
        <th class="th-premium number-cell" style="width: 100px;">Preço Unitário</th>
        <th class="th-premium number-cell" style="width: 120px;">Valor Total</th>
        <th colspan="4" style="border:none;"></th>
      </tr>
  `;

  const yearStart = `${year - 1}-01-01`;
  const yearEnd = `${year - 1}-12-31`;

  const allTxsForListing: AssetTransaction[] = [];
  assets.forEach(asset => {
    const txs = getAssetTransactions(asset, allTxs);
    txs.forEach(tx => {
      if (tx.date >= yearStart && tx.date <= yearEnd) {
        allTxsForListing.push({
          ...tx,
          ticker: asset.ticker || asset.name,
          name: asset.name,
          currency: asset.currency || 'BRL'
        });
      }
    });
  });

  // Ordenar por data
  allTxsForListing.sort((a, b) => a.date.localeCompare(b.date));

  if (allTxsForListing.length === 0) {
    html += `
      <tr>
        <td colspan="11" class="text-cell" style="color: #6b7280; font-style: italic;">Nenhuma movimentação realizada neste ano-calendário.</td>
      </tr>
    `;
  } else {
    allTxsForListing.forEach((tx, index) => {
      const zebraClass = index % 2 === 1 ? 'class="tr-zebra"' : '';
      const total = Number(tx.quantity) * Number(tx.price);
      const typeStr = tx.type === 'BUY' ? 'COMPRA' : 'VENDA';
      const dateStr = tx.date.split('-').reverse().join('/');
      const color = tx.type === 'BUY' ? '#059669' : '#dc2626';

      html += `
        <tr ${zebraClass}>
          <td class="text-cell">${dateStr}</td>
          <td class="text-cell" style="font-weight: bold;">${(tx.ticker || '').toUpperCase()}</td>
          <td class="text-cell">${tx.name}</td>
          <td class="text-cell" style="font-weight: bold; color: ${color};">${typeStr}</td>
          <td class="qty-cell">${Number(tx.quantity)}</td>
          <td class="number-cell">${Number(tx.price)}</td>
          <td class="number-cell" style="font-weight: bold;">${total}</td>
          <td colspan="4" style="border:none;"></td>
        </tr>
      `;
    });
  }

  html += `
    </table>
    </body>
    </html>
  `;

  downloadExcel(html, `auxiliar_ir_excel_seu_bolso_inteligente_${year - 1}.xls`);
};
