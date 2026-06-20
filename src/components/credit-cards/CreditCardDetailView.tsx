import React from "react";
import { useSharedCreditCards, useRevokeSharedCard } from "@/hooks/useSharedCreditCards";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CreditCardCategories } from "./CreditCardCategories";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Settings, Pencil, Trash2, ChevronLeft, ChevronRight, Wallet, Download, CreditCard, MoreHorizontal, Archive, RotateCcw, Share2, CalendarClock } from "lucide-react";
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
          "p-6 md:p-8 rounded-[2rem] text-white transition-all relative overflow-hidden shadow-2xl mx-auto w-full max-w-2xl",
          invoiceFetching && "opacity-80"
        )}
        style={{ 
          background: `linear-gradient(135deg, ${bank.color} 0%, ${bank.color}80 100%)`
        }}
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full blur-[60px] opacity-30 bg-white" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full blur-[60px] opacity-20 bg-black" />

        {/* Decorative Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />

        {invoiceFetching && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-sm z-20">
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl shadow-sm border border-white/20">
                <BankIcon bankId={selectedCard.bank_id} accountName={selectedCard.name} size="md" />
              </div>
              <div>
                <p className="font-bold text-lg tracking-tight leading-none">{selectedCard.name}</p>
                <p className="text-xs opacity-80 mt-0.5">{bank.name}</p>
              </div>
            </div>
            
            {(() => {
              const isOverdue = localInvoiceData.status === 'CLOSED' && new Date() > localInvoiceData.dueDate && localInvoiceData.invoiceTotal > 0;
              const isClosed = localInvoiceData.status === 'CLOSED';
              return (
                <span className={cn(
                  "text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest border shadow-sm backdrop-blur-md",
                  isOverdue ? "bg-red-500/20 text-red-100 border-red-500/50 animate-pulse" : 
                  isClosed ? "bg-amber-500/20 text-amber-100 border-amber-500/50" :
                  "bg-blue-400/20 text-blue-100 border-blue-400/50"
                )}>
                  {isOverdue ? '⚠️ Fatura Atrasada' : isClosed ? '🔴 Fatura Fechada' : '🔵 Fatura Aberta'}
                </span>
              );
            })()}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div>
              <p className="text-sm opacity-80 mb-1 font-medium uppercase tracking-wider">Valor da Fatura</p>
              <div className="flex items-baseline gap-3">
                <p className="font-display font-black text-5xl tracking-tighter drop-shadow-sm">
                  {formatCurrency(localInvoiceData.invoiceTotal)}
                </p>
              </div>
              {Math.abs(selectedCard.balance) > localInvoiceData.invoiceTotal + 0.01 && (
                <div className="inline-block mt-2 bg-white/10 border border-white/20 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  + {formatCurrency(Math.abs(selectedCard.balance) - localInvoiceData.invoiceTotal)} a mais
                </div>
              )}
            </div>

            <div className="flex flex-col md:items-end justify-end space-y-2">
              <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-xl backdrop-blur-md border border-white/10 w-fit md:w-auto">
                <CalendarClock className="w-4 h-4 opacity-70" />
                <span className="text-sm font-medium">
                  {localInvoiceData.status === 'OPEN' 
                    ? `Fecha em ${invoiceData.daysToClose} dias`
                    : `Vence em ${dateFns.format(localInvoiceData.dueDate, "dd MMM", { locale: ptBR })}`
                  }
                </span>
              </div>
              {Math.abs(selectedCard.balance) > localInvoiceData.invoiceTotal + 0.01 && (
                <p className="text-[11px] opacity-70 font-medium tracking-wide">
                  Total gasto acumulado: {formatCurrency(Math.abs(selectedCard.balance))}
                </p>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-8 pt-6 border-t border-white/10">
            <Button 
              variant="secondary" 
              className="h-12 bg-white text-black hover:bg-white/90 border-0 font-bold shadow-lg hover:scale-105 transition-transform col-span-2 md:col-span-1"
              onClick={() => setShowPayDialog(true)}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Pagar Fatura
            </Button>
            <Button 
              variant="secondary" 
              className="h-12 bg-black/20 hover:bg-black/30 backdrop-blur-md text-white border border-white/10 shadow-sm"
              onClick={() => setShowImportDialog(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Importar
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="secondary" 
                  className="h-12 bg-black/20 hover:bg-black/30 backdrop-blur-md text-white border border-white/10 shadow-sm w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl">
                <DropdownMenuItem onClick={() => handleExportCard('pdf', localInvoiceData.transactions, `Fatura ${monthName}`)} className="cursor-pointer">
                  Exportar Fatura em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCard('csv', localInvoiceData.transactions, `Fatura ${monthName}`)} className="cursor-pointer">
                  Exportar Fatura em Excel
                </DropdownMenuItem>
                
                {allYearTransactions.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      const cardYearTxs = allYearTransactions.filter(t => t.account_id === selectedCard.id);
                      handleExportCard('pdf', cardYearTxs, `Ano ${selectedDate.getFullYear()}`);
                    }} className="cursor-pointer">
                      Exportar Relatório Anual (PDF)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const cardYearTxs = allYearTransactions.filter(t => t.account_id === selectedCard.id);
                      handleExportCard('csv', cardYearTxs, `Ano ${selectedDate.getFullYear()}`);
                    }} className="cursor-pointer">
                      Exportar Relatório Anual (Excel)
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
                  "group flex items-start gap-4 p-4 hover:bg-muted/50 transition-all duration-200 hover:pl-5 cursor-pointer relative",
                  index !== localInvoiceData.transactions.length - 1 && "border-b border-border"
                )}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />
                
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 shadow-sm border border-border/50 group-hover:scale-110 transition-transform",
                  tx.type === "INCOME" ? "bg-positive/10" : "bg-background"
                )}>
                  {tx.category?.icon || (tx.type === "INCOME" ? "💰" : "💸")}
                </div>
                
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate text-foreground/90 group-hover:text-foreground transition-colors">{tx.description}</p>
                    {tx.is_installment && tx.current_installment && tx.total_installments && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/80 text-muted-foreground font-bold tracking-wider">
                        {tx.current_installment}/{tx.total_installments}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-1">
                    <span className="truncate">{tx.category?.name || "Sem categoria"}</span>
                    <span className="opacity-50">•</span>
                    <span>{dateFns.format(new Date(tx.date + 'T00:00:00'), "dd/MM/yyyy")}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0 pt-0.5">
                  <div className="flex flex-col items-end gap-0.5">
                    {(() => {
                      const isCredit = tx.type === "INCOME" || (tx.type === "TRANSFER" && tx.destination_account_id === selectedCard.id);
                      return (
                        <>
                          <span className={cn(
                            "font-mono font-bold text-right whitespace-nowrap",
                            isCredit ? "text-positive" : "text-foreground"
                          )}>
                            {isCredit ? "+" : ""}{formatCurrency(tx.amount)}
                          </span>
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-widest whitespace-nowrap opacity-70",
                            isCredit ? "text-positive" : "text-muted-foreground"
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl shadow-xl">
                        <DropdownMenuItem onClick={() => handleEditTransaction(tx)} className="cursor-pointer">
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar Lançamento
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteConfirm({ isOpen: true, transaction: tx })}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir Lançamento
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
