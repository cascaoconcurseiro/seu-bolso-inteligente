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

export type CascadeDeleteType = 'NONE' | 'NEXT' | 'ALL';

interface DeleteTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cascadeType: CascadeDeleteType) => void;
  transaction: Transaction | null;
}

export function DeleteTransactionModal({
  isOpen,
  onClose,
  onConfirm,
  transaction
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

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir "{transaction.description}"?
            {!transaction.is_installment && " Esta ação não pode ser desfeita."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {transaction.is_installment && (
          <div className="py-4">
            <h4 className="text-sm font-medium mb-3 text-foreground">
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
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setCascadeType('NONE')}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
