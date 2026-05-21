import { Plane, MapPin, Calendar, Users, ChevronRight, Wallet } from "lucide-react";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { moneyUtils } from "@/utils/money";
import { parseLocalDate } from "@/utils/dateUtils";

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
  
  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden p-5 rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 cursor-pointer bg-card/50 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
    >
      {/* Background Decorativo */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
      
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
              <Plane className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                  {trip.name}
                </h3>
                {trip.status === "ACTIVE" ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-[10px] font-bold text-green-600 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Ativa
                  </span>
                ) : trip.status === "COMPLETED" ? (
                  <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Finalizada
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    Planejando
                  </span>
                )}
              </div>
              
              <div className="flex flex-col gap-1.5">
                {trip.destination && (
                  <p className="text-sm text-muted-foreground/80 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary/60" />
                    {trip.destination}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/80 flex items-center gap-1.5 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-primary/60" />
                  {dateFns.format(parseLocalDate(trip.start_date), "dd 'de' MMM", { locale: ptBR })}
                  <span className="text-muted-foreground/40 px-1">•</span>
                  {dateFns.format(parseLocalDate(trip.end_date), "dd 'de' MMM", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between pt-2 border-t border-border/40">
          <div>
             <div className="flex items-center gap-1.5 text-primary/70 mb-0.5">
                <Wallet className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Orçamento</span>
             </div>
             <p className="font-mono font-bold text-xl tracking-tight text-foreground/90">
               {moneyUtils.format(trip.budget || 0, trip.currency ?? undefined)}
             </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center ring-2 ring-primary/5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
              DETALHES
              <ChevronRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
