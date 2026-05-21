import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Crown, X, UserPlus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFamily, useFamilyMembers, useInviteFamilyMember, useUpdateFamilyMember, useRemoveFamilyMember, FamilyRole } from "@/hooks/useFamily";
import { useFamilyInvitations, useCancelInvitation } from "@/hooks/useFamilyInvitations";
import { useAuth } from "@/contexts/AuthContext";
import { InviteMemberDialog } from "@/components/family/InviteMemberDialog";
import { FamilyMemberCard } from "@/components/family/FamilyMemberCard";

const roleLabels: Record<FamilyRole, { label: string; description: string }> = {
  admin: { label: "Administrador", description: "Acesso total, pode gerenciar membros" },
  editor: { label: "Editor", description: "Pode criar e editar transações" },
  viewer: { label: "Visualizador", description: "Apenas visualização" },
};

export function Family() {
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useFamily();
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  const { data: invitations = [] } = useFamilyInvitations();
  const inviteMember = useInviteFamilyMember();
  const updateMember = useUpdateFamilyMember();
  const removeMember = useRemoveFamilyMember();
  const cancelInvitation = useCancelInvitation();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const isOwner = family?.owner_id === user?.id;
  const canInvite = !family || isOwner;

  const getInitials = (n: string) => n.split(" ").map(x => x[0]).join("").toUpperCase().slice(0, 2);
  const getRoleColor = (r: string) => r === "admin" ? "bg-foreground text-background" : r === "editor" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground";

  if (familyLoading || membersLoading) return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 border border-border/50 bg-card/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-10 w-48 rounded-xl" />
            <div className="skeleton h-4 w-72 rounded-lg" />
          </div>
          <div className="skeleton h-11 w-36 rounded-xl" />
        </div>
      </div>
      <div className="skeleton h-20 rounded-2xl" />
      <div className="space-y-2">
        <div className="skeleton h-4 w-32 rounded-lg" />
        {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
      </div>
    </div>
  );

  const activeMembers = members.filter(m => m.status === "active" && m.linked_user_id !== user?.id);
  const pendingInvitations = [...invitations.filter(i => i.status === "pending"), ...members.filter(m => m.status === "pending")];

  const formatFamilyName = (name: string) => {
    if (!name) return "Família";
    
    // Se o nome contém "Família de" seguido de algo com ponto ou cara de email
    if (name.includes("Família de") && (name.includes(".") || name.includes("_"))) {
      const parts = name.replace("Família de ", "").split(/[._]/);
      const firstName = parts[0];
      return `Família de ${firstName.charAt(0).toUpperCase() + firstName.slice(1)}`;
    }
    
    return name;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tighter">
              {formatFamilyName(family?.name || "Família")}
            </h1>
            <p className="text-muted-foreground mt-1 font-medium">Gerencie quem tem acesso às suas finanças</p>
          </div>
          {canInvite && (
            <Button size="lg" className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 group h-11" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-5 w-5 mr-2 transition-transform group-hover:scale-110" /> 
              Convidar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1 p-4 rounded-2xl border border-border/50 bg-card/50">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Ativos</p>
          <p className="font-mono text-2xl font-bold text-foreground">{activeMembers.length}</p>
        </div>
        {pendingInvitations.length > 0 && (
          <div className="flex flex-col gap-1 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 uppercase font-bold tracking-widest">Pendentes</p>
            <p className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingInvitations.length}</p>
          </div>
        )}
        <div className="flex flex-col gap-1 p-4 rounded-2xl border border-border/50 bg-card/50">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Total</p>
          <p className="font-mono text-2xl font-bold text-foreground">{members.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Membros ({activeMembers.length})</h2>
        {activeMembers.length === 0 ? <div className="py-12 text-center border border-dashed rounded-xl"><Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" /><p>Nenhum membro ativo</p></div> : (
          <div className="space-y-2">{activeMembers.map(m => <FamilyMemberCard key={m.id} member={m} isSelf={m.linked_user_id === user?.id} roleLabels={roleLabels} getInitials={getInitials} onUpdateRole={(id, r) => updateMember.mutate({ id, role: r })} onRemove={(id) => removeMember.mutate(id)} />)}</div>
        )}
      </div>

      {pendingInvitations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Aguardando resposta ({pendingInvitations.length})</h2>
          <div className="space-y-2">
            {pendingInvitations.map((i: any) => (
              <div key={i.id} className="p-4 rounded-xl border border-dashed bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm">{getInitials(i.member_name || i.name)}</div><div><p className="font-display font-semibold">{i.member_name || i.name}</p><p className="text-xs text-muted-foreground">Convite pendente</p></div></div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => i.member_name ? cancelInvitation.mutate(i.id) : removeMember.mutate(i.id)}><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-6 rounded-xl border bg-muted/30"><h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">Níveis de permissão</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(roleLabels).map(([k, v]) => (
            <div key={k} className="flex items-start gap-3"><div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", getRoleColor(k))}>{k === "admin" ? <Crown className="h-4 w-4" /> : k === "editor" ? <Check className="h-4 w-4" /> : <Users className="h-4 w-4" />}</div><div><p className="font-medium text-sm">{v.label}</p><p className="text-xs text-muted-foreground">{v.description}</p></div></div>
          ))}
        </div>
      </div>

      <InviteMemberDialog open={showInviteDialog} onOpenChange={setShowInviteDialog} onInvite={async (d) => { await inviteMember.mutateAsync(d); setShowInviteDialog(false); }} isPending={inviteMember.isPending} />
    </div>
  );
}
