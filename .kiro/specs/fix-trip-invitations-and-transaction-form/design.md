# Design Document

## Overview

Este documento descreve o design técnico para corrigir três bugs críticos no sistema:
1. Viagens que desaparecem após aceitar convite
2. Ausência de notificação quando convite é rejeitado
3. Loop infinito ao abrir formulário de transação

A solução envolve correções nos hooks de React Query, otimização de cache, e melhorias na lógica de gerenciamento de membros de viagem.

## Architecture

### Component Hierarchy

```
App
├── Pages
│   ├── NewTransaction (usa TransactionForm)
│   └── Trips (usa PendingTripInvitationsAlert)
├── Components
│   ├── TransactionForm (problema de loop)
│   └── PendingTripInvitationsAlert (usa hooks de convites)
└── Hooks
    ├── useTripInvitations (problema: não adiciona membro)
    ├── useTrips (problema: query incorreta)
    └── useTripMembers (usado para verificar membros)
```

### Data Flow

```
1. Aceitar Convite:
   User clicks "Aceitar" 
   → useAcceptTripInvitation.mutate()
   → Update trip_invitations.status = 'accepted'
   → Insert into trip_members (FALTANDO)
   → Invalidate queries
   → UI atualiza com viagem visível

2. Rejeitar Convite:
   User clicks "Recusar"
   → useRejectTripInvitation.mutate()
   → Update trip_invitations.status = 'rejected'
   → Fetch trip and user data (FALTANDO)
   → Show toast with details (MELHORAR)
   → Invalidate queries

3. Abrir Formulário:
   User navega para /nova-transacao
   → TransactionForm monta
   → useQuery hooks executam (LOOP)
   → useEffect de duplicatas executa (LOOP)
   → DialogContent warnings (ACESSIBILIDADE)
```

## Components and Interfaces

### 1. Hook: useAcceptTripInvitation

**Localização:** `src/hooks/useTripInvitations.ts`

**Problema Atual:**
- Apenas atualiza o status do convite
- Não adiciona o usuário em `trip_members`
- Viagem não aparece na query `useTrips` porque ela busca por `trip_members`

**Solução:**

```typescript
export function useAcceptTripInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      // 1. Buscar dados do convite
      const { data: invitation, error: invError } = await supabase
        .from("trip_invitations")
        .select("id, trip_id, inviter_id, invitee_id")
        .eq("id", invitationId)
        .single();

      if (invError) throw invError;
      if (!invitation) throw new Error("Convite não encontrado");

      // 2. Atualizar status do convite
      const { error: updateError } = await supabase
        .from("trip_invitations")
        .update({ 
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq("id", invitationId);

      if (updateError) throw updateError;

      // 3. ADICIONAR USUÁRIO EM TRIP_MEMBERS (CORREÇÃO PRINCIPAL)
      const { error: memberError } = await supabase
        .from("trip_members")
        .insert({
          trip_id: invitation.trip_id,
          user_id: invitation.invitee_id,
          role: 'member',
          can_edit_details: false,
          can_manage_expenses: true,
        });

      if (memberError) {
        // Se já existe, ignorar erro de duplicata
        if (!memberError.message.includes('duplicate')) {
          throw memberError;
        }
      }

      // 4. Buscar dados para notificação
      const [tripResult, inviterResult] = await Promise.all([
        supabase
          .from("trips")
          .select("name, destination")
          .eq("id", invitation.trip_id)
          .single(),
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", invitation.inviter_id)
          .single()
      ]);

      return {
        ...invitation,
        trips: tripResult.data,
        inviter: inviterResult.data
      };
    },
    onSuccess: (data) => {
      // Invalidar queries em batch
      queryClient.invalidateQueries({ queryKey: ["pending-trip-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip-members", data.trip_id] });

      const tripName = data.trips?.name || "viagem";
      const inviterName = data.inviter?.full_name || "alguém";

      toast.success(
        `🎉 Você agora faz parte da viagem "${tripName}"!`,
        {
          description: `Convite de ${inviterName} aceito. Boa viagem!`,
          duration: 5000,
        }
      );
    },
    onError: (error: any) => {
      console.error("Erro ao aceitar convite:", error);
      toast.error("Erro ao aceitar convite: " + error.message);
    },
  });
}
```

