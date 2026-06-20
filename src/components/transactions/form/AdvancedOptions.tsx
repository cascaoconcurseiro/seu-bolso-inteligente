import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, RefreshCw, RotateCcw, Repeat, Bell, Plane, Users } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { useTransactionStore } from '@/store/useTransactionStore';

interface AdvancedOptionsProps {
  isExpense: boolean;
  isCreditCard: boolean;
  currencySymbol: string;
  numericAmount: number;
  
  // Novas propriedades integradas para Viagem e Partilha
  trips: any[];
  hasSharing: boolean;
  availableMembers: any[];
}

export function AdvancedOptions({
  isExpense,
  isCreditCard,
  currencySymbol,
  numericAmount,
  
  // Desestruturando novas propriedades
  trips,
  hasSharing,
  availableMembers,
}: AdvancedOptionsProps) {
  const isInstallment = useTransactionStore((state) => state.isInstallment);
  const setIsInstallment = useTransactionStore((state) => state.setIsInstallment);
  const totalInstallments = useTransactionStore((state) => state.totalInstallments);
  const setTotalInstallments = useTransactionStore((state) => state.setTotalInstallments);
  const isRefund = useTransactionStore((state) => state.isRefund);
  const setIsRefund = useTransactionStore((state) => state.setIsRefund);
  const isRecurring = useTransactionStore((state) => state.isRecurring);
  const setIsRecurring = useTransactionStore((state) => state.setIsRecurring);
  const frequency = useTransactionStore((state) => state.frequency);
  const setFrequency = useTransactionStore((state) => state.setFrequency);
  const recurrenceDay = useTransactionStore((state) => state.recurrenceDay);
  const setRecurrenceDay = useTransactionStore((state) => state.setRecurrenceDay);
  const enableNotification = useTransactionStore((state) => state.enableNotification);
  const setEnableNotification = useTransactionStore((state) => state.setEnableNotification);
  const notificationDate = useTransactionStore((state) => state.notificationDate);
  const setNotificationDate = useTransactionStore((state) => state.setNotificationDate);
  const tripId = useTransactionStore((state) => state.tripId);
  const setTripId = useTransactionStore((state) => state.setTripId);
  const setShowSplitModal = useTransactionStore((state) => state.setShowSplitModal);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasActiveOption = !!(tripId || hasSharing || isInstallment || isRefund || isRecurring || enableNotification);

  if (!isExpanded) {
    return (
      <div className="space-y-3">
        {/* Cabeçalho Colapsável Premium */}
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between py-2 px-1 hover:bg-muted/30 rounded-xl transition-all group text-left cursor-pointer select-none"
        >
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1.5">
            <span>⚙️ Recursos e Opções</span>
            {hasActiveOption && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </span>
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1 bg-muted/60 dark:bg-muted/30 px-2 py-0.5 rounded-lg group-hover:text-foreground transition-colors">
            Mostrar
            <svg
              className="h-3.5 w-3.5 transition-transform duration-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Cabeçalho Colapsável Premium */}
      <button
        type="button"
        onClick={() => setIsExpanded(false)}
        className="w-full flex items-center justify-between py-2 px-1 hover:bg-muted/30 rounded-xl transition-all group text-left cursor-pointer select-none"
      >
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1.5">
          <span>⚙️ Recursos e Opções</span>
          {hasActiveOption && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </span>
        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1 bg-muted/60 dark:bg-muted/30 px-2 py-0.5 rounded-lg group-hover:text-foreground transition-colors">
          Ocultar
          <svg
            className="h-3.5 w-3.5 transition-transform duration-300 rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Fileira Horizontal de Pílulas Interativas - Grid de 3 colunas em celular, linha única em desktop */}
      <div className="grid grid-cols-3 sm:flex sm:flex-row items-center gap-2 py-1 animate-slide-in">
        {/* 1. Viagem (Avião) */}
        {isExpense && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-2xl border transition-all duration-300 shadow-sm active:scale-95 min-h-[72px]",
                  tripId 
                ? "bg-emerald-500 text-white border-emerald-600 font-bold shadow-md dark:bg-emerald-600 dark:border-emerald-700" 
                    : "border-border hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground bg-transparent"
                )}
              >
                <Plane className="h-5 w-5 animate-pulse-slow" />
                <span className="text-[10px] tracking-tight font-medium truncate max-w-[70px] text-center">
                  {tripId ? (trips.find(t => t.id === tripId)?.name || 'Viagem') : 'Viagem'}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 rounded-xl border border-border bg-card shadow-md" align="start">
              <p className="text-xs font-bold text-muted-foreground px-2 py-1 uppercase tracking-wider text-[10px]">Vincular Viagem</p>
              <div className="space-y-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => setTripId('')}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium transition-all",
                    !tripId ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                  )}
                >
                  Nenhuma Viagem
                </button>
                {trips && trips.map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => setTripId(trip.id)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium flex items-center justify-between transition-all gap-2",
                      tripId === trip.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="truncate flex-1">{trip.name}</span>
                    <span className="text-[8px] px-1 py-0.2 bg-muted text-muted-foreground rounded uppercase font-bold shrink-0">{trip.currency}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* 2. Dividir Despesa (Pessoas) */}
        {isExpense && availableMembers.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSplitModal(true)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-2xl border transition-all duration-300 shadow-sm active:scale-95 min-h-[72px]",
              hasSharing 
                ? "bg-emerald-500 text-white border-emerald-600 font-bold shadow-md dark:bg-emerald-600 dark:border-emerald-700" 
                : "border-border hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground bg-transparent"
            )}
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px] tracking-tight font-medium text-center">
              {hasSharing ? 'Dividido' : 'Dividir'}
            </span>
          </button>
        )}

        {/* 3. Parcelar (RefreshCw) */}
        {isExpense && !isCreditCard && (
          <button
            type="button"
            onClick={() => {
              const nextState = !isInstallment;
              setIsInstallment(nextState);
              if (nextState && totalInstallments < 2) setTotalInstallments(2);
            }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-2xl border transition-all duration-300 shadow-sm active:scale-95 min-h-[72px]",
              isInstallment 
                ? "bg-emerald-500 text-white border-emerald-600 font-bold shadow-md dark:bg-emerald-600 dark:border-emerald-700" 
                : "border-border hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground bg-transparent"
            )}
          >
            <RefreshCw className={cn("h-5 w-5", isInstallment && "animate-spin-slow")} />
            <span className="text-[10px] tracking-tight font-medium text-center">Parcelar</span>
          </button>
        )}

        {/* 4. Reembolso (RotateCcw) */}
        {isExpense && (
          <button
            type="button"
            onClick={() => setIsRefund(!isRefund)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-2xl border transition-all duration-300 shadow-sm active:scale-95 min-h-[72px]",
              isRefund 
                ? "bg-emerald-500 text-white border-emerald-600 font-bold shadow-md dark:bg-emerald-600 dark:border-emerald-700" 
                : "border-border hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground bg-transparent"
            )}
          >
            <RotateCcw className="h-5 w-5" />
            <span className="text-[10px] tracking-tight font-medium text-center">Reembolso</span>
          </button>
        )}

        {/* 5. Recorrente (Repeat) */}
        <button
          type="button"
          onClick={() => setIsRecurring(!isRecurring)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-2xl border transition-all duration-300 shadow-sm active:scale-95 min-h-[72px]",
            isRecurring 
                ? "bg-emerald-500 text-white border-emerald-600 font-bold shadow-md dark:bg-emerald-600 dark:border-emerald-700" 
              : "border-border hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground bg-transparent"
          )}
        >
          <Repeat className="h-5 w-5" />
          <span className="text-[10px] tracking-tight font-medium text-center">Recorrente</span>
        </button>

        {/* 6. Notificação (Bell) */}
        <button
          type="button"
          onClick={() => {
            const nextState = !enableNotification;
            setEnableNotification(nextState);
            if (nextState && !notificationDate) setNotificationDate(new Date());
          }}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-2xl border transition-all duration-300 shadow-sm active:scale-95 min-h-[72px]",
            enableNotification 
                ? "bg-emerald-500 text-white border-emerald-600 font-bold shadow-md dark:bg-emerald-600 dark:border-emerald-700" 
              : "border-border hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground bg-transparent"
          )}
        >
          <Bell className="h-5 w-5" />
          <span className="text-[10px] tracking-tight font-medium text-center">Notificação</span>
        </button>
      </div>

      {/* Painéis de Detalhes Dinâmicos (só aparecem se o estado estiver ativo) */}
      <div className="space-y-3 mt-1">
        
        {/* 1. Detalhes do Parcelamento Manual */}
        {isExpense && !isCreditCard && isInstallment && (
          <div className="p-4 rounded-2xl border border-primary/20 bg-card space-y-4 animate-slide-in shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary animate-spin-slow" />
                <span className="font-bold text-sm">Parcelamento Manual</span>
                <InfoTooltip content="Divide esta despesa em várias parcelas iguais, criando transações avulsas nos próximos meses. Ideal para crediários ou compras fora de cartão de crédito." />
              </div>
              <Switch 
                checked={isInstallment} 
                onCheckedChange={(v) => setIsInstallment(v)} 
              />
            </div>
            <p className="text-xs text-muted-foreground leading-normal">
              Parcelamento manual (ex: empréstimo pessoal ou acordos fora do cartão).
            </p>

            <div className="space-y-3 pt-1">
              <div className="space-y-2">
                <Label className="text-xs">Número de parcelas</Label>
                <Select
                  value={totalInstallments.toString()}
                  onValueChange={(v) => setTotalInstallments(parseInt(v))}
                >
                  <SelectTrigger className="rounded-xl h-11">
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

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <span className="text-blue-500 dark:text-blue-400 text-sm mt-0.5 shrink-0">ℹ️</span>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                    Aviso Importante
                  </p>
                  <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-400">
                    Isso criará <strong>{totalInstallments} transações separadas</strong> no extrato (uma por mês).
                  </p>
                  <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-400">
                    ⚠️ Para compras no <strong>cartão de crédito</strong>, não use este painel. Use o parcelamento que aparece automaticamente no seletor de contas ao escolher seu cartão.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Detalhes de Reembolso */}
        {isExpense && isRefund && (
          <div className="p-4 rounded-2xl border border-primary/20 bg-card space-y-3 animate-slide-in shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">Despesa Reembolsável</span>
                <InfoTooltip content="Marca esta despesa como aguardando devolução (ex: viagem a trabalho paga por você para a empresa reembolsar). Um ícone ficará visível no extrato." />
              </div>
              <Switch checked={isRefund} onCheckedChange={setIsRefund} />
            </div>
            <p className="text-xs text-muted-foreground leading-normal">
              Esta despesa é elegível para devolução ou reembolso posterior de terceiros/empresa.
            </p>
          </div>
        )}

        {/* 3. Detalhes de Recorrência */}
        {isRecurring && (
          <div className="p-4 rounded-2xl border border-primary/20 bg-card space-y-4 animate-slide-in shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">Transação Recorrente</span>
                <InfoTooltip content="Clona e repete esta transação automaticamente no futuro com base na frequência que você escolher (ex: assinatura Netflix, Conta de Luz)." />
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
            <p className="text-xs text-muted-foreground leading-normal">
              Repetir automaticamente este lançamento na frequência abaixo.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-2">
                <Label className="text-xs">Frequência</Label>
                <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                  <SelectTrigger className="rounded-xl h-11">
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
                  <Label className="text-xs">Dia do mês para repetição</Label>
                  <Input type="number" inputMode="decimal"
                    min="1"
                    max="31"
                    value={recurrenceDay}
                    onChange={(e) => setRecurrenceDay(parseInt(e.target.value) || 1)}
                    placeholder="1-31"
                    className="rounded-xl h-11"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Detalhes de Notificação */}
        {enableNotification && (
          <div className="p-4 rounded-2xl border border-primary/20 bg-card space-y-4 animate-slide-in shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">Lembrete Ativo</span>
              </div>
              <Switch checked={enableNotification} onCheckedChange={setEnableNotification} />
            </div>
            <p className="text-xs text-muted-foreground leading-normal">
              Você receberá um lembrete antes do vencimento na data selecionada.
            </p>

            <div className="space-y-2 pt-1">
              <Label className="text-xs">Data da notificação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal rounded-xl h-11 border-border/80"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
