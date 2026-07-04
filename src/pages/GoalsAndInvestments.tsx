import { useState } from "react";
import {
  Target,
  TrendingUp,
  Plus,
  Download,
  FileDown,
  ShieldCheck,
  Edit,
  Trash2,
} from "lucide-react";
import { useGoals } from "@/hooks/useGoals";
import { useAssets } from "@/hooks/useAssets";
import { Goal, Asset } from "../types/database";
import { formatCurrency } from "@/utils/currencyFormatter";
import { GoalFormDialog } from "@/components/goals/GoalFormDialog";
import { GoalContributeDialog } from "@/components/goals/GoalContributeDialog";
import { AssetFormDialog } from "@/components/investments/AssetFormDialog";
import { AssetTransactionDialog } from "@/components/investments/AssetTransactionDialog";
import { AssetHistoryDialog } from "@/components/investments/AssetHistoryDialog";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  exportPortfolioToPDF,
  exportToCSV,
  exportToIRPDF,
  exportToIRExcel,
} from "@/utils/investmentExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { GoalCard } from "@/components/goals/GoalCard";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import { AssetCard } from "@/components/investments/AssetCard";
import { InvestmentSummarySection } from "@/components/investments/InvestmentSummarySection";
import { InvestmentIRPanel } from "@/components/investments/InvestmentIRPanel";
import { useSyncAssetPrices } from "@/hooks/useSyncAssetPrices";
import { RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { showActionFeedback } from "@/components/ui/ActionFeedback";

export function GoalsAndInvestments() {
  const [activeTab, setActiveTab] = useState<"GOALS" | "INVESTMENTS" | "IRPF">("GOALS");

  // Goals state
  const { goals, deleteGoal } = useGoals();
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showGoalContribute, setShowGoalContribute] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // Assets state
  const { assets, deleteAsset } = useAssets();
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showAssetTransaction, setShowAssetTransaction] = useState(false);
  const [showAssetHistory, setShowAssetHistory] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Delete state
  const [itemToDelete, setItemToDelete] = useState<{
    type: "goal" | "asset";
    id: string;
    name: string;
  } | null>(null);

  // Sync state
  const syncPrices = useSyncAssetPrices();

  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowGoalForm(true);
  };

  const handleContributeGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowGoalContribute(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowAssetForm(true);
  };

  const handleTransactAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowAssetTransaction(true);
  };

  const handleShowHistory = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowAssetHistory(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    showActionFeedback("error");
    setTimeout(() => {
      setItemToDelete(null);
    }, 80);
    if (itemToDelete.type === "goal") deleteGoal(itemToDelete.id);
    else deleteAsset(itemToDelete.id);
  };

  // Portfolio calculations
  const brAssets = assets?.filter((a) => a.location === "BR") || [];
  const abroadAssets = assets?.filter((a) => a.location === "ABROAD") || [];

  const totalBR = brAssets.reduce((sum, a) => {
    const price = a.current_price && a.current_price > 0 ? a.current_price : a.purchase_price || 0;
    return sum + (Number(a.quantity) || 0) * price;
  }, 0);

  // Agrupar totais por moeda para precisão matemática
  const totalsByCurrency = abroadAssets.reduce(
    (acc, a) => {
      const currency = a.currency || "USD";
      const price =
        a.current_price && a.current_price > 0 ? a.current_price : a.purchase_price || 0;
      const value = (Number(a.quantity) || 0) * price;
      acc[currency] = (acc[currency] || 0) + value;
      return acc;
    },
    {} as Record<string, number>
  );

  const assetTypes = Array.from(new Set(assets?.map((a) => a.type) || []));

  const formatAssetValue = (value: number, currency: string) => {
    if (currency === "BRL") return formatCurrency(value);
    return `${currency} ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header com Glassmorphism */}
      <div className="relative overflow-hidden rounded-4xl p-5 md:p-8 transition-all duration-700 ease-out bg-background/60 backdrop-blur-xl border border-border/40 shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="font-display font-black text-3xl md:text-3xl tracking-tighter text-foreground">
              Metas e Investimentos
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base font-medium flex items-center gap-2">
              <Target className="w-4 h-4" />
              {activeTab === "IRPF"
                ? "Relatório de Imposto de Renda (IRPF)"
                : "Gestão de Patrimônio"}
            </p>
          </div>

          {activeTab !== "IRPF" && (
            <div className="flex flex-col sm:flex-row gap-2">
              {activeTab === "INVESTMENTS" && (
                <Button
                  onClick={() => syncPrices.mutate()}
                  disabled={syncPrices.isPending}
                  variant="outline"
                  className="shadow-sm transition-all h-12 font-medium bg-background/50 backdrop-blur-sm"
                >
                  <RefreshCw
                    className={cn("w-4 h-4 mr-2", syncPrices.isPending && "animate-spin")}
                  />
                  {syncPrices.isPending ? "Sincronizando..." : "Atualizar Cotações"}
                </Button>
              )}
              <Button
                onClick={() => {
                  if (activeTab === "GOALS") {
                    setSelectedGoal(null);
                    setShowGoalForm(true);
                  } else {
                    setSelectedAsset(null);
                    setShowAssetForm(true);
                  }
                }}
                size="default"
                className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 group h-12 w-full sm:w-auto font-bold"
              >
                <Plus className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
                {activeTab === "GOALS" ? "Nova Meta" : "Novo Ativo"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="w-full sm:w-auto overflow-x-auto pb-1 -mb-1 hide-scrollbar">
          <div className="relative flex p-1 bg-muted/60 rounded-2xl w-full sm:w-fit border border-border/50 shadow-inner min-w-[320px]">
            {/* Sliding indicator */}
            <div
              className={cn(
                "absolute top-1 bottom-1 rounded-xl bg-background shadow-sm transition-all duration-300 ease-out",
                activeTab === "GOALS" && "left-1 right-[66.66%]",
                activeTab === "INVESTMENTS" && "left-[33.33%] right-[33.33%]",
                activeTab === "IRPF" && "left-[66.66%] right-1"
              )}
            />
            <button
              onClick={() => setActiveTab("GOALS")}
              className={cn(
                "relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 px-2 sm:px-6 rounded-xl text-sm font-medium transition-colors duration-200 whitespace-nowrap",
                activeTab === "GOALS"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Target className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Sonhos & Metas</span>
              <span className="sm:hidden">Metas</span>
            </button>
            <button
              onClick={() => setActiveTab("INVESTMENTS")}
              className={cn(
                "relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 px-2 sm:px-6 rounded-xl text-sm font-medium transition-colors duration-200 whitespace-nowrap",
                activeTab === "INVESTMENTS"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              Investimentos
            </button>
            <button
              onClick={() => setActiveTab("IRPF")}
              className={cn(
                "relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 px-2 sm:px-6 rounded-xl text-sm font-medium transition-colors duration-200 whitespace-nowrap",
                activeTab === "IRPF"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Imposto de Renda (IRPF)</span>
              <span className="sm:hidden">IRPF</span>
            </button>
          </div>
        </div>

        {activeTab === "INVESTMENTS" && assets && assets.length > 0 && (
          <div className="flex gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1 sm:flex-none rounded-xl"
                >
                  <Download className="w-4 h-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportPortfolioToPDF(assets)}>
                  <FileDown className="w-4 h-4 mr-2 text-success" /> PDF - Carteira
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToCSV(assets)}>
                  <Download className="w-4 h-4 mr-2 text-success" /> Excel - Carteira
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    toast.promise(exportToIRPDF(assets), {
                      loading: "Gerando relatório de IR (PDF)...",
                      success: "Relatório gerado com sucesso!",
                      error: "Erro ao gerar relatório.",
                    });
                  }}
                >
                  <ShieldCheck className="w-4 h-4 mr-2 text-accent" /> PDF - Auxiliar de IR (Receita
                  Federal)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    toast.promise(exportToIRExcel(assets), {
                      loading: "Gerando planilha de IR (Excel)...",
                      success: "Planilha gerada com sucesso!",
                      error: "Erro ao gerar planilha.",
                    });
                  }}
                >
                  <Download className="w-4 h-4 mr-2 text-accent" /> Excel - Auxiliar de IR (Receita
                  Federal)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="animate-fade-in-up stagger-1">
        {activeTab === "GOALS" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals?.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={Target}
                  title="Alcance seus objetivos"
                  description="Defina sonhos — uma viagem, a casa própria, sua reserva de segurança — e acompanhe cada passo do progresso."
                  action={
                    <Button
                      onClick={() => setShowGoalForm(true)}
                      size="lg"
                      className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all font-semibold"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Criar Primeira Meta
                    </Button>
                  }
                />
              </div>
            ) : (
              goals?.map((goal, index) => (
                <SwipeableRow
                  key={goal.id}
                  className="rounded-2xl overflow-hidden"
                  leftAction={{
                    icon: <Edit className="h-5 w-5" />,
                    color: "bg-primary",
                    onClick: () => handleEditGoal(goal),
                  }}
                  rightAction={{
                    icon: <Trash2 className="h-5 w-5" />,
                    color: "bg-destructive",
                    onClick: () => setItemToDelete({ type: "goal", id: goal.id, name: goal.name }),
                  }}
                >
                  <GoalCard
                    goal={goal}
                    index={index}
                    onEdit={handleEditGoal}
                    onDelete={(g) => setItemToDelete({ type: "goal", id: g.id, name: g.name })}
                    onContribute={handleContributeGoal}
                  />
                </SwipeableRow>
              ))
            )}
          </div>
        ) : activeTab === "INVESTMENTS" ? (
          <div className="space-y-6">
            <InvestmentSummarySection
              totalBR={totalBR}
              totalsByCurrency={totalsByCurrency}
              brAssetsCount={brAssets.length}
              abroadAssetsCount={abroadAssets.length}
              assetTypesCount={assetTypes.length}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets?.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState
                    icon={TrendingUp}
                    title="Sua carteira está vazia"
                    description="Adicione ações, FIIs, cripto ou renda fixa para acompanhar rentabilidade, cotações e histórico em um só lugar."
                    variant="success"
                    action={
                      <Button
                        onClick={() => setShowAssetForm(true)}
                        size="lg"
                        className="h-12 px-8 rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all font-semibold"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Adicionar Primeiro Ativo
                      </Button>
                    }
                  />
                </div>
              ) : (
                assets?.map((asset, index) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    index={index}
                    onEdit={handleEditAsset}
                    onDelete={(a) => setItemToDelete({ type: "asset", id: a.id, name: a.name })}
                    onShowHistory={handleShowHistory}
                    onTransact={handleTransactAsset}
                    formatAssetValue={formatAssetValue}
                  />
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-premium-sm animate-fade-in">
            <InvestmentIRPanel assets={assets || []} />
          </div>
        )}
      </div>

      <GoalFormDialog
        isOpen={showGoalForm}
        onClose={() => setShowGoalForm(false)}
        goal={selectedGoal}
      />

      {selectedGoal && (
        <GoalContributeDialog
          isOpen={showGoalContribute}
          onClose={() => setShowGoalContribute(false)}
          goal={selectedGoal}
        />
      )}

      <AssetFormDialog
        isOpen={showAssetForm}
        onClose={() => setShowAssetForm(false)}
        asset={selectedAsset}
      />

      {selectedAsset && (
        <AssetTransactionDialog
          isOpen={showAssetTransaction}
          onClose={() => setShowAssetTransaction(false)}
          asset={selectedAsset}
        />
      )}

      {selectedAsset && (
        <AssetHistoryDialog
          isOpen={showAssetHistory}
          onClose={() => setShowAssetHistory(false)}
          asset={selectedAsset}
        />
      )}

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent className="border-border w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {itemToDelete?.type === "goal" ? "Meta" : "Investimento"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{itemToDelete?.name}"? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
