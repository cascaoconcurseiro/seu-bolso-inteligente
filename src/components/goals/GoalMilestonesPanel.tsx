import { useState } from "react";
import { useGoalMilestones, useCreateGoalMilestone, useDeleteGoalMilestone } from "@/hooks/useGoalMilestones";
import { Goal } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flag, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GoalMilestonesPanelProps {
  goal: Goal;
}

export function GoalMilestonesPanel({ goal }: GoalMilestonesPanelProps) {
  const { data: milestones = [] } = useGoalMilestones(goal.id);
  const createMilestone = useCreateGoalMilestone();
  const deleteMilestone = useDeleteGoalMilestone();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pct, setPct] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const currentPct = goal.target_amount > 0
    ? Math.min(100, ((goal.current_amount ?? 0) / goal.target_amount) * 100)
    : 0;

  const handleAdd = async () => {
    const pctNum = parseFloat(pct.replace(",", "."));
    if (!name.trim() || isNaN(pctNum) || pctNum <= 0 || pctNum > 100) return;
    await createMilestone.mutateAsync({ goalId: goal.id, name: name.trim(), targetPct: pctNum });
    setName("");
    setPct("");
    setAdding(false);
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Flag className="h-3.5 w-3.5" /> Marcos
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setAdding(!adding)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar
        </Button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="flex gap-2 items-start flex-wrap">
          <Input
            placeholder="Nome do marco"
            value={name}
            onChange={e => setName(e.target.value)}
            className="h-8 text-sm flex-1 min-w-[120px]"
            autoFocus
          />
          <div className="flex items-center gap-1">
            <Input
              placeholder="%"
              inputMode="decimal"
              value={pct}
              onChange={e => setPct(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="h-8 text-sm w-16 text-center"
            />
            <Button size="sm" className="h-8 px-3" onClick={handleAdd} disabled={createMilestone.isPending}>
              OK
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setAdding(false)}>
              ✕
            </Button>
          </div>
        </div>
      )}

      {/* Milestone list */}
      {milestones.length > 0 ? (
        <div className="relative ml-1">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
          <div className="space-y-1.5">
            {milestones.map(m => {
              const reached = currentPct >= m.target_pct || !!m.reached_at;
              return (
                <div key={m.id} className="flex items-center gap-2.5 pl-1 group/m">
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full border-2 shrink-0 z-10 transition-colors",
                    reached ? "bg-success border-success" : "bg-background border-border"
                  )}>
                    {reached && <CheckCircle2 className="h-full w-full text-white" />}
                  </div>
                  <span className={cn(
                    "text-xs flex-1",
                    reached ? "text-success font-medium line-through opacity-70" : "text-foreground"
                  )}>
                    {m.name}
                  </span>
                  <span className={cn(
                    "text-xs font-mono shrink-0",
                    reached ? "text-success" : "text-muted-foreground"
                  )}>
                    {m.target_pct}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover/m:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => setConfirmDeleteId(m.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ) : !adding ? (
        <p className="text-xs text-muted-foreground pl-1">Nenhum marco. Adicione % de progresso para celebrar conquistas.</p>
      ) : null}
    </div>

    <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir marco?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O marco será removido permanentemente da meta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (confirmDeleteId) deleteMilestone.mutate({ id: confirmDeleteId, goalId: goal.id });
              setConfirmDeleteId(null);
            }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
