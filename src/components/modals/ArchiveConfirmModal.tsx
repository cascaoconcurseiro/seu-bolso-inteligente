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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ArchiveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  isArchiving?: boolean;
}

export function ArchiveConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isArchiving = false,
}: ArchiveConfirmModalProps) {
  const [confirmText, setConfirmText] = useState("");

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setConfirmText("");
    }
  };

  const isConfirmed = confirmText.toLowerCase() === "confirmar";

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arquivar Item</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Tem certeza que deseja arquivar <strong>{itemName}</strong>?
            </p>
            <p>
              Itens arquivados não aparecem nos seus cálculos do mês atual, mas
              ainda podem ser acessados na seção de "Arquivados" no final da página.
            </p>
            
            <div className="space-y-2 mt-4 text-left">
              <Label htmlFor="confirm-archive" className="text-foreground font-semibold">
                Digite "confirmar" para prosseguir:
              </Label>
              <Input
                id="confirm-archive"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="confirmar"
                className="mt-2"
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isArchiving}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              if (!isConfirmed) {
                e.preventDefault();
                return;
              }
              onConfirm();
              setConfirmText("");
            }}
            disabled={!isConfirmed || isArchiving}
            className="bg-primary hover:bg-primary/90"
          >
            {isArchiving ? "Arquivando..." : "Arquivar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
