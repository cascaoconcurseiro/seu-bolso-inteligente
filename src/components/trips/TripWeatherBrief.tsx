import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Luggage,
  Snowflake,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Trip } from "@/hooks/useTrips";
import { fetchWeatherForecast, type DayWeather } from "@/services/weatherService";

interface TripWeatherBriefProps {
  trip: Trip;
}

function WeatherIcon({ code, className = "h-5 w-5" }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={className} aria-hidden="true" />;
  if (code <= 3) return <CloudSun className={className} aria-hidden="true" />;
  if (code === 45 || code === 48) return <Cloud className={className} aria-hidden="true" />;
  if (code >= 51 && code <= 82) return <CloudRain className={className} aria-hidden="true" />;
  if (code >= 71 && code <= 77) return <Snowflake className={className} aria-hidden="true" />;
  if (code >= 95) return <CloudLightning className={className} aria-hidden="true" />;
  return <Cloud className={className} aria-hidden="true" />;
}

function buildPackingAdvice(days: DayWeather[]): string[] {
  if (!days.length) return [];

  const advice: string[] = [];
  const rainPeak = Math.max(...days.map((day) => day.precipitationProb ?? 0));
  const hottest = Math.max(...days.map((day) => day.maxTemp));
  const coldest = Math.min(...days.map((day) => day.minTemp));
  const windPeak = Math.max(...days.map((day) => day.windMax ?? 0));
  const uvPeak = Math.max(...days.map((day) => day.uvIndexMax ?? 0));
  const hasSnow = days.some((day) => day.weatherCode >= 71 && day.weatherCode <= 77);

  if (rainPeak >= 45) advice.push("Inclua capa de chuva ou guarda-chuva compacto.");
  if (coldest <= 12) advice.push("Leve uma camada quente para manhãs e noites.");
  if (hottest >= 28 || uvPeak >= 6) advice.push("Separe protetor solar e uma garrafa de água.");
  if (windPeak >= 35) advice.push("Um corta-vento deve ser útil nos dias mais expostos.");
  if (hasSnow) advice.push("Priorize calçado impermeável e proteção térmica.");

  return advice.slice(0, 3);
}

function ForecastCard({ day }: { day: DayWeather }) {
  return (
    <article className="min-w-[145px] rounded-2xl border border-border/70 bg-background/75 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {format(parseISO(day.date), "EEE", { locale: ptBR })}
          </p>
          <p className="text-sm font-semibold">{format(parseISO(day.date), "dd MMM", { locale: ptBR })}</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <WeatherIcon code={day.weatherCode} />
        </span>
      </div>

      <p className="mt-3 line-clamp-2 min-h-8 text-xs text-muted-foreground">{day.description}</p>
      <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <span>{day.maxTemp}°</span>
        <span className="text-muted-foreground">{day.minTemp}°</span>
      </div>
      {day.precipitationProb !== null && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
          {day.precipitationProb}% de chuva
        </div>
      )}
    </article>
  );
}

export function TripWeatherBrief({ trip }: TripWeatherBriefProps) {
  const latitude = trip.latitude;
  const longitude = trip.longitude;

  const { data = {}, isLoading, isError } = useQuery({
    queryKey: ["trip-weather-brief", trip.id, latitude, longitude],
    queryFn: () => fetchWeatherForecast(Number(latitude), Number(longitude)),
    enabled: latitude !== null && longitude !== null,
    staleTime: 1000 * 60 * 60 * 6,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });

  const tripForecast = useMemo(
    () =>
      Object.values(data)
        .filter((day) => day.date >= trip.start_date && day.date <= trip.end_date)
        .sort((left, right) => left.date.localeCompare(right.date)),
    [data, trip.end_date, trip.start_date]
  );

  const advice = useMemo(() => buildPackingAdvice(tripForecast), [tripForecast]);
  const rainPeak = tripForecast.length
    ? Math.max(...tripForecast.map((day) => day.precipitationProb ?? 0))
    : 0;
  const windPeak = tripForecast.length
    ? Math.max(...tripForecast.map((day) => day.windMax ?? 0))
    : 0;

  return (
    <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm" aria-labelledby="trip-weather-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <CloudSun className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="trip-weather-title" className="font-semibold">Clima da viagem</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Previsão gratuita para organizar roteiro e mala.
            </p>
          </div>
        </div>

        {tripForecast.length > 0 && (
          <div className="flex gap-2 text-xs text-muted-foreground">
            {rainPeak >= 45 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 font-medium text-blue-700 dark:text-blue-300">
                <CloudRain className="h-3.5 w-3.5" /> Chuva até {rainPeak}%
              </span>
            )}
            {windPeak >= 35 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
                <Wind className="h-3.5 w-3.5" /> Vento forte
              </span>
            )}
          </div>
        )}
      </div>

      {latitude === null || longitude === null ? (
        <div className="flex items-start gap-3 px-5 py-5 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Defina a localização do destino para receber a previsão.
        </div>
      ) : isLoading ? (
        <div className="flex gap-3 overflow-hidden px-4 py-5 sm:px-5" role="status" aria-label="Carregando previsão">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-36 min-w-[145px] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="px-5 py-5 text-sm text-muted-foreground">
          Não foi possível consultar o clima agora. O restante da viagem continua disponível.
        </div>
      ) : tripForecast.length === 0 ? (
        <div className="flex items-start gap-3 px-5 py-5 text-sm text-muted-foreground">
          <Thermometer className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          A previsão detalhada aparecerá quando a viagem estiver dentro da janela de 16 dias.
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            {tripForecast.map((day) => <ForecastCard key={day.date} day={day} />)}
          </div>

          <aside className="rounded-2xl bg-muted/45 p-4">
            <div className="flex items-center gap-2">
              <Luggage className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Sugestões para a mala</h3>
            </div>
            {advice.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {advice.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Não há extremos importantes na previsão disponível.
              </p>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
