import React from 'react';
import { X, User, Check, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { FamilyMember } from '@/hooks/useFamily';

export interface TransactionSplitData {
  memberId: string;
  percentage: number;
  amount: number;
}

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  payerId: string;
  setPayerId: (id: string) => void;
  splits: TransactionSplitData[];
  setSplits: (splits: TransactionSplitData[]) => void;
  familyMembers: FamilyMember[];
  activeAmount: number;
  onNavigateToFamily?: () => void;
  isInstallment?: boolean;
  setIsInstallment?: (value: boolean) => void;
  totalInstallments?: number;
  setTotalInstallments?: (value: number) => void;
  currentUserName?: string;
}

export function SplitModal({
  isOpen,
  onClose,
  onConfirm,
  payerId,
  setPayerId,
  splits,
  setSplits,
  familyMembers,
  activeAmount,
  onNavigateToFamily,
  isInstallment = false,
  setIsInstallment,
  totalInstallments = 2,
  setTotalInstallments,
  currentUserName,
}: SplitModalProps) {
  const toggleSplitMember = (memberId: string) => {
    let newSplits = [...splits];
    const exists = newSplits.find((s) => s.memberId === memberId);

    if (exists) {
      newSplits = newSplits.filter((s) => s.memberId !== memberId);
    } else {
      newSplits.push({ memberId, percentage: 0, amount: 0 });
    }

    // Auto-redistribute evenly
    if (newSplits.length > 0) {
      const totalPeople = newSplits.length + 1; // +1 for current user
      const sharePct = 100 / totalPeople;

      newSplits = newSplits.map((s) => ({
        ...s,
        percentage: Number(sharePct.toFixed(1)),
        amount: Number((activeAmount * (sharePct / 100)).toFixed(2)),
      }));
    }

    setSplits(newSplits);
  };

  const applyPreset = (myPct: number) => {
    const otherPct = 100 - myPct;
    const newSplits = splits.map((s) => ({
      ...s,
      percentage: otherPct / splits.length,
      amount: (activeAmount * otherPct) / 100 / splits.length,
    }));
    setSplits(newSplits);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const totalOtherPct = splits.reduce((sum, s) => sum + s.percentage, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Divisão e Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 1. QUEM PAGOU? */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Quem pagou?
            </Label>
            <div className="flex gap-2 p-1 rounded-lg bg-muted">
              <button
                type="button"
                onClick={() => setPayerId('me')}
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium rounded-md transition-all',
                  payerId === 'me'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {currentUserName ? `${currentUserName} Pagou` : 'Eu Paguei'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setPayerId(familyMembers.length > 0 ? familyMembers[0].id : 'other')
                }
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium rounded-md transition-all',
                  payerId !== 'me'
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Outro Pagou
              </button>
            </div>

            {payerId !== 'me' && (
              <div className="space-y-3">
                {familyMembers.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Nenhum membro cadastrado.
                    </p>
                    {onNavigateToFamily && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={onNavigateToFamily}
                        className="mt-2"
                      >
                        Cadastrar Família
                      </Button>
                    )}
                  </div>
                ) : (
                  <select
                    value={payerId}
                    onChange={(e) => setPayerId(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border bg-background font-medium"
                  >
                    {familyMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* PARCELAMENTO quando Outro Pagou */}
                {setIsInstallment && setTotalInstallments && (
                  <div className="p-4 rounded-lg border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Foi parcelado?</span>
                      </div>
                      <Switch
                        checked={isInstallment}
                        onCheckedChange={setIsInstallment}
                      />
                    </div>

                    {isInstallment && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm">Nº de Parcelas:</span>
                        <Input
                          type="number"
                          min={2}
                          max={48}
                          value={totalInstallments}
                          onChange={(e) =>
                            setTotalInstallments(parseInt(e.target.value) || 2)
                          }
                          className="w-20 text-center"
                        />
                        <span className="text-sm text-muted-foreground">
                          = R$ {(activeAmount / totalInstallments).toFixed(2)}/mês
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. QUEM DIVIDE? */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Dividir com quem?
            </Label>
            {familyMembers.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg">
                <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Adicione pessoas para dividir despesas.
                </p>
                {onNavigateToFamily && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNavigateToFamily}
                    className="mt-3"
                  >
                    Ir para Família
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {familyMembers
                  .filter((m) => m.id !== payerId)
                  .map((member) => {
                    const split = splits.find((s) => s.memberId === member.id);
                    const isSelected = !!split;
                    return (
                      <div
                        key={member.id}
                        onClick={() => toggleSplitMember(member.id)}
                        className={cn(
                          'p-4 flex items-center justify-between cursor-pointer rounded-lg border transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium text-sm">
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            {member.linked_user_id && (
                              <p className="text-xs text-primary">
                                Usuário vinculado ✓
                              </p>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* 3. PRESETS DE DIVISÃO RÁPIDA */}
          {splits.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Divisão Rápida
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '50/50', myPct: 50 },
                  { label: '60/40', myPct: 60 },
                  { label: '70/30', myPct: 70 },
                  { label: '80/20', myPct: 80 },
                  { label: currentUserName ? `Só ${currentUserName}` : 'Só eu', myPct: 100 },
                  { label: 'Só parceiro', myPct: 0 },
                ].map((preset) => {
                  const otherPct = 100 - preset.myPct;
                  const isActive =
                    splits.length > 0 && Math.round(totalOtherPct) === otherPct;

                  return (
                    <Button
                      key={preset.label}
                      type="button"
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyPreset(preset.myPct)}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </div>

              <div className="p-3 rounded-lg bg-muted text-sm">
                <span className="text-muted-foreground">Parceiro paga: </span>
                <span className="font-medium">
                  {totalOtherPct.toFixed(0)}% = R${' '}
                  {((activeAmount * totalOtherPct) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <p>
              <strong>Nota:</strong> Se você selecionou que "Outro Pagou", o valor
              total será registrado como uma dívida sua com essa pessoa, descontando
              a parte que você dividiu (se houver).
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
