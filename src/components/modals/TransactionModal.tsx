import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useTransactionModal } from '@/contexts/TransactionModalContext';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
}

export function TransactionModal({ isOpen, onClose, initialData }: TransactionModalProps) {
  const { transactionContext } = useTransactionModal();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>
            {initialData ? 'Editar Transação' : 'Nova Transação'}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <TransactionForm 
            initialData={initialData}
            context={transactionContext}
            onSuccess={onClose}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
