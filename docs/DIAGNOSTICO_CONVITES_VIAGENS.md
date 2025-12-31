# Diagnóstico: Convites de Viagens Não Aparecem

**Data:** 30/12/2024  
**Problema:** Convites de viagens não aparecem para quem foi convidado

---

## 🔍 PROBLEMA IDENTIFICADO

### 1. Convite Existe no Banco Mas Sem Notificação

**Dados encontrados:**
```
trip_invitations:
- ID: d25fd387-cef4-4287-aa10-4da55bacf246
- Viagem: "Viagem ferias" (898d43ff-c6cf-4135-b5b5-8f1df1962030)
- Convidador: Fran (9545d0c1-94be-4b69-b110-f939bce072ee)
- Convidado: Wesley (56ccd60b-641f-4265-bc17-7b8705a2f8c9)
- Status: pending
- Criado em: 2025-12-30 20:16:52
```

**Problema:**
- ✅ Convite foi criado na tabela `trip_invitations`
- ❌ Nenhuma notificação foi criada na tabela `notifications`
- ❌ Wesley não vê o convite na UI

### 2. Falta Trigger para Criar Notificações

**Triggers existentes em `trip_invitations`:**
- `trg_trip_invitation_accepted` → Executa quando convite é aceito
- ❌ **NÃO EXISTE** trigger para criar notificação quando convite é criado

**Comparação com convites de família:**
- Convites de família provavelmente têm trigger para criar notificações
- Convites de viagens NÃO têm

---

## 🐛 CAUSAS DO PROBLEMA

### Causa 1: Ausência de Trigger
Quando um convite de viagem é criado:
1. ✅ Registro é inserido em `trip_invitations`
2. ❌ Nenhuma notificação é criada automaticamente
3. ❌ Convidado não é notificado

### Causa 2: Frontend Não Cria Notificação
O hook `useCreateTripInvitation` apenas insere em `trip_invitations`:
```typescript
const { data, error } = await supabase
  .from("trip_invitations")
  .insert({
    trip_id: tripId,
    invitee_id: inviteeId,
    message: message || null,
    status: 'pending',
  })
  .select()
  .single();
```

**Não cria notificação!**

### Causa 3: Hook de Notificações Não Busca Convites
O hook `usePendingTripInvitations` busca apenas de `trip_invitations`, não de `notifications`.

---

## ✅ SOLUÇÃO

### Solução 1: Criar Trigger para Notificações (RECOMENDADO)

**Criar função e trigger:**

```sql
-- Função para criar notificação quando convite de viagem é criado
CREATE OR REPLACE FUNCTION create_trip_invitation_notification()
RETURNS TRIGGER AS $$
DECLARE
  trip_name TEXT;
  inviter_name TEXT;
BEGIN
  -- Buscar nome da viagem
  SELECT name INTO trip_name
  FROM trips
  WHERE id = NEW.trip_id;
  
  -- Buscar nome do convidador
  SELECT full_name INTO inviter_name
  FROM profiles
  WHERE id = NEW.inviter_id;
  
  -- Criar notificação para o convidado
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    icon,
    action_url,
    action_label,
    related_id,
    related_type,
    priority
  ) VALUES (
    NEW.invitee_id,
    'TRIP_INVITE',
    'Convite para viagem',
    COALESCE(inviter_name, 'Alguém') || ' convidou você para participar da viagem "' || COALESCE(trip_name, 'Sem nome') || '"',
    '✈️',
    '/viagens',
    'Ver convite',
    NEW.id,
    'trip_invitation',
    'HIGH'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
CREATE TRIGGER trg_create_trip_invitation_notification
AFTER INSERT ON trip_invitations
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION create_trip_invitation_notification();
```

**Benefícios:**
- ✅ Automático - não depende do frontend
- ✅ Consistente - sempre cria notificação
- ✅ Centralizado - lógica no banco
- ✅ Funciona para código antigo e novo

---

### Solução 2: Criar Notificação no Frontend (ALTERNATIVA)

**Modificar `useCreateTripInvitation`:**

```typescript
export function useCreateTripInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      inviteeId,
      message,
    }: {
      tripId: string;
      inviteeId: string;
      message?: string;
    }) => {
      // 1. Criar convite
      const { data: invitation, error } = await supabase
        .from("trip_invitations")
        .insert({
          trip_id: tripId,
          invitee_id: inviteeId,
          message: message || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Buscar dados para notificação
      const [tripResult, inviterResult] = await Promise.all([
        supabase.from("trips").select("name").eq("id", tripId).single(),
        supabase.auth.getUser()
      ]);

      const tripName = tripResult.data?.name || "viagem";
      const inviterName = inviterResult.data?.user?.user_metadata?.full_name || "Alguém";

      // 3. Criar notificação
      await supabase.from("notifications").insert({
        user_id: inviteeId,
        type: 'TRIP_INVITE',
        title: 'Convite para viagem',
        message: `${inviterName} convidou você para participar da viagem "${tripName}"`,
        icon: '✈️',
        action_url: '/viagens',
        action_label: 'Ver convite',
        related_id: invitation.id,
        related_type: 'trip_invitation',
        priority: 'HIGH'
      });

      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sent-trip-invitations"] });
      toast.success("Convite enviado!");
    },
    onError: (error: any) => {
      console.error("Erro ao enviar convite:", error);
      toast.error("Erro ao enviar convite: " + error.message);
    },
  });
}
```

