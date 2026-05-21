const fs = require('fs');

const path = 'src/utils/investmentExport.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Add supabase import
code = code.replace(`import { formatCurrency } from './currencyFormatter';`, `import { formatCurrency } from './currencyFormatter';
import { supabase } from '@/integrations/supabase/client';`);

// 2. Add Helper Functions
const helperFns = `
const getPositionAtDate = (asset: Asset, transactions: any[], cutoffDate: string) => {
  const assetTxs = transactions.filter(tx => tx.asset_id === asset.id);
  
  let qty = 0;
  let totalCost = 0;
  let avgPrice = 0;
  
  if (assetTxs.length === 0) {
    const pDate = asset.purchase_date ? asset.purchase_date.split('T')[0] : (asset.created_at || '').split('T')[0];
    if (pDate && pDate <= cutoffDate) {
      qty = Number(asset.quantity || 0);
      avgPrice = Number(asset.purchase_price || 0);
      totalCost = qty * avgPrice;
    }
  } else {
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
  }
  
  return { quantity: qty, totalCost: qty > 0 ? totalCost : 0, avgPrice: qty > 0 ? avgPrice : 0 };
};
`;

code = code.replace(`export interface IRAssetDetails {`, helperFns + '\nexport interface IRAssetDetails {');

// 3. Update getIRDetails
const oldGetIRDetails = `export const getIRDetails = (asset: Asset, year: number): IRAssetDetails => {
  const ticker = (asset.ticker || '').toUpperCase().trim();
  const quantity = Number(asset.quantity || 0);
  const purchasePrice = Number(asset.purchase_price || 0);
  const totalCost = quantity * purchasePrice;
  
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
  
  const situacaoAnterior = purchasedThisYear ? 0 : totalCost;
  const situacaoAtual = totalCost;`;

const newGetIRDetails = `export const getIRDetails = (asset: Asset, year: number, sitAnt: number, sitAtu: number, qtyAtu: number, pmAtu: number): IRAssetDetails => {
  const ticker = (asset.ticker || '').toUpperCase().trim();
  const totalCost = sitAtu;
  const situacaoAnterior = sitAnt;
  const situacaoAtual = sitAtu;
  const quantity = qtyAtu;
  const purchasePrice = pmAtu;`;

code = code.replace(oldGetIRDetails, newGetIRDetails);

code = code.replace(
  "Quantidade: ${quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 })}",
  "Quantidade consolidada: ${quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 })}"
);

// 4. Update exportToIRPDF
const oldExportToIRPDF = `export const exportToIRPDF = (assets: Asset[]) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('pt-BR');
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const year = new Date().getFullYear();`;

const newExportToIRPDF = `export const exportToIRPDF = async (assets: Asset[]) => {
  if (!assets.length) return;
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('pt-BR');
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const year = new Date().getFullYear();
  
  const { data: transactions } = await supabase
    .from('asset_transactions')
    .select('*')
    .in('asset_id', assets.map(a => a.id))
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });
  
  const allTxs = transactions || [];`;

code = code.replace(oldExportToIRPDF, newExportToIRPDF);

code = code.replace(
  `const ir = getIRDetails(asset, year - 1);`,
  `const posAnt = getPositionAtDate(asset, allTxs, \`\${year - 2}-12-31\`);
    const posAtu = getPositionAtDate(asset, allTxs, \`\${year - 1}-12-31\`);
    const ir = getIRDetails(asset, year - 1, posAnt.totalCost, posAtu.totalCost, posAtu.quantity, posAtu.avgPrice);`
);

// Add Operations Table to PDF
const operationsPdf = `
  // --- OPERATIONS SECTION ---
  doc.addPage();
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(\`Operações Realizadas no Ano-Calendário \${year - 1}\`, 14, 20);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório detalhado para auxiliar no preenchimento da aba de Renda Variável (Ganhos de Capital).', 14, 25);

  const txsThisYear = allTxs.filter(tx => tx.date.startsWith(\`\${year - 1}-\`));
  
  if (txsThisYear.length === 0) {
    doc.text('Nenhuma operação realizada neste ano.', 14, 35);
  } else {
    const opsData = txsThisYear.map(tx => {
      const asset = assets.find(a => a.id === tx.asset_id);
      const total = Number(tx.quantity) * Number(tx.price);
      const typeStr = tx.type === 'BUY' ? 'COMPRA' : 'VENDA';
      const dateStr = tx.date.split('-').reverse().join('/');
      return [
        dateStr,
        asset ? asset.ticker || asset.name : 'Desconhecido',
        typeStr,
        Number(tx.quantity).toFixed(4).replace(/\\.?0+$/, ''),
        formatCurrency(Number(tx.price), asset?.currency || 'BRL'),
        formatCurrency(total, asset?.currency || 'BRL')
      ];
    });

    safeCallAutoTable(doc, {
      head: [['Data', 'Ativo', 'Operação', 'Quantidade', 'Preço', 'Valor Total']],
      body: opsData,
      startY: 30,
      theme: 'striped',
      headStyles: { fillColor: BRAND_COLOR, fontSize: 9 },
      bodyStyles: { fontSize: 8.5 },
      didParseCell: (cellData: any) => {
        if (cellData.section === 'body' && cellData.column.index === 2) {
          if (cellData.cell.text[0] === 'COMPRA') cellData.cell.styles.textColor = [16, 185, 129];
          else if (cellData.cell.text[0] === 'VENDA') cellData.cell.styles.textColor = [239, 68, 68];
        }
      }
    });
  }
`;

