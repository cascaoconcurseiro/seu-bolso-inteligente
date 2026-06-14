import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Settings2, CreditCard } from "lucide-react";
import { useUserProfile, useUpdateUserProfile } from "@/hooks/useUserProfile";
import { useAccounts } from "@/hooks/useAccounts";
import { useFamily, useUpdateFamily } from "@/hooks/useFamily";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Input } from "@/components/ui/input";

interface SharedCycleSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SharedCycleSettingsModal({ isOpen, onOpenChange }: SharedCycleSettingsModalProps) {
  const { data: profile, isLoading: isProfileLoading } = useUserProfile();
  const updateProfile = useUpdateUserProfile();
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();
  const { data: family, isLoading: isFamilyLoading } = useFamily();
  const updateFamily = useUpdateFamily();
  
  const [sharedExpensesBehavior, setSharedExpensesBehavior] = useState<string>("CURRENT_MONTH");
  const [sharedSyncCreditCardId, setSharedSyncCreditCardId] = useState<string>("none");
  const [familyClosingDay, setFamilyClosingDay] = useState<string>("");
  const [familyDueDay, setFamilyDueDay] = useState<string>("");

  const creditCards = useMemo(() => {
    return accounts?.filter(acc => acc.type === 'CREDIT_CARD') || [];
  }, [accounts]);

  useEffect(() => {
    if (profile && isOpen && accounts) {
      setSharedExpensesBehavior(profile.shared_expenses_behavior || "CURRENT_MONTH");
      
      let initialCardId = profile.shared_sync_credit_card_id || "none";
      if (initialCardId === "none" && profile.shared_expenses_behavior === "CYCLE" && creditCards.length > 0) {
        initialCardId = creditCards[0].id;
      }
      setSharedSyncCreditCardId(initialCardId);
    }
    
    if (family && isOpen) {
      if (family.shared_closing_day) setFamilyClosingDay(family.shared_closing_day.toString());
      if (family.shared_due_day) setFamilyDueDay(family.shared_due_day.toString());
    }
  }, [profile, isOpen, accounts, creditCards, family]);

  const handleSave = async () => {
    const promises = [];
    promises.push(updateProfile.mutateAsync({
      shared_expenses_behavior: sharedExpensesBehavior,
      shared_sync_credit_card_id: sharedSyncCreditCardId === "none" ? null : sharedSyncCreditCardId,
    }));
    
    if (sharedExpensesBehavior === "CYCLE" && creditCards.length === 0 && family) {
      promises.push(updateFamily.mutateAsync({
        id: family.id,
        shared_closing_day: familyClosingDay ? parseInt(familyClosingDay) : null,
        shared_due_day: familyDueDay ? parseInt(familyDueDay) : null,
      }));
    }
    
    await Promise.all(promises);
    onOpenChange(false);
  };

  const hasChanges = () => {
    if (!profile) return false;
    const currentCardId = profile.shared_sync_credit_card_id || "none";
    let familyChanged = false;
    
    if (sharedExpensesBehavior === "CYCLE" && creditCards.length === 0 && family) {
      const dbClosing = family.shared_closing_day ? family.shared_closing_day.toString() : "";
      const dbDue = family.shared_due_day ? family.shared_due_day.toString() : "";
      familyChanged = dbClosing !== familyClosingDay || dbDue !== familyDueDay;
    }
    
    return (
      sharedExpensesBehavior !== (profile.shared_expenses_behavior || "CURRENT_MONTH") ||
      sharedSyncCreditCardId !== currentCardId ||
      familyChanged
    );
  };

  const isLoading = isProfileLoading || isAccountsLoading || isFamilyLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Ciclo de Despesas Compartilhadas
          </DialogTitle>
          <DialogDescription>
            Defina como o sistema deve tratar transações compartilhadas pagas à vista (Dinheiro/Conta Bancária).
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Comportamento do Ciclo</Label>
                <InfoTooltip content="Despesas feitas no Cartão de Crédito sempre seguem a fatura do cartão. Esta opção define o que acontece com despesas feitas no Dinheiro ou Conta Corrente." />
              </div>
              <Select value={sharedExpensesBehavior} onValueChange={(val) => {
                setSharedExpensesBehavior(val);
                if (val === "CYCLE" && sharedSyncCreditCardId === "none" && creditCards.length > 0) {
                  setSharedSyncCreditCardId(creditCards[0].id);
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CURRENT_MONTH">Cobrar no Mês do Lançamento</SelectItem>
                  <SelectItem value="CYCLE">Seguir Ciclo do Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg border border-border/50 space-y-2">
                {sharedExpensesBehavior === "CURRENT_MONTH" ? (
                  <>
                    <p className="font-semibold text-foreground">Cobrar no Mês do Lançamento:</p>
                    <p>Despesas pagas em dinheiro ou conta bancária serão cobradas no acerto (settlement) do <strong>exato mês</strong> em que a compra foi feita.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-foreground">Seguir Ciclo do Cartão de Crédito:</p>
                    <p>Despesas pagas em dinheiro ou conta bancária funcionarão igual a um cartão de crédito. Sincronize com um cartão mestre e tudo que for gasto acumulará para o seu parceiro(a) pagar apenas no mês seguinte.</p>
                  </>
                )}
              </div>
            </div>

            {sharedExpensesBehavior === "CYCLE" && (
              <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                {creditCards.length > 0 ? (
                  <>
                    <Label className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      Sincronizar com qual Cartão?
                    </Label>
                    <Select value={sharedSyncCreditCardId} onValueChange={setSharedSyncCreditCardId}>
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Selecione um cartão de crédito" />
                      </SelectTrigger>
                      <SelectContent>
                        {creditCards.map(card => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-primary font-medium p-3 bg-primary/10 rounded-md">
                      Você não possui cartões de crédito. Criamos um Ciclo Fixo Base (Fatura da Família) para alinhar os fechamentos dos gastos no dinheiro/PIX.
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Dia de Fechamento</Label>
                        <Input 
                          type="number" 
                          placeholder="Ex: 30" 
                          min={1} 
                          max={31} 
                          value={familyClosingDay} 
                          onChange={(e) => setFamilyClosingDay(e.target.value)} 
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Dia de Vencimento</Label>
                        <Input 
                          type="number" 
                          placeholder="Ex: 5" 
                          min={1} 
                          max={31} 
                          value={familyDueDay} 
                          onChange={(e) => setFamilyDueDay(e.target.value)} 
                          className="bg-background"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={
              !hasChanges() || 
              updateProfile.isPending || 
              updateFamily.isPending || 
              (sharedExpensesBehavior === "CYCLE" && creditCards.length === 0 && (!familyClosingDay || !familyDueDay))
            }
          >
            {(updateProfile.isPending || updateFamily.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Preferências
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
