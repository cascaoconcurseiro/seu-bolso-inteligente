import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Download, Printer, Eye, EyeOff, Scale, BadgePercent, Activity } from "lucide-react";

import { useAccountingDRE } from './useAccountingDRE';

export function AccountingDRE() {
  const {
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
  } = useAccountingDRE();
  
  const b = balanceSheetData;

  if (isLoading) {
    return (
      <div className="space-y-6 py-6 animate-pulse">
        <div className="h-10 w-1/3 bg-muted rounded-xl" />
        <div className="h-40 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Abas Superiores Contábeis */}
      <div className="flex bg-muted/60 p-1.5 rounded-2xl border border-border max-w-md shadow-inner">
        <Button 
          variant={activeTab === 'DRE' ? 'default' : 'ghost'} 
          className="flex-1 rounded-xl h-10 text-sm font-semibold transition-all"
          onClick={() => setActiveTab('DRE')}
        >
          Resultado (DRE)
        </Button>
        <Button 
          variant={activeTab === 'BALANCE_SHEET' ? 'default' : 'ghost'} 
          className="flex-1 rounded-xl h-10 text-sm font-semibold transition-all"
          onClick={() => setActiveTab('BALANCE_SHEET')}
        >
          Balanço Patrimonial
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h2 className="font-display font-black text-2xl tracking-tight">
            {activeTab === 'DRE' ? "DRE Contábil" : "Balanço Patrimonial"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'DRE' 
              ? "Demonstrativo do Resultado do Exercício de alta precisão" 
              : "Balanço consolidado de Bens, Direitos e Dívidas"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          
          {/* Seletor de Regime (Somente para DRE) */}
          {availableCurrencies.length > 1 && (
            <Select 
              value={selectedCurrency} 
              onValueChange={setSelectedCurrency}
            >
              <SelectTrigger className="w-[100px] bg-card/50 rounded-xl h-10 border-border/50">
                <SelectValue placeholder="Moeda" />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map((c) => (
                  <SelectItem key={c} value={c} className="font-medium">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {activeTab === 'DRE' && (
            <>
              <Select 
                value={dateCriterion} 
                onValueChange={(value: 'COMPETENCE' | 'DUE_DATE') => setDateCriterion(value)}
              >
                <SelectTrigger className="w-[180px] bg-card/50 rounded-xl h-10 border-border/50">
                  <SelectValue placeholder="Regime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPETENCE">📅 Competência (Compra)</SelectItem>
                  <SelectItem value="DUE_DATE">💳 Caixa (Vencimento)</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex bg-muted/50 rounded-xl p-1 border border-border/50 h-10 items-center">
                <Button 
                  variant={viewType === 'MONTH' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-7 text-sm rounded-lg px-3"
                  onClick={() => setViewType('MONTH')}
                >
                  Mensal
                </Button>
                <Button 
                  variant={viewType === 'YEAR' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-7 text-sm rounded-lg px-3"
                  onClick={() => setViewType('YEAR')}
                >
                  Anual
                </Button>
              </div>

              <Select 
                value={selectedYear.toString()} 
                onValueChange={(val) => setSelectedYear(parseInt(val, 10))}
              >
                <SelectTrigger className="w-[95px] bg-card/50 rounded-xl h-10 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {viewType === 'MONTH' && (
                <Select 
                  value={selectedMonth.toString()} 
                  onValueChange={(val) => setSelectedMonth(parseInt(val, 10))}
                >
                  <SelectTrigger className="w-[130px] bg-card/50 rounded-xl h-10 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}

          <Button variant="outline" size="icon" onClick={handleExportPDF} className="h-10 w-9 rounded-xl" title="Exportar PDF Contábil">
            <Printer className="h-4 w-4 text-primary" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExportCSV} className="h-10 w-9 rounded-xl" title="Exportar Excel">
            <Download className="h-4 w-4 text-accent" />
          </Button>
        </div>
      </div>

      {activeTab === 'DRE' ? (
        /* ================= VISTA: DRE ================= */
        <Card className="overflow-hidden border border-border bg-card/50 shadow-sm rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary/5 text-sm text-muted-foreground border-b border-border font-medium">
                  <th className="pl-6 py-3.5 text-left uppercase tracking-wider">Descrição das Contas Contábeis</th>
                  <th className="pr-6 py-3.5 text-right uppercase tracking-wider w-[200px]">Valor</th>
                  <th className="pr-6 py-3.5 text-right uppercase tracking-wider w-[120px]">Ações / Vert.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                
                <tr className="font-semibold text-foreground bg-muted/10 hover:bg-muted/20 transition-colors">
                  <td className="pl-6 py-3 text-left">1. RECEITAS OPERACIONAIS BRUTAS</td>
                  <td className="pr-6 py-3 text-right font-mono text-emerald-600 dark:text-emerald-500">{formatCurrency(dreData.grossRevenue)}</td>
                  <td className="pr-6 py-3 text-right text-sm text-muted-foreground font-mono">100.0%</td>
                </tr>
                
                <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors">
                  <td className="pl-10 py-2.5 text-left">1.1 Receitas de Trabalho / Pró-labore</td>
                  <td className="pr-6 py-2.5 text-right font-mono text-emerald-600/80 dark:text-emerald-500/80">{formatCurrency(dreData.lines.OPERATIONAL_INC.total)}</td>
                  <td className="pr-6 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand('OPERATIONAL_INC')}>
                      {expandedLines.OPERATIONAL_INC ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </td>
                </tr>
                {expandedLines.OPERATIONAL_INC && renderSubcategories('OPERATIONAL_INC', false)}

                <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors">
                  <td className="pl-10 py-2.5 text-left">1.2 Receitas Financeiras / Investimentos</td>
                  <td className="pr-6 py-2.5 text-right font-mono text-emerald-600/80 dark:text-emerald-500/80">{formatCurrency(dreData.lines.FINANCIAL_INC.total)}</td>
                  <td className="pr-6 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand('FINANCIAL_INC')}>
                      {expandedLines.FINANCIAL_INC ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </td>
                </tr>
                {expandedLines.FINANCIAL_INC && renderSubcategories('FINANCIAL_INC', false)}

                <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors">
                  <td className="pl-6 py-3 text-left font-semibold text-foreground">2. (-) ESTORNOS E DEDUÇÕES DO EXERCÍCIO</td>
                  <td className="pr-6 py-3 text-right font-mono font-semibold text-destructive dark:text-destructive">{formatNegativeCurrency(dreData.lines.DEDUCTION.total)}</td>
                  <td className="pr-6 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand('DEDUCTION')}>
                      {expandedLines.DEDUCTION ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </td>
                </tr>
                {expandedLines.DEDUCTION && renderSubcategories('DEDUCTION', false)}

                <tr className="font-bold text-primary bg-primary/5 border-y border-primary/20">
                  <td className="pl-6 py-3.5 text-left">(=) RECEITA OPERACIONAL LÍQUIDA</td>
                  <td className="pr-6 py-3.5 text-right font-mono">{formatCurrency(dreData.netRevenue)}</td>
                  <td className="pr-6 py-3.5 text-right font-mono text-sm">100.0%</td>
                </tr>

                <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors">
                  <td className="pl-6 py-3 text-left font-semibold text-foreground">3. (-) CUSTOS OPERACIONAIS E CONSUMO VARIÁVEL</td>
                  <td className="pr-6 py-3 text-right font-mono font-semibold text-destructive dark:text-destructive">{formatNegativeCurrency(dreData.lines.VARIABLE_EXP.total)}</td>
                  <td className="pr-6 py-3 text-right font-mono text-sm text-muted-foreground flex items-center justify-end gap-2">
                    <span>{dreData.netRevenue > 0 ? ((dreData.lines.VARIABLE_EXP.total / dreData.netRevenue) * 100).toFixed(1) + "%" : "0.0%"}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand('VARIABLE_EXP')}>
                      {expandedLines.VARIABLE_EXP ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </td>
                </tr>
                {expandedLines.VARIABLE_EXP && renderSubcategories('VARIABLE_EXP', true)}

                <tr className="font-bold text-foreground bg-muted/5 border-y border-border/20">
                  <td className="pl-6 py-3 text-left">(=) MARGEM DE CONTRIBUIÇÃO OPERACIONAL</td>
                  <td className="pr-6 py-3 text-right font-mono">{formatCurrency(dreData.contributionMargin)}</td>
                  <td className="pr-6 py-3 text-right font-mono text-sm">-</td>
                </tr>

                <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors">
                  <td className="pl-6 py-3 text-left font-semibold text-foreground">4. (-) DESPESAS ADMINISTRATIVAS E ESTRUTURA FIXA</td>
                  <td className="pr-6 py-3 text-right font-mono font-semibold text-destructive dark:text-destructive">{formatNegativeCurrency(dreData.lines.FIXED_EXP.total)}</td>
                  <td className="pr-6 py-3 text-right font-mono text-sm text-muted-foreground flex items-center justify-end gap-2">
                    <span>{dreData.netRevenue > 0 ? ((dreData.lines.FIXED_EXP.total / dreData.netRevenue) * 100).toFixed(1) + "%" : "0.0%"}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand('FIXED_EXP')}>
                      {expandedLines.FIXED_EXP ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </td>
                </tr>
                {expandedLines.FIXED_EXP && renderSubcategories('FIXED_EXP', true)}

                <tr className="font-bold text-foreground bg-muted/5 border-y border-border/20">
                  <td className="pl-6 py-3 text-left">(=) RESULTADO OPERACIONAL BRUTO (EBITDA)</td>
                  <td className="pr-6 py-3 text-right font-mono">{formatCurrency(dreData.ebitda)}</td>
                  <td className="pr-6 py-3 text-right font-mono text-sm">-</td>
                </tr>

                <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors">
                  <td className="pl-6 py-3 text-left font-semibold text-foreground">5. (-) TARIFAS E DESPESAS FINANCEIRAS / TRIBUTOS</td>
                  <td className="pr-6 py-3 text-right font-mono font-semibold text-destructive dark:text-destructive">{formatNegativeCurrency(dreData.lines.FINANCIAL_EXP.total)}</td>
                  <td className="pr-6 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand('FINANCIAL_EXP')}>
                      {expandedLines.FINANCIAL_EXP ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </td>
                </tr>
                {expandedLines.FINANCIAL_EXP && renderSubcategories('FINANCIAL_EXP', true)}

                <tr className="font-black text-base text-primary bg-primary/10 border-y-2 border-primary border-double">
                  <td className="pl-6 py-4 text-left uppercase tracking-tight">(=) RESULTADO LÍQUIDO DO EXERCÍCIO (Economia Real)</td>
                  <td className="pr-6 py-4 text-right font-mono text-primary">{formatCurrency(dreData.netSavings)}</td>
                  <td className="pr-6 py-4 text-right font-mono text-sm font-semibold">
                    {dreData.netRevenue > 0 ? ((dreData.netSavings / dreData.netRevenue) * 100).toFixed(1) + "%" : "0.0%"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* ================= VISTA: BALANÇO PATRIMONIAL ================= */
        <div className="space-y-6">
          
          {/* Card de Indicadores Contábeis de Saúde Financeira */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-5 border border-border bg-card/40 flex items-center gap-4 rounded-2xl shadow-sm">
              <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <Scale className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Liquidez Corrente</p>
                <p className="text-base font-bold font-mono">
                  {b.liquidityRatio === 999 ? "∞" : b.liquidityRatio.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Disponível para cobrir dívidas imediato</p>
              </div>
            </Card>

            <Card className="p-5 border border-border bg-card/40 flex items-center gap-4 rounded-2xl shadow-sm">
              <div className="h-10 w-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                <BadgePercent className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Grau de Endividamento</p>
                <p className="text-base font-bold font-mono">{b.debtRatio.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Proporção de ativos sob forma de dívida</p>
              </div>
            </Card>

            <Card className="p-5 border border-border bg-card/40 flex items-center gap-4 rounded-2xl shadow-sm">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Activity className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Saúde do Patrimônio</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-500 font-mono">
                  {b.netWorth >= 0 ? "Excelente" : "Atenção Crítica"}
                </p>
                <p className="text-sm text-muted-foreground">Saldo do patrimônio líquido consolidado</p>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden border border-border bg-card/50 shadow-sm rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary/5 text-sm text-muted-foreground border-b border-border font-medium">
                    <th className="pl-6 py-3.5 text-left uppercase tracking-wider">Grupo Patrimonial (Contas do Balanço)</th>
                    <th className="pr-6 py-3.5 text-right uppercase tracking-wider w-[200px]">Saldo Consolidado</th>
                    <th className="pr-6 py-3.5 text-right uppercase tracking-wider w-[120px]">AV %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  
                  {/* 1. ATIVOS */}
                  <tr className="font-semibold text-foreground bg-muted/10 hover:bg-muted/20 transition-colors">
                    <td className="pl-6 py-3 text-left">1. ATIVOS (Bens e Direitos)</td>
                    <td className="pr-6 py-3 text-right font-mono text-emerald-600 dark:text-emerald-500">{formatCurrency(b.totalAssets)}</td>
                    <td className="pr-6 py-3 text-right text-sm text-muted-foreground font-mono">100.0%</td>
                  </tr>

                  {/* 1.1 Ativo Circulante */}
                  <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors font-medium">
                    <td className="pl-10 py-2.5 text-left">1.1 Ativo Circulante (Disponibilidades)</td>
                    <td className="pr-6 py-2.5 text-right font-mono">{formatCurrency(b.assetCirculante)}</td>
                    <td className="pr-6 py-2.5 text-right text-sm text-muted-foreground font-mono">
                      {b.totalAssets > 0 ? `${((b.assetCirculante / b.totalAssets) * 100).toFixed(1)}%` : "0.0%"}
                    </td>
                  </tr>
                  
                  {/* 1.1.1 Contas Correntes / Caixa */}
                  <tr className="hover:bg-muted/30 text-sm text-muted-foreground border-b border-border/10 font-mono transition-colors">
                    <td className="pl-14 py-2 text-left">1.1.1 Saldos em Conta Corrente / Carteira</td>
                    <td className="pr-6 py-2 text-right">{formatCurrency(b.checkingChecking)}</td>
                    <td className="pr-6 py-2 text-right text-sm">
                      {b.assetCirculante > 0 ? `${((b.checkingChecking / b.assetCirculante) * 100).toFixed(1)}%` : "0.0%"}
                    </td>
                  </tr>

                  {/* 1.1.2 Poupança */}
                  <tr className="hover:bg-muted/30 text-sm text-muted-foreground border-b border-border/10 font-mono transition-colors">
                    <td className="pl-14 py-2 text-left">1.1.2 Investimentos de Liquidez Diária / Poupança</td>
                    <td className="pr-6 py-2 text-right">{formatCurrency(b.checkingSavings)}</td>
                    <td className="pr-6 py-2 text-right text-sm">
                      {b.assetCirculante > 0 ? `${((b.checkingSavings / b.assetCirculante) * 100).toFixed(1)}%` : "0.0%"}
                    </td>
                  </tr>

                  {/* 1.2 Ativo Não Circulante */}
                  <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors font-medium">
                    <td className="pl-10 py-2.5 text-left">1.2 Ativo Não Circulante (Bens e Médio/Longo Prazo)</td>
                    <td className="pr-6 py-2.5 text-right font-mono">{formatCurrency(b.assetNaoCirculante)}</td>
                    <td className="pr-6 py-2.5 text-right text-sm text-muted-foreground font-mono">
                      {b.totalAssets > 0 ? `${((b.assetNaoCirculante / b.totalAssets) * 100).toFixed(1)}%` : "0.0%"}
                    </td>
                  </tr>

                  {/* 1.2.1 Investimentos */}
                  <tr className="hover:bg-muted/30 text-sm text-muted-foreground border-b border-border/10 font-mono transition-colors">
                    <td className="pl-14 py-2 text-left">1.2.1 Contas de Investimento / Aplicações</td>
                    <td className="pr-6 py-2 text-right">{formatCurrency(b.currentInvestments)}</td>
                    <td className="pr-6 py-2 text-right text-sm">
                      {b.assetNaoCirculante > 0 ? `${((b.currentInvestments / b.assetNaoCirculante) * 100).toFixed(1)}%` : "0.0%"}
                    </td>
                  </tr>

                  {/* 1.2.2 Bens Cadastrados */}
                  <tr className="hover:bg-muted/30 text-sm text-muted-foreground border-b border-border/10 font-mono transition-colors">
                    <td className="pl-14 py-2 text-left">1.2.2 Bens e Ativos de Investimentos Cadastrados</td>
                    <td className="pr-6 py-2 text-right">{formatCurrency(b.physicalAssets)}</td>
                    <td className="pr-6 py-2 text-right text-sm">
                      {b.assetNaoCirculante > 0 ? `${((b.physicalAssets / b.assetNaoCirculante) * 100).toFixed(1)}%` : "0.0%"}
                    </td>
                  </tr>

                  {/* 2. PASSIVOS */}
                  <tr className="font-semibold text-foreground bg-muted/10 hover:bg-muted/20 transition-colors">
                    <td className="pl-6 py-3 text-left">2. PASSIVOS (Dívidas e Obrigações)</td>
                    <td className="pr-6 py-3 text-right font-mono text-destructive dark:text-destructive">{formatNegativeCurrency(b.totalLiabilities)}</td>
                    <td className="pr-6 py-3 text-right text-sm text-muted-foreground font-mono">100.0%</td>
                  </tr>

                  {/* 2.1 Passivo Circulante */}
                  <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors font-medium">
                    <td className="pl-10 py-2.5 text-left">2.1 Passivo Circulante (Curto Prazo)</td>
                    <td className="pr-6 py-2.5 text-right font-mono text-destructive/90 dark:text-destructive/90">{formatNegativeCurrency(b.totalLiabilities)}</td>
                    <td className="pr-6 py-2.5 text-right text-sm text-muted-foreground font-mono">100.0%</td>
                  </tr>

                  {/* 2.1.1 Faturas de Cartão */}
                  <tr className="hover:bg-muted/30 text-sm text-muted-foreground border-b border-border/10 font-mono transition-colors">
                    <td className="pl-14 py-2 text-left">2.1.1 Fatura Acumulada em Cartão de Crédito e Contas Negativas</td>
                    <td className="pr-6 py-2 text-right text-destructive">{formatNegativeCurrency(b.totalLiabilities)}</td>
                    <td className="pr-6 py-2 text-right text-sm">100.0%</td>
                  </tr>

                  {/* (=) PATRIMÔNIO LÍQUIDO */}
                  <tr className="font-black text-base text-primary bg-primary/10 border-y-2 border-primary border-double">
                    <td className="pl-6 py-4 text-left uppercase tracking-tight">(=) PATRIMÔNIO LÍQUIDO (Capital Líquido Consolidado)</td>
                    <td className="pr-6 py-4 text-right font-mono text-primary">{formatCurrency(b.netWorth)}</td>
                    <td className="pr-6 py-4 text-right font-mono text-sm font-semibold">
                      {b.totalAssets > 0 ? `${((b.netWorth / b.totalAssets) * 100).toFixed(1)}%` : "0.0%"}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
