import React, { useState } from 'react';
import { MoreVertical, Trash2, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RoleSelector, RoleBadge } from './RoleSelector';
import { AvatarUpload } from './AvatarUpload';
import { usePermissions } from '@/hooks/usePermissions';
import { useUpdateFamilyMember, useRemoveFamilyMember, type FamilyMember } from '@/hooks/useFamily';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface FamilyMemberCardProps {
  member: FamilyMember;
}

export function FamilyMemberCard({ member }: FamilyMemberCardProps) {
  const { user } = useAuth();
  const { canManageMembers } = usePermissions();
  const updateMember = useUpdateFamilyMember();
  const removeMember = useRemoveFamilyMember();
  const [isEditingRole, setIsEditingRole] = useState(false);

  const isCurrentUser = member.user_id === user?.id || member.linked_user_id === user?.id;

  const handleRoleChange = async (newRole: typeof member.role) => {
    await updateMember.mutateAsync({
      id: member.id,
      role: newRole,
    });
    setIsEditingRole(false);
  };

  const handleAvatarUpload = async (avatarUrl: string) => {
    await updateMember.mutateAsync({
      id: member.id,
      avatar_url: avatarUrl,
    });
  };

  const handleRemove = async () => {
    if (confirm(`Tem certeza que deseja remover ${member.name}?`)) {
      await removeMember.mutateAsync(member.id);
    }
  };

  return (
    <div className={cn(
      'p-4 rounded-xl border transition-all',
      isCurrentUser 
        ? 'border-primary bg-primary/5' 
        : 'border-border bg-card hover:border-primary/50'
    )}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <AvatarUpload
          currentAvatarUrl={member.avatar_url}
          onUploadComplete={handleAvatarUpload}
          memberId={member.id}
          size="md"
          editable={isCurrentUser || canManageMembers}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{member.name}</h3>
                {isCurrentUser && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    Você
                  </span>
                )}
              </div>
              {member.email && (
                <p className="text-sm text-muted-foreground truncate">{member.email}</p>
              )}
              {member.status === 'pending' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Convite pendente
                </p>
              )}
            </div>

            {/* Actions */}
            {canManageMembers && !isCurrentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setIsEditingRole(!isEditingRole)}
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    Alterar Permissão
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleRemove}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Role */}
          <div className="mt-3">
            {isEditingRole && canManageMembers ? (
              <RoleSelector
                value={member.role}
                onChange={handleRoleChange}
                className="w-full"
              />
            ) : (
              <RoleBadge role={member.role} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
