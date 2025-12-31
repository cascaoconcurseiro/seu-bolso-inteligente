# 🚀 Aplicar Correção de Notificações e Convites - AGORA

## ⚡ Aplicação Rápida (5 minutos)

### Passo 1: Aplicar Migration no Supabase
1. Abra o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo abaixo:

```sql
-- Correção: Marcar notificação como dispensada quando convite é respondido
CREATE OR REPLACE FUNCTION handle_trip_invitation_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('accepted', 'rejected') AND OLD.status = 'pending' THEN
    -- Marcar notificação como lida E dispensada
    UPDATE notifications
    SET is_read = true,
        read_at = NOW(),
        is_dismissed = true,
        dismissed_at = NOW()
    WHERE related_id = NEW.id
      AND related_type = 'trip_invitation'
      AND type = 'TRIP_INVITE';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger
DROP TRIGGER IF EXISTS trg_handle_trip_invitation_response ON trip_invitations;
CREATE TRIGGER trg_handle_trip_invitation_response
AFTER UPDATE ON trip_invitations
FOR EACH ROW
WHEN (NEW.status != OLD.status)
EXECUTE FUNCTION handle_trip_invitation_response();

-- Limpar notificações antigas de convites já respondidos
UPDATE notifications
SET is_dismissed = true,
    dismissed_at = NOW()
WHERE type = 'TRIP_INVITE'
  AND related_type = 'trip_invitation'
  AND related_id IN (
    SELECT id FROM trip_invitations
    WHERE status IN ('accepted', 'rejected')
  )
  AND is_dismissed = false;
```

4. Clique em **Run** ou pressione `Ctrl+Enter`
5. Verifique se aparece "Success" ✅

### Passo 2: Testar no Frontend
O frontend já foi corrigido automaticamente. Agora teste:

1. **Teste de Dispensar Notificação**
   - Abra o sino de notificações
   - Clique no X de uma notificação
   - ✅ Deve desaparecer imediatamente

2. **Teste de Limpar Notificações Lidas**
   - Marque algumas notificações como lidas
   - Clique em "Limpar"
   - ✅ Todas as lidas devem desaparecer

3. **Teste de Convite de Viagem**
   - Crie um convite de viagem
   - No usuário convidado, clique em "Ver convite"
   - ✅ Página deve rolar automaticamente para os convites
   - Aceite ou rejeite o convite
   - ✅ Notificação deve desaparecer automaticamente

## ✅ Verificação Rápida

Execute no SQL Editor para verificar se está funcionando:

```sql
-- Verificar notificações de convites respondidos
SELECT 
  n.id,
  n.title,
  n.is_dismissed,
  ti.status as convite_status
FROM notifications n
JOIN trip_invitations ti ON ti.id = n.related_id::uuid
WHERE n.type = 'TRIP_INVITE'
  AND n.related_type = 'trip_invitation'
ORDER BY n.created_at DESC
LIMIT 10;
```

**Resultado esperado**: Convites com status 'accepted' ou 'rejected' devem ter `is_dismissed = true`

## 🐛 Problemas Resolvidos

✅ **Problema 1**: Notificações não somem ao clicar no X
- **Solução**: Criados hooks `useDismissNotification()` e `useDismissAllRead()`

✅ **Problema 2**: Convites não aparecem ao clicar em "Ver convite"
- **Solução**: Scroll automático para a seção de convites

✅ **Problema 3**: Notificações de convites não somem após aceitar/rejeitar
- **Solução**: Trigger atualizado para dispensar notificações automaticamente

## 📝 Arquivos Modificados

### Frontend (já aplicado)
- ✅ `src/hooks/useNotifications.ts`
- ✅ `src/components/layout/NotificationButton.tsx`
- ✅ `src/pages/Trips.tsx`

### Backend (aplicar agora)
- ⚠️ `supabase/migrations/20251231_fix_trip_invitation_notifications.sql`

## 🎯 Resultado Final

Após aplicar:
- Notificações podem ser removidas individualmente
- Notificações lidas podem ser limpas em lote
- Convites de viagem ficam visíveis ao clicar na notificação
- Notificações de convites somem automaticamente após resposta
- Melhor experiência do usuário geral

## 📞 Suporte

Se algo não funcionar:
1. Verifique o console do navegador (F12)
2. Verifique os logs do Supabase
3. Recarregue a página (Ctrl+F5)
4. Limpe o cache do navegador
