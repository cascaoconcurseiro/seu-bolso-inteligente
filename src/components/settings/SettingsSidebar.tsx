import { cn } from "@/lib/utils";
import { User, Tag, Users, Bell, Shield, Database, HelpCircle, SlidersHorizontal, Lock, Zap } from "lucide-react";

export type SettingsSection = "account" | "preferences" | "security" | "categories" | "people" | "notifications" | "backup" | "admin" | "help" | "automations";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  setActiveSection: (section: SettingsSection) => void;
  categoriesCount: number;
  membersCount: number;
}

export function SettingsSidebar({ activeSection, setActiveSection, categoriesCount, membersCount }: SettingsSidebarProps) {
  const sections = [
    { id: "help" as const, label: "Central de Ajuda (FAQ)", icon: HelpCircle },
    { id: "account" as const, label: "Perfil", icon: User },
    { id: "preferences" as const, label: "Preferências", icon: SlidersHorizontal },
    { id: "security" as const, label: "Segurança", icon: Lock },
    { id: "categories" as const, label: "Categorias", icon: Tag, count: categoriesCount },
    { id: "people" as const, label: "Pessoas", icon: Users, count: membersCount },
    { id: "automations" as const, label: "Automações", icon: Zap },
    { id: "notifications" as const, label: "Notificações", icon: Bell },
    { id: "backup" as const, label: "Backup e Dados", icon: Database },
    { id: "admin" as const, label: "Área Adm", icon: Shield },
  ];

  return (
    <nav className="lg:col-span-1 space-y-2">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => setActiveSection(section.id)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-left",
            activeSection === section.id
              ? "bg-foreground text-background"
              : "hover:bg-muted hover:translate-x-1"
          )}
        >
          <div className="flex items-center gap-3">
            <section.icon className="h-5 w-5" />
            <span className="font-medium">{section.label}</span>
          </div>
          {section.count !== undefined && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full transition-all",
              activeSection === section.id ? "bg-background/20" : "bg-muted"
            )}>
              {section.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
