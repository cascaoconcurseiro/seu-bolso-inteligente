import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Settings2 } from "lucide-react";
import { useUserProfile, useUpdateUserProfile } from "@/hooks/useUserProfile";
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface SharedCycleSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SharedCycleSettingsModal({ isOpen, onOpenChange }: SharedCycleSettingsModalProps) {
  const { data: profile, isLoading } = useUserProfile();
  const updateProfile = useUpdateUserProfile();
  
  const [sharedExpensesBehavior, setSharedExpensesBehavior] = useState<string>("CURRENT_MONTH");
  const [sharedClosingDay, setSharedClosingDay] = useState("");
  const [sharedDueDay, setSharedDueDay] = useState("");

  useEffect(() => {
    if (profile && isOpen) {
      setSharedExpensesBehavior(profile.shared_expenses_behavior || "CURRENT_MONTH");
      setSharedClosingDay(profile.shared_closing_day?.toString() || "");
      setSharedDueDay(profile.shared_due_day?.toString() || "");
    }
  }, [profile, isOpen]);

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      shared_expenses_behavior: sharedExpensesBehavior,
      shared_closing_day: sharedClosingDay ? parseInt(sharedClosingDay, 10) : null,
      shared_due_day: sharedDueDay ? parseInt(sharedDueDay, 10) : null,
    });
    onOpenChange(false);
  };

  const hasChanges = () => {
    if (!profile) return false;
    return (
      sharedExpensesBehavior !== (profile.shared_expenses_behavior || "CURRENT_MONTH") ||
      sharedClosingDay !== (profile.shared_closing_day?.toString() || "") ||
      sharedDueDay !== (profile.shared_due_day?.toString() || "")
    );
  };

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
              <Select value={sharedExpensesBehavior} onValueChange={setSharedExpensesBehavior}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CURRENT_MONTH">Cobrar no Mês do Lançamento</SelectItem>
                  <SelectItem value="CYCLE">Seguir Ciclo/Fatura Compartilhada</SelectItem>
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
                    <p className="font-semibold text-foreground">Seguir Ciclo/Fatura Compartilhada:</p>
                    <p>Despesas pagas em dinheiro ou conta bancária funcionarão igual a um cartão de crédito. Você define um dia de "corte", e tudo que for gasto dali em diante acumulará para ser cobrado do seu parceiro(a) apenas no mês seguinte.</p>
                  </>
                )}
              </div>
            </div>

            {sharedExpensesBehavior === "CYCLE" && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-2">
                  <Label className="text-xs">Dia de Fechamento</Label>
                  <Select value={sharedClosingDay} onValueChange={setSharedClosingDay}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Ex: 30" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>Dia {day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Dia de Vencimento</Label>
                  <Select value={sharedDueDay} onValueChange={setSharedDueDay}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Ex: 5" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>Dia {day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
            disabled={!hasChanges() || updateProfile.isPending}
          >
            {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Preferências
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
