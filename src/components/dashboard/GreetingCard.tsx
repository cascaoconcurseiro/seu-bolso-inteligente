/**
 * Componente de Saudação Animada
 * 
 * Exibe uma frase motivacional financeira do dia com animações suaves
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { getQuoteOfTheDay } from "@/lib/financialQuotes";
import { cn } from "@/lib/utils";
import { Sparkles, Quote } from "lucide-react";

interface GreetingCardProps {
  className?: string;
}

export function GreetingCard({ className }: GreetingCardProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [quoteData, setQuoteData] = useState<{ quote: string; author: string } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);

  useEffect(() => {
    // Obtém a frase motivacional do dia
    const dailyQuote = getQuoteOfTheDay();
    setQuoteData(dailyQuote);
    
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

  if (!quoteData) {
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
        {/* Quote icon */}
        <Quote className="h-8 w-8 text-primary/30 mb-3" />
        
        {/* Quote text */}
        <p 
          className={cn(
            "text-base md:text-lg font-medium text-foreground/90 leading-relaxed mb-4",
            "transition-all duration-500 delay-200",
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
          )}
        >
          "{quoteData.quote}"
        </p>
        
        {/* Author */}
        <p 
          className={cn(
            "text-sm text-muted-foreground font-medium",
            "transition-all duration-500 delay-300",
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
          )}
        >
          — {quoteData.author}
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
