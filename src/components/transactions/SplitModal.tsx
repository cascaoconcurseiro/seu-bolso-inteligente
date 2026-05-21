import { User, Check, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { FamilyMember } from '@/hooks/useFamily';
import { moneyUtils } from '@/utils/money';

import { TransactionSplitData } from '@/types/transactions';

import { useMemo } from 'react';

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (splits: TransactionSplitData[]) => void; // ✅ CORREÇÃO: Passar splits
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
  currentUserMemberId?: string; // ✅ CORREÇÃO: Receber ID de membro atual
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
  currentUserMemberId,
}: SplitModalProps) {
  console.log('🔵 [SplitModal] Renderizado com:', { 
    isOpen, 
    splits, 
    familyMembers: familyMembers.length, 
    activeAmount,
    payerId,
    currentUserMemberId
  });

  // Filtro de outros membros da família (exclui o usuário atual) para o seletor de quem pagou
  const otherMembers = useMemo(() => {
    return (familyMembers || []).filter((m) => m.id !== currentUserMemberId);
  }, [familyMembers, currentUserMemberId]);

  // Filtro de quem divide a conta (exclui a pessoa que pagou)
  const checklistMembers = useMemo(() => {
    const resolvedPayerMemberId = payerId === 'me' ? currentUserMemberId : payerId;
    return (familyMembers || []).filter((m) => m.id !== resolvedPayerMemberId);
  }, [familyMembers, payerId, currentUserMemberId]);

  const toggleSplitMember = (memberId: string) => {
    console.log('🔵 [SplitModal] toggleSplitMember chamado:', { memberId, currentSplits: splits });
    
    let newSplits = [...splits];
    const exists = newSplits.find((s) => s.memberId === memberId);

    if (exists) {
      console.log('🔵 [SplitModal] Removendo membro:', memberId);
      newSplits = newSplits.filter((s) => s.memberId !== memberId);
    } else {
      console.log('🔵 [SplitModal] Adicionando membro:', memberId);
      newSplits.push({ memberId, percentage: 0, amount: 0 });
    }

    // Auto-redistribute evenly
    if (newSplits.length > 0) {
      const totalPeople = newSplits.length + 1; // +1 for current user
      const splitAmounts = moneyUtils.splitSafely(activeAmount, totalPeople);
      
      // The first amount is mine (not in splits), the rest go to others
      newSplits = newSplits.map((s, idx) => {
        const amount = splitAmounts[idx + 1]; // Skipping the first one which is mine
        return {
          ...s,
          percentage: Number(((amount / activeAmount) * 100).toFixed(1)),
          amount: amount,
        };
      });
      
      console.log('🔵 [SplitModal] Splits redistribuídos com precisão:', newSplits);
    } else {
      console.log('🔵 [SplitModal] ⚠️ Nenhum split após remoção');
    }

    console.log('🔵 [SplitModal] Chamando setSplits com:', newSplits);
    setSplits(newSplits);
  };

  const applyPreset = (myPct: number) => {
    console.log('🔵 [SplitModal] applyPreset chamado:', { myPct, currentSplits: splits });
    
    const otherPct = 100 - myPct;
    const totalOtherAmount = (activeAmount * otherPct) / 100;
    const otherAmounts = moneyUtils.splitSafely(totalOtherAmount, splits.length);

    const newSplits = splits.map((s, idx) => ({
      ...s,
      percentage: Number((otherPct / splits.length).toFixed(1)),
      amount: otherAmounts[idx],
    }));
    
    console.log('🔵 [SplitModal] Preset aplicado, novos splits:', newSplits);
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
          <DialogDescription>
            Configure como a despesa será dividida entre os participantes
          </DialogDescription>
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
                  setPayerId(otherMembers.length > 0 ? otherMembers[0].id : 'other')
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
                {otherMembers.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Nenhum outro membro cadastrado na família.
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
                    {otherMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* PARCELAMENTO quando Outro Pagou */}
                {setIsInstallment && setTotalInstallments && (
                  <div className="p-4 rounded-lg border border-border space-y-3">
                    <label className="flex items-center justify-between cursor-pointer select-none py-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Foi parcelado?</span>
                      </div>
                      <Switch
                        checked={isInstallment}
                        onCheckedChange={setIsInstallment}
                      />
                    </label>

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
            {checklistMembers.length === 0 ? (
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
                {checklistMembers.map((member) => {
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
          <Button onClick={() => {
            console.log('🔵 [SplitModal] Confirmando com splits:', splits);
            onConfirm(splits); // ✅ CORREÇÃO: Passar splits explicitamente
          }}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
