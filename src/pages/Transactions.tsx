import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  X,
  Loader2,
  Trash2,
  Edit,
  Lock,
  User,
  Clock,
  Users,
  CheckCircle,
  FastForward,
  HandCoins,
  Download,
  FileSpreadsheet,
  FileJson,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransactions, useDeleteTransaction, useDeleteInstallmentSeries } from "@/hooks/useTransactions";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
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
import { TransactionModal } from "@/components/modals/TransactionModal";
import { AdvanceInstallmentsDialog } from "@/components/transactions/AdvanceInstallmentsDialog";
import { SettlementConfirmDialog } from "@/components/transactions/SettlementConfirmDialog";
import { TransactionDetailsModal } from "@/components/transactions/TransactionDetailsModal";
import { groupTransactionsByDay, DayGroup } from "@/utils/transactionUtils";
import { exportTransactions } from "@/services/exportService";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import { toast } from "sonner";

export function Transactions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteSeriesId, setDeleteSeriesId] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [settlementTransaction, setSettlementTransaction] = useState<any>(null);
  const [detailsTransaction, setDetailsTransaction] = useState<any>(null);
  const [advanceSeriesId, setAdvanceSeriesId] = useState<string | null>(null);
  const [advanceDescription, setAdvanceDescription] = useState<string>("");

  const { user } = useAuth();
  const { data: transactions, isLoading } = useTransactions();
  const { data: familyMembers = [] } = useFamilyMembers();
  const deleteTransaction = useDeleteTransaction();
  const deleteInstallmentSeries = useDeleteInstallmentSeries();

  // Listen for global transaction modal event
  useEffect(() => {
    const handleOpenModal = () => setShowTransactionModal(true);
    window.addEventListener('openTransactionModal', handleOpenModal);
    return () => window.removeEventListener('openTransactionModal', handleOpenModal);
  }, []);

  const formatCurrency = (value: number, currency: string = "BRL") => {
    // Para moedas internacionais, usar símbolo simples
    if (currency !== "BRL") {
      const symbol = getCurrencySymbol(currency);
      return `${symbol} ${Math.abs(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    // Para BRL, usar formatação padrão brasileira
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Math.abs(value));
  };

  // Extrair categorias e contas únicas das transações
  const { categories, accounts } = useMemo(() => {
    const catMap = new Map<string, { id: string; name: string; icon: string }>();
    const accMap = new Map<string, { id: string; name: string }>();
    
    (transactions || []).forEach(t => {
      if (t.category?.id && t.category?.name) {
        catMap.set(t.category.id, { id: t.category.id, name: t.category.name, icon: t.category.icon || "📁" });
      }
      if (t.account?.id && t.account?.name) {
        accMap.set(t.account.id, { id: t.account.id, name: t.account.name });
      }
    });
    
    return {
      categories: Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      accounts: Array.from(accMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [transactions]);

  // Calcular datas para filtros de período
  const getPeriodDates = (period: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case "today":
        return { start: today, end: today };
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return { start: weekStart, end: today };
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart, end: today };
      case "lastMonth":
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: lastMonthStart, end: lastMonthEnd };
      default:
        return null;
    }
  };

  // Filtrar transações por busca, tipo, categoria, conta e período
  const filteredTransactions = useMemo(() => {
    const periodDates = getPeriodDates(selectedPeriod);
    
    return (transactions || []).filter((t) => {
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "all" || t.type === selectedType;
      const matchesCategory = selectedCategory === "all" || t.category?.id === selectedCategory;
      const matchesAccount = selectedAccount === "all" || t.account?.id === selectedAccount;
      
      let matchesPeriod = true;
      if (periodDates) {
        const txDate = new Date(t.date + "T12:00:00");
        matchesPeriod = txDate >= periodDates.start && txDate <= new Date(periodDates.end.getTime() + 86400000 - 1);
      }
      
      return matchesSearch && matchesType && matchesCategory && matchesAccount && matchesPeriod;
    });
  }, [transactions, searchQuery, selectedType, selectedCategory, selectedAccount, selectedPeriod]);

  // Agrupar transações por dia
  const dayGroups = useMemo(() => {
    return groupTransactionsByDay(filteredTransactions);
  }, [filteredTransactions]);

  // Calcular totais gerais
  const totalIncome = filteredTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = filteredTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const hasFilters = selectedType !== "all" || selectedCategory !== "all" || selectedAccount !== "all" || selectedPeriod !== "all";

  const clearFilters = () => {
    setSelectedType("all");
    setSelectedCategory("all");
    setSelectedAccount("all");
    setSelectedPeriod("all");
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTransaction.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleDeleteSeries = async () => {
    if (deleteSeriesId) {
      await deleteInstallmentSeries.mutateAsync(deleteSeriesId);
      setDeleteSeriesId(null);
    }
  };

  const handleAdvance = (transaction: any) => {
    if (transaction.series_id) {
      setAdvanceSeriesId(transaction.series_id);
      setAdvanceDescription(transaction.description.replace(/\s*\(\d+\/\d+\)$/, ''));
    }
  };

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const getCreatorName = (creatorUserId: string | null) => {
    if (!creatorUserId) return null;
    if (creatorUserId === user?.id) return null;
    
    const member = familyMembers.find(
      m => m.user_id === creatorUserId || m.linked_user_id === creatorUserId
    );
    return member?.name || 'Outro membro';
  };

  const getPayerInfo = (transaction: any) => {
    if (!transaction.is_shared) return null;
    
    if (!transaction.payer_id || transaction.payer_id === user?.id) {
      return { label: 'Você pagou', isMe: true };
    }
    
    const payer = familyMembers.find(m => m.id === transaction.payer_id);
    if (payer) {
      return { label: `Pago por ${payer.name}`, isMe: false };
    }
    
    return null;
  };

  // Verificar se transação compartilhada tem splits pendentes
  const hasPendingSplits = (transaction: any) => {
    if (!transaction.is_shared || !transaction.transaction_splits) return false;
    return transaction.transaction_splits.some((s: any) => !s.is_settled);
  };

  // Verificar se todos os splits foram acertados
  const isFullySettled = (transaction: any) => {
    if (!transaction.is_shared || !transaction.transaction_splits) return false;
    if (transaction.transaction_splits.length === 0) return false;
    return transaction.transaction_splits.every((s: any) => s.is_settled);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Transações</h1>
          <p className="text-muted-foreground mt-1">{filteredTransactions.length} registros</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => {
                exportTransactions(filteredTransactions, "csv");
                toast.success("Transações exportadas em CSV");
              }}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar CSV
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                exportTransactions(filteredTransactions, "json");
                toast.success("Transações exportadas em JSON");
              }}
              className="gap-2"
            >
              <FileJson className="h-4 w-4" />
              Exportar JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-8 py-4 border-y border-border">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Entradas</p>
          <p className="font-mono text-lg font-medium text-positive">+{formatCurrency(totalIncome)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Saídas</p>
          <p className="font-mono text-lg font-medium text-negative">-{formatCurrency(totalExpense)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Resultado</p>
          <p className={cn(
            "font-mono text-lg font-medium",
            totalIncome - totalExpense >= 0 ? "text-positive" : "text-negative"
          )}>
            {totalIncome - totalExpense >= 0 ? "+" : "-"}{formatCurrency(Math.abs(totalIncome - totalExpense))}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {hasFilters && (
              <span className="w-2 h-2 rounded-full bg-background" />
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-border animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="INCOME">Receitas</SelectItem>
                  <SelectItem value="EXPENSE">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoria</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conta</label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Período</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Todo período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo período</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Últimos 7 dias</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="lastMonth">Mês passado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {hasFilters && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1 text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                  Limpar
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction List - Grouped by Day */}
      <div className="space-y-6">
        {dayGroups.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">Nenhuma transação encontrada</p>
            <p className="text-sm text-muted-foreground mt-2">Use o botão + para adicionar uma transação</p>
          </div>
        ) : (
          dayGroups.map((group) => (
            <div key={group.date} className="space-y-2">
              {/* Day Header */}
              <div className="flex items-center justify-between py-2 px-1">
                <h3 className="font-medium text-sm text-muted-foreground">{group.label}</h3>
                <span className={cn(
                  "font-mono text-sm font-medium",
                  group.balance >= 0 ? "text-positive" : "text-negative"
                )}>
                  {group.balance >= 0 ? "+" : ""}{formatCurrency(group.balance)}
                </span>
              </div>
              
              {/* Day Transactions */}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {group.transactions.map((transaction, index) => {
                  const creatorName = getCreatorName(transaction.creator_user_id);
                  // Verificar se é dono (user_id) ou criador (creator_user_id)
                  const isOwner = transaction.user_id === user?.id;
                  const isCreator = transaction.creator_user_id === user?.id;
                  const isMirror = !!transaction.source_transaction_id;
                  // Dono ou criador pode editar (exceto mirrors) e excluir
                  const canEdit = (isOwner || isCreator) && !isMirror;
                  const canDelete = isOwner || isCreator;
                  const payerInfo = getPayerInfo(transaction);
                  const pending = hasPendingSplits(transaction);
                  const settled = isFullySettled(transaction);
                  
                  return (
                    <div
                      key={transaction.id}
                      className={cn(
                        "group flex items-center justify-between py-4 px-4 hover:bg-muted/30 transition-colors cursor-pointer",
                        index !== group.transactions.length - 1 && "border-b border-border"
                      )}
                      onClick={() => setDetailsTransaction(transaction)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0",
                          transaction.type === "INCOME" ? "bg-positive/10" : "bg-muted"
                        )}>
                          {transaction.category?.icon || (transaction.type === "INCOME" ? "💰" : "💸")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{transaction.description}</p>
                            {transaction.is_shared && (
                              <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-medium">
                                Compartilhado
                              </span>
                            )}
                            {isMirror && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                <Lock className="h-3 w-3" />
                                Espelhada
                              </span>
                            )}
                            {creatorName && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                                <User className="h-3 w-3" />
                                {creatorName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap mt-0.5">
                            <span className="truncate">{transaction.category?.name || "Sem categoria"}</span>
                            {transaction.account?.name && (
                              <>
                                <span>·</span>
                                <span className="truncate">{transaction.account.name}</span>
                              </>
                            )}
                            {transaction.is_installment && transaction.current_installment && transaction.total_installments && (
                              <>
                                <span>·</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-medium">
                                  {transaction.current_installment}/{transaction.total_installments}
                                </span>
                              </>
                            )}
                            {transaction.is_shared && (
                              <>
                                <span>·</span>
                                <span className={cn(
                                  "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium",
                                  settled 
                                    ? "bg-positive/10 text-positive" 
                                    : pending 
                                      ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                                      : "bg-muted"
                                )}>
                                  {settled ? (
                                    <><CheckCircle className="h-3 w-3" /> Acertado</>
                                  ) : pending ? (
                                    <><Clock className="h-3 w-3" /> Pendente</>
                                  ) : (
                                    <><Users className="h-3 w-3" /> Dividido</>
                                  )}
                                </span>
                              </>
                            )}
                            {payerInfo && (
                              <>
                                <span>·</span>
                                <span className={cn(
                                  "text-xs px-1.5 py-0.5 rounded font-medium",
                                  payerInfo.isMe 
                                    ? "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400"
                                    : "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400"
                                )}>
                                  {payerInfo.label}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn(
                            "font-mono font-medium text-right",
                            transaction.type === "INCOME" ? "text-positive" : "text-negative"
                          )}>
                            {transaction.type === "INCOME" ? "+" : "-"}
                            {formatCurrency(Number(transaction.amount), transaction.account?.currency || transaction.currency || "BRL")}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            transaction.type === "INCOME" ? "text-positive" : "text-negative"
                          )}>
                            {transaction.type === "INCOME" ? "Crédito" : "Débito"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          {/* Botão Confirmar Ressarcimento - apenas para compartilhadas pendentes que eu paguei */}
                          {transaction.is_shared && pending && (isOwner || isCreator) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-positive hover:text-positive"
                              onClick={() => setSettlementTransaction(transaction)}
                              title="Confirmar ressarcimento"
                            >
                              <HandCoins className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Botão Adiantar - apenas para parcelas */}
                          {transaction.is_installment && transaction.series_id && canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-600"
                              onClick={() => handleAdvance(transaction)}
                              title="Adiantar parcelas"
                            >
                              <FastForward className="h-4 w-4" />
                            </Button>
                          )}
                          {canEdit && !isMirror && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary"
                              onClick={() => handleEdit(transaction)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                // Se é parcela, perguntar se quer excluir série
                                if (transaction.is_installment && transaction.series_id) {
                                  setDeleteSeriesId(transaction.series_id);
                                } else {
                                  setDeleteId(transaction.id);
                                }
                              }}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {!canEdit && !canDelete && (
                            <div className="h-8 w-8 flex items-center justify-center text-muted-foreground" title="Somente leitura">
                              <Lock className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Single Transaction Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Installment Series Confirmation */}
      <AlertDialog open={!!deleteSeriesId} onOpenChange={() => setDeleteSeriesId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir parcelas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta é uma transação parcelada. Deseja excluir toda a série de parcelas?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSeries} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir toda a série
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Advance Installments Dialog */}
      <AdvanceInstallmentsDialog
        open={!!advanceSeriesId}
        onOpenChange={(open) => {
          if (!open) {
            setAdvanceSeriesId(null);
            setAdvanceDescription("");
          }
        }}
        seriesId={advanceSeriesId || ""}
        transactionDescription={advanceDescription}
      />

      {/* Settlement Confirm Dialog */}
      <SettlementConfirmDialog
        open={!!settlementTransaction}
        onOpenChange={(open) => {
          if (!open) setSettlementTransaction(null);
        }}
        transactionId={settlementTransaction?.id || ""}
        transactionDescription={settlementTransaction?.description || ""}
        transactionAmount={Number(settlementTransaction?.amount) || 0}
        splits={settlementTransaction?.transaction_splits || []}
      />

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        open={!!detailsTransaction}
        onOpenChange={(open) => {
          if (!open) setDetailsTransaction(null);
        }}
        transaction={detailsTransaction}
        onEdit={() => {
          if (detailsTransaction) {
            handleEdit(detailsTransaction);
          }
        }}
        onDelete={() => {
          if (detailsTransaction) {
            if (detailsTransaction.is_installment && detailsTransaction.series_id) {
              setDeleteSeriesId(detailsTransaction.series_id);
            } else {
              setDeleteId(detailsTransaction.id);
            }
          }
        }}
        onAdvance={() => {
          if (detailsTransaction) {
            handleAdvance(detailsTransaction);
          }
        }}
        onSettlement={() => {
          if (detailsTransaction) {
            setSettlementTransaction(detailsTransaction);
          }
        }}
      />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null);
        }}
        initialData={editingTransaction}
      />
    </div>
  );
}
