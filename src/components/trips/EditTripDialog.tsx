import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trip } from "@/hooks/useTrips";
import { moneyUtils } from "@/utils/money";

const CURRENCIES = [
  { code: "BRL", symbol: "R$", name: "Real Brasileiro" },
  { code: "USD", symbol: "$", name: "Dólar Americano" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "Libra Esterlina" },
  { code: "ARS", symbol: "$", name: "Peso Argentino" },
  { code: "CLP", symbol: "$", name: "Peso Chileno" },
  { code: "UYU", symbol: "$", name: "Peso Uruguaio" },
  { code: "PYG", symbol: "₲", name: "Guarani Paraguaio" },
];

interface EditTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
  onSubmit: (data: {
    name: string;
    destination: string;
    start_date: string;
    end_date: string;
    currency: string;
    budget: number;
  }) => void;
  isLoading: boolean;
}

export function EditTripDialog({
  open,
  onOpenChange,
  trip,
  onSubmit,
  isLoading,
}: EditTripDialogProps) {
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [budget, setBudget] = useState("");

  // Preencher campos quando trip mudar
  useEffect(() => {
    if (trip) {
      setName(trip.name);
      setDestination(trip.destination || "");
      setStartDate(trip.start_date);
      setEndDate(trip.end_date);
      setCurrency(trip.currency);
      setBudget(trip.budget?.toString() || "");
    }
  }, [trip]);

  const handleSubmit = () => {
    onSubmit({
      name: destination, // Usar destino como nome
      destination,
      start_date: startDate,
      end_date: endDate,
      currency,
      budget: moneyUtils.parse(budget),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-lg !rounded-b-none sm:!rounded-b-lg p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background pb-[env(safe-area-inset-bottom)] overflow-hidden pb-[env(safe-area-inset-bottom)]">
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-2 bg-muted rounded-full" />
        </div>
        <DialogHeader className="px-6 pt-2 pb-2 text-left shrink-0">
          <DialogTitle>Editar Viagem</DialogTitle>
          <DialogDescription>Apenas o criador da viagem pode editar estes campos</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 hide-scrollbar">
          <div className="space-y-4 py-2">
            <div className="space-y-2 mt-2">
              <Label>Destino</Label>
              <Input
                placeholder="Ex: Rio de Janeiro, RJ"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Orçamento Geral</Label>
                <Input
                  placeholder="5000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé fixo */}
        <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-border bg-background">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-11 rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 h-11 rounded-xl font-bold"
            onClick={handleSubmit}
            disabled={isLoading || !destination || !startDate || !endDate || !budget}
          >
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
