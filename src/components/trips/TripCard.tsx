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
  if (usagePercent >= 90) progressIndicatorClass = "bg-red-500";
  else if (usagePercent >= 75) progressIndicatorClass = "bg-amber-500";
  else if (usagePercent > 0) progressIndicatorClass = "bg-green-500";

  const gradients = [
    "from-slate-800 to-slate-900",
    "from-zinc-800 to-zinc-950",
    "from-stone-800 to-stone-950",
    "from-neutral-800 to-neutral-950"
  ];
  
  // Deterministic random based on name
  const hash = trip.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradient = gradients[hash % gradients.length];

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl cursor-pointer hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] border border-border/20 text-white`}
    >
      {/* Imagem de Fundo / Capa Escura (Boarding Pass Theme) */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-100 transition-opacity`} />
      
      {/* Pattern de "Boarding Pass" */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors duration-700" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 group-hover:bg-primary/30 transition-colors duration-700" />
      
      {/* Recorte simulando ticket e serrilhado */}
      <div className="absolute right-24 top-0 bottom-0 w-px border-r-2 border-dashed border-white/10 hidden sm:block" />
      
      <div className="relative p-5 sm:pr-28 flex flex-col sm:flex-row gap-5">
        <div className="flex-1 flex flex-col gap-5">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                <Plane className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-base leading-tight text-white group-hover:text-primary-foreground transition-colors">
                    {trip.name}
                  </h3>
                  {trip.status === "ACTIVE" ? (
                    <span className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-sm font-bold text-green-300 uppercase tracking-wider">
                      <span className="w-1.5 h-2 rounded-full bg-green-400 animate-pulse" />
                      Ativa
                    </span>
                  ) : trip.status === "COMPLETED" ? (
                    <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold text-gray-300 uppercase tracking-wider">
                      Finalizada
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-sm font-bold text-blue-300 uppercase tracking-wider">
                      Planejando
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col gap-2">
                  {trip.destination && (
                    <p className="text-sm text-gray-300 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {trip.destination}
                    </p>
                  )}
                  <p className="text-sm text-gray-400 flex items-center gap-2 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                    {dateFns.format(parseLocalDate(trip.start_date), "dd MMM yyyy", { locale: ptBR })}
                    <span className="text-gray-600 px-1">•</span>
                    {dateFns.format(parseLocalDate(trip.end_date), "dd MMM yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-gray-400 mb-0.5">
                  <Wallet className="h-3.5 w-3.5" />
                  <span className="text-sm font-bold uppercase tracking-widest">Orçamento</span>
               </div>
               {budget > 0 && (
                 <div className="text-sm font-medium text-gray-400">
                   {usagePercent.toFixed(0)}% Utilizado
                 </div>
               )}
            </div>
            
            {budget > 0 ? (
              <div className="space-y-2.5">
                <Progress 
                  value={usagePercent} 
                  className="h-2 bg-white/10" 
                  indicatorClassName={progressIndicatorClass} 
                />
                <div className="flex justify-between items-baseline">
                  <p className="font-mono font-bold text-base tracking-tight text-white">
                    {moneyUtils.format(totalSpent, trip.currency ?? undefined)}
                  </p>
                  <p className="font-mono text-sm text-gray-400">
                    de {moneyUtils.format(budget, trip.currency ?? undefined)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="font-mono font-bold text-base tracking-tight text-white">
                {moneyUtils.format(budget, trip.currency ?? undefined)}
              </p>
            )}
          </div>
        </div>

        {/* Canto do Boarding Pass */}
        <div className="sm:absolute right-0 top-0 bottom-0 sm:w-24 flex sm:flex-col items-center justify-between sm:justify-center p-5 sm:border-l border-t sm:border-t-0 border-white/10 bg-white/5">
          <div className="flex -space-x-2 sm:mb-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#1e293b] bg-white/10 backdrop-blur-md flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-gray-300" />
            </div>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border border-white/20 group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-all duration-300 transform group-hover:translate-x-1">
            <ChevronRight className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
