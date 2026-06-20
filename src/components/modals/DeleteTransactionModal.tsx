import { useState } from "react";
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

import { Label } from "@/components/ui/label";
import { Transaction } from "@/types";
import { moneyUtils } from "@/utils/money";

export type CascadeDeleteType = 'NONE' | 'NEXT' | 'ALL';

interface DeleteTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cascadeType: CascadeDeleteType) => void;
  transaction: Transaction | null;
  isDeleting?: boolean;
}

export function DeleteTransactionModal({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  isDeleting = false
}: DeleteTransactionModalProps) {
  const [cascadeType, setCascadeType] = useState<CascadeDeleteType>('NONE');

  if (!transaction) return null;

  const handleConfirm = () => {
    // Se não for parcela, o cascadeType deve ser NONE
    onConfirm(transaction.is_installment ? cascadeType : 'NONE');
  };

  // Reseta o estado quando abre para uma nova transação
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setCascadeType('NONE');
    }
  };

  const currentInst = transaction.current_installment || 1;
  const totalInst = transaction.total_installments || 1;
  const remainingInstallments = totalInst - currentInst + 1;
  const itemAmount = Number(transaction.amount || 0);
  const remainingValue = itemAmount * remainingInstallments;
  const totalValue = itemAmount * totalInst;
  const txCurrency = transaction.currency || "BRL";

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="backdrop-blur-md bg-background/95 border border-border/50 max-w-md shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir "{transaction.description}"?
            {!transaction.is_installment && " Esta ação não pode ser desfeita."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {transaction.is_installment && (
          <div className="py-2 space-y-4">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Opções de Exclusão (Compra Parcelada):
              </h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    name="cascade" 
                    value="NONE" 
                    id="delete-none" 
                    checked={cascadeType === 'NONE'}
                    onChange={() => setCascadeType('NONE')}
                    className="w-4 h-4 text-primary border-muted-foreground focus:ring-primary" 
                  />
                  <Label htmlFor="delete-none" className="font-normal cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                    Apenas esta parcela ({transaction.current_installment}/{transaction.total_installments})
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    name="cascade" 
                    value="NEXT" 
                    id="delete-next" 
                    checked={cascadeType === 'NEXT'}
                    onChange={() => setCascadeType('NEXT')}
                    className="w-4 h-4 text-primary border-muted-foreground focus:ring-primary" 
                  />
                  <Label htmlFor="delete-next" className="font-normal cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                    Esta e as próximas parcelas da série
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    name="cascade" 
                    value="ALL" 
                    id="delete-all" 
                    checked={cascadeType === 'ALL'}
                    onChange={() => setCascadeType('ALL')}
                    className="w-4 h-4 text-destructive border-muted-foreground focus:ring-destructive" 
                  />
                  <Label htmlFor="delete-all" className="font-normal cursor-pointer text-destructive">
                    Todas as parcelas desta compra
                  </Label>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-orange-500/20 bg-orange-500/5 text-orange-600 dark:text-orange-400 text-xs font-semibold leading-relaxed animate-in fade-in duration-350">
              {cascadeType === 'NONE' && (
                <p>⚠️ Esta ação removerá apenas a parcela atual de {moneyUtils.format(itemAmount, txCurrency)} no extrato.</p>
              )}
              {cascadeType === 'NEXT' && (
                <p>⚠️ Esta ação removerá {remainingInstallments} parcelas futuras, reduzindo {moneyUtils.format(remainingValue, txCurrency)} do seu planejamento futuro.</p>
              )}
              {cascadeType === 'ALL' && (
                <p>⚠️ Esta ação removerá TODAS as {totalInst} parcelas, limpando o total de {moneyUtils.format(totalValue, txCurrency)} do seu extrato histórico e futuro.</p>
              )}
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setCascadeType('NONE')} disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            {isDeleting ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
