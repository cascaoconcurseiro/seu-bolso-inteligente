import { Button } from "@/components/ui/button";
import { Archive, MapPin, Calendar, ArchiveRestore, ChevronRight } from "lucide-react";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/utils/dateUtils";

interface TripArchivedCardProps {
  trip: any;
  onUnarchive: () => void;
  onClick: () => void;
}

export function TripArchivedCard({ trip, onUnarchive, onClick }: TripArchivedCardProps) {
  return (
    <div
      className="group p-5 rounded-xl border border-border bg-muted/30"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Archive className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-display font-semibold text-lg">{trip.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Arquivada
            </span>
          </div>
          {trip.destination && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {trip.destination}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {dateFns.format(parseLocalDate(trip.start_date), "dd MMM", { locale: ptBR })}
              {" - "}
              {dateFns.format(parseLocalDate(trip.end_date), "dd MMM", { locale: ptBR })}
            </div>
            {trip.archived_at && (
              <div className="text-xs text-muted-foreground">
                Arquivada em {dateFns.format(new Date(trip.archived_at), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onUnarchive}
            className="gap-2"
          >
            <ArchiveRestore className="h-4 w-4" />
            <span className="hidden sm:inline">Desarquivar</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
