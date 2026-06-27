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
      className="group relative overflow-hidden rounded-2xl cursor-pointer hover:shadow-lg hover:shadow-primary/10 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] border border-border/60 bg-white dark:bg-card shadow-sm"
    >
      {/* Barra lateral colorida — identidade visual */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-2xl" />

      <div className="relative p-5 sm:pr-28 flex flex-col sm:flex-row gap-5">
        <div className="flex-1 flex flex-col gap-5">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                <Plane className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-base leading-tight text-foreground">{trip.name}</h3>
                  {trip.status === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/15 border border-success/40 text-xs font-bold text-success uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      Ativa
                    </span>
                  ) : trip.status === "COMPLETED" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted border border-border text-xs font-bold text-foreground uppercase tracking-wider">
                      Finalizada
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/50 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      Planejando
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  {trip.destination && (
                    <p className="text-sm text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-foreground/40" />
                      {trip.destination}
                    </p>
                  )}
                  <p className="text-sm text-foreground flex items-center gap-1.5 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-foreground/40" />
                    {dateFns.format(parseLocalDate(trip.start_date), "dd MMM yyyy", {
                      locale: ptBR,
                    })}
                    <span className="text-foreground/30 px-0.5">•</span>
                    {dateFns.format(parseLocalDate(trip.end_date), "dd MMM yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-foreground">
                <Wallet className="h-3.5 w-3.5" />
                <span className="text-xs font-bold uppercase tracking-widest">Orçamento</span>
              </div>
              {budget > 0 && (
                <div className="text-xs font-semibold text-foreground">
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
                  <p className="font-mono font-bold text-lg tracking-tight text-foreground">
                    {moneyUtils.format(totalSpent, trip.currency ?? undefined)}
                  </p>
                  <p className="font-mono text-sm text-foreground">
                    de {moneyUtils.format(budget, trip.currency ?? undefined)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="font-mono font-bold text-lg tracking-tight text-foreground">
                {moneyUtils.format(budget, trip.currency ?? undefined)}
              </p>
            )}
          </div>
        </div>

        {/* Canto do Boarding Pass */}
        <div className="sm:absolute right-0 top-0 bottom-0 sm:w-24 flex sm:flex-col items-center justify-between sm:justify-center p-5 sm:border-l border-t sm:border-t-0 border-border/50 bg-muted/20">
          <div className="flex -space-x-2 sm:mb-4">
            <div className="w-8 h-8 rounded-full border-2 border-border/60 bg-muted/50 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-foreground" />
            </div>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:translate-x-1">
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}
