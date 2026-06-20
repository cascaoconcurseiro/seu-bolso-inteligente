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

  return (
    <div className="w-full md:hidden py-1">
      <div className="flex justify-between items-start gap-2 px-2 sm:px-4">
        {shortcuts.map((shortcut, index) => {
          const Icon = shortcut.icon;
          
          return (
            <Link
              key={index}
              to={shortcut.to}
              className="group flex flex-col items-center gap-2 w-16"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-card/60 backdrop-blur-md border border-border/50 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-primary/30 group-hover:bg-card">
                <Icon className="h-6 w-6 text-foreground/70 group-hover:text-primary transition-colors duration-300" />
              </div>
              <p className="font-medium text-[11px] text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
                {shortcut.title}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
