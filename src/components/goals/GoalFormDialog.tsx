import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AmountInput } from '@/components/ui/amount-input';
import { FormField } from '@/components/ui/form-field';
import { FormSection } from '@/components/ui/form-section';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGoals } from '@/hooks/useGoals';
import { useAccounts } from '@/hooks/useAccounts';
import { Goal } from '../../types/database';
import { Target, CalendarDays, Building2 } from 'lucide-react';

interface GoalFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  goal?: Goal | null;
}

export function GoalFormDialog({ isOpen, onClose, goal }: GoalFormDialogProps) {
  const { createGoal, updateGoal, isCreating, isUpdating } = useGoals();
  const { data: accounts } = useAccounts();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState<Goal['priority']>('MEDIUM');
  const [linkedAccountId, setLinkedAccountId] = useState('none');

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setDescription(goal.description || '');
      setTargetAmount(goal.target_amount.toString());
      setTargetDate(goal.target_date || '');
      setPriority(goal.priority || 'MEDIUM');
      setLinkedAccountId(goal.linked_account_id || 'none');
    } else {
      setName('');
      setDescription('');
      setTargetAmount('');
      setTargetDate('');
      setPriority('MEDIUM');
      setLinkedAccountId('none');
    }
  }, [goal, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      name,
      description,
      target_amount: Number(targetAmount),
      target_date: targetDate || null,
      priority,
      linked_account_id: linkedAccountId === 'none' ? null : linkedAccountId,
      status: 'IN_PROGRESS' as const,
      category: null,
      current_amount: 0,
    };

    if (goal) {
      updateGoal({ id: goal.id, ...payload }, { onSuccess: onClose });
    } else {
      createGoal(payload, { onSuccess: onClose });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:w-[425px] max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b">
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-2 bg-muted rounded-full" />
        </div>
        <DialogHeader className="px-6 pt-2 pb-2 text-left">
          <DialogTitle className="text-base font-display font-bold">
            {goal ? 'Editar Meta' : 'Nova Meta Financeira'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <div className="px-5 overflow-y-auto hide-scrollbar flex-1">
          <div className="flex flex-col gap-3 pt-2">
            <FormSection icon={<Target />} title="Objetivo">
              <FormField label="Nome da meta" htmlFor="goal-name" required>
                <Input
                  id="goal-name"
                  name="goal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Viagem para o Japão…"
                  required
                  autoComplete="off"
                />
              </FormField>

              <AmountInput
                label="Valor alvo"
                value={targetAmount}
                onChange={setTargetAmount}
                size="md"
              />
            </FormSection>

            <FormSection icon={<CalendarDays />} title="Prazo e prioridade">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Data alvo" htmlFor="goal-target-date">
                  <Input
                    id="goal-target-date"
                    name="goal-target-date"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>
                <FormField label="Prioridade" htmlFor="goal-priority">
                  <Select value={priority || 'MEDIUM'} onValueChange={(val: Goal['priority']) => setPriority(val)}>
                    <SelectTrigger id="goal-priority">
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">Alta</SelectItem>
                      <SelectItem value="MEDIUM">Média</SelectItem>
                      <SelectItem value="LOW">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </FormSection>

            <FormSection icon={<Building2 />} title="Conta vinculada">
              <FormField label="Conta (opcional)" htmlFor="goal-account">
                <Select value={linkedAccountId} onValueChange={setLinkedAccountId}>
                  <SelectTrigger id="goal-account">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {accounts?.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormSection>

          </div>
        </div>
        <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-border bg-background">
          <Button type="button" variant="outline" className="h-11" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isCreating || isUpdating} className="flex-1 h-11 font-bold">
            {isCreating || isUpdating ? 'Salvando…' : 'Salvar Meta'}
          </Button>
        </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
