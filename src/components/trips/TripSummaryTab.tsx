import { TrendingUp, Calendar, Users, User, CheckCircle, Wallet, ArrowRight, Info, Trash2, DollarSign, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { moneyUtils } from "@/utils/money";
import { parseLocalDate } from "@/utils/dateUtils";

interface TripSummaryTabProps {
  selectedTrip: any;
  totalExpenses: number;
  myTotalSpent: number;
  myPersonalBudget: number | null;
  participants: any[];
  balances: any[];
  tripTransactions: any[];
  tripFinancialSummary: any;
  user: any;
  onAddParticipant: () => void;
  permissions: any;
  dateFns: any;
  ptBR: any;
  onRemoveClick?: (participant: any, balance: any) => void;
}

export function TripSummaryTab({
  selectedTrip,
  totalExpenses,
  myTotalSpent,
  myPersonalBudget,
  participants,
  balances,
  tripTransactions,
  user,
  onAddParticipant,
  permissions,
  onRemoveClick,
}: TripSummaryTabProps) {
  const tripDays = Math.max(1, Math.ceil((parseLocalDate(selectedTrip.end_date).getTime() - parseLocalDate(selectedTrip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const currency = selectedTrip.currency || 'BRL';

  // (a) Gastos pessoais: minhas transações NÃO compartilhadas
  const myPersonalExpenses = tripTransactions
    .filter(t => t.type === "EXPENSE" && !t.is_shared && (t.creator_user_id === user?.id || t.user_id === user?.id))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Saldo do participante atual (do RPC — fonte única da verdade)
  const myBalance = balances.find(b => b.participantId === user?.id);

  const myShareOfSharedExpenses = myBalance?.owes || 0;
  const myTotalPersonal = myPersonalExpenses + myShareOfSharedExpenses;

  // (b) Gastos compartilhados pagos por mim (eu paguei a conta toda)
  const mySharedExpensesPaid = tripTransactions
    .filter(t => t.type === "EXPENSE" && t.is_shared && (t.creator_user_id === user?.id || t.user_id === user?.id))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // (c) Total de despesas compartilhadas do grupo (para exibição geral)
  const totalSharedExpenses = tripTransactions
    .filter(t => t.type === "EXPENSE" && t.is_shared)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-8 mt-6 animate-fade-in">
      {/* Grid de Informações Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Duração</span>
          </div>
          <p className="font-mono text-3xl font-black tracking-tighter">
            {tripDays}
            <span className="text-xs font-normal text-muted-foreground ml-1">dias</span>
          </p>
        </div>


        <div className="p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Minha Média/Dia</span>
          </div>
          <p className="font-mono text-3xl font-black tracking-tighter text-primary">
            {moneyUtils.format(myTotalPersonal / tripDays, currency)}
          </p>
        </div>
      </div>

      {/* ===== SEÇÃO DE GASTOS — 3 BLOCOS SEPARADOS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* (A) Gastos Pessoais — apenas meus, privados e impacto no orçamento */}
        <div className="p-6 rounded-3xl border border-border/50 bg-gradient-to-br from-card/50 to-muted/20 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <User className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <User className="h-4 w-4 text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Meu Gasto (Orçamento)</h3>
            </div>
            <p className="font-mono text-3xl font-black tracking-tighter text-foreground mb-1">
              {moneyUtils.format(myTotalSpent, currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              Impacto real (caixa): privadas + adiantamentos pendentes em compartilhados
            </p>
            {myPersonalBudget && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Orçamento Pessoal</p>
                <p className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                  {((myTotalSpent / myPersonalBudget) * 100).toFixed(1)}% utilizado
                </p>
              </div>
            )}
          </div>
        </div>

        {/* (B) Compartilhados que EU paguei */}
        <div className="p-6 rounded-3xl border border-border/50 bg-gradient-to-br from-card/50 to-muted/20 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <Receipt className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Receipt className="h-4 w-4 text-purple-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Compartilhados que Paguei</h3>
            </div>
            <p className="font-mono text-3xl font-black tracking-tighter text-foreground mb-1">
              {moneyUtils.format(mySharedExpensesPaid, currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {tripTransactions.filter(t => t.type === "EXPENSE" && t.is_shared && (t.creator_user_id === user?.id || t.user_id === user?.id)).length} despesas do grupo
            </p>
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Total do Grupo</p>
              <p className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">
                {moneyUtils.format(totalSharedExpenses, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* (C) Valores que me devem / Eu devo (do RPC — fonte de verdade) */}
        <div className="p-6 rounded-3xl border border-border/50 bg-gradient-to-br from-card/50 to-muted/20 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <DollarSign className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <DollarSign className="h-4 w-4 text-green-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Saldo Compartilhado</h3>
            </div>
            {myBalance ? (
              <>
                <p className={cn(
                  "font-mono text-3xl font-black tracking-tighter mb-1",
                  Math.abs(myBalance.balance) < 0.01 ? "text-muted-foreground" :
                  myBalance.balance > 0 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
                )}>
                  {Math.abs(myBalance.balance) < 0.01 ? "Em dia!" : (
                    <>{myBalance.balance > 0 ? "+" : ""}{moneyUtils.format(myBalance.balance, currency)}</>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.abs(myBalance.balance) < 0.01 ? "Tudo acertado" :
                   myBalance.balance > 0 ? "Outros te devem" : "Você deve ao grupo"}
                </p>
                <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Paguei</p>
                    <p className="text-sm font-mono font-bold text-green-600 dark:text-green-400">
                      {moneyUtils.format(myBalance.paid, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Minha parte</p>
                    <p className="text-sm font-mono font-bold text-orange-600 dark:text-orange-400">
                      {moneyUtils.format(myBalance.owes, currency)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados de saldo</p>
            )}
          </div>
        </div>
      </div>

      {/* Painel de Acerto Final */}
      {participants.length > 0 && myBalance && (() => {
        const isSettled = Math.abs(myBalance.balance) < 0.01;
        
        return (
          <div className={cn(
            "p-8 rounded-[2rem] border transition-all duration-500 relative overflow-hidden",
            isSettled 
              ? "border-green-500/20 bg-green-500/5"
              : myBalance.balance >= 0
                ? "border-blue-500/20 bg-blue-500/5"
                : "border-orange-500/20 bg-orange-500/5"
          )}>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-5">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110",
                  isSettled ? "bg-green-500 shadow-green-500/20" : myBalance.balance >= 0 ? "bg-blue-500 shadow-blue-500/20" : "bg-orange-500 shadow-orange-500/20"
                )}>
                  {isSettled ? <CheckCircle className="h-8 w-8 text-white" /> : <Wallet className="h-8 w-8 text-white" />}
                </div>
                <div>
                  <h3 className="font-display font-bold text-2xl tracking-tight">Meu Saldo de Acertos</h3>
                  <p className="text-muted-foreground">
                    {isSettled ? "Você está em dia com a viagem!" : myBalance.balance >= 0 ? "Você pagou mais que a sua parte." : "Você deve para o grupo ou participante."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-8 md:gap-12">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Eu Paguei</p>
                  <p className="font-mono text-2xl font-black tracking-tighter text-green-600 dark:text-green-400">
                    {moneyUtils.format(myBalance.paid, currency)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Minha Parte</p>
                  <p className="font-mono text-2xl font-black tracking-tighter text-orange-600 dark:text-orange-400">
                    {moneyUtils.format(myBalance.owes, currency)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Saldo Atual</p>
                  <p className={cn(
                    "font-mono text-2xl font-black tracking-tighter",
                    isSettled ? "text-green-600 dark:text-green-400" :
                    myBalance.balance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"
                  )}>
                    {isSettled ? moneyUtils.format(0, currency) : (
                      <>{myBalance.balance >= 0 ? "+" : ""}{moneyUtils.format(myBalance.balance, currency)}</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {!isSettled && (
              <div className="mt-8 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                  <Info className="h-4 w-4" />
                  {myBalance.balance >= 0 
                    ? "Aguarde os outros participantes realizarem o acerto com você." 
                    : "Realize o acerto na aba Compartilhados para equilibrar seu saldo."}
                </div>
                <Button 
                  variant="outline" 
                  className="rounded-xl gap-2 hover:bg-muted"
                  onClick={() => window.location.href = '/compartilhados?tab=TRAVEL'}
                >
                  Ir para Acertos <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Seção de Viajantes da Viagem */}
      {participants.length > 0 && (
        <section className="p-6 rounded-3xl border border-border/50 bg-gradient-to-br from-card/50 to-muted/20 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Viajantes da Viagem</h3>
            </div>
            {permissions?.isOwner && (
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl gap-1.5 h-9" 
                onClick={onAddParticipant}
              >
                <Plus className="h-4 w-4" /> Convidar Viajante
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {participants.map((participant) => {
              // CORREÇÃO: usar user_id para lookup consistente com o RPC
              const balance = balances.find(b => b.participantId === participant.user_id);
              const currentBalance = balance?.balance ?? 0;
              const isOwner = participant.role === 'owner';
              const isCurrentUser = participant.user_id === user?.id;

              return (
                <div key={participant.id} className="p-4 rounded-2xl border border-border/50 bg-card/40 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium font-display shrink-0 border border-border">
                      {participant.name.split(" ").map((x: string) => x[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-foreground truncate">{participant.name}</p>
                        {isCurrentUser && (
                          <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">Você</span>
                        )}
                        {isOwner && (
                          <span className="text-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">Líder</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        Saldo: <span className={cn(
                          "font-bold",
                          Math.abs(currentBalance) < 0.01 ? "text-muted-foreground" :
                          currentBalance < 0 ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"
                        )}>
                          {moneyUtils.format(currentBalance, currency)}
                        </span>
                      </p>
                      {/* Gasto Compartilhado do participante */}
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        Gastou no compartilhado: <span className="font-bold text-foreground">
                          {moneyUtils.format(
                            tripTransactions
                              .filter(t => t.type === "EXPENSE" && t.is_shared && t.user_id === participant.user_id)
                              .reduce((sum, t) => sum + Number(t.amount), 0),
                            currency
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  {permissions?.isOwner && !isOwner && onRemoveClick && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={() => onRemoveClick(participant, balance || null)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