### 2. Hook: useRejectTripInvitation

**Localização:** `src/hooks/useTripInvitations.ts`

**Problema Atual:**
- Não busca dados da viagem e do usuário
- Notificação genérica sem detalhes
- Criador da viagem não sabe quem rejeitou

**Solução:**

```typescript
export function useRejectTripInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      // 1. Buscar dados do convite antes de atualizar
      const { data: invitation, error: invError } = await supabase
        .from("trip_invitations")
        .select("id, trip_id, inviter_id, invitee_id")
        .eq("id", invitationId)
        .single();

      if (invError) throw invError;
      if (!invitation) throw new Error("Convite não encontrado");

      // 2. Atualizar status
      const { error: updateError } = await supabase
        .from("trip_invitations")
        .update({ 
          status: 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq("id", invitationId);

      if (updateError) throw updateError;

      // 3. Buscar dados para notificação detalhada
      const [tripResult, inviterResult] = await Promise.all([
        supabase
          .from("trips")
          .select("name, destination")
          .eq("id", invitation.trip_id)
          .single(),
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", invitation.inviter_id)
          .single()
      ]);

      return {
        ...invitation,
        trips: tripResult.data,
        inviter: inviterResult.data
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pending-trip-invitations"] });
      
      const tripName = data.trips?.name || "viagem";
      const inviterName = data.inviter?.full_name || "alguém";

      toast.info(
        `Convite recusado`,
        {
          description: `Você recusou o convite de ${inviterName} para "${tripName}"`,
          duration: 5000,
        }
      );
    },
    onError: (error: any) => {
      console.error("Erro ao rejeitar convite:", error);
      toast.error("Erro ao rejeitar convite: " + error.message);
    },
  });
}
```

### 3. Hook: useTrips

**Localização:** `src/hooks/useTrips.ts`

**Problema Atual:**
- Query já está correta (busca por trip_members)
- Mas precisa de otimizações de cache

**Solução (Otimizações):**

```typescript
export function useTrips() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trips", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Buscar IDs das viagens onde o usuário é membro
      const { data: memberTrips, error: memberError } = await supabase
        .from("trip_members")
        .select("trip_id")
        .eq("user_id", user.id);

      if (memberError) throw memberError;
      
      if (!memberTrips || memberTrips.length === 0) return [];

      const tripIds = memberTrips.map(m => m.trip_id);

      // Buscar as viagens completas
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .in("id", tripIds)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as Trip[];
    },
    enabled: !!user,
    retry: false, // OTIMIZAÇÃO: Não retentar em caso de erro
    staleTime: 30000, // OTIMIZAÇÃO: Cache por 30 segundos
    refetchOnWindowFocus: false, // OTIMIZAÇÃO: Não re-buscar ao focar janela
  });
}
```

### 4. Hook: usePendingTripInvitations

**Localização:** `src/hooks/useTripInvitations.ts`

**Problema Atual:**
- Configurações de cache podem causar loops
- Re-busca excessiva ao trocar de aba

**Solução (Já Implementada, Manter):**

```typescript
export function usePendingTripInvitations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pending-trip-invitations", user?.id],
    queryFn: async () => {
      // ... código existente ...
    },
    enabled: !!user,
    retry: 1, // JÁ OTIMIZADO
    staleTime: 60000, // JÁ OTIMIZADO
    refetchOnMount: true,
    refetchOnWindowFocus: false, // JÁ OTIMIZADO
  });
}
```

### 5. Component: TransactionForm

**Localização:** `src/components/transactions/TransactionForm.tsx`

**Problemas Atuais:**
1. useEffect de detecção de duplicatas sem verificação de array vazio
2. Dependências do useEffect causando loops
3. DialogContent sem aria-describedby

