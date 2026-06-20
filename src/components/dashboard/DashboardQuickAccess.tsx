import { Link } from "react-router-dom";
import { CreditCard, Users, Wallet, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortcutProps {
  to: string;
  icon: any;
  title: string;
  colorName: "indigo" | "emerald" | "blue" | "orange";
}

export function DashboardQuickAccess() {
  const shortcuts: ShortcutProps[] = [
    {
      to: "/contas",
      icon: Wallet,
      title: "Contas",
      colorName: "blue"
    },
    {
      to: "/cartoes",
      icon: CreditCard,
      title: "Cartões",
      colorName: "indigo"
    },
    {
      to: "/viagens",
      icon: Plane,
      title: "Viagens",
      colorName: "orange"
    },
    {
      to: "/compartilhados",
      icon: Users,
      title: "Grupos",
      colorName: "emerald"
    }
  ];

  // Helper function to map colors to tailwind classes
  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return {
          borderHover: "hover:border-blue-500/50",
          bgGradient: "from-blue-500/5",
          iconBg: "bg-blue-100 dark:bg-blue-500/20 group-hover:bg-blue-200 dark:group-hover:bg-blue-500/30",
          iconColor: "text-blue-600 dark:text-blue-400"
        };
      case "indigo":
        return {
          borderHover: "hover:border-indigo-500/50",
          bgGradient: "from-indigo-500/5",
          iconBg: "bg-indigo-100 dark:bg-indigo-500/20 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-500/30",
          iconColor: "text-indigo-600 dark:text-indigo-400"
        };
      case "emerald":
        return {
          borderHover: "hover:border-emerald-500/50",
          bgGradient: "from-emerald-500/5",
          iconBg: "bg-emerald-100 dark:bg-emerald-500/20 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/30",
          iconColor: "text-emerald-600 dark:text-emerald-400"
        };
      case "orange":
        return {
          borderHover: "hover:border-orange-500/50",
          bgGradient: "from-orange-500/5",
          iconBg: "bg-orange-100 dark:bg-orange-500/20 group-hover:bg-orange-200 dark:group-hover:bg-orange-500/30",
          iconColor: "text-orange-600 dark:text-orange-400"
        };
      default:
        return {
          borderHover: "hover:border-primary/50",
          bgGradient: "from-primary/5",
          iconBg: "bg-primary/10 group-hover:bg-primary/20",
          iconColor: "text-primary"
        };
    }
  };

  return (
    <div className="w-full relative">
      {/* Container com scroll horizontal fluido e sem barra de rolagem */}
      <div 
        className="flex overflow-x-auto snap-x snap-mandatory gap-3 sm:gap-4 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {shortcuts.map((shortcut, index) => {
          const colors = getColorClasses(shortcut.colorName);
          const Icon = shortcut.icon;
          
          return (
            <Link
              key={index}
              to={shortcut.to}
              className={cn(
                "snap-start shrink-0 w-[100px] sm:w-[120px] group relative overflow-hidden rounded-2xl p-4 border border-border/80 bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-1 flex flex-col items-center justify-center gap-3",
                colors.borderHover
              )}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500", colors.bgGradient)} />
              
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-colors duration-300 relative z-10", colors.iconBg)}>
                <Icon className={cn("h-6 w-6 transition-transform duration-300 group-hover:scale-110", colors.iconColor)} />
              </div>
              
              <p className="font-semibold text-sm text-foreground/90 group-hover:text-foreground transition-colors relative z-10">
                {shortcut.title}
              </p>
            </Link>
          );
        })}
      </div>
      
      {/* Sombra suave nas laterais para indicar que tem mais conteúdo (apenas no mobile se necessário) */}
      <div className="absolute top-0 right-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
    </div>
  );
}
