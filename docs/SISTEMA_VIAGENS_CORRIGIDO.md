# 🎯 Sistema de Viagens - Documentação Completa

## 📋 Visão Geral

O sistema de viagens permite que usuários criem viagens, convidem outros membros, e compartilhem despesas de forma organizada. O sistema foi completamente corrigido em 27/12/2024 para funcionar de forma confiável e consistente.

## 🏗️ Arquitetura

### Tabelas Principais

#### 1. `trips`
Armazena informações das viagens.

```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  destination TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  currency TEXT DEFAULT 'BRL',
  budget NUMERIC(10,2),
  status TEXT CHECK (status IN ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  cover_image TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `trip_members`
Armazena os membros de cada viagem.

```sql
CREATE TABLE trip_members (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'member')),
  can_edit_details BOOLEAN DEFAULT false,
  can_manage_expenses BOOLEAN DEFAULT true,
  personal_budget NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id) -- Evita duplicatas
);
```

**Invariantes:**
- Cada viagem tem exatamente um owner
- Não pode haver duplicatas de (trip_id, user_id)
- Owner sempre tem can_edit_details = true

#### 3. `trip_invitations`
Armazena convites para participar de viagens.

```sql
CREATE TABLE trip_invitations (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(trip_id, invitee_id) -- Não pode convidar mesma pessoa duas vezes
);
```

## 🔧 Triggers

### 1. `add_trip_owner()`
Adiciona automaticamente o criador da viagem como owner em trip_members.

```sql
CREATE OR REPLACE FUNCTION add_trip_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO trip_members (
    trip_id, user_id, role, can_edit_details, can_manage_expenses
  )
  VALUES (
    NEW.id, NEW.owner_id, 'owner', true, true
  )
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
```

**Quando executa:** AFTER INSERT em trips
**O que faz:** Cria registro em trip_members para o owner
**Importante:** ON CONFLICT evita erro de chave duplicada

### 2. `handle_trip_invitation_accepted()`
Adiciona membro em trip_members quando convite é aceito.

```sql
CREATE OR REPLACE FUNCTION handle_trip_invitation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO trip_members (
      trip_id, user_id, role, can_edit_details, can_manage_expenses
    )
    VALUES (
      NEW.trip_id, NEW.invitee_id, 'member', false, true
    )
    ON CONFLICT (trip_id, user_id) DO NOTHING;
    
    NEW.responded_at := NOW();
  END IF;
  
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    NEW.responded_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;
```

**Quando executa:** BEFORE UPDATE em trip_invitations
**O que faz:** Cria registro em trip_members quando convite é aceito
**Importante:** ON CONFLICT evita erro de chave duplicada

## 🔒 Políticas RLS

### Política: trips SELECT
Usuários podem ver viagens das quais são membros.

```sql
CREATE POLICY "Users can view trips they are members of"
  ON trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trips.id 
      AND tm.user_id = auth.uid()
    )
  );
```

**Como funciona:**
- Verifica se usuário está em trip_members
- Usa EXISTS para melhor performance
- Usa alias `tm` para evitar ambiguidade

### Outras Políticas

- **trip_members SELECT:** Usuários veem membros das viagens que participam
- **trip_members INSERT:** Apenas owner pode adicionar membros (ou via trigger)
- **trip_members DELETE:** Apenas owner pode remover membros
- **trip_invitations SELECT:** Usuários veem convites que enviaram ou receberam
- **trip_invitations INSERT:** Apenas owner pode criar convites
- **trip_invitations UPDATE:** Apenas invitee pode atualizar status

## 💻 Frontend

### Hook: useTrips
Busca viagens do usuário.

```typescript
export function useTrips() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trips", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Buscar viagens diretamente - RLS filtra automaticamente
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as Trip[];
    },
    enabled: !!user,
  });
}
```

**Como funciona:**
- Query simples em trips
- RLS filtra automaticamente (apenas viagens onde usuário é membro)
- Não precisa query intermediária em trip_members

### Hook: useCreateTrip
Cria nova viagem.

```typescript
export function useCreateTrip() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTripInput) => {
      const { memberIds, ...tripData } = input;

      // Criar viagem
      const { data, error } = await supabase
        .from("trips")
        .insert({
          owner_id: user.id,
          ...tripData,
        })
        .select()
        .single();

      if (error) throw error;

      // Owner é adicionado automaticamente via trigger add_trip_owner()

      // Criar convites para membros selecionados
      if (memberIds && memberIds.length > 0) {
        const invitations = memberIds.map(userId => ({
          trip_id: data.id,
          inviter_id: user.id,
          invitee_id: userId,
          message: `Você foi convidado para participar da viagem "${data.name}"!`,
        }));

        await supabase.from("trip_invitations").insert(invitations);
      }

      return data as Trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}
```

**Como funciona:**
1. Insere viagem em trips
2. Trigger add_trip_owner() adiciona owner em trip_members automaticamente
3. Cria convites para membros selecionados (se houver)
4. Invalida cache de viagens

## 🔄 Fluxos

### Fluxo 1: Criar Viagem

```
1. Usuário preenche formulário
   ↓
