import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSharedContacts } from "@/hooks/useFamily";

interface AddParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableMembers: any[];
  onAdd: (member: any) => void;
  onAddGuest?: (guestName: string) => void;
  onNavigateToFamily: () => void;
  getInitials: (name: string) => string;
  currentParticipantNames?: string[];
}

export function AddParticipantDialog({
  open,
  onOpenChange,
  availableMembers,
  onAdd,
  onAddGuest,
  onNavigateToFamily,
  getInitials,
  currentParticipantNames = [],
}: AddParticipantDialogProps) {
  const [tab, setTab] = useState<'family' | 'contacts' | 'guest'>('family');
  const [guestName, setGuestName] = useState('');
  const { data: contacts = [] } = useSharedContacts();

  // Filter out contacts already in the trip
  const availableContacts = contacts.filter(
    c => !currentParticipantNames.includes(c.name)
  );

  const handleAddGuest = () => {
    if (!guestName.trim()) return;
    onAddGuest?.(guestName.trim());
    setGuestName('');
    onOpenChange(false);
  };

  const handleAddContact = (contact: any) => {
    onAddGuest?.(contact.name);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); setGuestName(''); setTab('family'); }}>
      <DialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-lg !rounded-b-none sm:!rounded-b-lg p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background pb-[env(safe-area-inset-bottom)] overflow-hidden">
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-2 bg-muted rounded-full" />
        </div>
        <DialogHeader className="px-6 pt-2 pb-2 text-left shrink-0">
          <DialogTitle>Adicionar Participante</DialogTitle>
          <DialogDescription>Família, contatos ou convidado externo</DialogDescription>
        </DialogHeader>

        {/* Tab toggle */}
        <div className="px-6 pt-1 pb-3 shrink-0">
          <div className="flex gap-1 p-1 rounded-xl bg-muted">
            <button
              type="button"
              onClick={() => setTab('family')}
              className={cn(
                "flex-1 py-2 text-xs font-medium rounded-lg transition-all",
                tab === 'family' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              Família
            </button>
            {contacts.length > 0 && (
              <button
                type="button"
                onClick={() => setTab('contacts')}
                className={cn(
                  "flex-1 py-2 text-xs font-medium rounded-lg transition-all",
                  tab === 'contacts' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                )}
              >
                Contatos
              </button>
            )}
            <button
              type="button"
              onClick={() => setTab('guest')}
              className={cn(
                "flex-1 py-2 text-xs font-medium rounded-lg transition-all",
                tab === 'guest' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              Novo
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 overflow-y-auto hide-scrollbar space-y-3">
          {tab === 'family' && (
            <>
              {availableMembers.length === 0 ? (
                <div className="py-8 text-center bg-muted/20 rounded-xl border border-border/50">
                  <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">Nenhum membro disponível</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Todos os membros da família já estão nesta viagem.
                  </p>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={onNavigateToFamily}>
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
            </>
          )}

          {tab === 'contacts' && (
            <>
              {availableContacts.length === 0 ? (
                <div className="py-8 text-center bg-muted/20 rounded-xl border border-border/50">
                  <UserCircle2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">Nenhum contato disponível</p>
                  <p className="text-sm text-muted-foreground">
                    Todos os seus contatos já estão nesta viagem, ou você ainda não adicionou contatos.
                  </p>
                </div>
              ) : (
                availableContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleAddContact(contact)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-sm">
                        {getInitials(contact.name)}
                      </div>
                      <div>
                        <span className="font-medium text-sm">{contact.name}</span>
                        <p className="text-xs text-muted-foreground">Contato externo</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {tab === 'guest' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                <UserPlus className="h-5 w-5 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Adicione alguém que não tem conta no app — amigo, familiar ou colega de viagem.
                  O nome aparecerá nos rateios e no resumo da viagem.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-name">Nome do convidado</Label>
                <Input
                  id="guest-name"
                  placeholder="Ex: João Silva"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGuest()}
                  className="rounded-xl"
                  autoFocus
                />
              </div>
              <Button
                onClick={handleAddGuest}
                disabled={!guestName.trim()}
                className="w-full rounded-xl"
              >
                Adicionar Convidado
              </Button>
            </div>
          )}

          <div className="pt-1">
            <Button variant="outline" className="w-full rounded-xl" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
