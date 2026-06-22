/**
 * Componente de Saudação Animada
 * 
 * Exibe uma frase motivacional financeira do dia com animações suaves
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";

interface GreetingCardProps {
  className?: string;
}

export function GreetingCard({ className }: GreetingCardProps) {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const [isVisible, setIsVisible] = useState(false);

  const [tip, setTip] = useState("");

  useEffect(() => {
    const tips = [
      "💡 A regra 50-30-20 (Essencial, Lazer, Poupança) ajuda a equilibrar o seu orçamento sem sofrimento.",
      "🎯 Pagar suas faturas e contas em dia evita juros desnecessários e eleva sua pontuação de crédito.",
      "🛡️ Construir uma reserva de emergência equivalente a 3 a 6 meses de despesas traz paz financeira.",
      "📈 Os juros compostos são seus melhores amigos. Invista um valor constante, mesmo que pequeno, todo mês.",
      "🛍️ Espere 24 horas antes de fazer uma compra por impulso. Você realmente precisa disso ou é apenas ansiedade?",
      "📊 Acompanhar cada pequeno centavo é o primeiro passo para planejar e conquistar seus grandes sonhos.",
      "🏦 Concentrar gastos estratégicos no cartão pode render milhas ou cashback, contanto que pague o total da fatura."
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setTip(randomTip);

    // Animação de entrada
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 transition-all duration-700 ease-out",
        "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
        "border border-primary/20",
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-4",
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      {/* Content */}
      <div className="relative">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground">
            {(() => {
              const hour = new Date().getHours();
              if (hour < 12) return "Bom dia";
              if (hour < 18) return "Boa tarde";
              return "Boa noite";
            })()}, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || "usuário"}!
          </h2>
          <p className="text-sm font-medium text-muted-foreground opacity-90">
            Seu resumo financeiro está pronto para hoje.
          </p>
          {tip && (
            <p className="text-xs font-medium text-primary mt-1 border-t border-primary/10 pt-2 opacity-90 animate-fade-in">
              {tip}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
