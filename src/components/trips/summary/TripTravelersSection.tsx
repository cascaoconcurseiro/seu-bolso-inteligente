 
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moneyUtils } from "@/utils/money";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { Plus, Trash2, Users } from "lucide-react";
import type { TripParticipant } from "@/hooks/useTrips";
import type {
  SentTripInvitation,
  TripBalance,
  TripPermissions,
  TripTransaction,
  TripUser,
} from "../types";

interface TripTravelersSectionProps {
  participants: TripParticipant[];
  balances: TripBalance[];
  tripTransactions: TripTransaction[];
  user: TripUser;
  currency: string;
  permissions: TripPermissions | null | undefined;
  onAddParticipant: () => void;
  onRemoveClick?: (participant: TripParticipant, balance: TripBalance) => void;
  pendingInvitations?: SentTripInvitation[];
  onCancelInvitation?: (id: string) => void;
}

export function TripTravelersSection({
  participants,
  balances,
  tripTransactions,
  user,
  currency,
  permissions,
  onAddParticipant,
  onRemoveClick,
  pendingInvitations = [],
  onCancelInvitation,
}: TripTravelersSectionProps) {
  if (!participants || participants.length === 0) return null;

  return (
    <section className="p-6 rounded-3xl border border-border/50 bg-gradient-to-br from-card/50 to-muted/20 backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-widest">
            Viajantes ({participants.length})
          </h3>
        </div>
        {permissions?.isOwner && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2 h-10"
            onClick={onAddParticipant}
          >
            <Plus className="h-4 w-4" /> Convidar Viajante
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {participants.map((participant) => {
          const balance = balances.find((b) => b.participantId === participant.user_id);
          const currentBalance = balance?.balance ?? 0;
          const isOwner = participant.role === "owner";
          const isCurrentUser = participant.user_id === user?.id;

          return (
            <div
              key={participant.id}
              className="p-4 rounded-2xl border border-border/50 bg-card/40 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium font-display shrink-0 border border-border">
                  {participant.name
                    .split(" ")
                    .map((x: string) => x[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-foreground truncate">{participant.name}</p>
                    {isCurrentUser && (
                      <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                        Você
                      </span>
                    )}
                    {isOwner && (
                      <span className="text-[8px] bg-warning/10 text-warning dark:text-warning px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                        Líder
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                    Saldo:{" "}
                    <span
                      className={cn(
                        "font-bold",
                        Math.abs(currentBalance) < 0.01
                          ? "text-muted-foreground"
                          : currentBalance < 0
                            ? "text-warning"
                            : "text-accent"
                      )}
                    >
                      {moneyUtils.format(currentBalance, currency)}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                    Gastou no compartilhado:{" "}
                    <span className="font-bold text-foreground">
                      {moneyUtils.format(
                        tripTransactions
                          .filter(
                            (t) =>
                              t.type === "EXPENSE" &&
                              t.is_shared &&
                              t.user_id === participant.user_id
                          )
                          .reduce(
                            (sum, t) =>
                              SafeFinancialCalculator.add(sum, Number(t.amount)).toNumber(),
                            0
                          ),
                        currency
                      )}
                    </span>
                  </p>
                </div>
              </div>

              {permissions?.isOwner && !isOwner && onRemoveClick && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() =>
                    onRemoveClick(
                      participant,
                      balance ?? {
                        participantId: participant.user_id ?? participant.id,
                        name: participant.name,
                        paid: 0,
                        owes: 0,
                        balance: 0,
                        currency,
                      }
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}

        {permissions?.isOwner &&
          pendingInvitations.map((inv) => (
            <div
              key={inv.id}
              className="p-4 rounded-2xl border border-dashed border-border/50 bg-card/20 flex items-center justify-between gap-4 opacity-70"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium font-display shrink-0 border border-dashed border-border">
                  {inv.invitee?.full_name
                    ?.split(" ")
                    .map((x: string) => x[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-foreground truncate">
                      {inv.invitee?.full_name || "Convidado"}
                    </p>
                    <span className="text-[8px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                      Pendente
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 font-mono truncate">
                    Aguardando aceite...
                  </p>
                </div>
              </div>

              {onCancelInvitation && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => onCancelInvitation(inv.id)}
                  title="Cancelar convite"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
      </div>
    </section>
  );
}
