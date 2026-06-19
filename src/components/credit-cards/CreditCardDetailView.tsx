import React from "react";
import { useSharedCreditCards, useRevokeSharedCard } from "@/hooks/useSharedCreditCards";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CreditCardCategories } from "./CreditCardCategories";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Settings, Pencil, Trash2, ChevronLeft, ChevronRight, Wallet, Download, CreditCard, MoreHorizontal, Archive, RotateCcw, Share2, X } from "lucide-react";
import { BankIcon } from "@/components/financial/BankIcon";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { getInvoiceData } from "@/lib/invoiceUtils";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreditCardDetailViewProps {
  selectedCard: any;
  goBack: () => void;
  openEditCardDialog: (card: any) => void;
  setDeleteCardConfirm: (state: { isOpen: boolean; card: any | null }) => void;
  selectedDate: Date;
  changeMonth: (offset: number) => void;
  goToCurrentMonth: () => void;
  monthName: string;
  cycleRange: string;
  invoiceFetching: boolean;
  invoiceData: any;
  formatCurrency: (value: number) => string;
  daysUntilDue: number;
  usagePercent: number;
  bank: any;
  setShowPayDialog: (v: boolean) => void;
  setShowImportDialog: (v: boolean) => void;
  handleEditTransaction: (tx: any) => void;
  setDeleteConfirm: (v: { isOpen: boolean; transaction: any | null }) => void;
  installments: any[];
  allYearTransactions?: any[];
  dependentTransactions?: any[];
  canDelete?: boolean;
  onArchive: (card: any) => void;
  onUnarchive: (card: any) => void;
  setShowSharingDialog: (v: boolean) => void;
}

