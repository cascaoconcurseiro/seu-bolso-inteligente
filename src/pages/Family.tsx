import { FamilyMemberCard } from '@/components/family/FamilyMemberCard';
import { InviteMemberDialog } from '@/components/family/InviteMemberDialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import {
  FamilyRole,
  useAddSharedContact,
  useConvertContactToMember,
  useConvertMemberToContact,
  useFamily,
  useFamilyMembers,
  useInviteFamilyMember,
  useRemoveFamilyMember,
  useSharedContacts,
  useToggleContactActiveInForm,
  useUpdateFamilyMember,
} from '@/hooks/useFamily';
import { useCancelInvitation, useFamilyInvitations } from '@/hooks/useFamilyInvitations';
import { cn } from '@/lib/utils';
import { Check, Crown, Plus, UserCircle2, UserPlus, Users, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const roleLabels: Record<FamilyRole, { label: string; description: string }> = {
  admin: { label: 'Administrador', description: 'Acesso total, pode gerenciar membros' },
  editor: { label: 'Editor', description: 'Pode criar e editar transações' },
  viewer: { label: 'Visualizador', description: 'Apenas visualização' },
};

export function Family() {
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useFamily();
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  const { data: contacts = [] } = useSharedContacts();
  const { data: invitations = [] } = useFamilyInvitations();
  const inviteMember = useInviteFamilyMember();
  const updateMember = useUpdateFamilyMember();
  const removeMember = useRemoveFamilyMember();
  const cancelInvitation = useCancelInvitation();
  const moveToContact = useConvertMemberToContact();
  const moveToFamily = useConvertContactToMember();
  const toggleActiveInForm = useToggleContactActiveInForm();
  const addContact = useAddSharedContact();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const isOwner = family?.owner_id === user?.id;
  const canInvite = !family || isOwner;

  const getInitials = (n: string) =>
    n
      .split(' ')
      .map((x) => x[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  const getRoleColor = (r: string) =>
    r === 'admin'
      ? 'bg-foreground text-background'
      : r === 'editor'
        ? 'bg-primary/20 text-primary'
        : 'bg-muted text-muted-foreground';

  if (familyLoading || membersLoading)
    return (
      <div className="space-y-8 animate-fade-in pb-20">
        <div className="relative overflow-hidden rounded-2xl p-4 md:p-6 border border-border/50 bg-card/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="skeleton h-10 w-48 rounded-xl" />
              <div className="skeleton h-4 w-64 rounded-lg" />
            </div>
            <div className="skeleton h-12 w-36 rounded-xl" />
          </div>
        </div>
        <div className="skeleton h-20 rounded-2xl" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-32 rounded-lg" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );

  const activeMembers = members.filter(
    (m) => m.status === 'active' && m.linked_user_id !== user?.id,
  );
  const pendingInvitations = [
    ...invitations.filter((i) => i.status === 'pending'),
    ...members.filter((m) => m.status === 'pending'),
  ];

  const formatFamilyName = (name: string) => {
    if (!name) return 'Família';

    // Se o nome contém "Família de" seguido de algo com ponto ou cara de email
    if (name.includes('Família de') && (name.includes('.') || name.includes('_'))) {
      const parts = name.replace('Família de ', '').split(/[._]/);
      const firstName = parts[0];
      return `Família de ${firstName.charAt(0).toUpperCase() + firstName.slice(1)}`;
    }

    return name;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-4 md:p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-2xl md:text-4xl tracking-tighter">
              {formatFamilyName(family?.name || 'Família')}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base font-medium">
              Gerencie o núcleo familiar e as contas vinculadas
            </p>
          </div>
          {canInvite && (
            <Button
              size="default"
              className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 group h-12 w-full sm:w-auto font-bold"
              onClick={() => setShowInviteDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
              Convidar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1 p-4 rounded-2xl border border-border/50 bg-card/50">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
            Ativos
          </p>
          <p className="font-mono text-2xl font-bold text-foreground">{activeMembers.length}</p>
        </div>
        {pendingInvitations.length > 0 && (
          <div className="flex flex-col gap-1 p-4 rounded-2xl border border-warning/20 bg-warning/5">
            <p className="text-xs text-warning/70 dark:text-warning/70 uppercase font-bold tracking-widest">
              Pendentes
            </p>
            <p className="font-mono text-2xl font-bold text-warning dark:text-warning">
              {pendingInvitations.length}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-1 p-4 rounded-2xl border border-border/50 bg-card/50">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Total</p>
          <p className="font-mono text-2xl font-bold text-foreground">{members.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Membros ({activeMembers.length})
        </h2>
        {activeMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum membro ativo"
            description="Convide familiares para participarem da sua conta, compartilharem viagens ou cartões de crédito em conjunto."
            action={
              <Button
                onClick={() => setShowInviteDialog(true)}
                className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Convidar Membro
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {activeMembers.map((m) => (
              <FamilyMemberCard
                key={m.id}
                member={m}
                isSelf={m.linked_user_id === user?.id}
                roleLabels={roleLabels}
                getInitials={getInitials}
                onUpdateRole={async (id, r) => {
                  try {
                    await updateMember.mutateAsync({ id, role: r });
                    toast.success('Permissão atualizada com sucesso');
                  } catch (e: any) {
                    toast.error(e.message || 'Erro ao atualizar permissão');
                  }
                }}
                onRemove={async (id) => {
                  try {
                    await removeMember.mutateAsync(id);
                    toast.success('Membro removido com sucesso');
                  } catch (e: any) {
                    toast.error(e.message || 'Erro ao remover membro');
                  }
                }}
                onMoveToContact={
                  isOwner
                    ? async (id) => {
                        await moveToContact.mutateAsync(id);
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {pendingInvitations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            Aguardando resposta ({pendingInvitations.length})
          </h2>
          <div className="space-y-2">
            {pendingInvitations.map((i: any) => (
              <div
                key={i.id}
                className="p-4 rounded-xl border border-dashed bg-muted/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm">
                    {getInitials(i.member_name || i.name)}
                  </div>
                  <div>
                    <p className="font-display font-semibold">{i.member_name || i.name}</p>
                    <p className="text-xs text-muted-foreground">Convite pendente</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 transition-colors"
                  disabled={cancelInvitation.isPending || removeMember.isPending}
                  onClick={async () => {
                    try {
                      if (i.member_name) {
                        await cancelInvitation.mutateAsync(i.id);
                      } else {
                        await removeMember.mutateAsync(i.id);
                      }
                      toast.success('Convite cancelado');
                    } catch (e: any) {
                      toast.error(e.message || 'Erro ao cancelar convite');
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCircle2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Contatos de Despesa ({contacts.length})
            </h2>
          </div>
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => setShowAddContact((v) => !v)}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar contato
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Pessoas com quem você divide despesas mas que não fazem parte da família. Não aparecem nos
          painéis de saldo familiar.
        </p>

        {showAddContact && (
          <form
            className="flex flex-col gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newContactName.trim()) return;
              await addContact.mutateAsync({
                name: newContactName,
                email: newContactEmail || undefined,
              });
              setNewContactName('');
              setNewContactEmail('');
              setShowAddContact(false);
            }}
          >
            <div className="flex gap-2">
              <Input
                placeholder="Nome do contato"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="h-9 text-sm flex-1"
                autoFocus
              />
              <Button
                type="submit"
                size="sm"
                disabled={addContact.isPending || !newContactName.trim()}
              >
                Salvar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddContact(false);
                  setNewContactName('');
                  setNewContactEmail('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="Email (opcional — para vincular ao app)"
              type="email"
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
              className="h-9 text-sm"
            />
          </form>
        )}

        {contacts.length > 0 && (
          <div className="space-y-2">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.active_in_form
                        ? 'Ativo no formulário de transação'
                        : 'Contato externo — histórico preservado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">No formulário</span>
                    <Switch
                      checked={!!c.active_in_form}
                      onCheckedChange={(checked) =>
                        toggleActiveInForm.mutate({ id: c.id, active_in_form: checked })
                      }
                      disabled={toggleActiveInForm.isPending}
                    />
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary hover:text-primary/80"
                      onClick={() => moveToFamily.mutate(c.id)}
                      disabled={moveToFamily.isPending}
                    >
                      Mover para família
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 rounded-xl border bg-muted/30">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
          Níveis de permissão
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(roleLabels).map(([k, v]) => (
            <div key={k} className="flex items-start gap-3">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  getRoleColor(k),
                )}
              >
                {k === 'admin' ? (
                  <Crown className="h-4 w-4" />
                ) : k === 'editor' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{v.label}</p>
                <p className="text-xs text-muted-foreground">{v.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <InviteMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInvite={async (d) => {
          await inviteMember.mutateAsync(d);
          setShowInviteDialog(false);
        }}
        isPending={inviteMember.isPending}
      />
    </div>
  );
}
