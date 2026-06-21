import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateAccount } from "@/hooks/useAccounts";
import { Loader2, Wallet, Target, Sparkles, ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface WelcomeOnboardingProps {
  onComplete: () => void;
}

export function WelcomeOnboarding({ onComplete }: WelcomeOnboardingProps) {
  const [step, setStep] = useState(1);
  const [accountName, setAccountName] = useState("Minha Carteira");
  const [initialBalance, setInitialBalance] = useState("");
  const [goalName, setGoalName] = useState("Reserva de Emergência");
  const [goalAmount, setGoalAmount] = useState("");

  const { data: profile } = useUserProfile();
  const createAccount = useCreateAccount();

  const handleNext = () => setStep(2);

  const handleFinish = async () => {
    try {
      const balanceNum = parseFloat(initialBalance.replace(",", "."));
      await createAccount.mutateAsync({
        name: accountName,
        type: "CHECKING",
        balance: isNaN(balanceNum) ? 0 : balanceNum,
        currency: "BRL"
      });
      
      toast.success("Tudo pronto! Seu Bolso Inteligente está configurado.");
      onComplete();
    } catch (error) {
      toast.error("Erro ao configurar sua conta inicial.");
    }
  };

  const variants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden shadow-2xl w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-[2rem] !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background" hideClose>
        {/* Banner header with Glassmorphism */}
        <div className="relative p-8 flex flex-col items-center justify-center text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent z-0"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/30 blur-[50px] rounded-full z-0"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 blur-[50px] rounded-full z-0"></div>
          
          <div className="relative z-10 w-16 h-16 bg-background/50 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-lg border border-white/10">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <DialogTitle className="relative z-10 text-3xl font-display font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Olá, {profile?.name?.split(" ")[0] || "viajante"}!
          </DialogTitle>
          <DialogDescription className="relative z-10 text-base mt-2 text-foreground/80 max-w-[80%] mx-auto font-medium">
            Bem-vindo ao Pé de Meia. Vamos preparar o terreno para a sua liberdade financeira.
          </DialogDescription>
        </div>

        <div className="p-6 relative z-10 bg-card/50 backdrop-blur-sm rounded-t-3xl -mt-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] border-t border-white/5">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    Passo 1 de 2
                  </div>
                  <h3 className="font-semibold text-xl flex items-center gap-2">
                    <Wallet className="w-6 h-6 text-primary" />
                    Sua Carteira Principal
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Onde seu dinheiro vive atualmente? Dê um nome e defina o saldo atual para começarmos com o pé direito.
                  </p>
                  
                  <div className="space-y-4 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="accName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da Conta</Label>
                      <Input 
                        id="accName" 
                        value={accountName} 
                        onChange={e => setAccountName(e.target.value)} 
                        placeholder="Ex: Nubank, Carteira, Itaú"
                        className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary/50 text-lg transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accBalance" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Saldo Inicial (R$)</Label>
                      <Input 
                        id="accBalance" 
                        type="number"
                        placeholder="0.00"
                        value={initialBalance} 
                        onChange={e => setInitialBalance(e.target.value)} 
                        className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary/50 text-lg transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 mt-8">
                  <Button onClick={handleNext} className="w-full h-12 text-md font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5">
                    Continuar <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                  <Button variant="ghost" onClick={onComplete} className="w-full text-xs text-muted-foreground hover:bg-transparent hover:text-foreground">
                    Pular configuração (não recomendado)
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    Passo 2 de 2
                  </div>
                  <h3 className="font-semibold text-xl flex items-center gap-2">
                    <Target className="w-6 h-6 text-primary" />
                    Seu Grande Alvo
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    O dinheiro é um meio, não um fim. O que você quer conquistar primeiro?
                  </p>
                  
                  <div className="space-y-4 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="goalName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">O que você quer alcançar?</Label>
                      <Input 
                        id="goalName" 
                        value={goalName} 
                        onChange={e => setGoalName(e.target.value)}
                        placeholder="Ex: Reserva de Emergência, Carro Novo"
                        className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary/50 text-lg transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goalAmount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quanto você precisa? (R$)</Label>
                      <Input 
                        id="goalAmount" 
                        type="number"
                        placeholder="10000.00"
                        value={goalAmount} 
                        onChange={e => setGoalAmount(e.target.value)} 
                        className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary/50 text-lg transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-primary/5 p-4 rounded-xl flex items-start gap-3 border border-primary/10 mt-6"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground/80 font-medium">
                    Incrível! Após concluir, suas metas estarão disponíveis no painel principal.
                  </p>
                </motion.div>

                <div className="flex gap-3 mt-8">
                  <Button variant="outline" onClick={() => setStep(1)} className="h-12 rounded-xl px-4 border-white/10 bg-background/50">
                    Voltar
                  </Button>
                  <Button onClick={handleFinish} disabled={createAccount.isPending || !accountName} className="flex-1 h-12 text-md font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5">
                    {createAccount.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Concluir e Decolar"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
