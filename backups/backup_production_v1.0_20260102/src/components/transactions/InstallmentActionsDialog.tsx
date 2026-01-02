/**
 * Dialog para ações em parcelas de uma série
 * Permite editar ou excluir parcelas individuais ou toda a série
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import {
  useDeleteInstallmentSeries,
  useDeleteFutureInstallments,
  useUpdateInstallmentSeries,
} from "@/hooks/useTransactions";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category_id: string | null;
  series_id: string | null;
  current_installment: number | null;
  total_installments: number | null;
  is_installment: boolean;
  date: string;
}

interface InstallmentActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSuccess?: () => void;
}

type ActionType = "edit" | "delete";
type DeleteScope = "this" | "future" | "all";
type EditScope = "this" | "all";

export function InstallmentActionsDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: InstallmentActionsDialogProps) {
  const [actionType, setActionType] = useState<ActionType>("edit");
  const [deleteScope, setDeleteScope] = useState<DeleteScope>("this");
  const [editScope, setEditScope] = useState<EditScope>("this");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  // Form state para edição
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");

  const { data: categories = [] } = useCategories();
  const deleteSeriesMutation = useDeleteInstallmentSeries();
  const deleteFutureMutation = useDeleteFutureInstallments();
  const updateSeriesMutation = useUpdateInstallmentSeries();

  const isLoading = 
    deleteSeriesMutation.isPending || 
    deleteFutureMutation.isPending || 
    updateSeriesMutation.isPending;

  // Reset form quando abre o dialog
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && transaction) {
      setDescription(transaction.description);
      setCategoryId(transaction.category_id || "");
      setActionType("edit");
      setDeleteScope("this");
      setEditScope("this");
    }
    onOpenChange(newOpen);
  };

  const handleDelete = async () => {
    if (!transaction?.series_id) return;

    try {
      if (deleteScope === "all") {
        await deleteSeriesMutation.mutateAsync(transaction.series_id);
      } else if (deleteScope === "future") {
        await deleteFutureMutation.mutateAsync({
          seriesId: transaction.series_id,
          fromInstallment: transaction.current_installment || 1,
        });
      }
      // Para "this", seria necessário um hook específico para excluir uma única parcela
      // Por enquanto, vamos usar o delete normal

      setShowConfirmDelete(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao excluir parcelas:", error);
    }
  };

  const handleUpdate = async () => {
    if (!transaction?.series_id) return;

    try {
      if (editScope === "all") {
        await updateSeriesMutation.mutateAsync({
          seriesId: transaction.series_id,
          updates: {
            description: description.trim(),
            category_id: categoryId || null,
          },
        });
      }
      // Para "this", seria necessário um hook específico para editar uma única parcela

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao atualizar parcelas:", error);
    }
  };

  if (!transaction || !transaction.is_installment || !transaction.series_id) {
    return null;
  }

  const expenseCategories = categories.filter(c => c.type === "expense");
  const currentInstallment = transaction.current_installment || 1;
  const totalInstallments = transaction.total_installments || 1;
  const remainingInstallments = totalInstallments - currentInstallment + 1;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Parcelas</DialogTitle>
            <DialogDescription>
              Parcela {currentInstallment} de {totalInstallments} - {transaction.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Seleção de ação */}
            <div className="space-y-3">
              <Label>O que deseja fazer?</Label>
              <RadioGroup
                value={actionType}
                onValueChange={(v) => setActionType(v as ActionType)}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="edit" id="edit" />
                  <Label htmlFor="edit" className="flex items-center gap-2 cursor-pointer">
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="delete" id="delete" />
                  <Label htmlFor="delete" className="flex items-center gap-2 cursor-pointer text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Opções de edição */}
            {actionType === "edit" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Aplicar alterações em:</Label>
                  <RadioGroup
                    value={editScope}
                    onValueChange={(v) => setEditScope(v as EditScope)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="this" id="edit-this" disabled />
                      <Label htmlFor="edit-this" className="cursor-pointer text-muted-foreground">
                        Apenas esta parcela (em breve)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="edit-all" />
                      <Label htmlFor="edit-all" className="cursor-pointer">
                        Todas as {totalInstallments} parcelas da série
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição da transação"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
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
              </div>
            )}

            {/* Opções de exclusão */}
            {actionType === "delete" && (
              <div className="space-y-3">
                <Label>Excluir:</Label>
                <RadioGroup
                  value={deleteScope}
                  onValueChange={(v) => setDeleteScope(v as DeleteScope)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="this" id="delete-this" disabled />
                    <Label htmlFor="delete-this" className="cursor-pointer text-muted-foreground">
                      Apenas esta parcela (em breve)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="future" id="delete-future" />
                    <Label htmlFor="delete-future" className="cursor-pointer">
                      Esta e as próximas ({remainingInstallments} parcelas)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="delete-all" />
                    <Label htmlFor="delete-all" className="cursor-pointer">
                      Toda a série ({totalInstallments} parcelas)
                    </Label>
                  </div>
                </RadioGroup>

                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {deleteScope === "all" 
                        ? "Todas as parcelas serão excluídas permanentemente."
                        : `${remainingInstallments} parcela(s) serão excluídas.`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {actionType === "edit" ? (
              <Button 
                onClick={handleUpdate} 
                disabled={isLoading || editScope === "this"}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            ) : (
              <Button 
                variant="destructive" 
                onClick={() => setShowConfirmDelete(true)}
                disabled={deleteScope === "this"}
              >
                Excluir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteScope === "all" 
                ? `Tem certeza que deseja excluir todas as ${totalInstallments} parcelas desta série?`
                : `Tem certeza que deseja excluir ${remainingInstallments} parcela(s)?`}
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
