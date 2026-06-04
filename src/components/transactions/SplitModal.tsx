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

import { useMemo, useState, useEffect } from 'react';

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
  // Estado local para a minha porcentagem de partilha quando o parceiro pagou
  const [mySplitPercentage, setMySplitPercentage] = useState<number>(50);

  // Sincroniza o estado local ao abrir o modal para carregar splits existentes se houver
  useEffect(() => {
    if (isOpen) {
      if (payerId !== 'me' && splits.length > 0) {
        setMySplitPercentage(Number((100 - splits[0].percentage).toFixed(1)));
      } else {
        setMySplitPercentage(50);
      }
      
      // Auto-inicializar 50/50 com o primeiro membro disponível se splits estiver vazio
      const otherMembersList = (familyMembers || []).filter((m) => m.id !== currentUserMemberId);
      if (payerId === 'me' && splits.length === 0 && otherMembersList.length > 0) {
        const memberId = otherMembersList[0].id;
        const totalPeople = 2; // eu + 1 parceiro
        const splitAmounts = moneyUtils.splitSafely(activeAmount, totalPeople);
        
        setSplits([{
          memberId,
          percentage: 50,
          amount: splitAmounts[1] // O parceiro fica com a segunda fatia
        }]);
      }
    }
  }, [isOpen, payerId, familyMembers, currentUserMemberId, activeAmount]);

  // Sempre que mySplitPercentage ou payerId mudar quando outro pagou (payerId !== 'me'), atualiza os splits no formato do banco
  useEffect(() => {
    if (isOpen && payerId !== 'me') {
      const partnerPercentage = 100 - mySplitPercentage;
      const partnerAmount = Number(((activeAmount * partnerPercentage) / 100).toFixed(2));
      
      // Define o split contendo apenas o parceiro que pagou
      setSplits([{
        memberId: payerId,
        percentage: partnerPercentage,
        amount: partnerAmount
      }]);
    }
  }, [mySplitPercentage, payerId, activeAmount, isOpen]);

  console.log('🔵 [SplitModal] Renderizado com:', { 
    isOpen, 
    splits, 
    familyMembers: familyMembers.length, 
    activeAmount,
    payerId,
    currentUserMemberId,
    mySplitPercentage
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
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>Divisão e Pagamento</DialogTitle>
          <DialogDescription>
            Configure como a despesa será dividida entre os participantes
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

          {payerId !== 'me' ? (
            /* NOVO PAINEL EXCLUSIVO: MINHA PARTICIPAÇÃO NO "OUTRO PAGOU" */
            <div className="space-y-4 border border-border p-4 rounded-xl bg-card">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                  Minha Participação
                </Label>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Outro Pagou
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Como <strong>{familyMembers.find(m => m.id === payerId)?.name || 'Parceiro'}</strong> pagou o valor total, defina abaixo a sua porcentagem de participação na despesa. O valor da sua fatia gerará uma dívida sua com essa pessoa.
              </p>

              {/* Seletor Rápido de Percentual */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                {[
                  { label: 'Meio a Meio (50%)', pct: 50 },
                  { label: 'Só Eu (100%)', pct: 100 },
                  { label: 'Proporcional (30%)', pct: 30 },
                  { label: 'Só Parceiro (0%)', pct: 0 },
                ].map((preset) => {
                  const isActive = mySplitPercentage === preset.pct;
                  return (
                    <Button
                      key={preset.label}
                      type="button"
                      variant={isActive ? 'default' : 'outline'}
                      className="py-2 text-[10px] sm:text-xs font-medium rounded-xl h-10 flex flex-col items-center justify-center gap-0.5 leading-none shadow-sm"
                      onClick={() => setMySplitPercentage(preset.pct)}
                    >
                      <span className="font-bold">{preset.pct}%</span>
                      <span className="text-[8px] opacity-75">{preset.pct === 50 ? 'Meio' : preset.pct === 100 ? 'Tudo' : preset.pct === 0 ? 'Nada' : 'Prop.'}</span>
                    </Button>
                  );
                })}
              </div>

              {/* Input de Ajuste Fino */}
              <div className="flex items-center gap-3 pt-2">
                <Label htmlFor="my-percentage" className="text-xs font-semibold whitespace-nowrap">
                  Ajuste Fino (%):
                </Label>
                <div className="relative flex-1">
                  <Input
                    id="my-percentage"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={mySplitPercentage}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setMySplitPercentage(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                    }}
                    className="h-10 pr-8 text-center font-bold text-sm rounded-xl"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">
                    %
                  </span>
                </div>
              </div>

              {/* Resumo de Custos em Cards Horizontais */}
              <div className="grid grid-cols-2 gap-3 pt-3">
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Minha Fatia (A Pagar)</span>
                  <span className="text-base font-black text-primary mt-1.5 leading-none">
                    R$ {((activeAmount * mySplitPercentage) / 100).toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-1 font-medium">Sua dívida com {familyMembers.find(m => m.id === payerId)?.name || 'parceiro'}</span>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-muted/40 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Custo do Parceiro</span>
                  <span className="text-base font-black text-foreground mt-1.5 leading-none">
                    R$ {((activeAmount * (100 - mySplitPercentage)) / 100).toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-1 font-medium">Parte que ele(a) consumiu</span>
                </div>
              </div>
            </div>
          ) : (
            /* AQUI FICA A RENDERIZAÇÃO ANTIGA (QUEM DIVIDE E PRESETS) QUANDO "EU PAGUEI" */
            <>
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
                  <strong>Nota:</strong> O valor que você dividiu com os membros
                  será registrado como saldo a receber ou dívida, dependendo de
                  quem pagou e da fatia de cada um.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-6 pt-4 border-t border-border shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => {
            console.log('🔵 [SplitModal] Confirmando com splits:', splits);
            onConfirm(splits);
          }}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
