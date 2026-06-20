import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Settings2, CreditCard, Banknote, CalendarDays, Wallet, Users } from "lucide-react";
import { useUserProfile, useUpdateUserProfile } from "@/hooks/useUserProfile";
import { useAccounts } from "@/hooks/useAccounts";
import { useFamily, useUpdateFamily } from "@/hooks/useFamily";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  const [sharedCreditCardBehavior, setSharedCreditCardBehavior] = useState<string>("CARD_CYCLE");
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
      setSharedCreditCardBehavior(profile.shared_credit_card_behavior || "CARD_CYCLE");
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
      shared_credit_card_behavior: sharedCreditCardBehavior,
    }));
    
    // Only update family if ONE of the options uses the family cycle
    const usesFamilyCycleForCash = sharedExpensesBehavior === "CYCLE" && sharedSyncCreditCardId === "none";
    const usesFamilyCycleForCredit = sharedCreditCardBehavior === "FAMILY_CYCLE";
    
    if ((usesFamilyCycleForCash || usesFamilyCycleForCredit) && family) {
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
    
    const usesFamilyCycleForCash = sharedExpensesBehavior === "CYCLE" && sharedSyncCreditCardId === "none";
    const usesFamilyCycleForCredit = sharedCreditCardBehavior === "FAMILY_CYCLE";
    
    if ((usesFamilyCycleForCash || usesFamilyCycleForCredit) && family) {
      const dbClosing = family.shared_closing_day ? family.shared_closing_day.toString() : "";
      const dbDue = family.shared_due_day ? family.shared_due_day.toString() : "";
      familyChanged = dbClosing !== familyClosingDay || dbDue !== familyDueDay;
    }
    
    return (
      sharedExpensesBehavior !== (profile.shared_expenses_behavior || "CURRENT_MONTH") ||
      sharedSyncCreditCardId !== currentCardId ||
      sharedCreditCardBehavior !== (profile.shared_credit_card_behavior || "CARD_CYCLE") ||
      familyChanged
    );
  };

  const isLoading = isProfileLoading || isAccountsLoading || isFamilyLoading;

  const currentCashMode = sharedExpensesBehavior === "CURRENT_MONTH" ? "MONTHLY" : (sharedSyncCreditCardId === "none" ? "CYCLE_FAMILY" : "CYCLE_CARD");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-background">
        <div className="bg-gradient-to-b from-primary/10 to-transparent p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black">
              <div className="p-2.5 bg-primary/20 rounded-xl">
                <Settings2 className="w-6 h-6 text-primary" />
              </div>
              Regras de Fechamento
            </DialogTitle>
            <DialogDescription className="text-base mt-2 text-muted-foreground/90">
              Personalize como os gastos do grupo devem ser somados e quando as faturas virtuais fecham.
            </DialogDescription>
          </DialogHeader>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
          </div>
        ) : (
          <div className="space-y-8 p-6 max-h-[65vh] overflow-y-auto pt-2">
            
            {/* SESSÃO 1: DINHEIRO / PIX / DÉBITO */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Banknote className="w-5 h-5 text-green-600 dark:text-green-500" />
                <h3 className="font-bold text-lg text-foreground">Pagamentos à Vista (Dinheiro/Pix/Débito)</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div 
                  onClick={() => { setSharedExpensesBehavior("CURRENT_MONTH"); setSharedSyncCreditCardId("none"); }}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all cursor-pointer flex gap-4",
                    currentCashMode === "MONTHLY" ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-border/60 hover:border-border bg-card"
                  )}
                >
                  <CalendarDays className={cn("w-6 h-6 mt-0.5", currentCashMode === "MONTHLY" ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <div className="font-bold text-base">Agrupar por Mês Exato</div>
                    <div className="text-sm text-muted-foreground mt-1">Fecha no último dia útil do mês (Dia 1 ao 30/31).</div>
                  </div>
                </div>

                {creditCards.length > 0 && (
                  <div 
                    onClick={() => { 
                      setSharedExpensesBehavior("CYCLE"); 
                      setSharedSyncCreditCardId(sharedSyncCreditCardId === "none" ? creditCards[0].id : sharedSyncCreditCardId);
                    }}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-3",
                      currentCashMode === "CYCLE_CARD" ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-border/60 hover:border-border bg-card"
                    )}
                  >
                    <div className="flex gap-4">
                      <CreditCard className={cn("w-6 h-6 mt-0.5 shrink-0", currentCashMode === "CYCLE_CARD" ? "text-primary" : "text-muted-foreground")} />
                      <div className="flex-1">
                        <div className="font-bold text-base">Juntar à Fatura do Cartão</div>
                        <div className="text-sm text-muted-foreground mt-1">Os gastos à vista seguirão as datas de fechamento de um cartão escolhido.</div>
                      </div>
                    </div>
                    {currentCashMode === "CYCLE_CARD" && (
                      <div className="pl-10 mt-2 animate-in fade-in duration-200">
                        <Select value={sharedSyncCreditCardId} onValueChange={setSharedSyncCreditCardId}>
                          <SelectTrigger className="h-11 bg-background shadow-sm border-primary/20 focus:ring-primary/30">
                            <SelectValue placeholder="Selecione um cartão" />
                          </SelectTrigger>
                          <SelectContent>
                            {creditCards.map(card => (
                              <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <div 
                  onClick={() => { setSharedExpensesBehavior("CYCLE"); setSharedSyncCreditCardId("none"); }}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all cursor-pointer flex gap-4",
                    currentCashMode === "CYCLE_FAMILY" ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-border/60 hover:border-border bg-card"
                  )}
                >
                  <Users className={cn("w-6 h-6 mt-0.5", currentCashMode === "CYCLE_FAMILY" ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <div className="font-bold text-base">Ciclo Familiar (Personalizado)</div>
                    <div className="text-sm text-muted-foreground mt-1">Cria uma "Fatura Virtual" com dia de fechamento personalizado.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* SESSÃO 2: CARTÃO DE CRÉDITO */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                <h3 className="font-bold text-lg text-foreground">Pagamentos no Cartão de Crédito</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div 
                  onClick={() => setSharedCreditCardBehavior("CARD_CYCLE")}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all cursor-pointer flex gap-4",
                    sharedCreditCardBehavior === "CARD_CYCLE" ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm shadow-blue-500/10" : "border-border/60 hover:border-border bg-card"
                  )}
                >
                  <Wallet className={cn("w-6 h-6 mt-0.5", sharedCreditCardBehavior === "CARD_CYCLE" ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")} />
                  <div>
                    <div className="font-bold text-base">Sempre Seguir Fatura Original</div>
                    <div className="text-sm text-muted-foreground mt-1">Cada gasto feito cairá no ciclo exato do cartão em que foi processado. (Recomendado)</div>
                  </div>
                </div>

                <div 
                  onClick={() => setSharedCreditCardBehavior("FAMILY_CYCLE")}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all cursor-pointer flex gap-4",
                    sharedCreditCardBehavior === "FAMILY_CYCLE" ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm shadow-blue-500/10" : "border-border/60 hover:border-border bg-card"
                  )}
                >
                  <Users className={cn("w-6 h-6 mt-0.5", sharedCreditCardBehavior === "FAMILY_CYCLE" ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")} />
                  <div>
                    <div className="font-bold text-base">Forçar Ciclo Familiar</div>
                    <div className="text-sm text-muted-foreground mt-1">Ignora os cartões. Centraliza tudo no "Ciclo Familiar" personalizado.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* DATAS DO CICLO FAMILIAR (Mostra se alguma opção pedir) */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              {(currentCashMode === "CYCLE_FAMILY" || sharedCreditCardBehavior === "FAMILY_CYCLE") && (
                <div className="mt-6 p-5 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <CalendarDays className="w-5 h-5" />
                    <span>Configurar Datas do Ciclo Familiar</span>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-primary-foreground/70 dark:text-primary-foreground font-semibold">Dia de Fechamento</Label>
                      <Input type="number" inputMode="decimal" placeholder="Ex: 30" min={1} max={31} value={familyClosingDay} onChange={(e) => setFamilyClosingDay(e.target.value)} className="bg-background shadow-inner h-11 border-primary/20 focus-visible:ring-primary/40 text-lg font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-primary-foreground/70 dark:text-primary-foreground font-semibold">Dia de Vencimento</Label>
                      <Input type="number" inputMode="decimal" placeholder="Ex: 5" min={1} max={31} value={familyDueDay} onChange={(e) => setFamilyDueDay(e.target.value)} className="bg-background shadow-inner h-11 border-primary/20 focus-visible:ring-primary/40 text-lg font-mono" />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        <div className="flex justify-end gap-3 p-6 pt-4 border-t border-border/10 bg-muted/20">
          <Button variant="ghost" className="h-11 px-6 font-medium" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="h-11 px-8 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
            disabled={
              !hasChanges() || 
              updateProfile.isPending || 
              updateFamily.isPending || 
              ((sharedExpensesBehavior === "CYCLE" && sharedSyncCreditCardId === "none") || sharedCreditCardBehavior === "FAMILY_CYCLE") && (!familyClosingDay || !familyDueDay)
            }
          >
            {(updateProfile.isPending || updateFamily.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Regras
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
