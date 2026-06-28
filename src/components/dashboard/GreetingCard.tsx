import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";

interface GreetingCardProps {
  className?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function GreetingCard({ className }: GreetingCardProps) {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const [isVisible, setIsVisible] = useState(false);

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "usuário";

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl px-5 py-4 transition-all duration-600 ease-out",
        "bg-gradient-to-br from-accent/8 via-accent/4 to-transparent",
        "border border-accent/15",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        className
      )}
    >
      {/* Decorative blur */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-accent/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold text-accent/60 uppercase tracking-widest mb-1">
            {getGreeting()}
          </p>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground leading-none">
            {firstName}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Seu resumo financeiro está atualizado.
          </p>
        </div>
      </div>
    </div>
  );
}
