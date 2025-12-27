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
  DialogFooter,
} from "@/components/ui/dialog";
import { useFamilyMembers } from "@/hooks/useFamily";
import { Users, Calendar } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

const CURRENCIES = [
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro' },
  { code: 'USD', symbol: '$', name: 'Dólar Americano' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'Libra Esterlina' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno' },
  { code: 'UYU', symbol: '$', name: 'Peso Uruguaio' },
  { code: 'PYG', symbol: '₲', name: 'Guarani Paraguaio' },
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
  currency = 'BRL',
  setCurrency,
}: NewTripDialogProps) {
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
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const days = differenceInDays(end, start) + 1; // +1 para incluir o último dia
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
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Viagem</DialogTitle>
          <DialogDescription>Crie uma viagem para organizar despesas</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input 
              placeholder="Ex: Férias de Verão" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Destino</Label>
            <Input 
              placeholder="Ex: Rio de Janeiro, RJ" 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Início</Label>
              <Input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate} // Não permitir data anterior ao início
              />
            </div>
          </div>
          
          {/* Mostrar número de dias */}
          {tripDays && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/50 p-3 rounded-lg">
              <Calendar className="h-4 w-4" />
              <span>
                {tripDays} {tripDays === 1 ? 'dia' : 'dias'} de viagem
              </span>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Orçamento (opcional)</Label>
            <Input 
              placeholder="5000" 
              value={budget}
              onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          {/* Seleção de membros da família */}
          {familyMembers.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label>Convidar Participantes (opcional)</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Selecione membros da família para convidar para esta viagem. 
                Eles receberão uma notificação e poderão aceitar ou recusar o convite.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {familyMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-3 p-2 hover:bg-accent rounded-md cursor-pointer"
                    onClick={() => toggleMember(member.linked_user_id!)}
                  >
                    <Checkbox
                      checked={selectedMembers.includes(member.linked_user_id!)}
                      onCheckedChange={() => toggleMember(member.linked_user_id!)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{member.name}</p>
                      {member.email && (
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {selectedMembers.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedMembers.length} {selectedMembers.length === 1 ? 'convite será enviado' : 'convites serão enviados'}
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !name || !startDate || !endDate}
          >
            {isLoading ? "Criando..." : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
