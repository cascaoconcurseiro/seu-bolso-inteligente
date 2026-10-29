import { Button } from "@/components/ui/button";
import { Check, X, Users, Loader2, HeartHandshake } from "lucide-react";
import {
  usePendingInvitations,
  useAcceptInvitation,
  useRejectInvitation,
} from "@/hooks/useFamilyInvitations";
import { logger } from "@/utils/logger";
import { cn } from "@/lib/utils";

interface PendingInvitationsAlertProps {
  className?: string;
}

export function PendingInvitationsAlert({ className }: PendingInvitationsAlertProps) {
  const { data: invitations = [], isLoading, error } = usePendingInvitations();
  const acceptInvitation = useAcceptInvitation();
  const rejectInvitation = useRejectInvitation();

  const safeInvitations = Array.isArray(invitations) ? invitations : [];

  if (isLoading) {
    return null;
  }

  if (error) {
    logger.error("Erro ao carregar convites:", error);
    return null;
  }

  if (safeInvitations.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4 w-full", className)}>
      {safeInvitations.map((invitation) => {
        const isAccepting =
          acceptInvitation.isPending && acceptInvitation.variables === invitation.id;
        const isRejecting =
          rejectInvitation.isPending && rejectInvitation.variables === invitation.id;
        const isBusy = acceptInvitation.isPending || rejectInvitation.isPending;
        const inviterName = invitation.from_user?.full_name || "Um familiar";

        return (
          <div
            key={invitation.id}
            role="region"
            aria-label="Convite para família"
            className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-background to-card p-5 md:p-6 shadow-xl shadow-primary/10 transition-all animate-fade-in"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0 shadow-inner">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-primary/15 px-2.5 py-0.5 rounded-full">
                      <Users className="w-3.5 h-3.5" /> Convite de Família
                    </span>
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground">
                    {inviterName} convidou você
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Você foi convidado(a) para participar da família como{" "}
                    <strong className="text-foreground">{invitation.member_name}</strong>. Ao
                    aceitar, vocês poderão compartilhar despesas, viagens e planejar as finanças
                    juntos.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0">
                <Button
                  size="default"
                  onClick={() => acceptInvitation.mutate(invitation.id)}
                  disabled={isBusy}
                  className="h-11 px-6 rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95 transition-all gap-2"
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Aceitando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Aceitar Convite
                    </>
                  )}
                </Button>

                <Button
                  size="default"
                  variant="outline"
                  onClick={() => rejectInvitation.mutate(invitation.id)}
                  disabled={isBusy}
                  className="h-11 px-4 rounded-xl font-semibold border-border/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all gap-2"
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recusando...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      Recusar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
