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
import { Input } from "@/components/ui/input";
import { InvoiceItem } from "@/utils/sharedFinanceCalculations";
import { sheetDialogCn } from "@/lib/dialog-variants";

interface SharedExpensesDialogsProps {
  undoConfirm: { isOpen: boolean; item: InvoiceItem | null };
  setUndoConfirm: (val: { isOpen: boolean; item: InvoiceItem | null }) => void;
  deleteConfirm: { isOpen: boolean; item: InvoiceItem | null };
  setDeleteConfirm: (val: { isOpen: boolean; item: InvoiceItem | null }) => void;
  deleteSeriesConfirm: { isOpen: boolean; item: InvoiceItem | null };
  setDeleteSeriesConfirm: (val: { isOpen: boolean; item: InvoiceItem | null }) => void;
  undoAllConfirm: boolean;
  setUndoAllConfirm: (val: boolean) => void;
  rejectDialog: { isOpen: boolean; item: InvoiceItem | null; reason: string };
  setRejectDialog: (val: { isOpen: boolean; item: InvoiceItem | null; reason: string }) => void;
  isUndoingAll: boolean;
  
  handleUndoSettlement: () => void;
  handleDeleteTransaction: () => void;
  handleDeleteSeries: () => void;
  handleUndoAll: () => void;
  handleRejectSettlement: (item: InvoiceItem, reason: string) => void;
  handleRejectDebtorSettlement: (items: InvoiceItem[], reason: string) => void;
}

export function SharedExpensesDialogs({
  undoConfirm,
  setUndoConfirm,
  deleteConfirm,
  setDeleteConfirm,
  deleteSeriesConfirm,
  setDeleteSeriesConfirm,
  undoAllConfirm,
  setUndoAllConfirm,
  rejectDialog,
  setRejectDialog,
  isUndoingAll,
  handleUndoSettlement,
  handleDeleteTransaction,
  handleDeleteSeries,
  handleUndoAll,
  handleRejectSettlement,
  handleRejectDebtorSettlement,
}: SharedExpensesDialogsProps) {
  return (
    <>
      <AlertDialog
        open={undoConfirm.isOpen}
        onOpenChange={(o) => !o && setUndoConfirm({ isOpen: false, item: null })}
      >
        <AlertDialogContent className={`max-w-md border-border/50 ${sheetDialogCn}`}>
          <AlertDialogHeader className="px-5 pt-5 pb-2 sm:px-6 sm:pt-6">
            <AlertDialogTitle>Desfazer Acerto</AlertDialogTitle>
            <AlertDialogDescription>
              O item voltará para pendente e precisará ser acertado novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUndoSettlement}>Desfazer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(o) => !o && setDeleteConfirm({ isOpen: false, item: null })}
      >
        <AlertDialogContent className={`max-w-md border-border/50 ${sheetDialogCn}`}>
          <AlertDialogHeader className="px-5 pt-5 pb-2 sm:px-6 sm:pt-6">
            <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
            <AlertDialogDescription>
              Esta transação será removida permanentemente. Os splits associados também serão
              excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteSeriesConfirm.isOpen}
        onOpenChange={(o) => !o && setDeleteSeriesConfirm({ isOpen: false, item: null })}
      >
        <AlertDialogContent className={`max-w-md border-border/50 ${sheetDialogCn}`}>
          <AlertDialogHeader className="px-5 pt-5 pb-2 sm:px-6 sm:pt-6">
            <AlertDialogTitle>Excluir Série</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as parcelas futuras desta série serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSeries} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={undoAllConfirm} onOpenChange={setUndoAllConfirm}>
        <AlertDialogContent className={`max-w-md border-border/50 ${sheetDialogCn}`}>
          <AlertDialogHeader className="px-5 pt-5 pb-2 sm:px-6 sm:pt-6">
            <AlertDialogTitle>Desfazer Tudo?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os acertos do mês atual voltarão para pendente. Esta ação pode ser refeita
              manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUndoAll}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isUndoingAll}
            >
              {isUndoingAll ? "..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={rejectDialog.isOpen}
        onOpenChange={(o) => setRejectDialog({ ...rejectDialog, isOpen: o })}
      >
        <AlertDialogContent className={`max-w-md border-border/50 ${sheetDialogCn}`}>
          <AlertDialogHeader className="px-5 pt-5 pb-2 sm:px-6 sm:pt-6">
            <AlertDialogTitle>Recusar Acerto</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              Informe o motivo da recusa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-5 sm:px-6 py-4 space-y-2">
            <Label>Motivo</Label>
            <Input
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
            />
          </div>
          <AlertDialogFooter className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (rejectDialog.item) {
                  if (rejectDialog.item.settledByCreditor && !rejectDialog.item.settledByDebtor) {
                    handleRejectDebtorSettlement([rejectDialog.item], rejectDialog.reason);
                  } else {
                    handleRejectSettlement(rejectDialog.item, rejectDialog.reason);
                  }
                }
              }}
            >
              Recusar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
