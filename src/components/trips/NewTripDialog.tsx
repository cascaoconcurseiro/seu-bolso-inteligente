import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFamilyMembers } from "@/hooks/useFamily";
import { Users } from "lucide-react";

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
}: NewTripDialogProps) {
  const { data: familyMembers = [] } = useFamilyMembers();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

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
              />
            </div>
          </div>
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
                <Label>Participantes da Viagem (opcional)</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Selecione membros da família que participarão desta viagem. 
                Eles poderão ver e gerenciar gastos, mas não poderão alterar nome, período ou moeda.
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
                  {selectedMembers.length} {selectedMembers.length === 1 ? 'membro selecionado' : 'membros selecionados'}
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
