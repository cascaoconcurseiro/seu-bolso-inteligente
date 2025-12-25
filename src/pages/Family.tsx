import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Users,
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
import { 
  useFamily, 
  useFamilyMembers, 
  useInviteFamilyMember, 
  useUpdateFamilyMember,
  useRemoveFamilyMember,
  FamilyRole 
} from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
import { InviteMemberDialog } from "@/components/family/InviteMemberDialog";

const roleLabels: Record<FamilyRole, { label: string; description: string }> = {
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
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useFamily();
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  const inviteMember = useInviteFamilyMember();
  const updateMember = useUpdateFamilyMember();
  const removeMember = useRemoveFamilyMember();

  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const isLoading = familyLoading || membersLoading;
  const isOwner = family?.owner_id === user?.id;

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

  const getRoleColor = (role: FamilyRole) => {
    switch (role) {
      case "admin":
        return "bg-foreground text-background";
      case "editor":
        return "bg-primary/20 text-primary";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleInvite = async (data: { name: string; email: string; role: FamilyRole }) => {
    await inviteMember.mutateAsync(data);
    setShowInviteDialog(false);
  };

  const handleUpdateRole = async (memberId: string, role: FamilyRole) => {
    await updateMember.mutateAsync({ id: memberId, role });
  };

  const handleRemove = async (memberId: string) => {
    await removeMember.mutateAsync(memberId);
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="h-12 w-48 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">
            {family?.name || "Família"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie quem tem acesso às suas finanças
          </p>
        </div>
        {isOwner && (
          <Button
            size="lg"
            onClick={() => setShowInviteDialog(true)}
            className="group transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="h-5 w-5 mr-2 transition-transform group-hover:scale-110" />
            Convidar
          </Button>
        )}
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
        {activeMembers.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-xl">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium">Nenhum membro ativo</p>
            <p className="text-sm text-muted-foreground">Convide pessoas para compartilhar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeMembers.map((member) => {
              const isSelf = member.user_id === user?.id;
              const memberIsOwner = family?.owner_id === member.user_id;
              
              return (
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
                            {member.name} {isSelf && "(você)"}
                          </p>
                          {memberIsOwner && (
                            <Crown className="h-4 w-4 text-warning" />
                          )}
                        </div>
                        {member.email && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </p>
                        )}
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
                      {isOwner && !memberIsOwner && !isSelf && (
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
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "admin")}>
                              Tornar Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "editor")}>
                              Tornar Editor
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "viewer")}>
                              Tornar Visualizador
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleRemove(member.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
                      {member.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-warning px-2 py-1 rounded-full bg-warning/10">
                      Aguardando aceite
                    </span>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemove(member.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
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
                  getRoleColor(key as FamilyRole)
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
      <InviteMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInvite={handleInvite}
        isPending={inviteMember.isPending}
      />
    </div>
  );
}
