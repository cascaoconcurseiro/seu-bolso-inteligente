import { CalendarDays } from "lucide-react";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DayWeather } from "@/services/weatherService";

export interface PlannerDay {
  date: string;
  label: string;
  itemCount: number;
  weather?: DayWeather;
}

interface ItineraryDaysRailProps {
  days: PlannerDay[];
  activeDate: string;
  onSelect: (date: string) => void;
}

export function ItineraryDaysRail({ days, activeDate, onSelect }: ItineraryDaysRailProps) {
  if (days.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Dias da viagem" className="min-w-0">
      <div className="mb-2 flex items-center gap-2 px-1">
        <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Dias da viagem
        </h2>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {days.map((day, index) => {
          const isActive = activeDate === day.date;
          const dateObj = dateFns.parseISO(day.date);
          const weekday = dateFns.format(dateObj, "EEE", { locale: ptBR });
          const dayNumber = dateFns.format(dateObj, "dd");
          const monthShort = dateFns.format(dateObj, "MMM", { locale: ptBR });
          const isFirst = index === 0;
          const isLast = index === days.length - 1;

          return (
            <button
              key={day.date}
              type="button"
              aria-current={isActive ? "date" : undefined}
              onClick={() => onSelect(day.date)}
              className={`group relative flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-3 py-2.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-w-[88px] ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border/70 bg-card text-foreground hover:border-primary/40 hover:bg-accent/40"
              }`}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                }`}
              >
                {isFirst ? "Início" : isLast ? "Fim" : weekday}
              </span>
              <span className="text-xl font-black leading-none">{dayNumber}</span>
              <span
                className={`text-[10px] font-medium uppercase ${
                  isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                }`}
              >
                {monthShort}
              </span>
              <span
                className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {day.itemCount > 0 ? (
                  <>
                    <span>{day.itemCount}</span>
                    <span className="opacity-70">paradas</span>
                  </>
                ) : (
                  <span className="opacity-70">Livre</span>
                )}
                {day.weather && (
                  <span aria-hidden="true" className="ml-0.5">
                    {day.weather.icon}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
