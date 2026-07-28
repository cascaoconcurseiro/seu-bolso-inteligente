/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Archive, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { banks, internationalBanks } from "@/lib/banks";

interface CardEditAndDeleteDialogsProps {
  showEditCardDialog: boolean;
  setShowEditCardDialog: (v: boolean) => void;
  editCardName: string;
  setEditCardName: (v: string) => void;
  editBankId: string;
  setEditBankId: (v: string) => void;
  editClosingDay: string;
  setEditClosingDay: (v: string) => void;
  editDueDay: string;
  setEditDueDay: (v: string) => void;
  editLimit: string;
  setEditLimit: (v: string) => void;
  editIsInternational: boolean;
  editCurrency: string;
  handleSaveEditCard: () => void;
  isUpdating: boolean;
  deleteCardConfirm: { isOpen: boolean; card: any | null };
  setDeleteCardConfirm: (v: { isOpen: boolean; card: any | null }) => void;
  archiveAccountMutation: any;
  deleteAccountMutation: any;
  deleteCardCanDelete: boolean;
  setView: (v: "list" | "detail") => void;
  refetchAccounts: () => void;
}

export function CardEditAndDeleteDialogs({
  showEditCardDialog,
  setShowEditCardDialog,
  editCardName,
  setEditCardName,
  editBankId,
  setEditBankId,
  editClosingDay,
  setEditClosingDay,
  editDueDay,
  setEditDueDay,
  editLimit,
  setEditLimit,
  editIsInternational,
  editCurrency,
  handleSaveEditCard,
  isUpdating,
  deleteCardConfirm,
  setDeleteCardConfirm,
  archiveAccountMutation,
  deleteAccountMutation,
  deleteCardCanDelete,
  setView,
  refetchAccounts,
}: CardEditAndDeleteDialogsProps) {
  return (
    <>
      {/* Edit Card Dialog */}
      <Dialog open={showEditCardDialog} onOpenChange={setShowEditCardDialog}>
        <DialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
          <DialogHeader>
            <DialogTitle>Editar Cartão de Crédito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Cartão</Label>
              <Input
                value={editCardName}
                onChange={(e) => setEditCardName(e.target.value)}
                placeholder="Ex: Nubank Roxo"
              />
            </div>
            <div className="space-y-2">
              <Label>Instituição Financeira</Label>
              <Select value={editBankId} onValueChange={setEditBankId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um banco" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <div className="p-2 text-xs font-bold text-muted-foreground uppercase">
                    Nacionais
                  </div>
                  {Object.values(banks).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                  <div className="p-2 text-xs font-bold text-muted-foreground uppercase border-t mt-1">
                    Internacionais
                  </div>
                  {Object.values(internationalBanks).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia de Fechamento</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={editClosingDay}
                  onChange={(e) => setEditClosingDay(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Dia de Vencimento</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={editDueDay}
                  onChange={(e) => setEditDueDay(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Limite de Crédito Total</Label>
              <CurrencyInput
                value={editLimit}
                onChange={setEditLimit}
                currency={editIsInternational ? editCurrency : "BRL"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditCardDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEditCard} disabled={isUpdating}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete / Archive Card Confirm Dialog */}
      <AlertDialog
        open={deleteCardConfirm.isOpen}
        onOpenChange={(open) => !open && setDeleteCardConfirm({ isOpen: false, card: null })}
      >
        <AlertDialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cartão "{deleteCardConfirm.card?.name}"?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              className="justify-start gap-3"
              onClick={async () => {
                if (deleteCardConfirm.card) {
                  try {
                    await archiveAccountMutation.mutateAsync(deleteCardConfirm.card.id);
                  } catch {
                    /* onError do hook já trata */
                  }
                  setDeleteCardConfirm({ isOpen: false, card: null });
                }
              }}
            >
              <Archive className="h-4 w-4" /> Arquivar (Recomendado)
            </Button>
            {deleteCardCanDelete && (
              <Button
                variant="destructive"
                className="justify-start gap-3"
                onClick={async () => {
                  if (deleteCardConfirm.card) {
                    try {
                      await deleteAccountMutation.mutateAsync(deleteCardConfirm.card.id);
                    } catch {
                      /* onError do hook já trata */
                    }
                    setDeleteCardConfirm({ isOpen: false, card: null });
                    setView("list");
                    refetchAccounts();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" /> Excluir Permanentemente
              </Button>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
