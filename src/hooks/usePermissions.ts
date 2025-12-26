import { useAuth } from '@/contexts/AuthContext';
import { useFamilyMembers } from './useFamily';

export type FamilyRole = 'admin' | 'editor' | 'viewer';

export interface PermissionCheck {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
  role: FamilyRole | null;
}

/**
 * Hook para verificar permissões do usuário atual
 */
export function usePermissions(): PermissionCheck {
  const { user } = useAuth();
  const { data: familyMembers = [] } = useFamilyMembers();

  // Encontrar o membro da família correspondente ao usuário atual
  const currentMember = familyMembers.find(
    (m) => m.user_id === user?.id || m.linked_user_id === user?.id
  );

  const role = currentMember?.role || null;

  return {
    canView: !!role, // Qualquer role pode visualizar
    canEdit: role === 'admin' || role === 'editor',
    canDelete: role === 'admin',
    canManageMembers: role === 'admin',
    role,
  };
}

/**
 * Hook para verificar se o usuário pode editar/excluir uma transação específica
 */
export function useTransactionPermissions(transaction?: {
  creator_user_id?: string | null;
  source_transaction_id?: string | null;
}) {
  const { user } = useAuth();
  const permissions = usePermissions();

  // Se não tem transação, retorna permissões padrão
  if (!transaction) {
    return {
      canEdit: permissions.canEdit,
      canDelete: permissions.canDelete,
      isCreator: false,
      isMirror: false,
    };
  }

  // Verifica se é o criador
  const isCreator = transaction.creator_user_id === user?.id;

  // Verifica se é uma transação espelhada (mirror)
  const isMirror = !!transaction.source_transaction_id;

  return {
    canEdit: isCreator || (permissions.canEdit && !isMirror),
    canDelete: isCreator || permissions.canDelete,
    isCreator,
    isMirror,
  };
}
