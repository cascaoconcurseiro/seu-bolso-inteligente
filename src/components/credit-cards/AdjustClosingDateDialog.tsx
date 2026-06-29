import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarClock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdjustClosingDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentClosingDate: Date;
  referenceDate: Date; // primeiro dia do mês de referência
  onSave: (newDate: string) => void;
}

export function AdjustClosingDateDialog({
  open,
  onOpenChange,
  currentClosingDate,
  referenceDate,
  onSave,
}: AdjustClosingDateDialogProps) {
  const [day, setDay] = useState(currentClosingDate.getDate().toString());

  const handleSave = () => {
    const d = parseInt(day, 10);
    if (d < 1 || d > 31) return;
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const maxDay = new Date(year, month + 1, 0).getDate();
    const actualDay = Math.min(d, maxDay);
    const newDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
    onSave(newDate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Ajustar Fechamento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Data atual: {format(currentClosingDate, "dd 'de' MMMM", { locale: ptBR })}
          </p>
          <div className="space-y-2">
            <Label>Novo dia de fechamento</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="font-mono text-lg"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Referente à fatura de {format(referenceDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
