/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Briefcase,
  Check,
  Coins,
  Copy,
  Percent,
} from "lucide-react";

interface BensEDireitosTabProps {
  selectedYear: number;
  bensEDireitosList: any[];
  copiedField: string | null;
  handleCopy: (text: string, fieldId: string) => void;
}

export function BensEDireitosTab({
  selectedYear,
  bensEDireitosList,
  copiedField,
  handleCopy,
}: BensEDireitosTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-base font-bold text-foreground">Ficha de Bens e Direitos</h3>
          <p className="text-sm text-muted-foreground">
            Posição consolidada de ativos em 31/12/{selectedYear - 1} e 31/12/{selectedYear}
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-success/30 text-success bg-success/5 font-bold"
        >
          {bensEDireitosList.length} Ativos Declarados
        </Badge>
      </div>

      {bensEDireitosList.length === 0 ? (
        <Card className="border-dashed border-2 py-12">
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            <Briefcase className="w-12 h-12 text-muted-foreground/30" />
            <span className="font-bold text-muted-foreground text-sm">
              Nenhum ativo com saldo no ano de {selectedYear}
            </span>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Ativos só aparecem aqui se houver compras registradas até 31/12/{selectedYear} ou saldo
              remanescente ativo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {bensEDireitosList.map(({ asset, posAnt, posAtu, irDetails }: any, index: number) => {
            const fieldIdCnpj = `cnpj-${asset.id}`;
            const fieldIdDisc = `disc-${asset.id}`;

            return (
              <Card
                key={asset.id}
                className="overflow-hidden border-border/80 hover:border-success/30 hover:shadow-premium-xs transition-all duration-300"
              >
                <div className="bg-success/5 border-b border-border/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-success bg-success/10 px-2 py-0.5 rounded-md">
                      #{index + 1}
                    </span>
                    <span className="font-display font-black text-foreground">
                      {asset.ticker || asset.name}
                    </span>
                    <Badge variant="secondary" className="text-sm py-0 px-1.5 uppercase font-medium">
                      {asset.type}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {irDetails.cnpj && (
                      <Button
                        onClick={() => handleCopy(irDetails.cnpj, fieldIdCnpj)}
                        variant="ghost"
                        size="sm"
                        className="h-8 text-sm font-semibold hover:bg-success/10 hover:text-success"
                      >
                        {copiedField === fieldIdCnpj ? (
                          <Check className="w-3.5 h-3.5 mr-1 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1" />
                        )}
                        Copiar CNPJ
                      </Button>
                    )}
                    <Button
                      onClick={() => handleCopy(irDetails.discriminacao, fieldIdDisc)}
                      variant="ghost"
                      size="sm"
                      className="h-8 text-sm font-semibold hover:bg-success/10 hover:text-success"
                    >
                      {copiedField === fieldIdDisc ? (
                        <Check className="w-3.5 h-3.5 mr-1 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 mr-1" />
                      )}
                      Copiar Discriminação
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm bg-muted/40 p-3 rounded-xl border">
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Grupo</span>
                      <span className="font-bold text-foreground">{irDetails.grupo}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Código</span>
                      <span className="font-bold text-foreground">{irDetails.codigo}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Localização</span>
                        <span className="font-bold text-foreground">
                          {irDetails.locationCode} - {asset.location === "BR" ? "Brasil" : "Exterior"}
                        </span>
                      </div>
                      {irDetails.cnpj && (
                        <div className="text-right">
                          <span className="text-muted-foreground block mb-0.5">CNPJ Emissor</span>
                          <span className="font-mono font-bold text-foreground">
                            {irDetails.cnpj}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-muted-foreground">
                      Discriminação detalhada para o IRPF:
                    </span>
                    <div className="p-3 bg-muted/20 border rounded-xl text-sm text-foreground italic leading-relaxed">
                      {irDetails.discriminacao}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t pt-3">
                    <div className="space-y-0.5">
                      <span className="text-sm text-muted-foreground block">
                        Situação em 31/12/{selectedYear - 1}
                      </span>
                      <span className="text-sm font-display font-extrabold text-muted-foreground">
                        R$ {posAnt.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-sm text-muted-foreground block">
                        Qtd: {posAnt.quantity.toLocaleString("pt-BR")}
                      </span>
                    </div>

                    <div className="space-y-0.5 border-l pl-4">
                      <span className="text-sm text-muted-foreground block">
                        Situação em 31/12/{selectedYear}
                      </span>
                      <span className="text-sm font-display font-extrabold text-success">
                        R$ {posAtu.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-sm text-muted-foreground block">
                        Qtd: {posAtu.quantity.toLocaleString("pt-BR")} (Média:{" "}
                        {asset.currency === "USD" ? "US$" : "R$"}{" "}
                        {posAtu.avgPrice.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                        )
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface RendimentosIsentosTabProps {
  selectedYear: number;
  isentosMap: Record<string, any>;
  copiedField: string | null;
  handleCopy: (text: string, fieldId: string) => void;
}

export function RendimentosIsentosTab({
  selectedYear,
  isentosMap,
  copiedField,
  handleCopy,
}: RendimentosIsentosTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h3 className="text-base font-bold text-foreground">
          Rendimentos Isentos e Não Tributáveis
        </h3>
        <p className="text-sm text-muted-foreground">
          Dividendos de ações, proventos de FIIs e rendimentos de renda fixa isenta (Poupança/LCI/LCA)
        </p>
      </div>

      {Object.keys(isentosMap).length === 0 ? (
        <Card className="border-dashed border-2 py-12">
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            <Coins className="w-12 h-12 text-muted-foreground/30" />
            <span className="font-bold text-muted-foreground text-sm">
              Nenhum rendimento isento identificado em {selectedYear}
            </span>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Lançamentos de receitas (INCOME) sob a categoria "Investimentos" com subcategorias
              "Dividendos" ou "Fundos Imobiliários" alimentam esta ficha automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(isentosMap).map(([key, item]: [string, any]) => {
            const fieldId = `isento-${key}`;
            return (
              <Card key={key} className="overflow-hidden border-border/80">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-muted-foreground bg-muted border px-2.5 py-0.5 rounded-full">
                        {item.codigo.split(" - ")[0]}
                      </span>
                      <span className="text-sm font-bold text-success bg-success/10 px-2 py-0.5 rounded-md">
                        {item.tipo}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{item.fontePagadora}</h4>
                      <span className="text-sm text-muted-foreground block">
                        {item.codigo.split(" - ").slice(1).join(" - ")}
                      </span>
                      {item.cnpj && (
                        <div className="flex items-center gap-2 mt-1 font-mono text-sm text-muted-foreground">
                          <span>CNPJ Fonte Pagadora: {item.cnpj}</span>
                          <Button
                            onClick={() => handleCopy(item.cnpj, fieldId)}
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                          >
                            {copiedField === fieldId ? (
                              <Check className="w-3 h-3 text-success" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                    <span className="text-sm text-muted-foreground block sm:mb-1">
                      Valor Recebido
                    </span>
                    <span className="text-base font-display font-extrabold text-foreground">
                      R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-6 p-0 text-sm text-muted-foreground hover:text-primary"
                          >
                            Ver Detalhes ({item.detalhes.length} lançamentos)
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-sm space-y-2">
                          {item.detalhes.map((d: string, i: number) => (
                            <div key={i} className="font-mono">
                              {d}
                            </div>
                          ))}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TributacaoExclusivaTabProps {
  selectedYear: number;
  tributacaoExclusivaMap: Record<string, any>;
  copiedField: string | null;
  handleCopy: (text: string, fieldId: string) => void;
}

export function TributacaoExclusivaTab({
  selectedYear,
  tributacaoExclusivaMap,
  copiedField,
  handleCopy,
}: TributacaoExclusivaTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h3 className="text-base font-bold text-foreground">
          Rendimentos de Tributação Exclusiva
        </h3>
        <p className="text-sm text-muted-foreground">
          Juros sobre Capital Próprio (JCP) e rendimentos tributados retidos na fonte (CDB/Tesouro Direto)
        </p>
      </div>

      {Object.keys(tributacaoExclusivaMap).length === 0 ? (
        <Card className="border-dashed border-2 py-12">
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            <Percent className="w-12 h-12 text-muted-foreground/30" />
            <span className="font-bold text-muted-foreground text-sm">
              Nenhum rendimento tributado identificado em {selectedYear}
            </span>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Receitas de investimentos nas subcategorias "Juros" ou "Rendimento CDB" geram este
              demonstrativo de imposto retido na fonte automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(tributacaoExclusivaMap).map(([key, item]: [string, any]) => {
            const fieldId = `tributado-${key}`;
            return (
              <Card key={key} className="overflow-hidden border-border/80">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-muted-foreground bg-muted border px-2.5 py-0.5 rounded-full">
                        {item.codigo.split(" - ")[0]}
                      </span>
                      <span className="text-sm font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-md">
                        {item.tipo}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{item.fontePagadora}</h4>
                      <span className="text-sm text-muted-foreground block">
                        {item.codigo.split(" - ").slice(1).join(" - ")}
                      </span>
                      {item.cnpj && (
                        <div className="flex items-center gap-2 mt-1 font-mono text-sm text-muted-foreground">
                          <span>CNPJ Fonte Pagadora: {item.cnpj}</span>
                          <Button
                            onClick={() => handleCopy(item.cnpj, fieldId)}
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                          >
                            {copiedField === fieldId ? (
                              <Check className="w-3 h-3 text-success" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                    <span className="text-sm text-muted-foreground block sm:mb-1">
                      Valor Líquido Recebido
                    </span>
                    <span className="text-base font-display font-extrabold text-foreground">
                      R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-6 p-0 text-sm text-muted-foreground hover:text-primary"
                          >
                            Ver Detalhes ({item.detalhes.length} lançamentos)
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-sm space-y-2">
                          {item.detalhes.map((d: string, i: number) => (
                            <div key={i} className="font-mono">
                              {d}
                            </div>
                          ))}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
