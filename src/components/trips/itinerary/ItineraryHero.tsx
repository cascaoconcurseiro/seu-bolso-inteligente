import {
  ArrowLeft,
  Calendar,
  FileText,
  MapPin,
  Plus,
  Route as RouteIcon,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { Trip } from "@/hooks/useTrips";
import {
  getFastDestinationCoverImage,
  fetchDestinationCoverImage,
} from "@/services/destinationImageService";

interface ItineraryHeroProps {
  trip: Trip;
  totalStops: number;
  dayCount: number;
  geocoded: { lat: number; lon: number } | null;
  onAddStop: () => void;
  onSearchPlaces: () => void;
  onOptimize: () => void;
  onImport: () => void;
  onExportPdf: () => void;
}

export function ItineraryHero({
  trip,
  totalStops,
  dayCount,
  geocoded,
  onAddStop,
  onSearchPlaces,
  onOptimize,
  onImport,
  onExportPdf,
}: ItineraryHeroProps) {
  const startLabel = dateFns.format(dateFns.parseISO(trip.start_date), "dd MMM", { locale: ptBR });
  const endLabel = dateFns.format(dateFns.parseISO(trip.end_date), "dd MMM yyyy", { locale: ptBR });
  const destination = trip.destination || trip.name;

  const [coverUrl, setCoverUrl] = useState<string>(
    () => trip.cover_image || getFastDestinationCoverImage(destination)
  );

  useEffect(() => {
    if (trip.cover_image) {
      setCoverUrl(trip.cover_image);
      return;
    }
    let isCancelled = false;
    fetchDestinationCoverImage(destination).then((url) => {
      if (!isCancelled && url) setCoverUrl(url);
    });
    return () => {
      isCancelled = true;
    };
  }, [trip.cover_image, destination]);

  return (
    <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-card px-5 py-6 sm:px-7 sm:py-7">
      {coverUrl && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={coverUrl}
            alt={destination}
            className="h-full w-full object-cover opacity-25 dark:opacity-30 transition-opacity duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/85 to-card/40" />
        </div>
      )}

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 self-start text-muted-foreground hover:text-foreground"
          >
            <a href={`/viagens/${trip.id}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Voltar para a viagem
            </a>
          </Button>

          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <RouteIcon className="h-3 w-3" aria-hidden="true" />
              Organização de roteiro
            </p>
            <h1 className="font-display text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              {destination}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {startLabel} – {endLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {totalStops} {totalStops === 1 ? "parada" : "paradas"} em {dayCount}{" "}
                {dayCount === 1 ? "dia" : "dias"}
              </span>
              {geocoded ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  Localização confirmada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                  Aguardando geocodificação
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={onSearchPlaces}
          >
            <Search className="mr-2 h-4 w-4" aria-hidden="true" />
            Buscar lugares
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            onClick={onOptimize}
            disabled={totalStops < 2}
          >
            <RouteIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            Otimizar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 text-sky-600 hover:text-sky-700 dark:text-sky-400"
            onClick={onImport}
          >
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Importar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={onExportPdf}
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 text-violet-600 hover:text-violet-700 dark:text-violet-400"
            disabled
            title="Sugestões com IA — abra o painel lateral para gerar"
          >
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            Sugestões IA
          </Button>
          <Button type="button" className="min-h-11 shadow-sm" onClick={onAddStop}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Adicionar parada
          </Button>
        </div>
      </div>
    </header>
  );
}
