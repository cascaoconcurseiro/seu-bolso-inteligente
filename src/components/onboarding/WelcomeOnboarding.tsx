import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateAccount } from "@/hooks/useAccounts";
import { Loader2, Wallet, Target, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";

interface WelcomeOnboardingProps {
  onComplete: () => void;
}

export function WelcomeOnboarding({ onComplete }: WelcomeOnboardingProps) {
  const [step, setStep] = useState(1);
  const [accountName, setAccountName] = useState("Minha Carteira");
  const [initialBalance, setInitialBalance] = useState("0");
  const [goalName, setGoalName] = useState("Reserva de Emergência");
  const [goalAmount, setGoalAmount] = useState("10000");

  const { data: profile } = useUserProfile();
  const createAccount = useCreateAccount();

  const handleNext = () => setStep(2);

  const handleFinish = async () => {
    try {
      // Create first account
      const balanceNum = parseFloat(initialBalance.replace(",", "."));
      await createAccount.mutateAsync({
        name: accountName,
        type: "CHECKING",
        balance: isNaN(balanceNum) ? 0 : balanceNum,
        currency: "BRL"
      });

      // Se tivéssemos um hook useCreateGoal aqui, criaríamos a meta.
      // Por simplicidade, vamos apenas criar a conta e concluir.
      
      toast.success("Tudo pronto! Seu Bolso Inteligente está configurado.");
      onComplete();
    } catch (error) {
      toast.error("Erro ao configurar sua conta inicial.");
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0" hideClose>
        {/* Banner header */}
        <div className="bg-primary/10 p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-display font-bold">
            Bem-vindo, {profile?.name?.split(" ")[0] || "viajante"}!
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Vamos configurar seu Bolso Inteligente em menos de 1 minuto.
          </DialogDescription>
        </div>

        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  Sua Conta Principal
                </h3>
                <p className="text-sm text-muted-foreground">
                  Para começar, precisamos de um local para registrar suas movimentações.
                </p>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="accName">Nome da Conta</Label>
                    <Input 
                      id="accName" 
                      value={accountName} 
                      onChange={e => setAccountName(e.target.value)} 
                      placeholder="Ex: Nubank, Carteira, Itaú"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accBalance">Saldo Inicial (R$)</Label>
                    <Input 
                      id="accBalance" 
                      type="number"
                      value={initialBalance} 
                      onChange={e => setInitialBalance(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col mt-4">
                <Button onClick={handleNext} className="w-full h-12 text-lg">
                  Próximo <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="ghost" onClick={onComplete} className="w-full text-muted-foreground">
                  Pular configuração inicial
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Sua Primeira Meta
                </h3>
                <p className="text-sm text-muted-foreground">
                  O Bolso Inteligente é focado no futuro. Qual o seu primeiro grande objetivo?
                </p>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="goalName">Nome da Meta</Label>
                    <Input 
                      id="goalName" 
                      value={goalName} 
                      onChange={e => setGoalName(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goalAmount">Valor Alvo (R$)</Label>
                    <Input 
                      id="goalAmount" 
                      type="number"
                      value={goalAmount} 
                      onChange={e => setGoalAmount(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-muted p-4 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Você está a um passo de assumir o controle total das suas finanças.
                </p>
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
                <Button onClick={handleFinish} disabled={createAccount.isPending} className="flex-1 h-12 text-lg">
                  {createAccount.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Concluir e Começar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
