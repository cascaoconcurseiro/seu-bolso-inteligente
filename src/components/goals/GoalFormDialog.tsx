import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGoals } from '@/hooks/useGoals';
import { useAccounts } from '@/hooks/useAccounts';
import { Goal } from '../../types/database';

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold">
            {goal ? 'Editar Meta' : 'Nova Meta Financeira'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Nome da Meta</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Viagem para o Japão"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Valor Alvo (R$)</Label>
            <Input type="number" inputMode="decimal"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Alvo</Label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority || 'MEDIUM'} onValueChange={(val: any) => setPriority(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="MEDIUM">Média</SelectItem>
                  <SelectItem value="LOW">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Conta Vinculada (Opcional)</Label>
            <Select value={linkedAccountId} onValueChange={setLinkedAccountId}>
              <SelectTrigger>
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
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isCreating || isUpdating}
              className="flex-1"
            >
              {isCreating || isUpdating ? 'Salvando...' : 'Salvar Meta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