export function CreditCardDetailView({
  selectedCard,
  goBack,
  openEditCardDialog,
  setDeleteCardConfirm,
  selectedDate,
  changeMonth,
  goToCurrentMonth,
  monthName,
  cycleRange,
  invoiceFetching,
  invoiceData,
  formatCurrency,
  daysUntilDue,
  usagePercent,
  bank,
  setShowPayDialog,
  setShowImportDialog,
  handleEditTransaction,
  setDeleteConfirm,
  installments,
  allYearTransactions = [],
  dependentTransactions = [],
  canDelete = false,
  onArchive,
  onUnarchive,
  setShowSharingDialog,
}: CreditCardDetailViewProps) {
  const { user } = useAuth();
  const { data: sharedCards = [] } = useSharedCreditCards(selectedCard.id);
  const revokeMutation = useRevokeSharedCard();
  const isOwner = selectedCard.user_id === user?.id;

  const [activeTab, setActiveTab] = React.useState("mine");

  const myTransactions = React.useMemo(() => {
    return allYearTransactions.filter(t => t.account_id === selectedCard.id || t.destination_account_id === selectedCard.id);
  }, [allYearTransactions, selectedCard.id]);

  const dependentTransactionsForCard = React.useMemo(() => {
    return dependentTransactions.filter(t => t.account_id === selectedCard.id || t.destination_account_id === selectedCard.id);
  }, [dependentTransactions, selectedCard.id]);

  const cardTransactions = React.useMemo(() => {
    if (!isOwner || sharedCards.length === 0) return myTransactions;
    if (activeTab === "all") return [...myTransactions, ...dependentTransactionsForCard];
    if (activeTab === "mine") return myTransactions;
    // For a specific dependent:
    return dependentTransactionsForCard.filter(t => t.user_id === activeTab);
  }, [isOwner, sharedCards.length, activeTab, myTransactions, dependentTransactionsForCard]);

  // Recalculate invoice based on selected tab transactions
  const localInvoiceData = React.useMemo(() => {
    // invoiceData originally comes from props (which is global), but we override it locally for tabs!
    const baseData = getInvoiceData(selectedCard, cardTransactions, selectedDate);
    // Preservar propriedades do invoiceData recebido via prop (como status) caso a gente não tenha calculado
    return { ...baseData, status: invoiceData?.status || baseData.status };
  }, [selectedCard, cardTransactions, selectedDate, invoiceData?.status]);

  // Calculate category summary for the current tab
  const categorySummary = React.useMemo(() => {
    const summary: Record<string, { amount: number, name: string, icon: string, color: string }> = {};
    let totalExpenses = 0;
    
    // Only use expenses that belong to the current invoice
    localInvoiceData.transactions.forEach(t => {
      if (t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.account_id === selectedCard.id)) {
        const catId = t.category_id || 'uncategorized';
        const catName = t.category?.name || 'Outros';
        const catIcon = t.category?.icon || 'help-circle';
        // Assign a random color if needed, or use a default
        const amount = Number(t.amount);
        
        if (!summary[catId]) {
          summary[catId] = { amount: 0, name: catName, icon: catIcon, color: 'bg-muted' };
        }
        summary[catId].amount += amount;
        totalExpenses += amount;
      }
    });
    
    return Object.values(summary).sort((a, b) => b.amount - a.amount).map(cat => ({
      ...cat,
      percent: totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0
    }));
  }, [localInvoiceData.transactions, selectedCard.id]);

  const handleExportCard = async (format: 'pdf'|'csv', txs: any[], periodLabel: string) => {
    const { exportDetailedCardReportToCSV, exportDetailedCardReportToPDF } = await import("@/utils/exportData");
    if (format === 'pdf') exportDetailedCardReportToPDF(txs, selectedCard, periodLabel);
    else exportDetailedCardReportToCSV(txs, selectedCard, periodLabel);
  };

  const onBack = () => goBack();

  return (
    <div className="space-y-6 pb-20 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <BankIcon bankId={selectedCard.bank_id} accountName={selectedCard.name} size="lg" />

          <div className="flex flex-col">
            <h1 className="font-display font-bold text-2xl tracking-tight">{selectedCard.name}</h1>

          </div>

        </div>

        {/* Share Button highlighted */}
        {isOwner && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setShowSharingDialog(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md flex items-center justify-center transition-all hover:scale-105 shrink-0 px-3 md:px-4"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden md:inline md:ml-2">Compartilhar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs space-y-2 p-3 bg-card text-card-foreground shadow-premium-sm border-border">
                <p className="font-bold text-sm">Dividindo os Gastos?</p>
                <p className="text-xs text-muted-foreground">
                  Envie um link para o seu parceiro ou familiar para que ele possa acompanhar os lançamentos da fatura e lançar os próprios gastos nesse cartão em tempo real!
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-xl border-border shrink-0">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditCardDialog(selectedCard)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar Cartão
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => selectedCard.is_archived ? onUnarchive(selectedCard) : onArchive(selectedCard)}>
              {selectedCard.is_archived ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Desarquivar Cartão
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar Cartão
                </>
              )}
            </DropdownMenuItem>

            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setDeleteCardConfirm({ isOpen: true, card: selectedCard })}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Cartão
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>



      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-muted/30 p-2 rounded-xl">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => changeMonth(-1)}
          className="rounded-full hover:bg-background shadow-sm transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-lg capitalize">
              {monthName}
            </h3>
            {!dateFns.isSameMonth(selectedDate, new Date()) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={goToCurrentMonth}
                className="h-6 px-2 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 rounded-full"
              >
                Hoje
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">Ciclo: {cycleRange}</p>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => changeMonth(1)}
          className="rounded-full hover:bg-background shadow-sm transition-all"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div 
        className={cn(
          "p-6 rounded-2xl text-white transition-all hover:shadow-lg relative overflow-hidden",
          invoiceFetching && "opacity-80"
        )}
        style={{ backgroundColor: bank.color }}
      >
        {invoiceFetching && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[1px] z-10">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1",
          localInvoiceData.status === 'CLOSED' && new Date() > localInvoiceData.dueDate && localInvoiceData.invoiceTotal > 0
            ? "bg-red-500 animate-pulse" 
            : localInvoiceData.status === 'CLOSED' 
              ? "bg-amber-500" 
              : "bg-blue-400"
        )} />
        
        <div className="flex items-start justify-between mb-4">
          {(() => {
            const isOverdue = localInvoiceData.status === 'CLOSED' && new Date() > localInvoiceData.dueDate && localInvoiceData.invoiceTotal > 0;
            const isClosed = localInvoiceData.status === 'CLOSED';
            return (
              <span className={cn(
                "text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider",
                isOverdue ? "bg-red-500 text-white" : 
                isClosed ? "bg-amber-500/30 text-amber-100" :
                "bg-blue-400/30 text-blue-100"
              )}>
                {isOverdue ? '⚠️ ATRASADA' : isClosed ? '🔴 FECHADA' : '🔵 ABERTA'}
              </span>
            );
          })()}
        </div>
        
        <p className="text-sm opacity-80 mb-1">Valor da Fatura</p>
        <div className="flex items-baseline gap-3">
          <p className="font-display font-bold text-4xl tracking-tight">
            {formatCurrency(localInvoiceData.invoiceTotal)}
          </p>
          {Math.abs(selectedCard.balance) > localInvoiceData.invoiceTotal + 0.01 && (
            <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider animate-pulse">
              + {formatCurrency(Math.abs(selectedCard.balance) - localInvoiceData.invoiceTotal)} pendente
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm opacity-80">
            {localInvoiceData.status === 'OPEN' 
              ? `Fecha em ${invoiceData.daysToClose} dias`
              : `Vence ${dateFns.format(localInvoiceData.dueDate, "dd 'de' MMMM", { locale: ptBR })}`
            }
          </p>
          <div className="flex flex-col items-end">
            <span className="text-xs px-2 py-1 rounded-full bg-white/20">
              {daysUntilDue > 0 ? `${daysUntilDue} dias` : "Vencida"}
            </span>
            {Math.abs(selectedCard.balance) > localInvoiceData.invoiceTotal + 0.01 && (
              <span className="text-[9px] opacity-70 mt-1">Total acumulado: {formatCurrency(Math.abs(selectedCard.balance))}</span>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 mt-6 flex-wrap">
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1 min-w-[120px] bg-white/20 hover:bg-white/30 text-white border-0"
            onClick={() => setShowPayDialog(true)}
          >
            <Wallet className="h-4 w-4 mr-2" />
            Pagar Fatura
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1 min-w-[120px] bg-white/20 hover:bg-white/30 text-white border-0"
            onClick={() => setShowImportDialog(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Importar
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex-1 min-w-[120px] bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleExportCard('pdf', localInvoiceData.transactions, `Fatura ${monthName}`)}>
                Exportar Fatura Completa (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportCard('csv', localInvoiceData.transactions, `Fatura ${monthName}`)}>
                Exportar Fatura em Excel (CSV)
              </DropdownMenuItem>
              
              {allYearTransactions.length > 0 && (
                <>
                  <div className="h-px bg-border my-1" />
                  <DropdownMenuItem onClick={() => {
                    const cardYearTxs = allYearTransactions.filter(t => t.account_id === selectedCard.id);
                    handleExportCard('pdf', cardYearTxs, `Ano ${selectedDate.getFullYear()}`);
                  }}>
                    Exportar Relatório Anual (PDF)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    const cardYearTxs = allYearTransactions.filter(t => t.account_id === selectedCard.id);
                    handleExportCard('csv', cardYearTxs, `Ano ${selectedDate.getFullYear()}`);
                  }}>
                    Exportar Relatório Anual (CSV)
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>


      {/* Dependent Tabs (Only for owner of shared card) */}
      {isOwner && sharedCards.length > 0 && (
        <div className="bg-muted/30 p-1 rounded-xl mt-6 overflow-x-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start h-auto p-1 bg-transparent border-none">
              <TabsTrigger value="mine" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Meus Gastos</TabsTrigger>
              {sharedCards.map((sc: any) => (
                <TabsTrigger key={sc.user_id} value={sc.user_id} className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
                  <UserAvatar name={sc.user?.full_name || 'Conv.'} avatarUrl={sc.user?.avatar_url} iconId={sc.user?.avatar_icon} colorId={sc.user?.avatar_color} size="sm" className="w-6 h-6 text-[10px]" />
                  <span className="truncate max-w-[80px]">{sc.user?.full_name?.split(' ')[0] || 'Convidado'}</span>
                </TabsTrigger>
              ))}
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Fatura Completa</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Category Breakdown */}
      {localInvoiceData.transactions.length > 0 && (
        <CreditCardCategories transactions={localInvoiceData.transactions} />
      )}

      {/* Transactions List */}
      {localInvoiceData.transactions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            Lançamentos ({localInvoiceData.transactions.length})
          </h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {localInvoiceData.transactions.map((tx: any, index: number) => (
              <div 
                key={tx.id} 
                className={cn(
                  "group flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors",
                  index !== localInvoiceData.transactions.length - 1 && "border-b border-border"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0",
                  tx.type === "INCOME" ? "bg-positive/10" : "bg-muted"
                )}>
                  {tx.category?.icon || (tx.type === "INCOME" ? "💰" : "💸")}
                </div>
                
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{tx.description}</p>
                    {tx.is_installment && tx.current_installment && tx.total_installments && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-medium">
                        {tx.current_installment}/{tx.total_installments}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap mt-1">
                    <span className="truncate">{tx.category?.name || "Sem categoria"}</span>
                    <span>·</span>
                    <span>{dateFns.format(new Date(tx.date + 'T00:00:00'), "dd/MM/yyyy")}</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 shrink-0 pt-0.5">
                  <div className="flex flex-col items-end gap-0.5">
                    {(() => {
                      const isCredit = tx.type === "INCOME" || (tx.type === "TRANSFER" && tx.destination_account_id === selectedCard.id);
                      return (
                        <>
                          <span className={cn(
                            "font-mono font-medium text-right whitespace-nowrap",
                            isCredit ? "text-positive" : "text-negative"
                          )}>
                            {isCredit ? "+" : "-"}{formatCurrency(tx.amount)}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                            isCredit ? "text-positive" : "text-negative"
                          )}>
                            {isCredit ? "Crédito" : "Débito"}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditTransaction(tx)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteConfirm({ isOpen: true, transaction: tx })}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {localInvoiceData.transactions.length === 0 && (
        <EmptyState
          icon={CreditCard}
          title="Nenhum lançamento"
          description="Você ainda não possui compras registradas nesta fatura."
        />
      )}

      {/* Installments */}
      {installments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            Parcelas ativas ({installments.length})
          </h2>
          <div className="space-y-3">
            {installments.map((inst) => (
              <div 
                key={inst.id} 
                className="p-4 rounded-xl border border-border transition-all duration-200 hover:border-foreground/20"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium">{inst.description}</p>
                  <span className="font-mono text-sm">{formatCurrency(inst.value)}/mês</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(inst.current / inst.total) * 100}%`,
                        backgroundColor: bank.color 
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {inst.current}/{inst.total}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card Info */}
      <div className="p-4 rounded-xl border border-border">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">
          Informações
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Fechamento</p>
            <p className="font-medium">Dia {selectedCard.closing_day || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Vencimento</p>
            <p className="font-medium">Dia {selectedCard.due_day || "-"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
