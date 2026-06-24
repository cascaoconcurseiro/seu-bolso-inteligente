import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Plane, Check, X, Calendar, MapPin } from "lucide-react";
import { 
  usePendingTripInvitations, 
  useAcceptTripInvitation, 
  useRejectTripInvitation 
} from "@/hooks/useTripInvitations";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { logger } from '@/utils/logger';

export function PendingTripInvitationsAlert() {
  const { data: invitations = [], isLoading, error } = usePendingTripInvitations();
  const acceptInvitation = useAcceptTripInvitation();
  const rejectInvitation = useRejectTripInvitation();

  // logger.debug('🟣 [PendingTripInvitationsAlert] Renderizado:', { 
  //   invitations, 
  //   isLoading, 
  //   error,
  //   hasInvitations: invitations && invitations.length > 0 
  // });

  if (isLoading) {
    // logger.debug('🟣 [PendingTripInvitationsAlert] Carregando...');
    return null;
  }

  if (error) {
    // logger.error("🟣 [PendingTripInvitationsAlert] Erro ao carregar convites:", error);
    return null;
  }
  
  if (!invitations || invitations.length === 0) {
    // logger.debug('🟣 [PendingTripInvitationsAlert] Nenhum convite pendente');
    return null;
  }

  // logger.debug('🟣 [PendingTripInvitationsAlert] Renderizando', invitations.length, 'convite(s)');

  return (
    <div className="space-y-3">
      {invitations.map((invitation) => {
        const tripName = invitation.trips?.name || "Viagem";
        const destination = invitation.trips?.destination;
        const startDate = invitation.trips?.start_date;
        const endDate = invitation.trips?.end_date;
        const inviterName = invitation.inviter?.full_name || invitation.inviter?.email || "Alguém";

        return (
          <Alert key={invitation.id} className="border-primary/50 bg-primary/5">
            <Plane className="h-4 w-4" />
            <AlertTitle>Novo Convite de Viagem</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p>
                Você foi convidado por <strong>{inviterName}</strong> para participar da viagem{" "}
                <strong>"{tripName}"</strong>!
              </p>
              
              {destination && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{destination}</span>
                </div>
              )}
              
              {startDate && endDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {dateFns.format(new Date(startDate), "dd/MM/yyyy", { locale: ptBR })} até{" "}
                    {dateFns.format(new Date(endDate), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}

              {invitation.message && (
                <p className="text-sm italic text-muted-foreground">"{invitation.message}"</p>
              )}

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
                  Recusar
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
