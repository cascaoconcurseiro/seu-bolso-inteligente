import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useSharedCreditCards, useInviteSharedCard, useRevokeSharedCard } from "@/hooks/useSharedCreditCards";
import { Users, UserPlus, X, ShieldAlert } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";

interface ShareCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  card: any;
}

export function ShareCardDialog({ isOpen, onClose, card }: ShareCardDialogProps) {
  const { user } = useAuth();
  const { data: familyMembers = [], isLoading: membersLoading } = useFamilyMembers();
  const { data: sharedCards = [], isLoading: sharedLoading } = useSharedCreditCards(card?.id);
  const inviteMutation = useInviteSharedCard();
  const revokeMutation = useRevokeSharedCard();
  const [selectedMemberForInvite, setSelectedMemberForInvite] = useState<any>(null);
  const [inviteLimit, setInviteLimit] = useState<string>("");

  if (!card) return null;

  // Filtra membros da família que têm usuário logado (linked_user_id)
  const availableMembers = familyMembers.filter(m => m.linked_user_id && m.status === 'active' && m.linked_user_id !== user?.id);

  const confirmInvite = () => {
    if (!selectedMemberForInvite || !inviteLimit || Number(inviteLimit) <= 0) return;
    inviteMutation.mutate({
      accountId: card.id,
      userId: selectedMemberForInvite.linked_user_id,
      cardName: card.name,
      creditLimit: Number(inviteLimit)
    });
    setSelectedMemberForInvite(null);
    setInviteLimit("");
  };

  const handleOpenInviteLimit = (member: any) => {
    setSelectedMemberForInvite(member);
    setInviteLimit("");
  };

  const handleRevoke = (inviteId: string) => {
    revokeMutation.mutate(inviteId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Compartilhar Cartão
          </DialogTitle>
          <DialogDescription>
            Convide membros da sua família para compartilhar o limite e a fatura do cartão <b>{card.name}</b>.
            As compras de cada um serão isoladas para maior privacidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="bg-amber-50 dark:bg-warning/12 p-3 flex gap-3 rounded-lg border border-amber-200 dark:border-amber-900/30">
            <ShieldAlert className="w-5 h-5 text-warning dark:text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-warning">
              O convidado não poderá editar o Vencimento nem o Fechamento da fatura. Ao fechar a fatura, ele fará o acerto do valor devido para você.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Membros Compartilhados / Convites</h4>
            {sharedLoading ? (
              <div className="text-center text-sm text-muted-foreground py-2">Carregando...</div>
            ) : sharedCards.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4 border border-dashed rounded-lg">
                Nenhum membro compartilhando este cartão.
              </div>
            ) : (
              <div className="space-y-2">
                {sharedCards.map((sc) => (
                  <div key={sc.id} className="flex items-center justify-between p-2 border rounded-lg bg-card">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={sc.user?.full_name || 'Usuário'} avatarUrl={sc.user?.avatar_url} iconId={sc.user?.avatar_icon} colorId={sc.user?.avatar_color} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{sc.user?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {sc.status === 'PENDING' ? 'Pendente' : sc.status === 'ACCEPTED' ? 'Aceito' : 'Recusado'}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRevoke(sc.id)} title="Remover acesso">
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Convidar Membro da Família</h4>
            {membersLoading ? (
              <div className="text-center text-sm text-muted-foreground py-2">Carregando membros...</div>
            ) : availableMembers.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4 border border-dashed rounded-lg">
                Nenhum membro ativo encontrado na sua família.
              </div>
            ) : (
              <div className="space-y-2">
                {availableMembers.map((member) => {
                  const isAlreadyShared = sharedCards.some(sc => sc.user_id === member.linked_user_id);
                  if (isAlreadyShared) return null;

                  return (
                    <div key={member.id} className="flex items-center justify-between p-2 border border-transparent hover:border-border rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={member.name} avatarUrl={member.avatar_url || undefined} iconId={member.avatar_icon || undefined} colorId={member.avatar_color || undefined} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.role === 'admin' ? 'Administrador' : 'Membro'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleOpenInviteLimit(member)} 
                          className="h-8"
                          variant="secondary"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Convidar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      <Dialog open={!!selectedMemberForInvite} onOpenChange={(o) => !o && setSelectedMemberForInvite(null)}>
        <DialogContent className="max-w-[320px] w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="bg-primary/10 p-4 rounded-full">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Definir Limite</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Qual será o limite para <b>{selectedMemberForInvite?.name}</b> usar neste cartão?
              </p>
            </div>
            
            <CurrencyInput 
              placeholder="R$ 0,00" 
              className="w-full h-12 text-center text-base font-medium" 
              value={inviteLimit} 
              onChange={(val) => setInviteLimit(val)} 
              currency={card?.currency || "BRL"}
            />

            <div className="flex items-center gap-2 w-full mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedMemberForInvite(null)}>
                Cancelar
              </Button>
              <Button 
                className="flex-1" 
                onClick={confirmInvite}
                disabled={inviteMutation.isPending || !inviteLimit || Number(inviteLimit) <= 0}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
