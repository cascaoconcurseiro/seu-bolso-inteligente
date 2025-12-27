import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

export function PersonalBudgetDialog({
  open,
  onOpenChange,
  currentBudget,
  tripName,
  onSubmit,
  isLoading,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meu Orçamento Pessoal</DialogTitle>
          <DialogDescription>
            Defina quanto você pretende gastar em "{tripName}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Orçamento Pessoal</Label>
            <Input
              type="number"
              placeholder="1000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Este é o seu orçamento individual para a viagem. Não afeta o orçamento geral.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !budget || parseFloat(budget) <= 0}
          >
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
