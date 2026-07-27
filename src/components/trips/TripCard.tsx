import { Plane, MapPin, Calendar, Users, ChevronRight, Wallet } from "lucide-react";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { moneyUtils } from "@/utils/money";
import { parseLocalDate } from "@/utils/dateUtils";
import { useTripFinancialSummary } from "@/hooks/useTrips";
import { Progress } from "@/components/ui/progress";
import { getFastDestinationCoverImage } from "@/services/destinationImageService";

interface Trip {
  id: string;
  name: string;
  destination: string | null;
  start_date: string;
  end_date: string;
  budget: number | null;
  currency: string | null;
  status: string;
  cover_image?: string | null;
}

interface TripCardProps {
  trip: Trip;
  onClick: () => void;
}

export function TripCard({ trip, onClick }: TripCardProps) {
  const { data: summary, isPending, isError } = useTripFinancialSummary(trip.id);
  const totalSpent = summary?.total_spent;
  const budget = trip.budget;

  const rawUsagePercent =
    budget && budget > 0 && totalSpent !== undefined ? (totalSpent / budget) * 100 : 0;
  const progressValue = Math.min(rawUsagePercent, 100);

  // Progress color based on usage
  let progressIndicatorClass = "bg-primary";
  if (rawUsagePercent >= 90) progressIndicatorClass = "bg-destructive";
  else if (rawUsagePercent >= 75) progressIndicatorClass = "bg-warning";
  else if (rawUsagePercent > 0) progressIndicatorClass = "bg-success";

  const status = {
    ACTIVE: { label: "Ativa", className: "bg-success/15 border-success/40 text-success" },
    COMPLETED: {
      label: "Finalizada",
      className: "bg-muted border-border text-foreground",
    },
    CANCELLED: {
      label: "Cancelada",
      className: "bg-destructive/10 border-destructive/30 text-destructive",
    },
    PLANNING: {
      label: "Planejando",
      className:
        "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700/50 text-amber-700 dark:text-amber-400",
    },
  }[trip.status] ?? {
    label: trip.status,
    className: "bg-muted border-border text-muted-foreground",
  };
  const titleId = `trip-${trip.id}-title`;
  const detailsId = `trip-${trip.id}-details`;
  const actionId = `trip-${trip.id}-action`;

  const coverImage = trip.cover_image || getFastDestinationCoverImage(trip.destination || trip.name);

  return (
    <article className="group relative w-full overflow-hidden rounded-2xl text-left hover:shadow-lg hover:shadow-primary/10 motion-safe:transition-all motion-safe:duration-500 motion-safe:hover:scale-[1.02] border border-border/60 bg-white dark:bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring">
      <button
        type="button"
        onClick={onClick}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none"
        aria-labelledby={`${actionId} ${titleId}`}
        aria-describedby={detailsId}
      >
        <span id={actionId} className="sr-only">
          Abrir viagem
        </span>
      </button>
      {coverImage && (
        <div className="relative h-32 overflow-hidden border-b sm:h-36">
          <img
            src={coverImage}
            alt={trip.destination || trip.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
          {trip.destination && (
            <span className="absolute bottom-3 left-5 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {trip.destination}
            </span>
          )}
        </div>
      )}
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
                  <h3 id={titleId} className="font-bold text-base leading-tight text-foreground">
                    {trip.name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wider ${status.className}`}
                  >
                    {trip.status === "ACTIVE" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-success motion-safe:animate-pulse" />
                    )}
                    {status.label}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {trip.destination && !trip.cover_image && (
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
              {!isPending && !isError && budget && budget > 0 && totalSpent !== undefined && (
                <div className="text-xs font-semibold text-foreground">
                  {rawUsagePercent.toFixed(0)}% utilizado
                </div>
              )}
            </div>

            {isPending ? (
              <div aria-label="Carregando resumo financeiro" aria-busy="true" className="space-y-2">
                <div className="h-2 rounded-full bg-muted" />
                <div className="h-6 w-36 rounded bg-muted motion-safe:animate-pulse" />
              </div>
            ) : isError ? (
              <p className="text-sm font-medium text-muted-foreground">Resumo indisponível</p>
            ) : budget && budget > 0 && totalSpent !== undefined ? (
              <div className="space-y-2.5">
                <Progress
                  value={progressValue}
                  className="h-2 bg-muted"
                  indicatorClassName={progressIndicatorClass}
                  aria-label="Orçamento utilizado"
                  aria-valuenow={progressValue}
                  aria-valuetext={`${rawUsagePercent.toFixed(0)}% utilizado; gasto ${moneyUtils.format(totalSpent, trip.currency ?? undefined)} de ${moneyUtils.format(budget, trip.currency ?? undefined)}`}
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
              <p className="text-sm font-medium text-muted-foreground">Sem orçamento definido</p>
            )}
          </div>
          <p id={detailsId} className="sr-only">
            {trip.destination ? `${trip.destination}. ` : ""}
            {status.label}. De {trip.start_date} até {trip.end_date}.
          </p>
        </div>

        {/* Canto do Boarding Pass */}
        <div className="sm:absolute right-0 top-0 bottom-0 sm:w-24 flex sm:flex-col items-center justify-between sm:justify-center p-5 sm:border-l border-t sm:border-t-0 border-border/50 bg-muted/20">
          <div className="flex -space-x-2 sm:mb-4">
            <div className="w-8 h-8 rounded-full border-2 border-border/60 bg-muted/50 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-foreground" />
            </div>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground motion-safe:transition-all motion-safe:duration-300 motion-safe:group-hover:translate-x-1">
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>
      </div>
    </article>
  );
}
