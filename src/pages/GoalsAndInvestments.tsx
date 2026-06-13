import { useState } from 'react';
import { Target, TrendingUp, Plus, Download, FileDown, ShieldCheck, Scale } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { useAssets } from '@/hooks/useAssets';
import { Goal, Asset } from '../types/database';
import { formatCurrency } from '@/utils/currencyFormatter';
import { GoalFormDialog } from '@/components/goals/GoalFormDialog';
import { GoalContributeDialog } from '@/components/goals/GoalContributeDialog';
import { AssetFormDialog } from '@/components/investments/AssetFormDialog';
import { AssetTransactionDialog } from '@/components/investments/AssetTransactionDialog';
import { AssetHistoryDialog } from '@/components/investments/AssetHistoryDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { exportPortfolioToPDF, exportToCSV, exportToIRPDF, exportToIRExcel } from '@/utils/investmentExport';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { GoalCard } from '@/components/goals/GoalCard';
import { AssetCard } from '@/components/investments/AssetCard';
import { InvestmentSummarySection } from '@/components/investments/InvestmentSummarySection';
import { AccountingDRE } from '@/components/settings/AccountingDRE';
import { InvestmentIRPanel } from '@/components/investments/InvestmentIRPanel';

export function GoalsAndInvestments() {
  const [activeTab, setActiveTab] = useState<'GOALS' | 'INVESTMENTS' | 'IRPF' | 'DRE'>('GOALS');
  
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
  const [itemToDelete, setItemToDelete] = useState<{type: 'goal'|'asset', id: string, name: string} | null>(null);

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
    if (itemToDelete.type === 'goal') deleteGoal(itemToDelete.id);
    else deleteAsset(itemToDelete.id);
    setItemToDelete(null);
  };

  // Portfolio calculations
  const brAssets = assets?.filter(a => a.location === 'BR') || [];
  const abroadAssets = assets?.filter(a => a.location === 'ABROAD') || [];
  
  const totalBR = brAssets.reduce((sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.current_price) || 0), 0);
  
  // Agrupar totais por moeda para precisão matemática
  const totalsByCurrency = abroadAssets.reduce((acc, a) => {
    const currency = a.currency || 'USD';
    const value = (Number(a.quantity) || 0) * (Number(a.current_price) || 0);
    acc[currency] = (acc[currency] || 0) + value;
    return acc;
  }, {} as Record<string, number>);
  
  const assetTypes = Array.from(new Set(assets?.map(a => a.type) || []));

  const formatAssetValue = (value: number, currency: string) => {
    if (currency === 'BRL') return formatCurrency(value);
    return `${currency} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tighter text-foreground">
              Metas e Investimentos
            </h1>
            <p className="text-muted-foreground mt-1 font-medium">
              {activeTab === 'DRE' ? 'DRE & Balanço Patrimonial' : activeTab === 'IRPF' ? 'Relatório de Imposto de Renda (IRPF)' : 'Gestão de Patrimônio'}
            </p>
          </div>
          
          {activeTab !== 'DRE' && activeTab !== 'IRPF' && (
            <Button 
              onClick={() => {
                if (activeTab === 'GOALS') {
                  setSelectedGoal(null);
                  setShowGoalForm(true);
                } else {
                  setSelectedAsset(null);
                  setShowAssetForm(true);
                }
              }}
              size="default"
              className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 group h-11 w-full sm:w-auto font-bold"
            >
              <Plus className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
              {activeTab === 'GOALS' ? 'Nova Meta' : 'Novo Ativo'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex p-1 bg-muted/60 rounded-2xl w-full sm:w-fit border border-border/50 shadow-inner">
          {/* Sliding indicator */}
          <div
            className={cn(
              "absolute top-1 bottom-1 rounded-xl bg-background shadow-sm transition-all duration-300 ease-out",
              activeTab === 'GOALS' && "left-1 right-[75%]",
              activeTab === 'INVESTMENTS' && "left-[25%] right-[50%]",
              activeTab === 'IRPF' && "left-[50%] right-[25%]",
              activeTab === 'DRE' && "left-[75%] right-1"
            )}
          />
          <button
            onClick={() => setActiveTab('GOALS')}
            className={cn(
              "relative z-10 flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-sm font-medium transition-colors duration-200",
              activeTab === 'GOALS' 
                ? "text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Target className="w-4 h-4" />
            Sonhos & Metas
          </button>
          <button
            onClick={() => setActiveTab('INVESTMENTS')}
            className={cn(
              "relative z-10 flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-sm font-medium transition-colors duration-200",
              activeTab === 'INVESTMENTS' 
                ? "text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="w-4 h-4" />
            Investimentos
          </button>
          <button
            onClick={() => setActiveTab('IRPF')}
            className={cn(
              "relative z-10 flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-sm font-medium transition-colors duration-200",
              activeTab === 'IRPF' 
                ? "text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            Imposto de Renda (IRPF)
          </button>
          <button
            onClick={() => setActiveTab('DRE')}
            className={cn(
              "relative z-10 flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-sm font-medium transition-colors duration-200",
              activeTab === 'DRE' 
                ? "text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Scale className="w-4 h-4" />
            DRE & Balanço
          </button>
        </div>

        {activeTab === 'INVESTMENTS' && assets && assets.length > 0 && (
          <div className="flex gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none rounded-xl">
                  <Download className="w-4 h-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportPortfolioToPDF(assets)}>
                  <FileDown className="w-4 h-4 mr-2 text-emerald-600" /> PDF - Carteira
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToCSV(assets)}>
                  <Download className="w-4 h-4 mr-2 text-emerald-600" /> Excel - Carteira
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  toast.promise(exportToIRPDF(assets), {
                    loading: 'Gerando relatório de IR (PDF)...',
                    success: 'Relatório gerado com sucesso!',
                    error: 'Erro ao gerar relatório.'
                  });
                }}>
                  <ShieldCheck className="w-4 h-4 mr-2 text-blue-600" /> PDF - Auxiliar de IR (Receita Federal)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  toast.promise(exportToIRExcel(assets), {
                    loading: 'Gerando planilha de IR (Excel)...',
                    success: 'Planilha gerada com sucesso!',
                    error: 'Erro ao gerar planilha.'
                  });
                }}>
                  <Download className="w-4 h-4 mr-2 text-blue-600" /> Excel - Auxiliar de IR (Receita Federal)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="animate-fade-in-up stagger-1">
        {activeTab === 'GOALS' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals?.length === 0 ? (
               <div className="col-span-full flex flex-col items-center justify-center p-16 border-2 border-dashed border-border rounded-2xl bg-muted/30">
                 <Target className="w-16 h-16 text-muted-foreground/30 mb-4" />
                 <h3 className="text-xl font-display font-semibold text-foreground mb-2">Nenhuma meta cadastrada</h3>
                 <p className="text-muted-foreground text-center max-w-md text-sm">
                   Defina seus sonhos e acompanhe seu progresso até alcançá-los.
                 </p>
               </div>
            ) : (
              goals?.map((goal, index) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  index={index}
                  onEdit={handleEditGoal}
                  onDelete={(g) => setItemToDelete({type: 'goal', id: g.id, name: g.name})}
                  onContribute={handleContributeGoal}
                />
              ))
            )}
          </div>
        ) : activeTab === 'INVESTMENTS' ? (
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
                <div className="col-span-full flex flex-col items-center justify-center p-16 border-2 border-dashed border-border rounded-2xl bg-muted/30">
                  <TrendingUp className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-xl font-display font-semibold text-foreground mb-2">Sua carteira está vazia</h3>
                  <p className="text-muted-foreground text-center max-w-md text-sm">
                    Adicione seus investimentos e acompanhe a rentabilidade em um só lugar.
                  </p>
                </div>
              ) : (
                assets?.map((asset, index) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    index={index}
                    onEdit={handleEditAsset}
                    onDelete={(a) => setItemToDelete({type: 'asset', id: a.id, name: a.name})}
                    onShowHistory={handleShowHistory}
                    onTransact={handleTransactAsset}
                    formatAssetValue={formatAssetValue}
                  />
                ))
              )}
            </div>
          </div>
        ) : activeTab === 'IRPF' ? (
          <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-premium-sm animate-fade-in">
            <InvestmentIRPanel assets={assets || []} />
          </div>
        ) : (
          <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-premium-sm animate-fade-in">
            <AccountingDRE />
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
        <AlertDialogContent className="border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {itemToDelete?.type === 'goal' ? 'Meta' : 'Investimento'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{itemToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