**Solução:**

#### A. Correção do useEffect de Duplicatas

```typescript
// ANTES (linha ~140):
useEffect(() => {
  const handler = setTimeout(() => {
    const numericAmount = getNumericAmount();
    if (!description || numericAmount === 0 || !date) {
      setDuplicateWarning(false);
      return;
    }

    const hasDuplicate = allTransactions.some((tx) => {
      // ... lógica ...
    });

    setDuplicateWarning(hasDuplicate);
  }, 500);

  return () => clearTimeout(handler);
}, [amount, description, date, activeTab]);

// DEPOIS (CORREÇÃO):
useEffect(() => {
  // ADICIONAR: Verificar se allTransactions está carregado
  if (!allTransactions || allTransactions.length === 0) {
    setDuplicateWarning(false);
    return;
  }

  const handler = setTimeout(() => {
    const numericAmount = getNumericAmount();
    if (!description || numericAmount === 0 || !date) {
      setDuplicateWarning(false);
      return;
    }

    const hasDuplicate = allTransactions.some((tx) => {
      if (tx.type !== activeTab) return false;

      const amountMatch = Math.abs(tx.amount - numericAmount) < 0.01;
      const descMatch = tx.description.toLowerCase().includes(description.toLowerCase().trim()) ||
        description.toLowerCase().trim().includes(tx.description.toLowerCase());

      const txDate = typeof tx.date === 'string' ? parseISO(tx.date) : tx.date;
      const formDate = typeof date === 'string' ? parseISO(date) : date;
      const daysDiff = Math.abs(differenceInDays(txDate, formDate));
      const dateMatch = daysDiff <= 3;

      return amountMatch && descMatch && dateMatch;
    });

    setDuplicateWarning(hasDuplicate);
  }, 500);

  return () => clearTimeout(handler);
  // REMOVER allTransactions das dependências para evitar loop
}, [amount, description, date, activeTab]);
```

#### B. Otimização da Query de Transações

```typescript
// Em useTransactions hook (se necessário):
const { data: allTransactions = [] } = useTransactions({
  staleTime: 60000, // Cache por 1 minuto
  refetchOnWindowFocus: false, // Não re-buscar ao focar
});
```

#### C. Correção de Acessibilidade no SplitModal

**Localização:** `src/components/transactions/SplitModal.tsx`

```typescript
// Adicionar Description ao DialogContent:
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
  <DialogHeader>
    <DialogTitle>Dividir Despesa</DialogTitle>
    <DialogDescription>
      Configure como a despesa será dividida entre os participantes
    </DialogDescription>
  </DialogHeader>
  {/* ... resto do conteúdo ... */}
</DialogContent>
```

## Data Models

### trip_members Table

```sql
CREATE TABLE trip_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  can_edit_details BOOLEAN DEFAULT false,
  can_manage_expenses BOOLEAN DEFAULT true,
  personal_budget DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);
```

### trip_invitations Table

