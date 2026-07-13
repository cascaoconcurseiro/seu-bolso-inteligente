import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateAccount } from "@/hooks/useAccounts";
import { useCreateDefaultCategories } from "@/hooks/useCategories";
import {
  Loader2,
  Wallet,
  CreditCard,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Tag,
  ChevronLeft,
} from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface WelcomeOnboardingProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 4;

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
};

export function WelcomeOnboarding({ onComplete }: WelcomeOnboardingProps) {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);

  // Passo 1 — Conta
  const [accountName, setAccountName] = useState("Minha Carteira");
  const [initialBalance, setInitialBalance] = useState("");

  // Passo 2 — Cartão (opcional)
  const [hasCard, setHasCard] = useState<boolean | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardLimit, setCardLimit] = useState("");
  const [closingDay, setClosingDay] = useState("10");
  const [dueDay, setDueDay] = useState("17");

  const [isLoading, setIsLoading] = useState(false);

  const { data: profile } = useUserProfile();
  const createAccount = useCreateAccount();
  const createDefaultCategories = useCreateDefaultCategories();

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      // 1. Criar conta bancária
      const balanceNum = parseFloat(initialBalance.replace(",", "."));
      await createAccount.mutateAsync({
        name: accountName || "Minha Carteira",
        type: "CHECKING",
        balance: isNaN(balanceNum) ? 0 : balanceNum,
        currency: "BRL",
      });

      // 2. Criar cartão se informado
      if (hasCard && cardName) {
        const limitNum = parseFloat(cardLimit.replace(",", "."));
        await createAccount.mutateAsync({
          name: cardName,
          type: "CREDIT_CARD",
          balance: 0,
          currency: "BRL",
          credit_limit: isNaN(limitNum) ? undefined : limitNum,
          closing_day: parseInt(closingDay) || 10,
          due_day: parseInt(dueDay) || 17,
        } as any);
      }

      // 3. Criar categorias padrão
      await createDefaultCategories.mutateAsync({ force: false });

      toast.success("Tudo pronto! Bem-vindo ao Pé de Meia 🎉");
      onComplete();
    } catch (err) {
      toast.error("Algo deu errado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const stepLabel = [
    "Sua conta principal",
    "Tem cartão de crédito?",
    "Categorias prontas",
    "Tudo certo!",
  ];

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.12)] sm:shadow-lg max-h-[92vh] flex flex-col border-b-0 sm:border-b bg-background pb-[env(safe-area-inset-bottom)] [&>button]:hidden">
        {/* Header */}
        <div className="relative p-6 flex flex-col items-center justify-center text-center overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent z-0" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/30 blur-[50px] rounded-full z-0" />
          <div className="relative z-10 w-14 h-14 bg-background/60 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-white/10">
            <Sparkles className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <DialogTitle className="relative z-10 text-2xl font-display font-bold tracking-tight">
            Olá, {profile?.name?.split(" ")[0] || "bem-vindo"}!
          </DialogTitle>
          <DialogDescription className="relative z-10 text-sm mt-1 text-muted-foreground max-w-[80%] mx-auto">
            Configuração rápida em {TOTAL_STEPS} passos
          </DialogDescription>

          {/* Progress dots */}
          <div className="relative z-10 flex items-center gap-2 mt-4">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i + 1 === step
                    ? "w-6 bg-primary"
                    : i + 1 < step
                      ? "w-3 bg-primary/60"
                      : "w-3 bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-6">
          <AnimatePresence mode="wait" custom={dir}>
            {/* PASSO 1 — Conta */}
            {step === 1 && (
              <motion.div
                key="s1"
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-5 pt-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Passo 1 de {TOTAL_STEPS}</p>
                    <p className="text-sm text-muted-foreground">{stepLabel[0]}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Qual é sua conta principal? Pode ser uma conta bancária, carteira física ou
                  qualquer lugar onde seu dinheiro fica.
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accName">Nome da conta</Label>
                    <Input
                      id="accName"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Ex: Nubank, Itaú, Carteira"
                      className="h-12 text-base"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accBalance">Saldo atual (R$)</Label>
                    <Input
                      id="accBalance"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      className="h-12 text-base font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Quanto você tem hoje nessa conta? Pode digitar 0 e ajustar depois.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Button
                    onClick={() => go(2)}
                    disabled={!accountName.trim()}
                    className="w-full h-12 text-base font-semibold rounded-xl"
                  >
                    Continuar <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={onComplete}
                    className="w-full text-sm text-muted-foreground"
                  >
                    Pular (configurar depois)
                  </Button>
                </div>
              </motion.div>
            )}

            {/* PASSO 2 — Cartão */}
            {step === 2 && (
              <motion.div
                key="s2"
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-5 pt-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Passo 2 de {TOTAL_STEPS}</p>
                    <p className="text-sm text-muted-foreground">{stepLabel[1]}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Se você usa cartão de crédito, configurar agora garante que as faturas sejam
                  calculadas corretamente.
                </p>

                {/* Sim / Não */}
                {hasCard === null && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-16 flex flex-col gap-1 text-base"
                      onClick={() => setHasCard(true)}
                    >
                      <span className="text-2xl">💳</span>
                      <span>Sim, tenho</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 flex flex-col gap-1 text-base"
                      onClick={() => {
                        setHasCard(false);
                        go(3);
                      }}
                    >
                      <span className="text-2xl">❌</span>
                      <span>Não tenho</span>
                    </Button>
                  </div>
                )}

                {hasCard === true && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome do cartão</Label>
                      <Input
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Ex: Nubank, Inter, Itaú Visa"
                        className="h-12 text-base"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Limite (R$)</Label>
                      <Input
                        inputMode="decimal"
                        value={cardLimit}
                        onChange={(e) => setCardLimit(e.target.value)}
                        placeholder="5000,00"
                        className="h-12 text-base font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Dia de fechamento</Label>
                        <Input
                          inputMode="numeric"
                          value={closingDay}
                          onChange={(e) => setClosingDay(e.target.value)}
                          placeholder="10"
                          className="h-12 text-base font-mono text-center"
                        />
                        <p className="text-xs text-muted-foreground">Dia que a fatura fecha</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Dia de vencimento</Label>
                        <Input
                          inputMode="numeric"
                          value={dueDay}
                          onChange={(e) => setDueDay(e.target.value)}
                          placeholder="17"
                          className="h-12 text-base font-mono text-center"
                        />
                        <p className="text-xs text-muted-foreground">Dia que você paga</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => go(1)}
                    className="h-12 w-12 shrink-0 rounded-xl p-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  {hasCard !== null && (
                    <Button
                      onClick={() => go(3)}
                      disabled={hasCard && !cardName.trim()}
                      className="flex-1 h-12 text-base font-semibold rounded-xl"
                    >
                      Continuar <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {/* PASSO 3 — Categorias */}
            {step === 3 && (
              <motion.div
                key="s3"
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-5 pt-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Passo 3 de {TOTAL_STEPS}</p>
                    <p className="text-sm text-muted-foreground">{stepLabel[2]}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Vamos criar automaticamente as categorias mais usadas para você já poder
                  categorizar seus gastos de imediato.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    "🍔 Alimentação",
                    "🚗 Transporte",
                    "🏠 Moradia",
                    "❤️ Saúde",
                    "🎉 Lazer",
                    "📚 Educação",
                    "💡 Contas",
                    "🛍️ Compras",
                    "💰 Salário",
                    "📈 Investimentos",
                  ].map((cat) => (
                    <div
                      key={cat}
                      className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/30 text-sm font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      {cat}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  +30 subcategorias incluídas. Você pode personalizar tudo em Configurações.
                </p>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => go(2)}
                    className="h-12 w-12 shrink-0 rounded-xl p-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => go(4)}
                    className="flex-1 h-12 text-base font-semibold rounded-xl"
                  >
                    Perfeito, vamos lá! <ArrowRight className="w-5 h-5 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* PASSO 4 — Pronto */}
            {step === 4 && (
              <motion.div
                key="s4"
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-5 pt-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Passo 4 de {TOTAL_STEPS}</p>
                    <p className="text-sm text-muted-foreground">{stepLabel[3]}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Você está pronto. Aqui está o que pode fazer primeiro:
                </p>

                <div className="space-y-3">
                  {[
                    {
                      emoji: "➕",
                      title: "Lançar uma despesa",
                      desc: "Toque no botão + para registrar qualquer gasto",
                    },
                    {
                      emoji: "📊",
                      title: "Ver seu dashboard",
                      desc: "Resumo do mês, saldos e faturas na tela inicial",
                    },
                    {
                      emoji: "💳",
                      title: "Acompanhar sua fatura",
                      desc: "Em Cartões, veja os gastos do ciclo atual",
                    },
                  ].map((tip) => (
                    <div
                      key={tip.title}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/30"
                    >
                      <span className="text-xl shrink-0">{tip.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold">{tip.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => go(3)}
                    className="h-12 w-12 shrink-0 rounded-xl p-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={handleFinish}
                    disabled={isLoading}
                    className="flex-1 h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/20"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Começar agora 🚀"}
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
