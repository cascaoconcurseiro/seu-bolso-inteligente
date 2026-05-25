import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Sparkles, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CategorySelector } from '../CategorySelector';
import { parseLocalDate } from '@/utils/dateUtils';
import { TabType } from '@/types/transactions';

interface BasicInfoSectionProps {
  description: string;
  setDescription: (v: string) => void;
  date: Date;
  setDate: (v: Date) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  activeTab: TabType;
  categories: any[];
  categoriesLoading: boolean;
  selectedTrip?: any;
  suggestion?: string;
  predictedCategoryId?: string | null;
  isPredicting?: boolean;
  onApplySuggestion?: () => void;
}

export function BasicInfoSection({
  description,
  setDescription,
  date,
  setDate,
  categoryId,
  setCategoryId,
  activeTab,
  categories,
  categoriesLoading,
  selectedTrip,
  suggestion,
  predictedCategoryId,
  isPredicting,
  onApplySuggestion
}: BasicInfoSectionProps) {
  const isTransfer = activeTab === 'TRANSFER';

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="space-y-2 relative">
        <Label>Descrição</Label>
        <div className="relative">
          <Input
            placeholder="Ex: Almoço, Uber, Salário"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-12 pr-10 text-lg relative z-10 bg-transparent"
          />
          
          {/* Autocomplete Hint (Ghost text behind input) */}
          {suggestion && suggestion.toLowerCase().startsWith(description.toLowerCase()) && description.length > 0 && (
            <div className="absolute inset-0 flex items-center h-12 px-3 text-lg pointer-events-none z-0">
              <span className="opacity-0">{description}</span>
              <span className="text-muted-foreground/40">{suggestion.slice(description.length)}</span>
            </div>
          )}

          {isPredicting && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isPredicting && suggestion && suggestion !== description && (
            <button
              type="button"
              onClick={onApplySuggestion}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-1.5 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 rounded-md transition-colors animate-pulse cursor-pointer"
              title="Completar sugestão da IA"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* AI Suggestion Chip (Mobile Keyboard Style) */}
        {suggestion && suggestion !== description && (
          <div className="flex items-center animate-fade-in -mt-1 mb-2">
            <button
              type="button"
              onClick={onApplySuggestion}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-100 dark:border-blue-800/50"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Sugestão da IA</span>
              </div>
              <span className="font-semibold text-base">{suggestion}</span>
            </button>
          </div>
        )}
      </div>

      {/* Date & Category (responsive: stacked on mobile, side by side on sm screens) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-12 justify-start text-left font-normal",
                  selectedTrip && (
                  format(date, 'yyyy-MM-dd') < selectedTrip.start_date ||
                  format(date, 'yyyy-MM-dd') > selectedTrip.end_date
                  ) && "border-amber-400 dark:border-amber-600"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "dd/MM/yy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {selectedTrip && (
            format(date, 'yyyy-MM-dd') < selectedTrip.start_date ||
            format(date, 'yyyy-MM-dd') > selectedTrip.end_date
          ) && (
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 leading-tight">
                ⚠️ Data fora do período da viagem ({format(parseLocalDate(selectedTrip.start_date), 'dd/MM/yy')} - {format(parseLocalDate(selectedTrip.end_date), 'dd/MM/yy')})
              </p>
            )}
        </div>

        {/* Category */}
        {!isTransfer ? (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Categoria
              {predictedCategoryId === categoryId && categoryId && (
                <Sparkles className="h-3 w-3 text-blue-500" title="Categoria sugerida pela IA" />
              )}
            </Label>

            {categoriesLoading ? (
              <Button
                variant="outline"
                disabled
                className="h-12 w-full justify-between font-normal"
              >
                <span className="text-muted-foreground">Carregando categorias...</span>
              </Button>
            ) : (
              <CategorySelector
                categories={categories || []}
                value={categoryId}
                onValueChange={setCategoryId}
                type={activeTab === 'INCOME' ? 'income' : 'expense'}
                placeholder="Selecione uma categoria"
              />
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Categoria</Label>
            <div className="h-12 flex items-center justify-center bg-muted rounded-md">
              <span className="text-xs font-bold text-muted-foreground">Automático</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
