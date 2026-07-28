/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unused-imports/no-unused-vars */
import { memo } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Users, Wallet, Plane } from "lucide-react";

interface ShortcutProps {
  to: string;
  icon: any;
  title: string;
  colorName: "indigo" | "emerald" | "blue" | "orange";
}

export const DashboardQuickAccess = memo(function DashboardQuickAccess() {
  const shortcuts: ShortcutProps[] = [
    {
      to: "/contas",
      icon: Wallet,
      title: "Contas",
      colorName: "blue",
    },
    {
      to: "/cartoes",
      icon: CreditCard,
      title: "Cartões",
      colorName: "indigo",
    },
    {
      to: "/viagens",
      icon: Plane,
      title: "Viagens",
      colorName: "orange",
    },
    {
      to: "/compartilhados",
      icon: Users,
      title: "Grupos",
      colorName: "emerald",
    },
  ];

  return (
    <div className="w-full py-1">
      <div className="flex justify-center sm:justify-between items-start gap-3 sm:gap-2 px-2 sm:px-4">
        {shortcuts.map((shortcut, index) => {
          const Icon = shortcut.icon;

          return (
            <Link
              key={index}
              to={shortcut.to}
              className="group flex flex-col items-center gap-2 w-16 sm:w-auto sm:flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-card/60 backdrop-blur-md border border-border/50 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-primary/30 group-hover:bg-card group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <Icon className="h-6 w-6 text-foreground/70 group-hover:text-primary transition-colors duration-300" />
              </div>
              <p className="font-medium text-sm text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
                {shortcut.title}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
});
