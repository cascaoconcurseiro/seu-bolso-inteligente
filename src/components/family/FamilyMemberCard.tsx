import { Crown, Mail, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type FamilyRole = "admin" | "editor" | "viewer";

interface FamilyMember {
  id: string;
  name: string;
  email: string | null;
  role: FamilyRole;
  user_id?: string | null;
}

interface FamilyMemberCardProps {
  member: FamilyMember;
  isSelf: boolean;
  roleLabels: Record<string, { label: string; description: string }>;
  getInitials: (name: string) => string;
  onUpdateRole: (id: string, role: FamilyRole) => void;
  onRemove: (id: string) => void;
}

export function FamilyMemberCard({ 
  member, isSelf, roleLabels, getInitials, onUpdateRole, onRemove 
}: FamilyMemberCardProps) {
  const memberIsOwner = member.role === "admin"; // Enhanced logic

  return (
    <div className="group relative overflow-hidden p-4 rounded-2xl border border-border/50 bg-card/45 hover:bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-default">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Enhanced Avatar with double border and rich gradient */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 text-primary-foreground flex items-center justify-center font-semibold text-sm transition-transform group-hover:scale-105 shadow-md shadow-primary/10">
            {getInitials(member.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-display font-bold text-foreground flex items-center gap-2">
                {member.name} 
                {isSelf && <span className="text-sm text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold">VOCÊ</span>}
              </p>
              {memberIsOwner && <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500 animate-pulse" />}
            </div>
            {member.email && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground/60" />
                {member.email}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-widest transition-all", 
            member.role === "admin" 
              ? "bg-amber-500/10 text-warning dark:text-warning" 
              : member.role === "editor" 
                ? "bg-primary/10 text-primary" 
                : "bg-muted text-muted-foreground"
          )}>
            {roleLabels[member.role]?.label}
          </span>
          {!isSelf && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => onUpdateRole(member.id, "admin")}>Tornar Admin</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateRole(member.id, "editor")}>Tornar Editor</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateRole(member.id, "viewer")}>Tornar Visualizador</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive font-semibold focus:text-destructive" onClick={() => onRemove(member.id)}>
                  <Trash2 className="h-4 w-4 mr-2 text-destructive" /> 
                  Remover Membro
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
