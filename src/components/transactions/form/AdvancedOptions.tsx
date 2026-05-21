import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, RefreshCw, RotateCcw, Repeat, Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdvancedOptionsProps {
  isExpense: boolean;
  isCreditCard: boolean;
  isInstallment: boolean;
  setIsInstallment: (v: boolean) => void;
  totalInstallments: number;
  setTotalInstallments: (v: number) => void;
  isRefund: boolean;
  setIsRefund: (v: boolean) => void;
  isRecurring: boolean;
  setIsRecurring: (v: boolean) => void;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  setFrequency: (v: any) => void;
  recurrenceDay: number;
  setRecurrenceDay: (v: number) => void;
  enableNotification: boolean;
  setEnableNotification: (v: boolean) => void;
  notificationDate: Date | undefined;
  setNotificationDate: (v: Date | undefined) => void;
  currencySymbol: string;
  numericAmount: number;
}

export function AdvancedOptions({
  isExpense,
  isCreditCard,
  isInstallment,
  setIsInstallment,
  totalInstallments,
  setTotalInstallments,
  isRefund,
  setIsRefund,
  isRecurring,
  setIsRecurring,
  frequency,
  setFrequency,
  recurrenceDay,
  setRecurrenceDay,
  enableNotification,
  setEnableNotification,
  notificationDate,
  setNotificationDate,
  currencySymbol,
  numericAmount
}: AdvancedOptionsProps) {
  return (
    <div className="space-y-4">
      {/* Installments (manual, non-credit card only) */}
      {isExpense && !isCreditCard && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-4">
          <label className="flex items-center justify-between cursor-pointer select-none py-1">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Parcelar Despesa</p>
                <p className="text-sm text-muted-foreground">
                  Parcelamento manual (ex: empréstimo pessoal)
                </p>
              </div>
            </div>
            <Switch 
              checked={isInstallment} 
              onCheckedChange={(v) => {
                setIsInstallment(v);
                if (v && totalInstallments < 2) setTotalInstallments(2);
              }} 
            />
          </label>

          {isInstallment && (
            <div className="space-y-3 animate-slide-in">
              <div className="space-y-2">
                <Label>Número de parcelas</Label>
                <Select
                  value={totalInstallments.toString()}
                  onValueChange={(v) => setTotalInstallments(parseInt(v))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}x de {currencySymbol}{' '}
                        {(numericAmount / n).toFixed(2).replace('.', ',')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">ℹ️</span>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                    Para que serve este parcelamento?
                  </p>
                  <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-400">
                    Use este modo <strong>apenas para acordos manuais fora do cartão</strong> — por exemplo:
                    uma pessoa te emprestou R$ 300 e você vai devolver R$ 100 por mês durante 3 meses.
                  </p>
                  <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-400">
                    ⚠️ Isso cria <strong>{totalInstallments} transação(ões) separada(s)</strong>, uma por mês.
                    Para compras no <strong>cartão de crédito</strong>, use o seletor de parcelas que aparece
                    automaticamente ao selecionar a conta do cartão.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Refund (any expense) */}
      {isExpense && (
        <div className="p-4 rounded-xl border border-border space-y-4">
          <label className="flex items-center justify-between cursor-pointer select-none py-1">
            <div className="flex items-center gap-3">
              <RotateCcw className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Reembolso</p>
                <p className="text-sm text-muted-foreground">
                  Devolução de uma despesa anterior
                </p>
              </div>
            </div>
            <Switch checked={isRefund} onCheckedChange={setIsRefund} />
          </label>
        </div>
      )}

      {/* Recurring (any type) */}
      <div className="p-4 rounded-xl border border-border space-y-4">
        <label className="flex items-center justify-between cursor-pointer select-none py-1">
          <div className="flex items-center gap-3">
            <Repeat className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Recorrente</p>
              <p className="text-sm text-muted-foreground">
                Repetir automaticamente
              </p>
            </div>
          </div>
          <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
        </label>

        {isRecurring && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Diariamente</SelectItem>
                  <SelectItem value="WEEKLY">Semanalmente</SelectItem>
                  <SelectItem value="MONTHLY">Mensalmente</SelectItem>
                  <SelectItem value="YEARLY">Anualmente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {frequency === 'MONTHLY' && (
              <div className="space-y-2">
                <Label>Dia do mês</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={recurrenceDay}
                  onChange={(e) => setRecurrenceDay(parseInt(e.target.value) || 1)}
                  placeholder="1-31"
                />
                <p className="text-xs text-muted-foreground">
                  Dia em que a transação será repetida todo mês
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="p-4 rounded-xl border border-border space-y-4">
        <label className="flex items-center justify-between cursor-pointer select-none py-1">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Notificação</p>
              <p className="text-sm text-muted-foreground">
                Lembrete antes do vencimento
              </p>
            </div>
          </div>
          <Switch checked={enableNotification} onCheckedChange={setEnableNotification} />
        </label>

        {enableNotification && (
          <div className="space-y-2">
            <Label>Data da notificação</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {notificationDate ? format(notificationDate, "dd/MM/yyyy", { locale: ptBR }) : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={notificationDate}
                  onSelect={setNotificationDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Você receberá um lembrete nesta data
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
