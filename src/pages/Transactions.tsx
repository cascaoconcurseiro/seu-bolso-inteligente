import { useState, useEffect } from "react";
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
  Plus,
  Search,
  Filter,
  X,
  Loader2,
  Trash2,
  Edit,
  Lock,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransactions, useDeleteTransaction, TransactionType } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useTransactionPermissions } from "@/hooks/usePermissions";
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
import { FAB } from "@/components/ui/fab";

export function Transactions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const { user } = useAuth();
  const { data: transactions, isLoading } = useTransactions();
  const { data: categories } = useCategories();
  const { data: familyMembers = [] } = useFamilyMembers();
  const deleteTransaction = useDeleteTransaction();

  // Listen for global transaction modal event
  useEffect(() => {
    const handleOpenModal = () => setShowTransactionModal(true);
    window.addEventListener('openTransactionModal', handleOpenModal);
    return () => window.removeEventListener('openTransactionModal', handleOpenModal);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Math.abs(value));
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(date));
  };

  const filteredTransactions = (transactions || []).filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || t.type === selectedType;
    return matchesSearch && matchesType;
  });

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = filteredTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const hasFilters = selectedType !== "all";

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTransaction.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const getCreatorName = (creatorUserId: string | null) => {
    if (!creatorUserId) return null;
    if (creatorUserId === user?.id) return null; // É o próprio usuário
    
    const member = familyMembers.find(
      m => m.user_id === creatorUserId || m.linked_user_id === creatorUserId
    );
    return member?.name || 'Outro membro';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-3xl tracking-tight">Transações</h1>
        <p className="text-muted-foreground mt-1">{filteredTransactions.length} registros</p>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-8 py-4 border-y border-border">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Entradas</p>
          <p className="font-mono text-lg font-medium text-positive">{formatCurrency(totalIncome)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Saídas</p>
          <p className="font-mono text-lg font-medium text-negative">{formatCurrency(totalExpense)}</p>
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
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="INCOME">Receitas</SelectItem>
                  <SelectItem value="EXPENSE">Despesas</SelectItem>
                  <SelectItem value="TRANSFER">Transferências</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedType("all")}
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

      {/* Transaction List */}
      <div className="space-y-1">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">Nenhuma transação encontrada</p>
            <p className="text-sm text-muted-foreground mt-2">Use o botão "Nova transação" acima para começar</p>
          </div>
        ) : (
          filteredTransactions.map((transaction) => {
            const creatorName = getCreatorName(transaction.creator_user_id);
            const isCreator = transaction.creator_user_id === user?.id;
            const isMirror = !!transaction.source_transaction_id;
            const canEdit = isCreator || !isMirror;
            const canDelete = isCreator;
            
            return (
            <div
              key={transaction.id}
              className="group flex items-center justify-between py-4 border-b border-border last:border-0 
                         hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg shrink-0">
                  {transaction.category?.icon || (transaction.type === "INCOME" ? "💰" : transaction.type === "TRANSFER" ? "↔️" : "💸")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{transaction.description}</p>
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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                    <span className="truncate">{transaction.category?.name || (transaction.type === "TRANSFER" ? "Transferência" : "Sem categoria")}</span>
                    <span>·</span>
                    <span>{formatDate(transaction.date)}</span>
                    {transaction.is_installment && transaction.current_installment && transaction.total_installments && (
                      <>
                        <span>·</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                          {transaction.current_installment}/{transaction.total_installments}
                        </span>
                      </>
                    )}
                    {transaction.is_shared && (
                      <>
                        <span>·</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted">Dividido</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn(
                  "font-mono font-medium text-right",
                  transaction.type === "INCOME" ? "text-positive" : "text-foreground"
                )}>
                  {transaction.type === "INCOME" ? "+" : transaction.type === "EXPENSE" ? "-" : ""}
                  {formatCurrency(Number(transaction.amount))}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      onClick={() => setDeleteId(transaction.id)}
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
          )})
        )}
      </div>

      {/* Delete Confirmation */}
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
