import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Route, Check, MapPin, ArrowRight, ExternalLink } from "lucide-react";
import { buildGoogleMapsUrl } from "@/services/overpassService";
import { toast } from "sonner";

interface Stop {
  id: string;
  title: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface RouteOptimizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stops: Stop[];
  onApplyOptimization: (orderedIds: string[]) => void;
}

// Algoritmo do Vizinho Mais Próximo (Nearest Neighbor TSP heuristic)
function optimizeStopsOrder(stops: Stop[]): { optimized: Stop[]; totalDistKm: number } {
  const validStops = stops.filter((s) => s.latitude !== null && s.longitude !== null);
  if (validStops.length <= 1) return { optimized: stops, totalDistKm: 0 };

  const unvisited = [...validStops];
  const result: Stop[] = [];
  let current = unvisited.shift()!;
  result.push(current);
  let totalDistKm = 0;

  function haversineDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // raio da terra em km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const candidate = unvisited[i];
      const dist = haversineDistKm(
        current.latitude!,
        current.longitude!,
        candidate.latitude!,
        candidate.longitude!
      );
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }

    current = unvisited.splice(nearestIdx, 1)[0];
    result.push(current);
    totalDistKm += minDist;
  }

  // Adiciona paradas sem coordenadas no final
  const invalidStops = stops.filter((s) => s.latitude === null || s.longitude === null);
  return { optimized: [...result, ...invalidStops], totalDistKm: Math.round(totalDistKm * 10) / 10 };
}

export function RouteOptimizerDialog({
  open,
  onOpenChange,
  stops,
  onApplyOptimization,
}: RouteOptimizerDialogProps) {
  const [optimizedResult, setOptimizedResult] = useState<{ optimized: Stop[]; totalDistKm: number } | null>(null);

  const handleCalculate = () => {
    const res = optimizeStopsOrder(stops);
    setOptimizedResult(res);
  };

  const handleApply = () => {
    if (!optimizedResult) return;
    onApplyOptimization(optimizedResult.optimized.map((s) => s.id));
    onOpenChange(false);
    toast.success("Ordem do roteiro otimizada com sucesso!");
  };

  const handleExportGoogleMaps = () => {
    if (!optimizedResult) return;
    const waypoints = optimizedResult.optimized
      .filter((s) => s.latitude && s.longitude)
      .map((s) => ({
        location: s.title,
        lat: s.latitude!,
        lon: s.longitude!,
      }));

    if (waypoints.length > 0) {
      const url = buildGoogleMapsUrl(waypoints);
      window.open(url, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-emerald-600" />
            Otimizador Inteligente de Rota do Dia
          </DialogTitle>
          <DialogDescription>
            Reordene automaticamente as paradas do dia para percorrer a menor distância entre os pontos.
          </DialogDescription>
        </DialogHeader>

        {!optimizedResult ? (
          <div className="py-6 text-center space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <Route className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Você possui <strong>{stops.length}</strong> atrações/paradas cadastradas neste dia.
            </p>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
              onClick={handleCalculate}
            >
              Calcular Melhor Rota
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                Distância estimada de deslocamento:
              </span>
              <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                ~{optimizedResult.totalDistKm} km
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Sequência Sugerida:
              </span>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {optimizedResult.optimized.map((stop, idx) => (
                  <div
                    key={stop.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border text-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div className="truncate flex-1">
                      <span className="font-medium">{stop.title}</span>
                      {stop.location && (
                        <p className="text-[10px] text-slate-400 truncate">{stop.location}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 text-xs gap-1.5"
                onClick={handleExportGoogleMaps}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Abrir no Maps
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                onClick={handleApply}
              >
                <Check className="h-3.5 w-3.5" /> Aplicar Ordem
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
