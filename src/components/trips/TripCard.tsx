import { Plane, MapPin, Calendar, Users, ChevronRight, Wallet } from "lucide-react";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { moneyUtils } from "@/utils/money";
import { parseLocalDate } from "@/utils/dateUtils";
import { useTripFinancialSummary } from "@/hooks/useTrips";
import { Progress } from "@/components/ui/progress";

interface Trip {
  id: string;
  name: string;
  destination: string | null;
  start_date: string;
  end_date: string;
  budget: number | null;
  currency: string | null;
  status: string;
}

interface TripCardProps {
  trip: Trip;
  onClick: () => void;
}

export function TripCard({ trip, onClick }: TripCardProps) {
  const { data: summary } = useTripFinancialSummary(trip.id);
  const totalSpent = summary?.total_spent || 0;
  const budget = trip.budget || 0;

  const usagePercent = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;

  // Progress color based on usage
  let progressIndicatorClass = "bg-primary";
  if (usagePercent >= 90) progressIndicatorClass = "bg-destructive";
  else if (usagePercent >= 75) progressIndicatorClass = "bg-warning";
  else if (usagePercent > 0) progressIndicatorClass = "bg-success";

  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl cursor-pointer hover:shadow-xl hover:shadow-primary/15 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] border-2 border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.03] dark:from-card dark:via-card dark:to-primary/[0.06]"
    >
      {/* Padrão decorativo sutil */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/[0.07] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/[0.12] transition-colors duration-700" />
      <div className="absolute bottom-0 left-0 w-28 h-28 bg-primary/[0.12] rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 group-hover:bg-primary/[0.18] transition-colors duration-700" />

      {/* Recorte simulando ticket */}
      <div className="absolute right-24 top-0 bottom-0 w-px border-r-2 border-dashed border-border/60 hidden sm:block" />

      <div className="relative p-5 sm:pr-28 flex flex-col sm:flex-row gap-5">
        <div className="flex-1 flex flex-col gap-5">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 border-2 border-primary/25 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500">
                <Plane className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-base leading-tight text-foreground">{trip.name}</h3>
                  {trip.status === "ACTIVE" ? (
                    <span className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-success/10 border border-success/30 text-sm font-bold text-success-foreground uppercase tracking-wider">
                      <span className="w-1.5 h-2 rounded-full bg-success animate-pulse" />
                      Ativa
                    </span>
                  ) : trip.status === "COMPLETED" ? (
                    <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-sm font-bold text-muted-foreground uppercase tracking-wider">
                      Finalizada
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-sm font-bold text-accent-foreground uppercase tracking-wider">
                      Planejando
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {trip.destination && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {trip.destination}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    {dateFns.format(parseLocalDate(trip.start_date), "dd MMM yyyy", {
                      locale: ptBR,
                    })}
                    <span className="text-muted-foreground/50 px-1">•</span>
                    {dateFns.format(parseLocalDate(trip.end_date), "dd MMM yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground mb-0.5">
                <Wallet className="h-3.5 w-3.5" />
                <span className="text-sm font-bold uppercase tracking-widest">Orçamento</span>
              </div>
              {budget > 0 && (
                <div className="text-sm font-medium text-muted-foreground">
                  {usagePercent.toFixed(0)}% Utilizado
                </div>
              )}
            </div>

            {budget > 0 ? (
              <div className="space-y-2.5">
                <Progress
                  value={usagePercent}
                  className="h-2 bg-muted"
                  indicatorClassName={progressIndicatorClass}
                />
                <div className="flex justify-between items-baseline">
                  <p className="font-mono font-bold text-base tracking-tight text-foreground">
                    {moneyUtils.format(totalSpent, trip.currency ?? undefined)}
                  </p>
                  <p className="font-mono text-sm text-muted-foreground">
                    de {moneyUtils.format(budget, trip.currency ?? undefined)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="font-mono font-bold text-base tracking-tight text-foreground">
                {moneyUtils.format(budget, trip.currency ?? undefined)}
              </p>
            )}
          </div>
        </div>

        {/* Canto do Boarding Pass */}
        <div className="sm:absolute right-0 top-0 bottom-0 sm:w-24 flex sm:flex-col items-center justify-between sm:justify-center p-5 sm:border-l border-t sm:border-t-0 border-border bg-muted/30">
          <div className="flex -space-x-2 sm:mb-4">
            <div className="w-8 h-8 rounded-full border-2 border-border bg-muted flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted border border-border group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground transition-all duration-300 transform group-hover:translate-x-1">
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}
