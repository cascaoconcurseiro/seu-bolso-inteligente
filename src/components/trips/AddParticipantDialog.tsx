import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

interface AddParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableMembers: any[];
  onAdd: (member: any) => void;
  onNavigateToFamily: () => void;
  getInitials: (name: string) => string;
}

export function AddParticipantDialog({
  open,
  onOpenChange,
  availableMembers,
  onAdd,
  onNavigateToFamily,
  getInitials,
}: AddParticipantDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Participante</DialogTitle>
          <DialogDescription>Selecione um membro da família</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          {availableMembers.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Nenhum membro disponível</p>
              <p className="text-xs text-muted-foreground mb-4">
                Todos os membros da família já estão nesta viagem.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onNavigateToFamily}
              >
                Adicionar Novos Membros
              </Button>
            </div>
          ) : (
            availableMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-foreground/20 cursor-pointer transition-colors"
                onClick={() => onAdd(member)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium">
                    {getInitials(member.name)}
                  </div>
                  <span className="font-medium">{member.name}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
