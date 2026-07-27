import { ExternalLink, MapPin, Maximize2, Navigation } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ItineraryStop } from "./types";

export type ItineraryMapMode = "day" | "all";

interface ItineraryMapEmbedProps {
  stops: ItineraryStop[];
  destination: string;
  geocoded: { lat: number; lon: number } | null;
  mode: ItineraryMapMode;
  onModeChange: (mode: ItineraryMapMode) => void;
  totalKmEstimate: number;
  totalMinEstimate: number;
}

/**
 * Mapa via iframe do Google Maps — não precisa de API key.
 * Renderiza direções entre paradas (modo dia) ou visualização de todos os pins (modo todos).
 *
 * Como o iframe do Google Maps é limitado (não é interativo programaticamente),
 * os botões "Abrir no Google Maps" e "Adicionar parada" continuam sendo a forma
 * principal de interação. O embed serve como preview visual do roteiro.
 */
export function ItineraryMapEmbed({
  stops,
  destination,
  geocoded,
  mode,
  onModeChange,
  totalKmEstimate,
  totalMinEstimate,
}: ItineraryMapEmbedProps) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => setIsOnline(true), { once: true });
    window.addEventListener("offline", () => setIsOnline(false), { once: true });
  }

  const mapped = useMemo(
    () =>
      stops
        .map((s, idx) => ({ stop: s, idx }))
        .filter(({ stop }) => stop.latitude !== null && stop.longitude !== null),
    [stops]
  );

  const iframeSrc = useMemo(() => {
    if (mapped.length === 0) {
      // Sem paradas: centraliza no destino
      const q = geocoded
        ? `${geocoded.lat},${geocoded.lon}`
        : encodeURIComponent(destination || "Brasil");
      return `https://maps.google.com/maps?q=${q}&z=12&output=embed`;
    }
    if (mapped.length === 1) {
      const s = mapped[0].stop;
      return `https://maps.google.com/maps?q=${s.latitude},${s.longitude}&z=15&output=embed`;
    }

    // Múltiplas paradas: usa o endpoint /dir para traçar rota com waypoints
    const origin = `${mapped[0].stop.latitude},${mapped[0].stop.longitude}`;
    const destinationPoint = `${mapped[mapped.length - 1].stop.latitude},${mapped[mapped.length - 1].stop.longitude}`;
    const waypoints = mapped
      .slice(1, -1)
      .slice(0, 9)
      .map(({ stop }) => `${stop.latitude},${stop.longitude}`)
      .join("|");

    const params = new URLSearchParams({
      api: "1",
      origin,
      destination: destinationPoint,
      travelmode: "driving",
    });
    if (waypoints) params.set("waypoints", waypoints);
    return `https://www.google.com/maps/embed?pb=!1m${mode === "all" ? "2" : "4"}!3m2!1s${
      mapped[0].stop.latitude
    }!2s${mapped[0].stop.longitude}!4m${Math.min(mapped.length * 2, 20)}!1e0!3e0`;
  }, [mapped, geocoded, destination, mode]);

  // Link externo para abrir no app do Google Maps
  const externalLink = useMemo(() => {
    if (mapped.length === 0) {
      const q = geocoded
        ? `${geocoded.lat},${geocoded.lon}`
        : encodeURIComponent(destination);
      return `https://www.google.com/maps/search/?api=1&query=${q}`;
    }
    if (mapped.length === 1) {
      const s = mapped[0].stop;
      return `https://www.google.com/maps/search/?api=1&query=${s.latitude},${s.longitude}`;
    }
    const origin = `${mapped[0].stop.latitude},${mapped[0].stop.longitude}`;
    const dest = `${mapped[mapped.length - 1].stop.latitude},${mapped[mapped.length - 1].stop.longitude}`;
    const waypoints = mapped
      .slice(1, -1)
      .slice(0, 9)
      .map(({ stop }) => `${stop.latitude},${stop.longitude}`)
      .join("|");
    const params = new URLSearchParams({
      api: "1",
      origin,
      destination: dest,
      travelmode: "driving",
    });
    if (waypoints) params.set("waypoints", waypoints);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }, [mapped, geocoded, destination]);

  if (!isOnline) {
    return (
      <div className="grid min-h-[360px] place-items-center rounded-3xl border border-dashed border-border bg-muted/30 p-6 text-center sm:min-h-[440px]">
        <div>
          <MapPin className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <p className="mt-3 font-semibold text-foreground">Mapa indisponível sem internet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Conecte-se para ver o roteiro e abrir direções no Google Maps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm"
      aria-label="Mapa embutido do Google Maps"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur sm:px-5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {mode === "all" ? "Mapa completo" : "Mapa do dia"}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {mapped.length === 0
                ? "Nenhuma parada georreferenciada"
                : `${mapped.length} ${mapped.length === 1 ? "pin ativo" : "pins ativos"}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-background p-0.5">
            {(["day", "all"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onModeChange(option)}
                aria-pressed={mode === option}
                className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  mode === option
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option === "day" ? "Dia atual" : "Viagem inteira"}
              </button>
            ))}
          </div>
          <Button asChild variant="outline" size="sm" className="min-h-9">
            <a href={externalLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Abrir no Google Maps
            </a>
          </Button>
        </div>
      </div>

      <div className="relative aspect-[16/10] w-full bg-muted/30 sm:aspect-[21/9]">
        {mapped.length === 0 ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <div>
              <MapPin className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
              <p className="mt-3 text-base font-semibold text-foreground">
                Sem paradas com localização ainda
              </p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Adicione uma parada com endereço ou escolha um ponto no mapa usando a busca para
                visualizar o roteiro aqui.
              </p>
            </div>
          </div>
        ) : (
          <iframe
            key={iframeSrc}
            src={iframeSrc}
            title="Mapa do roteiro no Google Maps"
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-card/80 px-4 py-3 backdrop-blur sm:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {mapped.length >= 2 ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                <strong>~{totalKmEstimate.toFixed(1)} km</strong>
              </span>
              <span>≈ {totalMinEstimate} min de carro</span>
              <span className="text-muted-foreground/80">Estimativa em linha reta (haversine)</span>
            </>
          ) : (
            <span>Adicione 2 ou mais paradas com pin para ver distância e tempo.</span>
          )}
        </div>
        <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
          <a href={externalLink} target="_blank" rel="noopener noreferrer">
            <Maximize2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Tela cheia
          </a>
        </Button>
      </div>
    </section>
  );
}