**Desvantagens:**
- ⚠️ Depende do frontend
- ⚠️ Se frontend falhar, notificação não é criada
- ⚠️ Código duplicado se houver múltiplos lugares que criam convites

---

### Solução 3: Criar Notificação para Convite Existente

**Corrigir o convite pendente de Wesley:**

```sql
-- Criar notificação para o convite existente
INSERT INTO notifications (
  user_id,
  type,
  title,
  message,
  icon,
  action_url,
  action_label,
  related_id,
  related_type,
  priority
)
SELECT 
  ti.invitee_id,
  'TRIP_INVITE',
  'Convite para viagem',
  COALESCE(p.full_name, 'Alguém') || ' convidou você para participar da viagem "' || COALESCE(t.name, 'Sem nome') || '"',
  '✈️',
  '/viagens',
  'Ver convite',
  ti.id,
  'trip_invitation',
  'HIGH'
FROM trip_invitations ti
JOIN trips t ON t.id = ti.trip_id
JOIN profiles p ON p.id = ti.inviter_id
WHERE ti.status = 'pending'
  AND ti.id = 'd25fd387-cef4-4287-aa10-4da55bacf246';
```

---

## 📊 FLUXO CORRETO

### Como Deveria Funcionar

1. **Fran convida Wesley para viagem**
   ```
   Frontend → INSERT trip_invitations
   ```

2. **Trigger cria notificação automaticamente**
   ```
   Trigger → INSERT notifications
   ```

3. **Wesley vê notificação**
   ```
   UI → SELECT notifications WHERE user_id = wesley_id
   ```

4. **Wesley clica em "Ver convite"**
   ```
   UI → Navega para /viagens
   ```

5. **Wesley vê lista de convites pendentes**
   ```
   UI → SELECT trip_invitations WHERE invitee_id = wesley_id AND status = 'pending'
   ```

6. **Wesley aceita convite**
   ```
   Frontend → UPDATE trip_invitations SET status = 'accepted'
   Trigger → INSERT trip_members
   ```

7. **Wesley vê viagem na lista**
   ```
   UI → SELECT trips WHERE id IN (SELECT trip_id FROM trip_members WHERE user_id = wesley_id)
   ```

---

## 🎯 IMPLEMENTAÇÃO RECOMENDADA

### Passo 1: Criar Trigger (CRÍTICO)
✅ Garante que notificações sempre serão criadas
✅ Funciona para todos os casos
✅ Não quebra código existente

### Passo 2: Criar Notificação para Convite Existente
✅ Resolve o problema imediato de Wesley
✅ Permite testar o fluxo completo

### Passo 3: Testar Fluxo Completo
1. Wesley vê notificação
2. Wesley clica em "Ver convite"
3. Wesley vê convite na lista
4. Wesley aceita convite
5. Wesley vê viagem na lista
6. Wesley pode criar transações na viagem

### Passo 4: Adicionar Trigger para Deletar Notificação (OPCIONAL)
Quando convite é aceito ou rejeitado, deletar/marcar notificação como lida:

```sql
CREATE OR REPLACE FUNCTION handle_trip_invitation_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('accepted', 'rejected') AND OLD.status = 'pending' THEN
    -- Marcar notificação como lida
    UPDATE notifications
    SET is_read = true,
        read_at = NOW()
    WHERE related_id = NEW.id
      AND related_type = 'trip_invitation'
      AND type = 'TRIP_INVITE';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_handle_trip_invitation_response
AFTER UPDATE ON trip_invitations
FOR EACH ROW
WHEN (NEW.status != OLD.status)
EXECUTE FUNCTION handle_trip_invitation_response();
```

---

## 📝 NOTAS TÉCNICAS

### Estrutura de Dados

**Convite de Viagem:**
```
trip_invitations
├─ id: uuid
├─ trip_id: uuid
├─ inviter_id: uuid (quem convidou)
├─ invitee_id: uuid (quem foi convidado)
├─ status: 'pending' | 'accepted' | 'rejected'
├─ message: text (opcional)
└─ created_at: timestamp

notifications (criada pelo trigger)
├─ id: uuid
├─ user_id: uuid (invitee_id)
├─ type: 'TRIP_INVITE'
├─ title: 'Convite para viagem'
├─ message: '{inviter} convidou você para "{trip}"'
├─ related_id: uuid (trip_invitation.id)
├─ related_type: 'trip_invitation'
└─ is_read: boolean
```

### Políticas RLS

**Verificar se RLS permite:**
1. ✅ Convidado pode ver seus convites
2. ✅ Convidado pode ver notificações
3. ✅ Convidado pode atualizar status do convite
4. ✅ Convidado pode ver viagem após aceitar

---

## ✅ RESUMO

**Problema:**
- Convites de viagens são criados mas não geram notificações
- Convidados não veem os convites

**Causa:**
- Falta trigger para criar notificações automaticamente

**Solução:**
1. ✅ Criar trigger `trg_create_trip_invitation_notification`
2. ✅ Criar notificação para convite existente de Wesley
3. ✅ Testar fluxo completo
4. ⏭️ Adicionar trigger para marcar notificação como lida

**Impacto:**
- ✅ Novos convites gerarão notificações automaticamente
- ✅ Convidados verão notificações
- ✅ Fluxo de convites funcionará corretamente

---

**Conclusão:** O problema é a ausência de trigger para criar notificações. A solução é criar o trigger e corrigir o convite existente.
