# Guia de Implementação - Soft Delete no Frontend

## 🎯 Checklist de Implementação

### 1. Atualizar Queries Existentes

#### ❌ Antes (queries antigas)
```typescript
// Buscar membros da família
const { data: members } = await supabase
  .from('family_members')
  .select('*')
  .eq('family_id', familyId);

// Buscar membros da viagem
const { data: tripMembers } = await supabase
  .from('trip_members')
  .select('*')
  .eq('trip_id', tripId);
```

#### ✅ Depois (filtrar apenas ativos)
```typescript
// Opção 1: Usar view (recomendado)
const { data: members } = await supabase
  .from('active_family_members')
  .select('*')
  .eq('family_id', familyId);

// Opção 2: Filtrar por status
const { data: members } = await supabase
  .from('family_members')
  .select('*')
  .eq('family_id', familyId)
  .eq('status', 'active');
```

### 2. Criar Hook Customizado

```typescript
// src/hooks/useFamilyMembers.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useFamilyMembers(familyId: string, includeInactive = false) {
  return useQuery({
    queryKey: ['family-members', familyId, includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId);
      
      if (!includeInactive) {
        query = query.eq('status', 'active');
      }
      
      const { data, error } = await query.order('created_at');
      
      if (error) throw error;
      return data;
    },
  });
}

// Uso:
const { data: activeMembers } = useFamilyMembers(familyId);
const { data: allMembers } = useFamilyMembers(familyId, true);
```

### 3. Adicionar Função de Remoção

```typescript
// src/hooks/useFamilyMembers.ts (continuação)
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useRemoveFamilyMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      memberId,
      removedBy,
      reason,
    }: {
      memberId: string;
      removedBy?: string;
      reason?: string;
    }) => {
      const { error } = await supabase.rpc('remove_family_member', {
        p_member_id: memberId,
        p_removed_by: removedBy,
        p_reason: reason,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      toast.success('Membro removido com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao remover membro');
      console.error(error);
    },
  });
}

// Uso:
const removeMember = useRemoveFamilyMember();

const handleRemove = () => {
  removeMember.mutate({
    memberId: member.id,
    removedBy: currentUserId,
    reason: 'Usuário solicitou saída',
  });
};
```

### 4. Adicionar Função de Reativação

```typescript
export function useReactivateFamilyMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.rpc('reactivate_family_member', {
        p_member_id: memberId,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      toast.success('Membro reativado com sucesso');
    },
  });
}
```

### 5. Componente de Lista de Membros

```tsx
// src/components/family/FamilyMembersList.tsx
import { useState } from 'react';
import { useFamilyMembers, useRemoveFamilyMember, useReactivateFamilyMember } from '@/hooks/useFamilyMembers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UserMinus, UserPlus, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function FamilyMembersList({ familyId }: { familyId: string }) {
  const [showInactive, setShowInactive] = useState(false);
  const { data: allMembers } = useFamilyMembers(familyId, true);
  const removeMember = useRemoveFamilyMember();
  const reactivateMember = useReactivateFamilyMember();
  
  const activeMembers = allMembers?.filter(m => m.status === 'active') || [];
  const inactiveMembers = allMembers?.filter(m => m.status === 'inactive') || [];
  
  return (
    <div className="space-y-4">
      {/* Membros Ativos */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Membros Ativos ({activeMembers.length})</h3>
        {activeMembers.map(member => (
          <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeMember.mutate({
                memberId: member.id,
                reason: 'Removido pelo administrador',
              })}
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Remover
            </Button>
          </div>
        ))}
      </div>
      
      {/* Membros Inativos (Colapsável) */}
      {inactiveMembers.length > 0 && (
        <Collapsible open={showInactive} onOpenChange={setShowInactive}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="text-sm text-muted-foreground">
                Membros Inativos ({inactiveMembers.length})
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showInactive ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-2 mt-2">
            {inactiveMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.name}</p>
                      <Badge variant="secondary">Inativo</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Removido em {format(new Date(member.removed_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    {member.removal_reason && (
                      <p className="text-xs text-muted-foreground italic">
                        Motivo: {member.removal_reason}
                      </p>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reactivateMember.mutate(member.id)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Reativar
                </Button>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
```

### 6. Dialog de Confirmação de Remoção

```tsx
// src/components/family/RemoveMemberDialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export function RemoveMemberDialog({
  member,
  isOpen,
  onClose,
  onConfirm,
}: {
  member: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}) {
  const [reason, setReason] = useState('');
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover Membro da Família</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover <strong>{member?.name}</strong> da família?
            <br /><br />
            O histórico de transações será preservado, mas o membro não poderá mais
            participar de novos compartilhamentos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-2">
          <Label htmlFor="reason">Motivo (opcional)</Label>
          <Textarea
            id="reason"
            placeholder="Ex: Saiu do grupo, não participa mais..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(reason || undefined)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remover Membro
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Uso:
const [memberToRemove, setMemberToRemove] = useState<any>(null);

<RemoveMemberDialog
  member={memberToRemove}
  isOpen={!!memberToRemove}
  onClose={() => setMemberToRemove(null)}
  onConfirm={(reason) => {
    removeMember.mutate({
      memberId: memberToRemove.id,
      reason,
    });
    setMemberToRemove(null);
  }}
/>
```

### 7. Atualizar Tipos TypeScript

```typescript
// src/types/database.types.ts (atualizar com tipos gerados)
export type FamilyMemberStatus = 'active' | 'inactive' | 'pending';
export type TripMemberStatus = 'active' | 'inactive' | 'pending';

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  status: FamilyMemberStatus;
  removed_at: string | null;
  removed_by: string | null;
  removal_reason: string | null;
  // ... outros campos
}
```

## 📝 Arquivos a Modificar

### Prioridade Alta
- [ ] `src/hooks/useFamilyMembers.ts` - Criar/atualizar
- [ ] `src/hooks/useTripMembers.ts` - Criar/atualizar
- [ ] `src/pages/Family.tsx` - Atualizar queries
- [ ] `src/pages/Trips.tsx` - Atualizar queries
- [ ] `src/pages/SharedExpenses.tsx` - Atualizar queries

### Prioridade Média
- [ ] `src/components/family/FamilyMembersList.tsx` - Criar
- [ ] `src/components/family/RemoveMemberDialog.tsx` - Criar
- [ ] `src/components/trips/TripMembersList.tsx` - Criar
- [ ] `src/types/database.types.ts` - Atualizar tipos

### Prioridade Baixa
- [ ] Adicionar seção de membros inativos (opcional)
- [ ] Adicionar filtros de status
- [ ] Adicionar relatórios de histórico

## ✅ Testes Recomendados

1. **Remover membro**
   - Verificar que status muda para 'inactive'
   - Verificar que removed_at é preenchido
   - Verificar que histórico é preservado

2. **Reativar membro**
   - Verificar que status volta para 'active'
   - Verificar que removed_at é limpo
   - Verificar que membro aparece em novos compartilhamentos

3. **Queries**
   - Verificar que apenas membros ativos aparecem por padrão
   - Verificar que histórico mostra todos os membros
   - Verificar performance com índices

## 🚀 Deploy

1. Migration já aplicada em produção ✅
2. Tipos TypeScript gerados ✅
3. Implementar frontend (seguir checklist acima)
4. Testar em desenvolvimento
5. Deploy para produção

---

**Última atualização**: 03/01/2026
