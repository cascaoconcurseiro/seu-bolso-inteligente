import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

interface PeopleSettingsProps {
  members: any[];
  isLoading: boolean;
  getInitials: (name: string) => string;
}

export function PeopleSettings({ members, isLoading, getInitials }: PeopleSettingsProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nenhum membro"
        description="Adicione membros na página Família para gerenciá-los aqui."
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display font-semibold text-lg">Pessoas</h2>
        <p className="text-sm text-muted-foreground">Membros para dividir despesas</p>
      </div>
      <div className="space-y-2">
        {members.map((person) => (
          <div
            key={person.id}
            className="group flex items-center justify-between p-4 rounded-xl border border-border 
                       hover:border-foreground/20 transition-all duration-200 hover:shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-br from-foreground/80 to-foreground 
                              text-background flex items-center justify-center font-medium
                              transition-transform duration-200 group-hover:scale-110"
              >
                {getInitials(person.name)}
              </div>
              <div>
                <p className="font-medium">{person.name}</p>
                <p className="text-sm text-muted-foreground">{person.email}</p>
              </div>
            </div>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                person.role === "admin" ? "bg-foreground text-background" : "bg-muted"
              )}
            >
              {person.role === "admin"
                ? "Admin"
                : person.role === "editor"
                  ? "Editor"
                  : "Visualizador"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
