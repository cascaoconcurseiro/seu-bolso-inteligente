import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FastForward, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFutureInstallments, useAdvanceInstallments } from "@/hooks/useInstallments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdvanceInstallmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesId: string;
  transactionDescription: string;
}

export function AdvanceInstallmentsDialog({
  open,
  onOpenChange,
  seriesId,
  transactionDescription,
}: AdvanceInstallmentsDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const { data: futureInstallments = [], isLoading } = useFutureInstallments(seriesId);
  const advanceInstallments = useAdvanceInstallments();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCompetence = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  const handleToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === futureInstallments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(futureInstallments.map(i => i.id));
    }
  };

  const handleAdvance = async () => {
    if (selectedIds.length === 0) return;
    
    await advanceInstallments.mutateAsync(selectedIds);
    setSelectedIds([]);
    onOpenChange(false);
  };

  const totalToAdvance = futureInstallments
    .filter(i => selectedIds.includes(i.id))
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FastForward className="h-5 w-5 text-primary" />
            Adiantar Parcelas
          </DialogTitle>
          <DialogDescription>
            Selecione as parcelas que deseja adiantar para este mês.
            <br />
            <span className="font-medium text-foreground">{transactionDescription}</span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : futureInstallments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Não há parcelas futuras para adiantar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Select All */}
            <div className="flex items-center justify-between pb-2 border-b">
              <label className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.length === futureInstallments.length}
                  onCheckedChange={handleSelectAll}
                />
                Selecionar todas
              </label>
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} de {futureInstallments.length}
              </span>
            </div>

            {/* Installments List */}
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {futureInstallments.map((installment) => (
                <div
                  key={installment.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedIds.includes(installment.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                  onClick={() => handleToggle(installment.id)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedIds.includes(installment.id)}
                      onCheckedChange={() => handleToggle(installment.id)}
                    />
                    <div>
                      <p className="font-medium text-sm">
                        Parcela {installment.current_installment}/{installment.total_installments}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCompetence(installment.competence_date)}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-medium">
                    {formatCurrency(Number(installment.amount))}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            {selectedIds.length > 0 && (
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-sm font-medium">Total a adiantar:</span>
                <span className="font-mono font-bold text-lg text-primary">
                  {formatCurrency(totalToAdvance)}
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAdvance}
            disabled={selectedIds.length === 0 || advanceInstallments.isPending}
            className="gap-2"
          >
            {advanceInstallments.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FastForward className="h-4 w-4" />
            )}
            Adiantar {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