code = code.replace(
  `  // Footer\n  const pageCount = (doc as any).internal.getNumberOfPages();`,
  operationsPdf + `\n  // Footer\n  const pageCount = (doc as any).internal.getNumberOfPages();`
);

// 5. Update exportToIRExcel
const oldExportToIRExcel = `export const exportToIRExcel = (assets: Asset[]) => {
  const year = new Date().getFullYear();
  const today = new Date().toLocaleDateString('pt-BR');`;

const newExportToIRExcel = `export const exportToIRExcel = async (assets: Asset[]) => {
  if (!assets.length) return;
  const year = new Date().getFullYear();
  const today = new Date().toLocaleDateString('pt-BR');

  const { data: transactions } = await supabase
    .from('asset_transactions')
    .select('*')
    .in('asset_id', assets.map(a => a.id))
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });
  
  const allTxs = transactions || [];`;

code = code.replace(oldExportToIRExcel, newExportToIRExcel);

code = code.replace(
  `const ir = getIRDetails(asset, year - 1);`,
  `const posAnt = getPositionAtDate(asset, allTxs, \`\${year - 2}-12-31\`);
    const posAtu = getPositionAtDate(asset, allTxs, \`\${year - 1}-12-31\`);
    const ir = getIRDetails(asset, year - 1, posAnt.totalCost, posAtu.totalCost, posAtu.quantity, posAtu.avgPrice);`
);

// Add Operations to Excel
const excelOps = `
      <tr><td colspan="11" style="border:none; height: 20px;"></td></tr>
      <tr>
        <th colspan="11" class="section-title">3. OPERAÇÕES REALIZADAS NO ANO (RENDA VARIÁVEL / GANHOS DE CAPITAL)</th>
      </tr>
      <tr>
        <th class="th-premium text-cell" style="width: 100px;">Data</th>
        <th class="th-premium text-cell" style="width: 100px;">Ativo</th>
        <th class="th-premium text-cell" style="width: 100px;">Operação</th>
        <th class="th-premium qty-cell" style="width: 100px;">Quantidade</th>
        <th class="th-premium number-cell" style="width: 100px;">Preço</th>
        <th class="th-premium number-cell" style="width: 100px;">Valor Total</th>
        <th colspan="5" style="border:none;"></th>
      </tr>
\`;

  const txsThisYear = allTxs.filter(tx => tx.date.startsWith(\`\${year - 1}-\`));
  
  txsThisYear.forEach((tx, index) => {
    const zebraClass = index % 2 === 1 ? 'class="tr-zebra"' : '';
    const asset = assets.find(a => a.id === tx.asset_id);
    const total = Number(tx.quantity) * Number(tx.price);
    const typeStr = tx.type === 'BUY' ? 'COMPRA' : 'VENDA';
    const dateStr = tx.date.split('-').reverse().join('/');
    
    html += \`
      <tr \${zebraClass}>
        <td class="text-cell">\${dateStr}</td>
        <td class="text-cell" style="font-weight: bold;">\${asset ? asset.ticker || asset.name : 'Desconhecido'}</td>
        <td class="text-cell" style="font-weight: bold; color: \${tx.type === 'BUY' ? '#059669' : '#dc2626'};">\${typeStr}</td>
        <td class="qty-cell">\${Number(tx.quantity)}</td>
        <td class="number-cell">\${Number(tx.price)}</td>
        <td class="number-cell" style="font-weight: bold;">\${total}</td>
        <td colspan="5" style="border:none;"></td>
      </tr>
    \`;
  });

  html += \`
`;

code = code.replace(
  `  html += \`\n    </table>\n    </body>\n    </html>\n  \`;`,
  excelOps + `    </table>\n    </body>\n    </html>\n  \`;`
);

fs.writeFileSync(path, code);
console.log('Done rewriting investmentExport.ts');