```sql
CREATE TABLE trip_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id),
  invitee_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(trip_id, invitee_id)
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Após análise dos critérios de aceitação, identifiquei as seguintes redundâncias:

- **1.3 e 1.5**: Ambos testam que a query de viagens retorna viagens onde o usuário é membro. Consolidar em uma propriedade.
- **1.1, 5.2, 5.3, 5.4**: Todos testam aspectos do registro criado em trip_members ao aceitar convite. Consolidar em uma propriedade abrangente.
- **4.1 e 4.2**: Ambos testam a mesma operação de buscar viagens por trip_members. Consolidar.
- **2.3 e 6.3**: Ambos testam que a notificação de rejeição contém os dados corretos. Consolidar.

### Correctness Properties

**Property 1: Trip Member Creation on Accept**
*For any* trip invitation that is accepted, the system should create a record in trip_members with the invitee's user_id, role set to 'member', and can_manage_expenses set to true.
**Validates: Requirements 1.1, 5.2, 5.3, 5.4**

**Property 2: Trip Visibility After Accept**
*For any* user who accepts a trip invitation, the trips query should return that trip in the user's list of trips.
**Validates: Requirements 1.3, 1.4, 1.5, 4.1, 4.2**

**Property 3: Invitation Status Update on Accept**
*For any* trip invitation that is accepted, the invitation status should be updated to 'accepted' in the database.
**Validates: Requirements 5.1**

**Property 4: Invitation Status Update on Reject**
*For any* trip invitation that is rejected, the invitation status should be updated to 'rejected' and the record should remain in the database.
**Validates: Requirements 2.1, 2.5**

**Property 5: Rejection Notification Content**
*For any* trip invitation that is rejected, the toast notification should contain both the trip name and the inviter's name.
**Validates: Requirements 2.3, 6.3**

**Property 6: Empty Trip List Handling**
*For any* user with no trip memberships, the trips query should return an empty array without throwing an error.
**Validates: Requirements 4.3**

**Property 7: Dialog Accessibility**
*For any* DialogContent component rendered in the transaction form, it should include either an aria-describedby attribute or a DialogDescription child component.
**Validates: Requirements 3.5**

**Property 8: Duplicate Detection with Empty Transactions**
*For any* transaction form state where allTransactions is empty or undefined, the duplicate warning should be false and no errors should occur.
**Validates: Requirements 3.4**



## Error Handling

### 1. Accept Invitation Errors

**Scenario:** Convite não encontrado
- **Detection:** Query retorna null
- **Response:** Throw error "Convite não encontrado"
- **User Feedback:** Toast de erro com mensagem clara

**Scenario:** Erro ao criar trip_member (duplicata)
- **Detection:** Supabase retorna erro de constraint violation
- **Response:** Ignorar erro se for duplicata, throw se for outro erro
- **User Feedback:** Continuar normalmente (usuário já é membro)

**Scenario:** Erro ao buscar dados para notificação
- **Detection:** Promise.all falha
- **Response:** Usar valores padrão ("viagem", "alguém")
- **User Feedback:** Notificação com dados genéricos mas operação bem-sucedida

### 2. Reject Invitation Errors

**Scenario:** Convite não encontrado
- **Detection:** Query retorna null
- **Response:** Throw error "Convite não encontrado"
- **User Feedback:** Toast de erro

**Scenario:** Erro ao buscar dados complementares
- **Detection:** Promise.all falha parcialmente
- **Response:** Usar valores padrão para dados faltantes
- **User Feedback:** Notificação com dados disponíveis

### 3. Transaction Form Errors

**Scenario:** allTransactions é undefined durante mount
- **Detection:** Verificação no início do useEffect
- **Response:** Return early, set duplicateWarning = false
- **User Feedback:** Nenhum (comportamento normal)

**Scenario:** Query de transações falha
- **Detection:** React Query error state
- **Response:** Mostrar mensagem de erro, permitir continuar
- **User Feedback:** Banner de erro, formulário ainda funcional

**Scenario:** Loop infinito detectado
- **Detection:** Múltiplas re-renders em curto período
- **Response:** Configurações de cache previnem (staleTime, refetchOnWindowFocus)
- **User Feedback:** Nenhum (prevenção automática)

### 4. Query Optimization Errors

**Scenario:** Falha ao buscar trip_members
- **Detection:** Supabase error
- **Response:** Throw error, retry = false
- **User Feedback:** Mensagem de erro, não retentar automaticamente

**Scenario:** Falha ao buscar trips
- **Detection:** Supabase error após obter trip_ids
- **Response:** Throw error
- **User Feedback:** Mensagem de erro

## Testing Strategy

### Unit Tests

Unit tests verificam comportamentos específicos e casos de borda:

1. **useAcceptTripInvitation**
   - Teste: Aceitar convite cria registro em trip_members
   - Teste: Aceitar convite com duplicata não falha
   - Teste: Aceitar convite atualiza status para 'accepted'
   - Teste: Erro ao buscar convite é tratado corretamente

2. **useRejectTripInvitation**
   - Teste: Rejeitar convite atualiza status para 'rejected'
   - Teste: Rejeitar convite mantém registro no banco
   - Teste: Notificação contém dados corretos quando disponíveis
   - Teste: Notificação usa valores padrão quando dados faltam

3. **useTrips**
   - Teste: Query retorna array vazio para usuário sem viagens
   - Teste: Query retorna viagens corretas para usuário com memberships
   - Teste: Query não retentar em caso de erro (retry = false)

4. **TransactionForm**
   - Teste: useEffect não executa com allTransactions vazio
   - Teste: Debounce de 500ms funciona corretamente
   - Teste: DialogContent tem aria-describedby ou Description

### Property-Based Tests

Property tests verificam propriedades universais através de dados gerados aleatoriamente. Cada teste deve executar no mínimo 100 iterações.

**Configuração do Framework:**
- Usar `@fast-check/vitest` para TypeScript/React
- Configurar `fc.assert` com `numRuns: 100`
- Cada teste deve referenciar sua propriedade do design

**Property Test 1: Trip Member Creation on Accept**
```typescript
// Feature: fix-trip-invitations-and-transaction-form, Property 1: Trip Member Creation on Accept
// Validates: Requirements 1.1, 5.2, 5.3, 5.4

