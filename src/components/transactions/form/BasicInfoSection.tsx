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
import { useTransactionStore } from '@/store/useTransactionStore';

interface BasicInfoSectionProps {
  categories: any[];
  categoriesLoading: boolean;
  selectedTrip?: any;
  predictedCategoryId?: string | null;
  isPredicting?: boolean;
}

export function BasicInfoSection({
  categories,
  categoriesLoading,
  selectedTrip,
  predictedCategoryId,
  isPredicting,
}: BasicInfoSectionProps) {
  const description = useTransactionStore((state) => state.description);
  const setDescription = useTransactionStore((state) => state.setDescription);
  const date = useTransactionStore((state) => state.date);
  const setDate = useTransactionStore((state) => state.setDate);
  const categoryId = useTransactionStore((state) => state.categoryId);
  const _setCategoryId = useTransactionStore((state) => state.setCategoryId);
  const _setHasUserSelectedCategoryManually = useTransactionStore((state) => state.setHasUserSelectedCategoryManually);
  
  const setCategoryId = (id: string) => {
    _setCategoryId(id);
    _setHasUserSelectedCategoryManually(true);
  };
  const activeTab = useTransactionStore((state) => state.activeTab);

  const isTransfer = activeTab === 'TRANSFER';

  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="space-y-2 relative">
        <Label>Descrição</Label>
        <div className="relative">
          <Input
            placeholder="Ex: Almoço, Uber, Salário"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="pr-10 text-base relative z-10 bg-transparent"
          />
          
          {isPredicting && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Date & Category (responsive: stacked on mobile, side by side on sm screens) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Data</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
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
              <p className="text-sm font-bold text-warning dark:text-warning leading-tight">
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
                <Sparkles className="h-3 w-3 text-accent" title="Categoria sugerida pela IA" />
              )}
            </Label>

            {categoriesLoading ? (
              <Button
                variant="outline"
                disabled
                className="w-full justify-between font-normal"
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
            <div className="h-10 flex items-center justify-center bg-muted rounded-md">
              <span className="text-sm font-bold text-muted-foreground">Automático</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