2. Frontend chama useCreateTrip.mutate()
   ↓
3. INSERT em trips (owner_id = user.id)
   ↓
4. Trigger add_trip_owner() executa
   ↓
5. INSERT em trip_members (trip_id, user_id, role='owner')
   ↓
6. Query de viagens retorna a nova viagem
   ↓
7. Frontend exibe viagem na lista
```

### Fluxo 2: Convidar Membro

```
1. Owner seleciona membros ao criar viagem
   ↓
2. Frontend cria convites em trip_invitations
   ↓
3. Invitee recebe notificação (futuro)
   ↓
4. Invitee aceita convite
   ↓
5. UPDATE trip_invitations SET status='accepted'
   ↓
6. Trigger handle_trip_invitation_accepted() executa
   ↓
7. INSERT em trip_members (trip_id, user_id, role='member')
   ↓
8. Query de viagens retorna a viagem para o novo membro
   ↓
9. Frontend exibe viagem na lista do membro
```

### Fluxo 3: Ver Viagens

```
1. Usuário acessa página de viagens
   ↓
2. Frontend chama useTrips()
   ↓
3. Query SELECT * FROM trips
   ↓
4. RLS verifica: EXISTS (SELECT 1 FROM trip_members WHERE user_id = auth.uid())
   ↓
5. Retorna apenas viagens onde usuário é membro
   ↓
6. Frontend exibe lista de viagens
```

## 🧪 Validação

### Script de Validação
Execute `scripts/validate-trip-integrity.sql` para verificar:

1. ✅ Viagens sem owner em trip_members
2. ✅ Owners não em trip_members
3. ✅ Duplicatas em trip_members
4. ✅ Convites aceitos sem membro
5. ✅ Viagens com múltiplos owners
6. ✅ Membros órfãos
7. ✅ Convites órfãos

### Testes Manuais

**Teste 1: Criar Viagem**
1. Criar viagem via interface
2. Verificar que não há erro
3. Verificar que viagem aparece imediatamente
4. Verificar que você é owner

**Teste 2: Convidar Membro**
1. Criar viagem
2. Convidar outro usuário
3. Aceitar convite como outro usuário
4. Verificar que viagem aparece para ambos

**Teste 3: Viagens Antigas**
1. Recarregar página
2. Verificar que todas as viagens aparecem
3. Verificar que pode abrir todas

## 🐛 Troubleshooting

### Problema: Viagem não aparece

**Diagnóstico:**
1. Execute `scripts/validate-trip-integrity.sql`
2. Verifique se owner está em trip_members
3. Verifique se RLS está ativa

**Solução:**
1. Execute `scripts/APLICAR_FIX_TRIP_SYSTEM.sql`
2. Recarregue a página

### Problema: Erro de chave duplicada

**Diagnóstico:**
1. Verifique se trigger tem ON CONFLICT
2. Verifique se há duplicatas em trip_members

**Solução:**
1. Execute `scripts/APLICAR_FIX_TRIP_SYSTEM.sql`
2. Trigger será atualizado com ON CONFLICT

### Problema: Convite aceito mas membro não adicionado

**Diagnóstico:**
1. Verifique se trigger está ativo
2. Verifique logs do Supabase

**Solução:**
1. Execute `scripts/APLICAR_FIX_TRIP_SYSTEM.sql`
2. Trigger será recriado

## 📊 Estatísticas

Para ver estatísticas do sistema:

```sql
SELECT 
  (SELECT COUNT(*) FROM trips) as total_viagens,
  (SELECT COUNT(*) FROM trip_members) as total_membros,
  (SELECT COUNT(*) FROM trip_members WHERE role = 'owner') as total_owners,
  (SELECT COUNT(*) FROM trip_invitations) as total_convites,
  (SELECT COUNT(*) FROM trip_invitations WHERE status = 'pending') as convites_pendentes;
```

## 🔐 Segurança

### Princípios

1. **Least Privilege:** Usuários só veem suas viagens
2. **Owner Control:** Apenas owner pode editar detalhes críticos
3. **Member Permissions:** Membros podem gerenciar despesas
4. **Invite Control:** Apenas invitee pode aceitar/rejeitar convite

### Validações

- RLS garante isolamento de dados
- Triggers executam com SECURITY DEFINER
- Constraints garantem integridade
- ON CONFLICT evita erros de duplicação

## 📅 Histórico

**27/12/2024:**
- ✅ Corrigido erro de chave duplicada
- ✅ Simplificadas políticas RLS
- ✅ Corrigidos dados inconsistentes
- ✅ Atualizado frontend
- ✅ Removidos scripts obsoletos
- ✅ Criada documentação completa

## 🎯 Próximos Passos

1. Implementar notificações de convites
2. Adicionar sistema de permissões granulares
3. Implementar compartilhamento de despesas por viagem
4. Adicionar relatórios de gastos por viagem
5. Implementar exportação de dados

---

**Última atualização:** 27/12/2024
**Spec:** fix-trip-system-database
**Migration:** 20251227145010_fix_trip_system.sql
