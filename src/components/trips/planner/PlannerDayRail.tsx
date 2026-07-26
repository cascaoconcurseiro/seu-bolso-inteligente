import { CalendarDays } from "lucide-react";
import type { DayWeather } from "@/services/weatherService";

export interface PlannerDay {
  date: string;
  label: string;
  itemCount: number;
  weather?: DayWeather;
}

interface PlannerDayRailProps {
  days: PlannerDay[];
  activeDate: string;
  onSelect: (date: string) => void;
}

export function PlannerDayRail({ days, activeDate, onSelect }: PlannerDayRailProps) {
  return (
    <nav aria-label="Dias da viagem" className="min-w-0">
      <div className="mb-3 flex items-center gap-2 px-1">
        <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Dias
        </h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
        {days.map((day, index) => {
          const isActive = activeDate === day.date;
          return (
            <button
              key={day.date}
              type="button"
              aria-current={isActive ? "date" : undefined}
              onClick={() => onSelect(day.date)}
              className={`min-h-11 min-w-36 shrink-0 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:min-w-0 ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-background hover:border-primary/40 hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="block text-xs font-medium opacity-75">Dia {index + 1}</span>
                {day.weather && (
                  <span className="text-xs flex items-center gap-1 font-semibold" title={day.weather.description}>
                    <span>{day.weather.icon}</span>
                    <span className="text-[10px]">{day.weather.maxTemp}°C</span>
                  </span>
                )}
              </div>
              <span className="block truncate text-sm font-semibold">{day.label}</span>
              <span className="mt-1 block text-xs opacity-80">
                {day.itemCount === 0
                  ? "Dia livre"
                  : `${day.itemCount} ${day.itemCount === 1 ? "parada" : "paradas"}`}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
