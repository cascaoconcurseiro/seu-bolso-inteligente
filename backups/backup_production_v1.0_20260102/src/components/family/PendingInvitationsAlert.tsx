import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Check, X, Users } from "lucide-react";
import { usePendingInvitations, useAcceptInvitation, useRejectInvitation } from "@/hooks/useFamilyInvitations";

export function PendingInvitationsAlert() {
  const { data: invitations = [], isLoading, error } = usePendingInvitations();
  const acceptInvitation = useAcceptInvitation();
  const rejectInvitation = useRejectInvitation();

  // Garantir que invitations é sempre um array
  const safeInvitations = Array.isArray(invitations) ? invitations : [];

  if (isLoading) {
    return null;
  }

  if (error) {
    console.error('Erro ao carregar convites:', error);
    return null;
  }

  if (safeInvitations.length === 0) {
    return null;
  }

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
