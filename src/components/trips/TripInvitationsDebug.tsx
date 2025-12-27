import { useAuth } from "@/contexts/AuthContext";
import { usePendingTripInvitations } from "@/hooks/useTripInvitations";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function TripInvitationsDebug() {
  const { user } = useAuth();
  const { data: invitations, isLoading, error } = usePendingTripInvitations();

  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Info className="h-5 w-5 text-blue-600" />
      <AlertTitle className="text-blue-900 font-semibold">
        Debug: Convites de Viagem
      </AlertTitle>
      <AlertDescription className="space-y-2 text-sm">
        <div>
          <strong>Usuário autenticado:</strong> {user ? "Sim" : "Não"}
        </div>
        {user && (
          <>
            <div>
              <strong>User ID:</strong> {user.id}
            </div>
            <div>
              <strong>Email:</strong> {user.email}
            </div>
          </>
        )}
        <div>
          <strong>Loading:</strong> {isLoading ? "Sim" : "Não"}
        </div>
        <div>
          <strong>Erro:</strong> {error ? JSON.stringify(error) : "Nenhum"}
        </div>
        <div>
          <strong>Convites encontrados:</strong> {invitations?.length || 0}
        </div>
        {invitations && invitations.length > 0 && (
          <div className="mt-2">
            <strong>Convites:</strong>
            <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(invitations, null, 2)}
            </pre>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
