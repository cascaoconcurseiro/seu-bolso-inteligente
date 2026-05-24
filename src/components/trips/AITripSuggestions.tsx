import React, { useState } from 'react';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AIAdvisorService } from '@/services/aiAdvisorService';
import { toast } from 'sonner';

interface AITripSuggestionsProps {
  type: 'shopping' | 'itinerary' | 'checklist';
  destination: string;
  currency?: string;
  onApply: (selectedItems: any[]) => void;
  buttonClassName?: string;
}

export function AITripSuggestions({
  type,
  destination,
  currency = 'BRL',
  onApply,
  buttonClassName
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
        results = await AIAdvisorService.suggestTripChecklist(destination);
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
    checklist: 'Sugestões de Checklist'
  };

  const descriptions = {
    shopping: 'Itens comuns que viajantes compram neste destino.',
    itinerary: 'Passeios e atividades imperdíveis.',
    checklist: 'Itens essenciais para levar na mala ou providenciar.'
  };

  return (
    <>
      <Button 
        onClick={handleOpen} 
        variant="outline" 
        size="sm"
        className={buttonClassName || "bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-700 dark:from-blue-900/30 dark:to-indigo-900/30 dark:border-blue-800/50 dark:text-blue-300"}
      >
        <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
        Consultoria IA
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Sparkles className="h-5 w-5" />
              {titles[type]}
            </DialogTitle>
            <DialogDescription>
              {descriptions[type]} em <strong>{destination}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-500" />
                  <p>A IA está montando sugestões personalizadas para {destination}...</p>
                </div>
                {/* Skeletons */}
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-start space-x-3 p-3 rounded-lg border border-border/50 bg-muted/20 animate-pulse">
                    <div className="w-4 h-4 rounded bg-muted-foreground/20 mt-1" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
                      <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Não foi possível gerar sugestões no momento. Tente novamente.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    {selectedIndices.size} de {suggestions.length} selecionados
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-8"
                    onClick={() => {
                      if (selectedIndices.size === suggestions.length) {
                        setSelectedIndices(new Set());
                      } else {
                        setSelectedIndices(new Set(suggestions.map((_, i) => i)));
                      }
                    }}
                  >
                    {selectedIndices.size === suggestions.length ? 'Desmarcar todos' : 'Marcar todos'}
                  </Button>
                </div>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {suggestions.map((item, index) => (
                    <div 
                      key={index}
                      className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedIndices.has(index) 
                          ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20' 
                          : 'border-border/50 hover:bg-muted/50'
                      }`}
                      onClick={() => toggleSelection(index)}
                    >
                      <Checkbox 
                        checked={selectedIndices.has(index)}
                        onCheckedChange={() => toggleSelection(index)}
                        className="mt-1 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-tight">
                          {type === 'shopping' && item.item}
                          {type === 'itinerary' && item.title}
                          {type === 'checklist' && item.item}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {type === 'shopping' && `Custo estimado: ${currency} ${item.estimatedCost.toFixed(2)}`}
                          {type === 'itinerary' && `${item.location} • Aprox. ${item.durationHours}h`}
                          {type === 'checklist' && `Categoria: ${item.category}`}
                        </p>
                        {type === 'itinerary' && item.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleApply} 
              disabled={isLoading || suggestions.length === 0 || selectedIndices.size === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Adicionar {selectedIndices.size} {selectedIndices.size === 1 ? 'item' : 'itens'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
