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
      <DialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-lg !rounded-b-none sm:!rounded-b-lg p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background pb-[env(safe-area-inset-bottom)] overflow-hidden pb-[env(safe-area-inset-bottom)]">
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-2 bg-muted rounded-full" />
        </div>
        <DialogHeader className="px-6 pt-2 pb-2 text-left shrink-0">
          <DialogTitle>Adicionar Participante</DialogTitle>
          <DialogDescription>Selecione um membro da família</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 overflow-y-auto hide-scrollbar space-y-2 mt-2">
          {availableMembers.length === 0 ? (
            <div className="py-8 text-center bg-muted/20 rounded-xl border border-border/50">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Nenhum membro disponível</p>
              <p className="text-sm text-muted-foreground mb-4">
                Todos os membros da família já estão nesta viagem.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                className="rounded-xl"
                onClick={onNavigateToFamily}
              >
                Adicionar Novos Membros
              </Button>
            </div>
          ) : (
            availableMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => onAdd(member)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {getInitials(member.name)}
                  </div>
                  <span className="font-medium text-sm">{member.name}</span>
                </div>
              </div>
            ))
          )}
          <div className="pt-2">
            <Button variant="outline" className="w-full rounded-xl" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
