 
/* eslint-disable unused-imports/no-unused-vars */
import { Asset } from "@/types/database";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import {
  ShieldCheck,
  Calendar,
  Briefcase,
  Coins,
  Percent,
  TrendingUp,
  Download,
  AlertCircle,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { exportToIRPDF, exportToIRExcel } from "@/utils/investmentExport";
import {
  BensEDireitosTab,
  RendimentosIsentosTab,
  TributacaoExclusivaTab,
} from "./ir/AssetTaxCards";

interface InvestmentIRPanelProps {
  assets: Asset[];
}

import { useInvestmentIR } from "@/hooks/useInvestmentIR";

export function InvestmentIRPanel({ assets }: InvestmentIRPanelProps) {
  const {
    currentYear,
    selectedYear,
    setSelectedYear,
    copiedField,
    setCopiedField,
    availableYears,
    assetTransactions,
    isLoadingAssetTxs,
    bensEDireitosList,
    isentosMap,
    tributacaoExclusivaMap,
    monthlyResumo,
    operationsOfYear,
    copyToClipboard: handleCopy,
    handleExportPDF,
    handleExportExcel,
    monthNames,
  } = useInvestmentIR({ assets });

  return (
    <div className="space-y-6">
      {/* 1. Header do Painel com visual premium */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl border border-success/20 bg-gradient-to-r from-success/10 via-transparent to-transparent shadow-premium-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-success">
            <ShieldCheck className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-bold tracking-wider uppercase text-success">
              Auxiliar IRPF Interativo
            </span>
          </div>
          <h2 className="text-2xl font-display font-black text-foreground tracking-tight">
            Imposto de Renda de Investimentos
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Sua carteira de investimentos e rendimentos compilada exatamente no formato das fichas
            oficiais do programa da Receita Federal.
          </p>
        </div>

        {/* Seletores e Ações */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/80 border border-border px-3 py-1.5 rounded-xl text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-muted-foreground">Ano-Calendário:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer border-none p-0 w-16"
            >
              {availableYears.map((y) => (
                <option key={y} value={y} className="bg-background text-foreground">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={() => {
              toast.promise(exportToIRPDF(assets), {
                loading: "Gerando PDF Oficial...",
                success: "PDF auxiliar de IR baixado com sucesso!",
                error: "Erro ao gerar PDF.",
              });
            }}
            variant="outline"
            size="sm"
            className="rounded-xl border-success/30 text-success hover:bg-success/10"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>

          <Button
            onClick={() => {
              toast.promise(exportToIRExcel(assets), {
                loading: "Gerando Planilha...",
                success: "Excel auxiliar de IR baixado com sucesso!",
                error: "Erro ao gerar planilha.",
              });
            }}
            variant="outline"
            size="sm"
            className="rounded-xl border-success/30 text-success hover:bg-success/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* 2. Banner de Aviso/Explicação */}
      <div className="flex gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm">
        <AlertCircle className="w-5 h-5 shrink-0 text-accent" />
        <div className="space-y-2">
          <span className="font-bold">Demonstrativo Informativo Auxiliar</span>
          <p>
            Este relatório consolida de forma inteligente o custo histórico médio ponderado de
            aquisição e rendimentos registrados. As informações aqui contidas facilitam o
            preenchimento da Declaração Anual de Ajuste do IRPF, mas não substituem os Informes de
            Rendimentos oficiais disponibilizados pelas suas respectivas corretoras de valores e
            bancos.
          </p>
        </div>
      </div>

      {/* 3. Navegação em Abas do IRPF */}
      <Tabs defaultValue="bens-direitos" className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 p-1 bg-muted/80 rounded-2xl border border-border">
          <TabsTrigger
            value="bens-direitos"
            className="rounded-xl text-sm md:text-sm font-semibold flex items-center gap-2 py-2"
          >
            <Briefcase className="w-4 h-4" />
            Bens e Direitos
          </TabsTrigger>
          <TabsTrigger
            value="isentos"
            className="rounded-xl text-sm md:text-sm font-semibold flex items-center gap-2 py-2"
          >
            <Coins className="w-4 h-4" />
            Rendimentos Isentos
          </TabsTrigger>
          <TabsTrigger
            value="tributado-exclusiva"
            className="rounded-xl text-sm md:text-sm font-semibold flex items-center gap-2 py-2"
          >
            <Percent className="w-4 h-4" />
            Tributação Exclusiva
          </TabsTrigger>
          <TabsTrigger
            value="renda-variavel"
            className="rounded-xl text-sm md:text-sm font-semibold flex items-center gap-2 py-2"
          >
            <TrendingUp className="w-4 h-4" />
            Renda Variável
          </TabsTrigger>
        </TabsList>

        {/* --- ABA 1: BENS E DIREITOS --- */}
        <TabsContent value="bens-direitos" className="space-y-4">
          <BensEDireitosTab
            selectedYear={selectedYear}
            bensEDireitosList={bensEDireitosList}
            copiedField={copiedField}
            handleCopy={handleCopy}
          />
        </TabsContent>

        {/* --- ABA 2: RENDIMENTOS ISENTOS --- */}
        <TabsContent value="isentos" className="space-y-4">
          <RendimentosIsentosTab
            selectedYear={selectedYear}
            isentosMap={isentosMap}
            copiedField={copiedField}
            handleCopy={handleCopy}
          />
        </TabsContent>

        {/* --- ABA 3: TRIBUTAÇÃO EXCLUSIVA --- */}
        <TabsContent value="tributado-exclusiva" className="space-y-4">
          <TributacaoExclusivaTab
            selectedYear={selectedYear}
            tributacaoExclusivaMap={tributacaoExclusivaMap}
            copiedField={copiedField}
            handleCopy={handleCopy}
          />
        </TabsContent>

        {/* --- ABA 4: RENDA VARIÁVEL / CONTROLE DE GANHOS --- */}
        <TabsContent value="renda-variavel" className="space-y-6">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-foreground">Demonstrativo de Renda Variável</h3>
            <p className="text-sm text-muted-foreground">
              Controle mensal de volumes negociados e lucros ou prejuízos de mercado para emissão de
              DARF ou isenção
            </p>
          </div>

          {/* Grid de Informações de Renda Variável */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border-success/20 bg-success/5">
              <span className="text-sm text-muted-foreground block font-semibold">
                Volume de Compras no Ano
              </span>
              <span className="text-base font-display font-black text-success mt-1 block">
                R${" "}
                {SafeFinancialCalculator.safeSum(Object.values(monthlyResumo).map((m) => m.compras))
                  .toNumber()
                  .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </Card>

            <Card className="p-4 border-accent/20 bg-accent/5">
              <span className="text-sm text-muted-foreground block font-semibold">
                Volume de Vendas no Ano
              </span>
              <span className="text-base font-display font-black text-accent mt-1 block">
                R${" "}
                {SafeFinancialCalculator.safeSum(Object.values(monthlyResumo).map((m) => m.vendas))
                  .toNumber()
                  .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </Card>

            {/* Balanço Geral */}
            {(() => {
              const totalPnL = SafeFinancialCalculator.safeSum(
                Object.values(monthlyResumo).map((m) => m.lucroEstimado)
              ).toNumber();
              const isProfit = totalPnL >= 0;
              return (
                <Card
                  className={`p-4 border-${isProfit ? "success" : "destructive"}/20 bg-${isProfit ? "success" : "destructive"}/5`}
                >
                  <span className="text-sm text-muted-foreground block font-semibold">
                    Resultado Líquido Estimado
                  </span>
                  <span
                    className={`text-xl font-display font-black text-${isProfit ? "success" : "destructive"} mt-1 block`}
                  >
                    {isProfit ? "+" : ""}R${" "}
                    {totalPnL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </Card>
              );
            })()}
          </div>

          {/* Tabela Mês a Mês */}
          <Card className="overflow-hidden border-border/80">
            <CardHeader className="bg-muted/40 p-4 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                Resumo de Apuração Mensal — Renda Variável ({selectedYear})
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="p-3 font-semibold text-muted-foreground">Mês</th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">
                      Volume Compras
                    </th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">
                      Volume Vendas
                    </th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">
                      Vendas Ações
                    </th>
                    <th className="p-3 font-semibold text-muted-foreground text-center">
                      Status Ações
                    </th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">
                      Resultado Apurado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.values(monthlyResumo).map((res) => {
                    const isExempt = res.vendasAcoes <= 20000;
                    const pnl = res.lucroEstimado;
                    const isProfit = pnl >= 0;

                    if (res.compras === 0 && res.vendas === 0) {
                      return (
                        <tr key={res.month} className="hover:bg-muted/10 opacity-40">
                          <td className="p-3 font-medium">{monthNames[res.month]}</td>
                          <td className="p-3 text-right">R$ 0,00</td>
                          <td className="p-3 text-right">R$ 0,00</td>
                          <td className="p-3 text-right">R$ 0,00</td>
                          <td className="p-3 text-center">-</td>
                          <td className="p-3 text-right text-muted-foreground">R$ 0,00</td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={res.month} className="hover:bg-muted/20">
                        <td className="p-3 font-semibold text-foreground">
                          {monthNames[res.month]}
                        </td>
                        <td className="p-3 text-right font-medium">
                          R$ {res.compras.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-medium">
                          R$ {res.vendas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-semibold">
                          R$ {res.vendasAcoes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center">
                          {res.vendasAcoes > 0 ? (
                            isExempt ? (
                              <Badge
                                variant="outline"
                                className="border-success/30 text-success bg-success/5 text-sm py-0 px-2 font-bold"
                              >
                                Isento (&lt; 20k)
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-warning/30 text-warning bg-warning/5 text-sm py-0 px-2 font-bold animate-pulse"
                              >
                                Tributável (DARF)
                              </Badge>
                            )
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td
                          className={`p-3 text-right font-bold text-${isProfit ? "success" : "destructive"}`}
                        >
                          {isProfit ? "+" : ""}R${" "}
                          {pnl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Histórico das Transações Realizadas */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-success" />
              Histórico Detalhado de Negociação ({selectedYear})
            </h4>
            {operationsOfYear.length === 0 ? (
              <Card className="p-6 border-dashed text-center text-sm text-muted-foreground">
                Nenhuma negociação direta (Compra/Venda) registrada em {selectedYear}.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto border p-2 rounded-xl bg-muted/10">
                {operationsOfYear.map((tx) => {
                  const asset = assets.find((a) => a.id === tx.asset_id);
                  const isBuy = tx.type === "BUY";
                  const dateStr = tx.date.split("-").reverse().join("/");

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1 rounded-md bg-${isBuy ? "emerald" : "rose"}-500/10 text-${isBuy ? "emerald" : "rose"}-600`}
                        >
                          {isBuy ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-foreground">
                            {isBuy ? "COMPRA" : "VENDA"} - {(asset?.ticker || "").toUpperCase()}
                          </span>
                          <span className="text-sm text-muted-foreground block">
                            {dateStr} | Quantidade:{" "}
                            {Number(tx.quantity).toLocaleString("pt-BR", {
                              maximumFractionDigits: 6,
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground block">
                          R${" "}
                          {(Number(tx.quantity) * Number(tx.price)).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span className="text-sm text-muted-foreground block">
                          Preço unitário: {asset?.currency === "USD" ? "US$" : "R$"}{" "}
                          {Number(tx.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
