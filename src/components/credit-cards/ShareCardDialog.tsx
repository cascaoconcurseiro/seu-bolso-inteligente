import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useSharedCreditCards, useInviteSharedCard, useRevokeSharedCard } from "@/hooks/useSharedCreditCards";
import { Users, UserPlus, X, ShieldAlert } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";

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
  const [inviteLimits, setInviteLimits] = useState<Record<string, string>>({});
  const [invitingMemberId, setInvitingMemberId] = useState<string | null>(null);

  if (!card) return null;

  // Filtra membros da família que têm usuário logado (linked_user_id)
  const availableMembers = familyMembers.filter(m => m.linked_user_id && m.status === 'active' && m.linked_user_id !== user?.id);

  const handleInvite = (member: any) => {
    const limit = inviteLimits[member.id];
    if (!limit || Number(limit) <= 0) {
      return; // Must have a limit
    }
    inviteMutation.mutate({
      accountId: card.id,
      userId: member.linked_user_id,
      cardName: card.name,
      creditLimit: Number(limit)
    });
    setInvitingMemberId(null);
  };

  const handleRevoke = (inviteId: string) => {
    revokeMutation.mutate(inviteId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
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
          <div className="bg-amber-50 dark:bg-amber-950/20 p-3 flex gap-3 rounded-lg border border-amber-200 dark:border-amber-900/30">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-400">
              O convidado não poderá editar o Vencimento nem o Fechamento da fatura. Ao fechar a fatura, ele fará o acerto do valor devido para você.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Membros Compartilhados / Convites</h4>
            {sharedLoading ? (
              <div className="text-center text-xs text-muted-foreground py-2">Carregando...</div>
            ) : sharedCards.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-4 border border-dashed rounded-lg">
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
                        <p className="text-xs text-muted-foreground">
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
              <div className="text-center text-xs text-muted-foreground py-2">Carregando membros...</div>
            ) : availableMembers.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-4 border border-dashed rounded-lg">
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
                        <UserAvatar name={member.name} avatarUrl={member.avatar_url} iconId={member.avatar_icon} colorId={member.avatar_color} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role === 'admin' ? 'Administrador' : 'Membro'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                        {invitingMemberId === member.id ? (
                          <>
                            <Input 
                              type="number" 
                              placeholder="Defina o Limite" 
                              className="w-32 h-8 text-xs" 
                              value={inviteLimits[member.id] || ''} 
                              onChange={(e) => setInviteLimits({...inviteLimits, [member.id]: e.target.value})} 
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setInvitingMemberId(null)}
                                className="px-2 h-8"
                              >
                                Cancelar
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleInvite(member)} 
                                disabled={inviteMutation.isPending || !inviteLimits[member.id] || Number(inviteLimits[member.id]) <= 0}
                                className="h-8"
                              >
                                Confirmar
                              </Button>
                            </div>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setInvitingMemberId(member.id)}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Convidar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
