import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TransactionWarningDialogProps {
  open: boolean;
  warnings: string[];
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onContinue: () => void | Promise<void>;
}

export function TransactionWarningDialog({
  open,
  warnings,
  onOpenChange,
  onCancel,
  onContinue,
}: TransactionWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-left">
          <div
            className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-warning/12"
            aria-hidden="true"
          >
            <BellRing className="h-5 w-5 text-warning" />
          </div>
          <DialogTitle>Atenção</DialogTitle>
          <DialogDescription>Detectamos avisos. Revise antes de continuar.</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-2 pl-5 text-sm text-warning">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
        <DialogFooter className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onContinue}>Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
