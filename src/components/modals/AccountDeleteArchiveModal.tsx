import { Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AccountDeleteArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onArchive: () => void;
  onDelete?: () => void;
  accountName: string;
  canDelete: boolean;
}

export function AccountDeleteArchiveModal({
  isOpen,
  onClose,
  onArchive,
  onDelete,
  accountName,
  canDelete,
}: AccountDeleteArchiveModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
        <DialogHeader>
          <DialogTitle>Remover conta "{accountName}"?</DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p className="text-sm">Escolha como deseja remover esta conta:</p>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-start gap-3">
                  <Archive className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                      Arquivar (Recomendado)
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      • A conta não aparecerá mais nos formulários
                      <br />
                      • Todas as transações serão preservadas
                      <br />• Histórico mantido para relatórios
                    </p>
                  </div>
                </div>
              </div>
              {canDelete && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-start gap-3">
                    <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <div className="space-y-2">
                      <p className="font-medium text-sm text-red-900 dark:text-red-100">
                        Excluir Permanentemente
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        • A conta será removida do sistema
                        <br />
                        • Todas as transações serão deletadas
                        <br />• Esta ação não pode ser desfeita
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              onArchive();
            }}
            className="w-full sm:w-auto gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/20"
          >
            <Archive className="h-4 w-4" /> Arquivar
          </Button>
          {canDelete && onDelete && (
            <Button
              variant="destructive"
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="w-full sm:w-auto gap-2"
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
