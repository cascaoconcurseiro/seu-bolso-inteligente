import { Card } from "@/components/ui/card";
import { Scale, BadgePercent, Activity } from "lucide-react";

interface BalanceSheetProps {
  balanceSheetData: {
    liquidityRatio: number;
    debtRatio: number;
    netWorth: number;
    totalAssets: number;
    assetCirculante: number;
    checkingChecking: number;
    checkingSavings: number;
    assetNaoCirculante: number;
    currentInvestments: number;
    physicalAssets: number;
    totalLiabilities: number;
  };
  formatCurrency: (val: number) => string;
  formatNegativeCurrency: (val: number) => string;
}

export function BalanceSheet({ balanceSheetData: b, formatCurrency, formatNegativeCurrency }: BalanceSheetProps) {
  return (
    <div className="space-y-6">
      {/* Card de Indicadores Contábeis de Saúde Financeira */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 border border-border bg-card/40 flex items-center gap-4 rounded-2xl shadow-sm">
          <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
            <Scale className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Liquidez Corrente</p>
            <p className="text-xl font-bold font-mono">
              {b.liquidityRatio === 999 ? "∞" : b.liquidityRatio.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground">Disponível para cobrir dívidas imediato</p>
          </div>
        </Card>

        <Card className="p-5 border border-border bg-card/40 flex items-center gap-4 rounded-2xl shadow-sm">
          <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
            <BadgePercent className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Grau de Endividamento</p>
            <p className="text-xl font-bold font-mono">{b.debtRatio.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">Proporção de ativos sob forma de dívida</p>
          </div>
        </Card>

        <Card className="p-5 border border-border bg-card/40 flex items-center gap-4 rounded-2xl shadow-sm">
          <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Saúde do Patrimônio</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-500 font-mono">
              {b.netWorth >= 0 ? "Excelente" : "Atenção Crítica"}
            </p>
            <p className="text-[10px] text-muted-foreground">Saldo do patrimônio líquido consolidado</p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden border border-border bg-card/50 shadow-sm rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary/5 text-xs text-muted-foreground border-b border-border font-medium">
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
                <td className="pr-6 py-3 text-right text-xs text-muted-foreground font-mono">100.0%</td>
              </tr>

              {/* 1.1 Ativo Circulante */}
              <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors font-medium">
                <td className="pl-10 py-2.5 text-left">1.1 Ativo Circulante (Disponibilidades)</td>
                <td className="pr-6 py-2.5 text-right font-mono">{formatCurrency(b.assetCirculante)}</td>
                <td className="pr-6 py-2.5 text-right text-xs text-muted-foreground font-mono">
                  {b.totalAssets > 0 ? `${((b.assetCirculante / b.totalAssets) * 100).toFixed(1)}%` : "0.0%"}
                </td>
              </tr>
              
              {/* 1.1.1 Contas Correntes / Caixa */}
              <tr className="hover:bg-muted/30 text-xs text-muted-foreground border-b border-border/10 font-mono transition-colors">
                <td className="pl-14 py-2 text-left">1.1.1 Saldos em Conta Corrente / Carteira</td>
                <td className="pr-6 py-2 text-right">{formatCurrency(b.checkingChecking)}</td>
                <td className="pr-6 py-2 text-right text-[10px]">
                  {b.assetCirculante > 0 ? `${((b.checkingChecking / b.assetCirculante) * 100).toFixed(1)}%` : "0.0%"}
                </td>
              </tr>

              {/* 1.1.2 Poupança */}
              <tr className="hover:bg-muted/30 text-xs text-muted-foreground border-b border-border/10 font-mono transition-colors">
                <td className="pl-14 py-2 text-left">1.1.2 Investimentos de Liquidez Diária / Poupança</td>
                <td className="pr-6 py-2 text-right">{formatCurrency(b.checkingSavings)}</td>
                <td className="pr-6 py-2 text-right text-[10px]">
                  {b.assetCirculante > 0 ? `${((b.checkingSavings / b.assetCirculante) * 100).toFixed(1)}%` : "0.0%"}
                </td>
              </tr>

              {/* 1.2 Ativo Não Circulante */}
              <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors font-medium">
                <td className="pl-10 py-2.5 text-left">1.2 Ativo Não Circulante (Bens e Médio/Longo Prazo)</td>
                <td className="pr-6 py-2.5 text-right font-mono">{formatCurrency(b.assetNaoCirculante)}</td>
                <td className="pr-6 py-2.5 text-right text-xs text-muted-foreground font-mono">
                  {b.totalAssets > 0 ? `${((b.assetNaoCirculante / b.totalAssets) * 100).toFixed(1)}%` : "0.0%"}
                </td>
              </tr>

              {/* 1.2.1 Investimentos */}
              <tr className="hover:bg-muted/30 text-xs text-muted-foreground border-b border-border/10 font-mono transition-colors">
                <td className="pl-14 py-2 text-left">1.2.1 Contas de Investimento / Aplicações</td>
                <td className="pr-6 py-2 text-right">{formatCurrency(b.currentInvestments)}</td>
                <td className="pr-6 py-2 text-right text-[10px]">
                  {b.assetNaoCirculante > 0 ? `${((b.currentInvestments / b.assetNaoCirculante) * 100).toFixed(1)}%` : "0.0%"}
                </td>
              </tr>

              {/* 1.2.2 Bens Cadastrados */}
              <tr className="hover:bg-muted/30 text-xs text-muted-foreground border-b border-border/10 font-mono transition-colors">
                <td className="pl-14 py-2 text-left">1.2.2 Bens e Ativos de Investimentos Cadastrados</td>
                <td className="pr-6 py-2 text-right">{formatCurrency(b.physicalAssets)}</td>
                <td className="pr-6 py-2 text-right text-[10px]">
                  {b.assetNaoCirculante > 0 ? `${((b.physicalAssets / b.assetNaoCirculante) * 100).toFixed(1)}%` : "0.0%"}
                </td>
              </tr>

              {/* 2. PASSIVOS */}
              <tr className="font-semibold text-foreground bg-muted/10 hover:bg-muted/20 transition-colors">
                <td className="pl-6 py-3 text-left">2. PASSIVOS (Dívidas e Obrigações)</td>
                <td className="pr-6 py-3 text-right font-mono text-red-600 dark:text-red-500">{formatNegativeCurrency(b.totalLiabilities)}</td>
                <td className="pr-6 py-3 text-right text-xs text-muted-foreground font-mono">100.0%</td>
              </tr>

              {/* 2.1 Passivo Circulante */}
              <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors font-medium">
                <td className="pl-10 py-2.5 text-left">2.1 Passivo Circulante (Curto Prazo)</td>
                <td className="pr-6 py-2.5 text-right font-mono text-red-600/90 dark:text-red-500/90">{formatNegativeCurrency(b.totalLiabilities)}</td>
                <td className="pr-6 py-2.5 text-right text-xs text-muted-foreground font-mono">100.0%</td>
              </tr>

              {/* 2.1.1 Faturas de Cartão */}
              <tr className="hover:bg-muted/30 text-xs text-muted-foreground border-b border-border/10 font-mono transition-colors">
                <td className="pl-14 py-2 text-left">2.1.1 Fatura Acumulada em Cartão de Crédito e Contas Negativas</td>
                <td className="pr-6 py-2 text-right text-red-500">{formatNegativeCurrency(b.totalLiabilities)}</td>
                <td className="pr-6 py-2 text-right text-[10px]">100.0%</td>
              </tr>

              {/* (=) PATRIMÔNIO LÍQUIDO */}
              <tr className="font-black text-lg text-primary bg-primary/10 border-y-2 border-primary border-double">
                <td className="pl-6 py-4 text-left uppercase tracking-tight">(=) PATRIMÔNIO LÍQUIDO (Capital Líquido Consolidado)</td>
                <td className="pr-6 py-4 text-right font-mono text-primary">{formatCurrency(b.netWorth)}</td>
                <td className="pr-6 py-4 text-right font-mono text-xs font-semibold">
                  {b.totalAssets > 0 ? `${((b.netWorth / b.totalAssets) * 100).toFixed(1)}%` : "0.0%"}
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
