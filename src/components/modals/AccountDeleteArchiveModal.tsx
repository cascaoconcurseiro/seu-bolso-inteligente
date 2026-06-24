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
      <DialogContent className="max-w-md w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background pb-[env(safe-area-inset-bottom)] overflow-hidden pb-[env(safe-area-inset-bottom)]">
        <DialogHeader className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
          <DialogTitle>Remover conta "{accountName}"?</DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p className="text-sm">Escolha como deseja remover esta conta:</p>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-accent/20 bg-accent/5 dark:bg-accent/10">
                <div className="flex items-start gap-3">
                  <Archive className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <p className="font-medium text-sm text-accent">
                      Arquivar (Recomendado)
                    </p>
                    <p className="text-sm text-accent/80">
                      • A conta não aparecerá mais nos formulários
                      <br />
                      • Todas as transações serão preservadas
                      <br />• Histórico mantido para relatórios
                    </p>
                  </div>
                </div>
              </div>
              {canDelete && (
                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/8">
                  <div className="flex items-start gap-3">
                    <Trash2 className="h-5 w-5 text-destructive dark:text-destructive mt-0.5 shrink-0" />
                    <div className="space-y-2">
                      <p className="font-medium text-sm text-destructive">
                        Excluir Permanentemente
                      </p>
                      <p className="text-sm text-destructive dark:text-destructive">
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
        <DialogFooter className="flex-col sm:flex-row gap-2 px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
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
            className="w-full sm:w-auto gap-2 border-accent/20 text-accent hover:bg-accent/5 dark:hover:bg-accent/10"
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
