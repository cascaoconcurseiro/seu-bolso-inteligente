import { Edit, Trash2, ArrowRightLeft, Target, TrendingUp, Info, CalendarClock, ChevronDown, FileDown, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from 'react';
import { GoalMilestonesPanel } from './GoalMilestonesPanel';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moneyUtils } from '@/utils/money';
import { useEconomicIndicators } from "@/hooks/useEconomicIndicators";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { differenceInMonths, format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Goal } from '../../types/database';
import { toast } from 'sonner';

interface GoalCardProps {
  goal: Goal;
  index: number;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onContribute: (goal: Goal) => void;
}

async function exportGoalToPDF(goal: Goal) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const percentage = goal.target_amount > 0
    ? Math.min(100, ((goal.current_amount ?? 0) / goal.target_amount) * 100)
    : 0;
  const remaining = Math.max(0, goal.target_amount - (goal.current_amount ?? 0));
  const now = new Date();

  // Header
  doc.setFillColor(16, 185, 129); // primary green
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo da Meta', 14, 16);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(goal.name, 14, 26);

  // Gerado em
  doc.setFontSize(9);
  doc.text(`Gerado em ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 32);

  // Reset color
  doc.setTextColor(30, 30, 30);

  // Status badge
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const statusLabel = goal.status === 'COMPLETED' ? 'Concluída' : 'Em Progresso';
  doc.text(`Status: ${statusLabel}`, 14, 46);

  // Valores
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Acumulado:  ${moneyUtils.format(goal.current_amount ?? 0, 'BRL')}`, 14, 56);
  doc.text(`Objetivo:       ${moneyUtils.format(goal.target_amount, 'BRL')}`, 14, 63);
  doc.text(`Progresso:   ${percentage.toFixed(1)}%`, 14, 70);
  if (remaining > 0) doc.text(`Faltam:          ${moneyUtils.format(remaining, 'BRL')}`, 14, 77);

  // Barra de progresso
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(14, 83, 182, 7, 2, 2, 'F');
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(14, 83, Math.max(2, (percentage / 100) * 182), 7, 2, 2, 'F');

  // Datas
  let y = 100;
  if (goal.target_date) {
    doc.text(`Prazo:  ${format(new Date(goal.target_date), "dd/MM/yyyy", { locale: ptBR })}`, 14, y);
    y += 7;
  }
  doc.text(`Criada em:  ${format(new Date(goal.created_at), "dd/MM/yyyy", { locale: ptBR })}`, 14, y);
  y += 7;
  if (goal.description) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const lines = doc.splitTextToSize(`Descrição: ${goal.description}`, 182);
    doc.text(lines, 14, y + 4);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Pé de Meia — seu controle financeiro pessoal', 14, 285);

  doc.save(`meta-${goal.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

export function GoalCard({ goal, index, onEdit, onDelete, onContribute }: GoalCardProps) {
  const [showMilestones, setShowMilestones] = useState(false);
  const percentage = goal.target_amount > 0 ? Math.min(100, Math.max(0, ((goal.current_amount ?? 0) / goal.target_amount) * 100)) : 0;
  const remaining = Math.max(0, goal.target_amount - (goal.current_amount ?? 0));
  
  const { data: indicators } = useEconomicIndicators();
  
  let adjustedTarget = goal.target_amount;
  let monthsToTarget = 0;

  if (goal.target_date && indicators?.ipca) {
    const targetDate = new Date(goal.target_date);
    const now = new Date();
    monthsToTarget = differenceInMonths(targetDate, now);

    if (monthsToTarget > 0) {
      adjustedTarget = SafeFinancialCalculator.calculateInflationAdjustedTarget(
        goal.target_amount,
        monthsToTarget,
        indicators.ipca.value
      );
    }
  }

  // Projeção de conclusão baseada na taxa mensal média de aporte
  const monthsSinceCreation = Math.max(1, differenceInMonths(new Date(), new Date(goal.created_at)));
  const monthlyRate = (goal.current_amount ?? 0) / monthsSinceCreation;
  const remainingAmount = Math.max(0, goal.target_amount - (goal.current_amount ?? 0));
  const estimatedMonthsLeft = monthlyRate > 0 ? Math.ceil(remainingAmount / monthlyRate) : null;
  const estimatedCompletionDate = estimatedMonthsLeft !== null ? addMonths(new Date(), estimatedMonthsLeft) : null;
  const monthlyNeeded = monthsToTarget > 0 ? remainingAmount / monthsToTarget : null;
  
  return (
    <div 
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        onEdit(goal);
      }}
      className={cn(
        "group relative bg-card border border-border/50 p-6 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 animate-stagger cursor-pointer",
        `stagger-${(index % 5) + 1}`
      )}
    >
      {/* Decoração de fundo */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

      <div className="relative">
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground leading-tight">{goal.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                  goal.status === 'COMPLETED' ? "bg-success/12 text-success" : "bg-primary/10 text-primary"
                )}>
                  {goal.status === 'COMPLETED' ? 'Concluída' : 'Em Progresso'}
                </span>
                {goal.priority === 'HIGH' && (
                  <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-destructive/12 text-destructive uppercase tracking-wider">
                    Prioridade Alta
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Desktop: ações visíveis no hover */}
            <div className="hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
              <Button variant="ghost" size="icon" aria-label="Exportar meta em PDF" onClick={async (e) => { e.stopPropagation(); try { await exportGoalToPDF(goal); } catch { toast.error('Erro ao exportar PDF'); } }} className="h-8 w-8 rounded-lg hover:bg-muted">
                <FileDown className="w-4 h-4 text-muted-foreground transition-colors" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Editar meta" onClick={(e) => { e.stopPropagation(); onEdit(goal); }} className="h-8 w-8 rounded-lg hover:bg-primary/10">
                <Edit className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Excluir meta" onClick={(e) => { e.stopPropagation(); onDelete(goal); }} className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="w-4 h-4 text-muted-foreground transition-colors" />
              </Button>
            </div>
            {/* Mobile: menu de 3 pontos sempre visível */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Mais opções" onClick={(e) => e.stopPropagation()} className="h-8 w-8 rounded-lg">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(goal)}>
                    <Edit className="w-4 h-4 mr-2" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => { try { await exportGoalToPDF(goal); } catch { toast.error('Erro ao exportar PDF'); } }}>
                    <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(goal)} className="text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {goal.description && (
          <p className="text-sm text-muted-foreground/80 mb-6 line-clamp-2 min-h-[40px]">
            {goal.description}
          </p>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-muted-foreground uppercase font-semibold tracking-widest mb-1">Acumulado</p>
              <p className="font-display text-2xl xs:text-3xl font-black text-foreground tracking-tighter">
                {moneyUtils.format(goal.current_amount ?? 0, 'BRL')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground uppercase font-semibold tracking-widest mb-1">Objetivo</p>
              <p className="text-sm font-mono font-bold text-foreground/70">
                {moneyUtils.format(goal.target_amount, 'BRL')}
              </p>
              {monthsToTarget > 0 && adjustedTarget > goal.target_amount && (
                <TooltipProvider>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <p className="text-sm font-mono font-bold text-warning/80 mt-0.5 flex items-center justify-end gap-1 cursor-help hover:text-warning transition-colors">
                        Real: {moneyUtils.format(adjustedTarget, 'BRL')} <Info className="h-3 w-3" />
                      </p>
                    </TooltipTrigger>
                    <TooltipContent className="w-64 p-3 bg-card border-border/50 shadow-xl rounded-xl z-50">
                      <p className="text-sm leading-relaxed text-foreground/90">
                        Devido à inflação atual de <strong className="text-warning">{indicators?.ipca?.value}% ao ano</strong> (IPCA BCB), 
                        você precisará de <strong className="font-mono">{moneyUtils.format(adjustedTarget, 'BRL')}</strong> em {monthsToTarget} meses 
                        para ter o mesmo poder de compra de {moneyUtils.format(goal.target_amount, 'BRL')} hoje.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-lg",
                  percentage >= 100 ? "bg-positive/10" : "bg-primary/10"
                )}>
                  <TrendingUp className={cn(
                    "w-3 h-3",
                    percentage >= 100 ? "text-positive" : "text-primary"
                  )} />
                </div>
                <span className="text-sm font-bold text-foreground/80">
                  {percentage.toFixed(0)}% <span className="text-muted-foreground font-medium">concluído</span>
                </span>
              </div>
              
              {remaining > 0 && (
                <p className="text-sm font-medium text-muted-foreground">
                  Faltam <span className="text-foreground font-bold">{moneyUtils.format(remaining, 'BRL')}</span>
                </p>
              )}
            </div>

            <div className="relative w-full bg-muted rounded-full h-4 overflow-hidden shadow-inner border border-border/30">
              <div 
                className={cn(
                  "absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)]",
                  percentage >= 100 
                    ? "bg-gradient-to-r from-positive/80 to-positive" 
                    : "bg-gradient-to-r from-primary via-primary/80 to-accent/60"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Projeção de conclusão */}
          {goal.status !== 'COMPLETED' && remaining > 0 && (
            <div className="mt-3 flex flex-col gap-1.5 p-3 rounded-xl bg-muted/50 border border-border/40">
              {goal.target_date && (
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Prazo
                  </span>
                  <span className={cn(
                    "font-bold",
                    monthsToTarget <= 0 ? "text-destructive" : monthsToTarget <= 3 ? "text-warning" : "text-foreground"
                  )}>
                    {format(new Date(goal.target_date), "MMM yyyy", { locale: ptBR })}
                    {monthsToTarget > 0 ? ` · ${monthsToTarget}m restantes` : ' · Prazo atingido'}
                  </span>
                </div>
              )}
              {monthlyNeeded !== null && monthlyNeeded > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Aportar/mês</span>
                  <span className="font-bold text-primary">{moneyUtils.format(monthlyNeeded, 'BRL')}</span>
                </div>
              )}
              {estimatedCompletionDate && !goal.target_date && (
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Estimativa
                  </span>
                  <span className="font-bold text-foreground">
                    {format(estimatedCompletionDate, "MMM yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          )}

          <Button
            variant="default"
            size="sm"
            onClick={() => onContribute(goal)}
            className="w-full mt-4 gap-2 h-10 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span className="font-bold text-sm uppercase tracking-wider">Movimentar Saldo</span>
          </Button>

          {/* Marcos */}
          <button
            type="button"
            className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            onClick={() => setShowMilestones(!showMilestones)}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showMilestones && "rotate-180")} />
            {showMilestones ? "Ocultar marcos" : "Ver marcos de progresso"}
          </button>
          {showMilestones && <GoalMilestonesPanel goal={goal} />}
        </div>
      </div>
    </div>
  );
}
