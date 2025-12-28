/**
 * Componente de Saudação Animada
 * 
 * Exibe uma saudação personalizada com animações suaves
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { getPersonalizedGreeting, getSimpleGreeting } from "@/services/greetingService";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface GreetingCardProps {
  className?: string;
}

export function GreetingCard({ className }: GreetingCardProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [greeting, setGreeting] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);

  useEffect(() => {
    // Gera a saudação quando o componente monta ou profile carrega
    const userName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';
    const personalGreeting = getPersonalizedGreeting(userName);
    setGreeting(personalGreeting);
    
    // Animação de entrada
    const timer1 = setTimeout(() => setIsVisible(true), 100);
    const timer2 = setTimeout(() => setShowSparkle(true), 600);
    const timer3 = setTimeout(() => setShowSparkle(false), 2000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [user, profile]);

  if (!greeting) {
    return null;
  }

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
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
      
      {/* Sparkle effect */}
      {showSparkle && (
        <div className="absolute top-4 right-4 animate-pulse">
          <Sparkles className="h-5 w-5 text-primary/60" />
        </div>
      )}
      
      {/* Content */}
      <div className="relative">
        <p 
          className={cn(
            "text-lg md:text-xl font-medium text-foreground/90 leading-relaxed",
            "transition-all duration-500 delay-200",
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
          )}
        >
          {greeting}
        </p>
      </div>
      
      {/* Animated border glow */}
      <div 
        className={cn(
          "absolute inset-0 rounded-2xl transition-opacity duration-1000",
          "bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0",
          showSparkle ? "opacity-100" : "opacity-0"
        )}
        style={{
          animation: showSparkle ? "shimmer 2s ease-in-out" : "none",
        }}
      />
    </div>
  );
}
