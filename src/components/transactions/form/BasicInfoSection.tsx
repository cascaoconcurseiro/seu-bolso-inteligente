import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CategorySelector } from '../CategorySelector';
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
  prediction?: any;
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
  prediction
}: BasicInfoSectionProps) {
  const isTransfer = activeTab === 'TRANSFER';

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Input
          placeholder="Ex: Almoço, Uber, Salário"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-12"
        />
      </div>

      {/* Date & Category (side by side) */}
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
                ⚠️ Data fora do período da viagem ({format(new Date(selectedTrip.start_date), 'dd/MM/yy')} - {format(new Date(selectedTrip.end_date), 'dd/MM/yy')})
              </p>
            )}
        </div>

        {/* Category */}
        {!isTransfer ? (
          <div className="space-y-2">
            <Label>Categoria</Label>

            {/* Badge de Sugestão */}
            {prediction && (
              <div className="flex items-center gap-2 mb-2 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="h-3 w-3" />
                  Sugestão: {prediction.categoryName}
                  <button
                    type="button"
                    onClick={() => setCategoryId(prediction.categoryId)}
                    className="ml-2 px-1.5 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-[10px]"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

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
