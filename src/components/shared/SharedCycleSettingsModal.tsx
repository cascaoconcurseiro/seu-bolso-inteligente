import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Settings2, CreditCard, Banknote } from "lucide-react";
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
    
    if (sharedExpensesBehavior === "CYCLE" && sharedSyncCreditCardId === "none" && family) {
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
    
    if (sharedExpensesBehavior === "CYCLE" && sharedSyncCreditCardId === "none" && family) {
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Configurações de Acertos e Ciclos
          </DialogTitle>
          <DialogDescription>
            Personalize como o sistema agrupa os gastos compartilhados para os acertos de contas.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto px-1">
            
            {/* SESSÃO 1: DINHEIRO / PIX / DÉBITO */}
            <div className="space-y-4 p-4 border border-border/50 rounded-xl bg-card">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Banknote className="w-5 h-5 text-green-600 dark:text-green-500" />
                <h3 className="font-semibold text-foreground">Pagamentos em Dinheiro / Pix</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label>Ciclo para gastos à vista</Label>
                  <InfoTooltip content="Como você quer agrupar as compras que não são feitas no cartão de crédito?" />
                </div>
                
                <Select value={sharedExpensesBehavior === "CURRENT_MONTH" ? "MONTHLY" : (sharedSyncCreditCardId === "none" ? "CYCLE_FAMILY" : "CYCLE_CARD")} onValueChange={(val) => {
                  if (val === "MONTHLY") {
                    setSharedExpensesBehavior("CURRENT_MONTH");
                    setSharedSyncCreditCardId("none");
                  } else if (val === "CYCLE_FAMILY") {
                    setSharedExpensesBehavior("CYCLE");
                    setSharedSyncCreditCardId("none");
                  } else if (val === "CYCLE_CARD") {
                    setSharedExpensesBehavior("CYCLE");
                    if (creditCards.length > 0) {
                      setSharedSyncCreditCardId(creditCards[0].id);
                    }
                  }
                }}>
                  <SelectTrigger className="h-12 bg-background border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Agrupar por Mês Exato (Dia 1 ao 30/31)</SelectItem>
                    {creditCards.length > 0 && (
                      <SelectItem value="CYCLE_CARD">Juntar com a fatura de um Cartão de Crédito</SelectItem>
                    )}
                    <SelectItem value="CYCLE_FAMILY">Criar um Ciclo Personalizado (Ciclo Familiar)</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg space-y-1">
                  {sharedExpensesBehavior === "CURRENT_MONTH" && (
                    <p>Todas as compras à vista fecham no último dia do mês atual.</p>
                  )}
                  {sharedExpensesBehavior === "CYCLE" && sharedSyncCreditCardId !== "none" && (
                    <p>As compras à vista se juntarão à fatura do cartão escolhido, usando os mesmos dias de fechamento e vencimento dele.</p>
                  )}
                  {sharedExpensesBehavior === "CYCLE" && sharedSyncCreditCardId === "none" && (
                    <p>Cria uma "Fatura Virtual" independente para os gastos em dinheiro, com as datas escolhidas por você abaixo.</p>
                  )}
                </div>

                {/* Sub-opção: Escolher Cartão */}
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  {sharedExpensesBehavior === "CYCLE" && sharedSyncCreditCardId !== "none" && (
                    <div className="space-y-3 mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <Label className="flex items-center gap-2">Qual cartão os gastos em dinheiro vão seguir?</Label>
                      <Select value={sharedSyncCreditCardId} onValueChange={setSharedSyncCreditCardId}>
                        <SelectTrigger className="h-10 bg-background">
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

                  {/* Sub-opção: Configurar Ciclo Familiar */}
                  {sharedExpensesBehavior === "CYCLE" && sharedSyncCreditCardId === "none" && (
                    <div className="space-y-4 mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Dia de Fechamento</Label>
                          <Input type="number" placeholder="Ex: 30" min={1} max={31} value={familyClosingDay} onChange={(e) => setFamilyClosingDay(e.target.value)} className="bg-background" />
                        </div>
                        <div className="space-y-2">
                          <Label>Dia de Vencimento</Label>
                          <Input type="number" placeholder="Ex: 5" min={1} max={31} value={familyDueDay} onChange={(e) => setFamilyDueDay(e.target.value)} className="bg-background" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SESSÃO 2: CARTÃO DE CRÉDITO */}
            <div className="space-y-4 p-4 border border-border/50 rounded-xl bg-card opacity-90">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                <h3 className="font-semibold text-foreground">Pagamentos no Cartão de Crédito</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label>Ciclo para gastos no cartão</Label>
                </div>
                <Select disabled value="DEFAULT">
                  <SelectTrigger className="h-12 bg-muted border-border/50 opacity-80 cursor-default">
                    <SelectValue placeholder="Sempre segue a própria fatura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEFAULT">Sempre segue a própria fatura</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg space-y-1">
                  <p>Por padrão, cada gasto feito no crédito segue o ciclo e vencimento do próprio cartão usado.</p>
                  <p className="mt-2 text-xs opacity-80">
                    <span className="font-semibold">Dica:</span> Se quiser alterar os dias de fechamento e vencimento de um cartão específico, acesse o menu <b>Contas e Cartões</b> e edite o cartão desejado.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border/10">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={
              !hasChanges() || 
              updateProfile.isPending || 
              updateFamily.isPending || 
              (sharedExpensesBehavior === "CYCLE" && sharedSyncCreditCardId === "none" && (!familyClosingDay || !familyDueDay))
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
