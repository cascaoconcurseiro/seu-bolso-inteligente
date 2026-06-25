import { useState } from "react";
import { sheetDialogCn } from "@/lib/dialog-variants";
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
      <AlertDialogContent className={`max-w-md border-border/50 ${sheetDialogCn}`}>
        <AlertDialogHeader className="px-5 pt-5 pb-2 sm:px-6 sm:pt-6">
          <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir "{transaction.description}"?
            {!transaction.is_installment && " Esta ação não pode ser desfeita."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {transaction.is_installment && (
          <div className="py-2 px-5 sm:px-6 space-y-3">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Opções de Exclusão (Compra Parcelada):
              </h4>
              <div className="space-y-2">
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

            <div className="p-3 rounded-xl border border-warning/20 bg-warning/5 text-warning text-sm font-semibold leading-relaxed animate-in fade-in duration-350">
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

        <AlertDialogFooter className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
          <AlertDialogCancel onClick={() => setCascadeType('NONE')} disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            {isDeleting ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
