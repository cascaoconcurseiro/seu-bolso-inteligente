
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useTransactionModal } from '@/contexts/TransactionModalContext';
import { haptics } from '@/utils/haptics';

interface TransactionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialData?: any;
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
  
  const handleSuccess = () => {
    haptics.success();
    actualClose();
  };
  
  return (
    <Dialog open={actualOpen} onOpenChange={actualClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] rounded-b-none sm:rounded-xl transition-transform duration-500 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-2xl">
        <div className="w-full flex justify-center pt-3 sm:hidden">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>
        <DialogHeader className="px-6 pt-4 sm:pt-6 pb-0">
          <DialogTitle className="font-display text-xl sm:text-2xl">
            Nova Transação
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <TransactionForm 
            context={transactionContext}
            onSuccess={handleSuccess}
            onCancel={actualClose}
            initialData={initialData}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
