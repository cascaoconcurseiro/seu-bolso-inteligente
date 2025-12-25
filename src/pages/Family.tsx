import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Crown,
  Mail,
  MoreHorizontal,
  Check,
  X,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  avatar?: string;
  status: "active" | "pending";
  joinedAt: Date;
}

// Mock data
const mockMembers: FamilyMember[] = [
  {
    id: "1",
    name: "Você",
    email: "eu@email.com",
    role: "admin",
    status: "active",
    joinedAt: new Date(2024, 0, 1),
  },
  {
    id: "2",
    name: "Ana Silva",
    email: "ana@email.com",
    role: "editor",
    status: "active",
    joinedAt: new Date(2024, 3, 15),
  },
  {
    id: "3",
    name: "Carlos Santos",
    email: "carlos@email.com",
    role: "viewer",
    status: "active",
    joinedAt: new Date(2024, 6, 20),
  },
  {
    id: "4",
    name: "Maria Oliveira",
    email: "maria@email.com",
    role: "editor",
    status: "pending",
    joinedAt: new Date(2024, 11, 1),
  },
];

const roleLabels: Record<string, { label: string; description: string }> = {
  admin: {
    label: "Administrador",
    description: "Acesso total, pode gerenciar membros",
  },
  editor: {
    label: "Editor",
    description: "Pode criar e editar transações",
  },
  viewer: {
    label: "Visualizador",
    description: "Apenas visualização",
  },
};

export function Family() {
  const [members] = useState<FamilyMember[]>(mockMembers);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");

  const activeMembers = members.filter((m) => m.status === "active");
  const pendingMembers = members.filter((m) => m.status === "pending");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-foreground text-background";
      case "editor":
        return "bg-primary/20 text-primary";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">
            Família
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie quem tem acesso às suas finanças
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => setShowInviteDialog(true)}
          className="group transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <UserPlus className="h-5 w-5 mr-2 transition-transform group-hover:scale-110" />
          Convidar
        </Button>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-8 py-4 border-y border-border">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
            Membros ativos
          </p>
          <p className="font-mono text-2xl font-bold">{activeMembers.length}</p>
        </div>
        {pendingMembers.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
              Convites pendentes
            </p>
            <p className="font-display text-lg font-semibold text-warning">
              {pendingMembers.length}
            </p>
          </div>
        )}
      </div>

      {/* Active Members */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Membros ({activeMembers.length})
        </h2>
        <div className="space-y-2">
          {activeMembers.map((member) => (
            <div
              key={member.id}
              className="group p-4 rounded-xl border border-border hover:border-foreground/20 
                         transition-all duration-200 hover:shadow-sm cursor-default"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-foreground/80 to-foreground 
                               text-background flex items-center justify-center font-medium text-sm
                               transition-transform group-hover:scale-105"
                  >
                    {getInitials(member.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display font-semibold">
                        {member.name}
                      </p>
                      {member.role === "admin" && (
                        <Crown className="h-4 w-4 text-warning" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-xs px-3 py-1 rounded-full font-medium transition-all",
                      getRoleColor(member.role)
                    )}
                  >
                    {roleLabels[member.role].label}
                  </span>
                  {member.role !== "admin" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Alterar permissão</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {pendingMembers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            Convites pendentes ({pendingMembers.length})
          </h2>
          <div className="space-y-2">
            {pendingMembers.map((member) => (
              <div
                key={member.id}
                className="group p-4 rounded-xl border border-dashed border-border 
                           hover:border-foreground/20 transition-all duration-200 bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full bg-muted text-muted-foreground 
                                 flex items-center justify-center font-medium text-sm"
                    >
                      {getInitials(member.name)}
                    </div>
                    <div>
                      <p className="font-display font-semibold text-muted-foreground">
                        {member.name}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-warning px-2 py-1 rounded-full bg-warning/10">
                      Aguardando aceite
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions Legend */}
      <div className="p-6 rounded-xl border border-border bg-muted/30">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
          Níveis de permissão
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(roleLabels).map(([key, { label, description }]) => (
            <div key={key} className="flex items-start gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  getRoleColor(key)
                )}
              >
                {key === "admin" ? (
                  <Crown className="h-4 w-4" />
                ) : key === "editor" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar membro</DialogTitle>
            <DialogDescription>
              Envie um convite para alguém acessar suas finanças
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissão</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as "editor" | "viewer")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">
                    <div className="flex flex-col items-start">
                      <span>Editor</span>
                      <span className="text-xs text-muted-foreground">
                        Pode criar e editar transações
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex flex-col items-start">
                      <span>Visualizador</span>
                      <span className="text-xs text-muted-foreground">
                        Apenas visualização
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => setShowInviteDialog(false)}
              disabled={!inviteEmail}
            >
              <Mail className="h-4 w-4 mr-2" />
              Enviar convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
