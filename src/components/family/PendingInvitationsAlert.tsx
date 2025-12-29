import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Check, X, Users } from "lucide-react";
import { usePendingInvitations, useAcceptInvitation, useRejectInvitation } from "@/hooks/useFamilyInvitations";
import { useEffect } from "react";

export function PendingInvitationsAlert() {
  const { data: invitations = [], isLoading, error } = usePendingInvitations();
  const acceptInvitation = useAcceptInvitation();
  const rejectInvitation = useRejectInvitation();

  // Garantir que invitations é sempre um array
  const safeInvitations = Array.isArray(invitations) ? invitations : [];

  // Log sempre que o componente renderizar
  useEffect(() => {
    console.log('🔔 PendingInvitationsAlert MONTADO/ATUALIZADO:', { 
      isLoading, 
      error,
      invitationsCount: safeInvitations.length,
      invitations: safeInvitations,
      rawData: invitations,
      timestamp: new Date().toISOString()
    });
  }, [isLoading, error, safeInvitations.length, invitations]);

  console.log('🔔 PendingInvitationsAlert RENDER:', { 
    isLoading, 
    error,
    invitationsCount: safeInvitations.length,
    invitations: safeInvitations,
    rawData: invitations
  });

  if (isLoading) {
    console.log('🔔 PendingInvitationsAlert: Carregando...');
    return (
      <div className="p-2 text-xs text-muted-foreground">
        🔄 Verificando convites...
      </div>
    );
  }

  if (error) {
    console.error('🔔 PendingInvitationsAlert ERROR:', error);
    return (
      <div className="p-2 text-xs text-red-500">
        ❌ Erro ao carregar convites: {error.message}
      </div>
    );
  }

  if (safeInvitations.length === 0) {
    console.log('🔔 PendingInvitationsAlert: Nenhum convite para mostrar');
    return (
      <div className="p-2 text-xs text-muted-foreground">
        ℹ️ Nenhum convite pendente
      </div>
    );
  }

  console.log('🔔 PendingInvitationsAlert: Mostrando', safeInvitations.length, 'convite(s)');

  return (
    <div className="space-y-3">
      {safeInvitations.map((invitation) => (
        <Alert key={invitation.id} className="border-primary/50 bg-primary/5">
          <Users className="h-4 w-4" />
          <AlertTitle>Solicitação de Vínculo Familiar</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p>
              <strong>{invitation.from_user?.full_name || invitation.from_user?.email}</strong> quer
              adicionar você à família como <strong>{invitation.member_name}</strong>.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => acceptInvitation.mutate(invitation.id)}
                disabled={acceptInvitation.isPending || rejectInvitation.isPending}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Aceitar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => rejectInvitation.mutate(invitation.id)}
                disabled={acceptInvitation.isPending || rejectInvitation.isPending}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Rejeitar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
