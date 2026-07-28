import { memo } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Plane, Users, Wallet, type LucideIcon } from "lucide-react";

interface ShortcutProps {
  to: string;
  icon: LucideIcon;
  title: string;
}

export const DashboardQuickAccess = memo(function DashboardQuickAccess() {
  const shortcuts: ShortcutProps[] = [
    {
      to: "/contas",
      icon: Wallet,
      title: "Contas",
    },
    {
      to: "/cartoes",
      icon: CreditCard,
      title: "Cartões",
    },
    {
      to: "/viagens",
      icon: Plane,
      title: "Viagens",
    },
    {
      to: "/compartilhados",
      icon: Users,
      title: "Grupos",
    },
  ];

  return (
    <nav className="w-full border-y border-border" aria-label="Acesso rápido">
      <ul className="grid grid-cols-4 divide-x divide-border">
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon;

          return (
            <li key={shortcut.to}>
              <Link
                to={shortcut.to}
                className="group flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex-row sm:gap-2 sm:px-2"
              >
                <Icon
                  className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary"
                  aria-hidden="true"
                />
                <span>{shortcut.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});
