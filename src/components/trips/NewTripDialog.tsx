import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/dialog";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Calendar, Loader2 } from "lucide-react";
import * as dateFns from "date-fns";
import { CurrencyInput } from "@/components/ui/currency-input";

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

interface NewTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (selectedMemberIds: string[]) => void;
  isLoading: boolean;
  name: string;
  setName: (v: string) => void;
  destination: string;
  setDestination: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  budget: string;
  setBudget: (v: string) => void;
  currency?: string;
  setCurrency?: (v: string) => void;
}

export function NewTripDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  name,
  setName,
  destination,
  setDestination,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  budget,
  setBudget,
  currency = "BRL",
  setCurrency,
}: NewTripDialogProps) {
  const { user } = useAuth();
  const { data: familyMembers = [] } = useFamilyMembers();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [localCurrency, setLocalCurrency] = useState(currency);

  const handleCurrencyChange = (value: string) => {
    setLocalCurrency(value);
    if (setCurrency) setCurrency(value);
  };

  // Calcular número de dias
  const tripDays = useMemo(() => {
    if (!startDate || !endDate) return null;
    try {
      const start = dateFns.parseISO(startDate);
      const end = dateFns.parseISO(endDate);
      const days = dateFns.differenceInDays(end, start) + 1; // +1 para incluir o último dia
      return days > 0 ? days : null;
    } catch {
      return null;
    }
  }, [startDate, endDate]);

  const handleSubmit = () => {
    onSubmit(selectedMembers);
    setSelectedMembers([]); // Reset selection
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-lg !rounded-b-none sm:!rounded-b-lg p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background pb-[env(safe-area-inset-bottom)] overflow-hidden pb-[env(safe-area-inset-bottom)]">
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-2 bg-muted rounded-full" />
        </div>
        <DialogHeader className="px-6 pt-2 pb-2 text-left shrink-0">
          <DialogTitle>Nova Viagem</DialogTitle>
          <DialogDescription>Crie uma viagem para organizar despesas</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 overflow-y-auto hide-scrollbar space-y-4">
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
                min={startDate} // Não permitir data anterior ao início
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Mostrar número de dias */}
          {tripDays && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/50 p-3 rounded-xl border border-border/50">
              <Calendar className="h-4 w-4" />
              <span>
                {tripDays} {tripDays === 1 ? "dia" : "dias"} de viagem
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={localCurrency} onValueChange={handleCurrencyChange}>
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
              <Label>
                Orçamento Total
                <span className="ml-1 text-sm text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <CurrencyInput
                placeholder="5000"
                value={budget}
                onChange={setBudget}
                currency={localCurrency}
              />
            </div>
          </div>

          {/* Seleção de membros da família */}
          {familyMembers.length > 0 && (
            <div className="space-y-3 pt-4 mt-2 border-t">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label>Convidar Participantes (opcional)</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Selecione membros da família para convidar. Eles poderão aceitar ou recusar.
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto hide-scrollbar border rounded-xl p-3 bg-muted/20">
                {familyMembers
                  .filter((member) => member.linked_user_id) // Apenas membros cadastrados
                  .filter((member) => member.linked_user_id !== user?.id) // Excluir o criador da viagem
                  .map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-3 p-2 hover:bg-accent rounded-lg cursor-pointer"
                      onClick={() => toggleMember(member.linked_user_id!)}
                    >
                      <Checkbox
                        checked={selectedMembers.includes(member.linked_user_id!)}
                        className="pointer-events-none rounded-md"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{member.name}</p>
                        {member.email && (
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              {selectedMembers.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedMembers.length}{" "}
                  {selectedMembers.length === 1
                    ? "convite será enviado"
                    : "convites serão enviados"}
                </p>
              )}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 rounded-xl font-bold"
              onClick={handleSubmit}
              disabled={isLoading || !destination || !startDate || !endDate}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Viagem"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
