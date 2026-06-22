import { useMemo } from "react";
import { PlaneTakeoff, Calendar, MapPin, Wallet, Receipt, TrendingUp, AlertCircle, RefreshCcw } from "lucide-react";
import { useTrips, useTripFinancialSummary, useTripTransactions } from "@/hooks/useTrips";
import { useCurrencyRate } from "@/hooks/useCurrencyRate";
import { moneyUtils } from "@/utils/money";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/utils/dateUtils";

export function TripDashboardView() {
  const { data: trips, isLoading: tripsLoading } = useTrips();
  
  // Find an active trip (or the closest upcoming one if none is active)
  const activeTrip = useMemo(() => {
    if (!trips || trips.length === 0) return null;
    const active = trips.find(t => t.status === "ACTIVE");
    if (active) return active;
    const planning = trips.filter(t => t.status === "PLANNING").sort((a, b) => parseLocalDate(a.start_date).getTime() - parseLocalDate(b.start_date).getTime());
    return planning[0] || trips[0];
  }, [trips]);

  const { data: summary, isLoading: summaryLoading } = useTripFinancialSummary(activeTrip?.id || null);
  const { data: transactions, isLoading: txLoading } = useTripTransactions(activeTrip?.id || null);

  const currency = activeTrip?.currency || 'BRL';
  const { data: realTimeRate, isLoading: isRateLoading } = useCurrencyRate(currency !== 'BRL' ? currency : '', 'BRL');

  if (tripsLoading || summaryLoading || txLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-muted/50 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-muted/50 rounded-2xl" />
          <div className="h-32 bg-muted/50 rounded-2xl" />
          <div className="h-32 bg-muted/50 rounded-2xl" />
        </div>
      </div>
    );
  }


  if (!activeTrip) {
    return (
      <div className="text-center py-12 bg-card/50 rounded-2xl border border-border/50">
        <PlaneTakeoff className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h2 className="text-base font-semibold mb-2">Nenhuma viagem em andamento</h2>
        <p className="text-muted-foreground">O Modo Viagem fica mais interessante quando você tem uma viagem ativa ou planejada.</p>
      </div>
    );
  }

  const formatValue = (val: number) => moneyUtils.format(val, currency);

  const budget = summary?.total_budget || activeTrip.budget || 0;
  const spent = summary?.total_spent || 0;
  const remaining = Math.max(0, budget - spent);
  const percentage = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  
  const isOverBudget = spent > budget && budget > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden p-6 md:p-8 rounded-4xl border border-border/50 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={activeTrip.status === 'ACTIVE' ? 'default' : 'secondary'} className="bg-primary/20 text-primary hover:bg-primary/30 border-none">
                {activeTrip.status === 'ACTIVE' ? 'Em andamento' : 'Planejada'}
              </Badge>
              {activeTrip.destination && (
                <span className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {activeTrip.destination}
                </span>
              )}
              {currency !== 'BRL' && (
                <Badge variant="outline" className="ml-2 flex items-center gap-1 bg-background shadow-sm">
                  {isRateLoading ? (
                    <RefreshCcw className="h-3 w-3 animate-spin text-muted-foreground" />
                  ) : realTimeRate ? (
                    <span className="font-mono text-sm">
                      1 {currency} = R$ {realTimeRate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Cotação indisponível</span>
                  )}
                </Badge>
              )}
            </div>
            
            <h1 className="text-3xl md:text-3xl font-display font-black tracking-tight">
              {activeTrip.name}
            </h1>
            
            <p className="text-muted-foreground flex items-center gap-2 font-medium">
              <Calendar className="h-4 w-4" />
              {format(parseLocalDate(activeTrip.start_date), "dd 'de' MMM", { locale: ptBR })} - {format(parseLocalDate(activeTrip.end_date), "dd 'de' MMM, yyyy", { locale: ptBR })}
            </p>
          </div>

          <div className="bg-background/80 backdrop-blur-xl p-6 rounded-2xl border border-border/50 shadow-xl max-w-sm w-full">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {isOverBudget ? "Orçamento estourado em" : "Restante do Orçamento"}
            </p>
            <h2 className={`text-3xl font-bold font-mono tracking-tighter ${isOverBudget ? 'text-destructive' : 'text-primary'}`}>
              {formatValue(isOverBudget ? spent - budget : remaining)}
            </h2>
            
            {budget > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm font-medium text-muted-foreground">
                  <span>Gasto: {formatValue(spent)}</span>
                  <span>Limite: {formatValue(budget)}</span>
                </div>
                <Progress value={percentage} className={`h-2 ${isOverBudget ? '*:bg-destructive' : ''}`} />
              </div>
            )}
            
            {!budget && (
              <div className="mt-4 flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 p-2 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>Nenhum orçamento definido para esta viagem.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Total Gasto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatValue(spent)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Acertos Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
              {formatValue(summary?.total_settled || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {summary?.participants_count || 1} participante(s)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.transactions_count || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">Registradas nesta viagem</p>
          </CardContent>
        </Card>
      </div>

      {transactions && transactions.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-base">Últimas Despesas</h3>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm divide-y divide-border/50">
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-base">
                    {tx.category?.icon || '💸'}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.description}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(tx.date + 'T12:00:00'), "dd/MM/yyyy")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-sm">
                    {tx.type === 'EXPENSE' ? '-' : '+'}{moneyUtils.format(tx.amount, tx.currency || currency)}
                  </p>
                  {tx.is_shared && (
                    <Badge variant="outline" className="text-sm mt-1">Dividida</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
