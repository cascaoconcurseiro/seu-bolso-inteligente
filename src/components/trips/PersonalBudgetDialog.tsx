import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PersonalBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBudget: number | null;
  tripName: string;
  onSubmit: (budget: number) => void;
  isLoading: boolean;
  required?: boolean; // Novo: indica se é obrigatório
}

export function PersonalBudgetDialog({
  open,
  onOpenChange,
  currentBudget,
  tripName,
  onSubmit,
  isLoading,
  required = false,
}: PersonalBudgetDialogProps) {
  const [budget, setBudget] = useState("");

  useEffect(() => {
    if (currentBudget) {
      setBudget(currentBudget.toString());
    }
  }, [currentBudget]);

  const handleSubmit = () => {
    const value = parseFloat(budget);
    if (value > 0) {
      onSubmit(value);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Se é obrigatório e está tentando fechar sem definir orçamento, impedir
    if (required && !newOpen && (!budget || parseFloat(budget) <= 0)) {
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={required ? "pointer-events-auto" : ""}>
        <DialogHeader>
          <DialogTitle>
            {required ? "Defina seu Orçamento Pessoal" : "Meu Orçamento Pessoal"}
          </DialogTitle>
          <DialogDescription>
            {required ? (
              <>
                Para participar de "{tripName}", você precisa definir seu orçamento pessoal.
                <span className="block mt-2 text-sm font-medium text-foreground">
                  Este valor é privado e não será compartilhado com outros participantes.
                </span>
              </>
            ) : (
              `Defina quanto você pretende gastar em "${tripName}"`
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Orçamento Pessoal {required && <span className="text-destructive">*</span>}</Label>
            <CurrencyInput
              placeholder="1000"
              value={budget}
              onChange={setBudget}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Este é o seu orçamento individual para a viagem. Não afeta o orçamento geral.
            </p>
            {required && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Você precisa definir um orçamento para continuar.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          {!required && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !budget || parseFloat(budget) <= 0}
            className="flex-1"
          >
            {isLoading ? "Salvando..." : required ? "Confirmar e Continuar" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
