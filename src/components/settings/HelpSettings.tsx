/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unused-imports/no-unused-vars */
import { useState } from "react";
import {
  HelpCircle,
  Search,
  BookOpen,
  Users,
  CreditCard,
  Target,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Globe,
  Settings,
  Sparkles,
  PiggyBank,
  FileText,
  Eraser,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { faqs } from "./helpFAQData";

export function HelpSettings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    | "all"
    | "general"
    | "shared"
    | "cards"
    | "goals"
    | "reports"
    | "investments"
    | "trips"
    | "security"
  >("all");
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeTab === "all" || faq.category === activeTab;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.keywords.some((kw) => kw.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="font-display font-semibold text-base flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary animate-pulse" />
            Central de Ajuda & FAQ do Pé de Meia
          </h2>
          <p className="text-sm text-muted-foreground">
            O manual de operações definitivo do seu sistema de alta precisão financeira
          </p>
        </div>
      </div>

      {/* Caixa de Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="helpSearch"
          name="helpSearch"
          placeholder="Busque por qualquer termo (ex: 'compensação', 'fatura', 'Competência', 'RLS', 'geladeira')…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-background focus-visible:ring-primary h-10 text-sm"
        />
      </div>

      {/* Tabs Interativas com Estilo Premium */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "Tudo", icon: BookOpen },
          { id: "general", label: "Geral & Contas", icon: Settings },
          { id: "shared", label: "Grupo & Divisão", icon: Users },
          { id: "cards", label: "Cartões & Faturas", icon: CreditCard },
          { id: "goals", label: "Metas & Conquistas", icon: Target },
          { id: "reports", label: "DRE & Exportações", icon: BarChart3 },
          { id: "investments", label: "Investimentos", icon: TrendingUp },
          { id: "trips", label: "Viagens & Projetos", icon: Globe },
          { id: "security", label: "Segurança & LGPD", icon: ShieldCheck },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "gap-2 rounded-full transition-all duration-200 text-xs h-8 px-3.5",
              activeTab === tab.id
                ? "shadow-md bg-foreground text-background font-semibold"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* FAQ Accordion */}
      {filteredFaqs.length > 0 ? (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <Accordion type="single" collapsible className="w-full">
            {filteredFaqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-b last:border-b-0 px-4"
              >
                <AccordionTrigger className="hover:no-underline font-medium text-left py-4 text-foreground/90 hover:text-foreground text-sm">
                  <div className="flex items-center gap-3">
                    <ChevronRight className="h-4 w-4 text-primary shrink-0 transition-transform duration-200" />
                    <span>{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 pt-2 border-t border-dashed border-border/60 mt-1">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed rounded-xl space-y-3">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="font-semibold text-muted-foreground">
            Nenhum termo de ajuda encontrado para &quot;{searchQuery}&quot;
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Tente buscar termos mais específicos ou navegue pelas abas acima para encontrar os
            manuais.
          </p>
        </div>
      )}

      {/* Caixa Informativa Premium Adicional */}
      <div className="p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent space-y-4">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2 text-foreground">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          Como o Pé de Meia garante a sua precisão monetária centesimal?
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ao contrário de softwares de finanças comuns que utilizam variáveis numéricas simples
          (como `float` ou `double` do Javascript) — que sofrem de dízimas periódicas que geram
          erros de arredondamento de centavos no fechamento mensal —, nossa arquitetura bancária
          utiliza a biblioteca de alta precisão **Decimal/BigInt**. Isso garante que todas as
          conversões de câmbio multi-moedas, splits de grupo, juros do cartão e amortizações
          parceladas fiquem exatas até o último centavo, protegendo o seu patrimônio com rigor
          científico.
        </p>
      </div>

      {/* Limpeza de Cache Local */}
      <div className="p-5 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-4">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2 text-foreground">
          <Eraser className="h-4 w-4 text-destructive" />
          Manutenção do Sistema (Limpar Cache)
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Se o aplicativo estiver lento, com problemas de atualização visual ou falhas de
          carregamento no modo offline (PWA), clique no botão abaixo para forçar a limpeza dos dados
          armazenados localmente e sincronizar novamente com os servidores seguros. Você não perderá
          nenhum dado contábil.
        </p>
        <Button variant="destructive" size="sm" onClick={() => setShowClearCacheDialog(true)}>
          Limpar Dados Locais e Recarregar
        </Button>
      </div>

      <AlertDialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
        <AlertDialogContent className="border-border w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente limpar o cache local?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá dados salvos em cache para acelerar o aplicativo e recarregará a
              página. Nenhum dado contábil ou financeiro do servidor será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                if ("serviceWorker" in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function (registrations) {
                    for (const registration of registrations) {
                      registration.unregister();
                    }
                  });
                }
                window.location.reload();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Limpar e Recarregar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Pequenos componentes locais de ícones para evitar falha de imports de arquivos inexistentes
function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return <FileText {...props} />;
}

function WalletIcon(props: React.SVGProps<SVGSVGElement>) {
  return <PiggyBank {...props} />;
}
