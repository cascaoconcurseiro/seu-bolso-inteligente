import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AIAdvisorService } from '@/services/aiAdvisorService';
import { Loader2, MapPin, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface AITripSuggestionsProps {
  type: 'shopping' | 'itinerary' | 'checklist';
  destination: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  onApply: (selectedItems: any[]) => void;
  buttonClassName?: string;
}

export function AITripSuggestions({
  type,
  destination,
  currency = 'BRL',
  startDate,
  endDate,
  onApply,
  buttonClassName,
}: AITripSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const handleOpen = async () => {
    if (!destination) {
      toast.error('O destino da viagem precisa estar preenchido para receber sugestões.');
      return;
    }

    setIsOpen(true);
    setSuggestions([]);
    setSelectedIndices(new Set());
    setIsLoading(true);

    try {
      let results: any[] = [];
      if (type === 'shopping') {
        results = await AIAdvisorService.suggestTripShopping(destination, currency);
      } else if (type === 'itinerary') {
        results = await AIAdvisorService.suggestTripItinerary(destination);
      } else if (type === 'checklist') {
        results = await AIAdvisorService.suggestTripChecklist(destination, startDate, endDate);
      }

      setSuggestions(results);
      // Selecionar todos por padrão
      setSelectedIndices(new Set(results.map((_, i) => i)));
    } catch (error) {
      toast.error('Erro ao buscar sugestões da IA.');
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleApply = () => {
    const selectedItems = suggestions.filter((_, i) => selectedIndices.has(i));
    onApply(selectedItems);
    setIsOpen(false);
  };

  const titles = {
    shopping: 'Sugestões de Compras',
    itinerary: 'Sugestões de Roteiro',
    checklist: 'Sugestões de Checklist',
  };

  const descriptions = {
    shopping: 'Itens comuns que viajantes compram neste destino.',
    itinerary: 'Passeios e atividades imperdíveis.',
    checklist: 'Itens essenciais para levar na mala ou providenciar.',
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outline"
        size="sm"
        className={
          buttonClassName ||
          'relative overflow-hidden group bg-accent hover:bg-accent/92 text-white border-none shadow-lg shadow-accent/25 transition-all duration-300 hover:scale-105 active:scale-95'
        }
      >
        <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-1000 -skew-x-12 -translate-x-full z-0" />
        <Sparkles className="h-4 w-4 mr-2 text-accent-foreground relative z-10" />
        <span className="font-bold tracking-wide relative z-10">Consultoria IA</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-full sm:max-w-[500px] !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-lg !rounded-b-none sm:!rounded-b-lg p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background pb-[env(safe-area-inset-bottom)] overflow-hidden">
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-12 h-2 bg-muted rounded-full" />
          </div>

          <DialogHeader className="px-6 pt-2 pb-2 text-left shrink-0">
            <DialogTitle className="flex items-center gap-2 text-accent">
              <Sparkles className="h-5 w-5" />
              {titles[type]}
            </DialogTitle>
            <DialogDescription>
              {descriptions[type]} em <strong>{destination}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-2 overflow-y-auto hide-scrollbar space-y-3 flex-1">
            {isLoading ? (
              <div className="space-y-3">
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-accent" />
                  <p className="text-sm text-center">
                    A IA está montando sugestões personalizadas para {destination}...
                  </p>
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-start space-x-3 p-3 rounded-xl border border-border/50 bg-muted/20 animate-pulse"
                  >
                    <div className="w-4 h-4 rounded bg-muted-foreground/20 mt-1 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
                      <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Não foi possível gerar sugestões no momento. Tente novamente.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    {selectedIndices.size} de {suggestions.length} selecionados
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm h-8 text-accent"
                    onClick={() => {
                      if (selectedIndices.size === suggestions.length) {
                        setSelectedIndices(new Set());
                      } else {
                        setSelectedIndices(new Set(suggestions.map((_, i) => i)));
                      }
                    }}
                  >
                    {selectedIndices.size === suggestions.length
                      ? 'Desmarcar todos'
                      : 'Marcar todos'}
                  </Button>
                </div>

                <div className="space-y-2">
                  {suggestions.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-start space-x-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                        selectedIndices.has(index)
                          ? 'border-accent/50 bg-accent/10 dark:bg-accent/20'
                          : 'border-border/50 hover:bg-muted/50'
                      }`}
                      onClick={() => toggleSelection(index)}
                    >
                      <Checkbox
                        checked={selectedIndices.has(index)}
                        onCheckedChange={() => toggleSelection(index)}
                        className="mt-1 data-[state=checked]:bg-accent data-[state=checked]:border-accent shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-tight">
                          {type === 'shopping' && item.item}
                          {type === 'itinerary' && item.title}
                          {type === 'checklist' && item.item}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {type === 'shopping' &&
                            `Custo estimado: ${currency} ${item.estimatedCost?.toFixed(2)}`}
                          {type === 'itinerary' &&
                            `${item.location} • Aprox. ${item.durationHours}h`}
                          {type === 'checklist' && item.category}
                        </p>
                        {type === 'itinerary' && item.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        {type === 'itinerary' && (
                          <div className="flex gap-1 mt-2">
                            <a
                              href={item.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.title + (item.location ? ', ' + item.location : '') + ', ' + destination)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                              title={item.mapsUrl ? 'Abrir localização exata no Google Maps' : 'Buscar no Google Maps'}
                            >
                              <MapPin className="h-3 w-3" />
                              Maps{item.mapsUrl ? ' ✓' : ''}
                            </a>
                            {item.rating && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-1 rounded-md bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
                                ⭐ {item.rating}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 flex gap-3 justify-end border-t border-border/50 shrink-0">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleApply}
              disabled={isLoading || suggestions.length === 0 || selectedIndices.size === 0}
              className="bg-accent hover:bg-accent/90 text-white"
            >
              Adicionar {selectedIndices.size} {selectedIndices.size === 1 ? 'item' : 'itens'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
