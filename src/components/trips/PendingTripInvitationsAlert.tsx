import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Plane, Check, X, Calendar, MapPin } from "lucide-react";
import { 
  usePendingTripInvitations, 
  useAcceptTripInvitation, 
  useRejectTripInvitation 
} from "@/hooks/useTripInvitations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function PendingTripInvitationsAlert() {
  const { data: invitations = [], isLoading, error } = usePendingTripInvitations();
  const acceptInvitation = useAcceptTripInvitation();
  const rejectInvitation = useRejectTripInvitation();

  if (isLoading) {
    return null;
  }

  if (error) {
    console.error("Erro ao carregar convites:", error);
    return null;
  }
  
  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {invitations.map((invitation) => {
        const tripName = invitation.trips?.name || "Viagem";
        const destination = invitation.trips?.destination;
        const startDate = invitation.trips?.start_date;
        const endDate = invitation.trips?.end_date;
        const inviterName = invitation.inviter?.full_name || invitation.inviter?.email || "Alguém";

        return (
          <Alert key={invitation.id} className="border-blue-200 bg-blue-50">
            <Plane className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-blue-900 font-semibold">
              Convite para Viagem
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <div className="text-blue-800">
                <p className="font-medium">
                  {inviterName} convidou você para participar da viagem "{tripName}"
                </p>
                
                {destination && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>{destination}</span>
                  </div>
                )}
                
                {startDate && endDate && (
                  <div className="flex items-center gap-2 mt-1 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(startDate), "dd/MM/yyyy", { locale: ptBR })} até{" "}
                      {format(new Date(endDate), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}

                {invitation.message && (
                  <p className="mt-2 text-sm italic">"{invitation.message}"</p>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => acceptInvitation.mutate(invitation.id)}
                  disabled={acceptInvitation.isPending || rejectInvitation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Aceitar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => rejectInvitation.mutate(invitation.id)}
                  disabled={acceptInvitation.isPending || rejectInvitation.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
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
