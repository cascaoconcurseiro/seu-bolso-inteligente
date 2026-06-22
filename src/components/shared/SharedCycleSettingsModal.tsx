import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Settings2, Banknote, CalendarDays, Users, Info } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useFamily, useUpdateFamily } from "@/hooks/useFamily";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SharedCycleSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SharedCycleSettingsModal({ isOpen, onOpenChange }: SharedCycleSettingsModalProps) {
  const { isLoading: isAccountsLoading } = useAccounts();
  const { data: family, isLoading: isFamilyLoading } = useFamily();
  const updateFamily = useUpdateFamily();
  
  const [currentCashMode, setCurrentCashMode] = useState<"MONTHLY" | "CYCLE_FAMILY">("MONTHLY");
  const [familyClosingDay, setFamilyClosingDay] = useState<string>("");
  const [familyDueDay, setFamilyDueDay] = useState<string>("");

  useEffect(() => {
    if (family && isOpen) {
      if (family.shared_closing_day) {
        setCurrentCashMode("CYCLE_FAMILY");
        setFamilyClosingDay(family.shared_closing_day.toString());
      } else {
        setCurrentCashMode("MONTHLY");
        setFamilyClosingDay("");
      }
      
      if (family.shared_due_day) {
        setFamilyDueDay(family.shared_due_day.toString());
      } else {
        setFamilyDueDay("");
      }
    }
  }, [family, isOpen]);

  const handleSave = async () => {
    const promises = [];
    
    if (family) {
      promises.push(updateFamily.mutateAsync({
        id: family.id,
        shared_closing_day: currentCashMode === "CYCLE_FAMILY" && familyClosingDay ? parseInt(familyClosingDay) : null,
        shared_due_day: currentCashMode === "CYCLE_FAMILY" && familyDueDay ? parseInt(familyDueDay) : null,
      }));
    }
    
    await Promise.all(promises);
    onOpenChange(false);
  };

  const hasChanges = () => {
    let familyChanged = false;
    if (family) {
      const dbClosing = family.shared_closing_day ? family.shared_closing_day.toString() : "";
      const dbDue = family.shared_due_day ? family.shared_due_day.toString() : "";
      
      if (currentCashMode === "CYCLE_FAMILY") {
        familyChanged = dbClosing !== familyClosingDay || dbDue !== familyDueDay;
      } else {
        familyChanged = dbClosing !== ""; // If changed to MONTHLY, it has changes if it used to have a closing day
      }
    }
    return familyChanged;
  };

  const isLoading = isAccountsLoading || isFamilyLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] overflow-hidden w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background">
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
            
            {/* INFORMAÇÃO CARTÃO DE CRÉDITO (Golden Rule) */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-4 rounded-xl flex gap-3 text-blue-800 dark:text-blue-300">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm leading-relaxed">
                <strong className="block mb-1">Cartões de Crédito:</strong> 
                Gastos feitos no crédito <b className="underline decoration-blue-400">sempre</b> seguem a data de fechamento e vencimento original do próprio cartão para garantir que o fluxo de caixa do grupo fique perfeitamente alinhado com a fatura real.
              </div>
            </div>

            {/* SESSÃO 1: DINHEIRO / PIX / DÉBITO */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Banknote className="w-5 h-5 text-green-600 dark:text-green-500" />
                <h3 className="font-bold text-base text-foreground">Pagamentos à Vista (Dinheiro/Pix/Débito)</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div 
                  onClick={() => setCurrentCashMode("MONTHLY")}
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

                <div 
                  onClick={() => setCurrentCashMode("CYCLE_FAMILY")}
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

            {/* DATAS DO CICLO FAMILIAR */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              {currentCashMode === "CYCLE_FAMILY" && (
                <div className="mt-6 p-5 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <CalendarDays className="w-5 h-5" />
                    <span>Configurar Datas do Ciclo Familiar</span>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-primary-foreground/70 dark:text-primary-foreground font-semibold">Dia de Fechamento</Label>
                      <Input type="number" inputMode="decimal" placeholder="Ex: 30" min={1} max={31} value={familyClosingDay} onChange={(e) => setFamilyClosingDay(e.target.value)} className="bg-background shadow-inner h-12 border-primary/20 focus-visible:ring-primary/40 text-base font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-primary-foreground/70 dark:text-primary-foreground font-semibold">Dia de Vencimento</Label>
                      <Input type="number" inputMode="decimal" placeholder="Ex: 5" min={1} max={31} value={familyDueDay} onChange={(e) => setFamilyDueDay(e.target.value)} className="bg-background shadow-inner h-12 border-primary/20 focus-visible:ring-primary/40 text-base font-mono" />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        <div className="p-6 pt-4 border-t bg-muted/30 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-6 font-semibold">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges() || updateFamily.isPending}
            className="h-12 px-8 font-semibold shadow-md"
          >
            {updateFamily.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Salvar Regras
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
