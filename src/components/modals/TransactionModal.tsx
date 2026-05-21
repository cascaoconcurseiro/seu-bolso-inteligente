
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useTransactionModal } from '@/contexts/TransactionModalContext';

interface TransactionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialData?: unknown;
}

export function TransactionModal({ 
  isOpen, 
  onClose, 
  open, 
  onOpenChange, 
  initialData 
}: TransactionModalProps) {
  const { transactionContext } = useTransactionModal();
  
  const actualOpen = open !== undefined ? open : isOpen;
  const actualClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };
  
  return (
    <Dialog open={actualOpen} onOpenChange={actualClose}>
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