test('accepting invitation creates trip_member with correct attributes', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.uuid(), // invitationId
      fc.uuid(), // tripId
      fc.uuid(), // inviteeId
      async (invitationId, tripId, inviteeId) => {
        // Setup: Create invitation
        await createInvitation({ id: invitationId, trip_id: tripId, invitee_id: inviteeId });
        
        // Action: Accept invitation
        await acceptInvitation(invitationId);
        
        // Assert: trip_member exists with correct data
        const member = await getTripMember(tripId, inviteeId);
        expect(member).toBeDefined();
        expect(member.role).toBe('member');
        expect(member.can_manage_expenses).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property Test 2: Trip Visibility After Accept**
```typescript
// Feature: fix-trip-invitations-and-transaction-form, Property 2: Trip Visibility After Accept
// Validates: Requirements 1.3, 1.4, 1.5, 4.1, 4.2

test('accepted trip appears in user trips query', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.uuid(), // userId
      fc.uuid(), // tripId
      fc.string(), // tripName
      async (userId, tripId, tripName) => {
        // Setup: Create trip and invitation
        await createTrip({ id: tripId, name: tripName });
        const invitationId = await createInvitation({ trip_id: tripId, invitee_id: userId });
        
        // Action: Accept invitation
        await acceptInvitation(invitationId);
        
        // Assert: Trip appears in user's trips
        const userTrips = await getUserTrips(userId);
        expect(userTrips.some(t => t.id === tripId)).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property Test 3: Invitation Status Update on Accept**
```typescript
// Feature: fix-trip-invitations-and-transaction-form, Property 3: Invitation Status Update on Accept
// Validates: Requirements 5.1

test('accepting invitation updates status to accepted', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.uuid(), // invitationId
      async (invitationId) => {
        // Setup: Create pending invitation
        await createInvitation({ id: invitationId, status: 'pending' });
        
        // Action: Accept invitation
        await acceptInvitation(invitationId);
        
        // Assert: Status is 'accepted'
        const invitation = await getInvitation(invitationId);
        expect(invitation.status).toBe('accepted');
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property Test 4: Invitation Status Update on Reject**
```typescript
// Feature: fix-trip-invitations-and-transaction-form, Property 4: Invitation Status Update on Reject
// Validates: Requirements 2.1, 2.5

test('rejecting invitation updates status and preserves record', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.uuid(), // invitationId
      async (invitationId) => {
        // Setup: Create pending invitation
        await createInvitation({ id: invitationId, status: 'pending' });
        
        // Action: Reject invitation
        await rejectInvitation(invitationId);
        
        // Assert: Status is 'rejected' and record exists
        const invitation = await getInvitation(invitationId);
        expect(invitation).toBeDefined();
        expect(invitation.status).toBe('rejected');
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property Test 5: Rejection Notification Content**
```typescript
// Feature: fix-trip-invitations-and-transaction-form, Property 5: Rejection Notification Content
// Validates: Requirements 2.3, 6.3

test('rejection notification contains trip and inviter names', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.uuid(), // invitationId
      fc.string({ minLength: 1 }), // tripName
      fc.string({ minLength: 1 }), // inviterName
      async (invitationId, tripName, inviterName) => {
        // Setup: Create invitation with trip and inviter
        await createInvitation({ 
          id: invitationId, 
          trip: { name: tripName },
          inviter: { full_name: inviterName }
        });
        
        // Mock toast
        const toastSpy = vi.spyOn(toast, 'info');
        
        // Action: Reject invitation
        await rejectInvitation(invitationId);
        
        // Assert: Toast called with names
        expect(toastSpy).toHaveBeenCalled();
        const toastCall = toastSpy.mock.calls[0];
        const description = toastCall[1]?.description || '';
        expect(description).toContain(tripName);
        expect(description).toContain(inviterName);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property Test 6: Empty Trip List Handling**
```typescript
// Feature: fix-trip-invitations-and-transaction-form, Property 6: Empty Trip List Handling
// Validates: Requirements 4.3

test('user with no trips gets empty array without error', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.uuid(), // userId
      async (userId) => {
        // Setup: User with no trip memberships
        await createUser({ id: userId });
        
        // Action: Query trips
        const trips = await getUserTrips(userId);
        
        // Assert: Empty array, no error
        expect(trips).toEqual([]);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Tests

Integration tests verificam fluxos completos:

1. **Fluxo Completo de Aceitar Convite**
   - Criar viagem
   - Enviar convite
   - Aceitar convite
   - Verificar viagem aparece para ambos usuários
   - Verificar notificação exibida

2. **Fluxo Completo de Rejeitar Convite**
   - Criar viagem
   - Enviar convite
   - Rejeitar convite
   - Verificar viagem não aparece para convidado
   - Verificar notificação com detalhes

3. **Fluxo de Formulário de Transação**
   - Abrir formulário
   - Verificar queries não entram em loop
   - Preencher dados
   - Verificar detecção de duplicatas
   - Submeter transação

### Manual Testing Checklist

- [ ] Aceitar convite e verificar viagem aparece na lista
- [ ] Rejeitar convite e verificar notificação com nomes
- [ ] Abrir formulário de transação múltiplas vezes sem loop
- [ ] Verificar console sem warnings de DialogContent
- [ ] Testar com conexão lenta para verificar cache
- [ ] Testar com múltiplos convites simultâneos

## Implementation Notes

### Ordem de Implementação

1. **Primeiro:** Corrigir useAcceptTripInvitation (adicionar trip_member)
2. **Segundo:** Corrigir useRejectTripInvitation (buscar dados e notificar)
3. **Terceiro:** Otimizar useTrips (já está correto, apenas adicionar configs)
4. **Quarto:** Corrigir TransactionForm useEffect (verificação de array vazio)
5. **Quinto:** Adicionar DialogDescription ao SplitModal

### Pontos de Atenção

- **Duplicatas em trip_members:** Usar UNIQUE constraint e ignorar erro de duplicata
- **Dados faltantes:** Sempre ter valores padrão para notificações
- **Cache:** Configurar staleTime e refetchOnWindowFocus em todas queries críticas
- **Debounce:** Manter 500ms para detecção de duplicatas
- **Acessibilidade:** Sempre incluir DialogDescription em DialogContent

### Rollback Plan

Se houver problemas após deploy:

1. **Viagens não aparecem:** Verificar se trigger de trip_members está ativo
2. **Loop infinito persiste:** Aumentar staleTime para 120 segundos
3. **Notificações não aparecem:** Verificar logs do Supabase para erros de query
4. **Performance degradada:** Desabilitar detecção de duplicatas temporariamente
