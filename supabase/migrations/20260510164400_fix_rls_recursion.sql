-- 1. Corrigir o gatilho para popular user_id além de linked_user_id
CREATE OR REPLACE FUNCTION handle_family_invitation_accepted()
RETURNS TRIGGER AS $$
DECLARE
  existing_member_id UUID;
  inviter_profile RECORD;
  invitee_profile RECORD;
  invitee_family_id UUID;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    
    -- Buscar perfis
    SELECT id, full_name, email INTO inviter_profile
    FROM profiles WHERE id = NEW.from_user_id;
    
    SELECT id, full_name, email INTO invitee_profile
    FROM profiles WHERE id = NEW.to_user_id;

    -- Buscar família do convidado
    SELECT id INTO invitee_family_id
    FROM families WHERE owner_id = NEW.to_user_id;
    
    -- 1. Adicionar convidado na família do convidador
    SELECT id INTO existing_member_id
    FROM family_members
    WHERE family_id = NEW.family_id
      AND (linked_user_id = NEW.to_user_id OR user_id = NEW.to_user_id)
    LIMIT 1;
    
    IF existing_member_id IS NOT NULL THEN
      UPDATE family_members
      SET status = 'active',
          role = NEW.role,
          user_id = NEW.to_user_id, -- Garantir que user_id está preenchido
          linked_user_id = NEW.to_user_id,
          name = COALESCE(invitee_profile.full_name, name)
      WHERE id = existing_member_id;
    ELSE
      INSERT INTO family_members (
        family_id,
        user_id, -- Adicionado
        linked_user_id,
        name,
        email,
        role,
        status,
        invited_by
      ) VALUES (
        NEW.family_id,
        NEW.to_user_id, -- Adicionado
        NEW.to_user_id,
        COALESCE(invitee_profile.full_name, NEW.member_name),
        invitee_profile.email,
        NEW.role,
        'active',
        NEW.from_user_id
      );
    END IF;

    -- 2. Vínculo bidirecional (se o convidado tiver família própria)
    IF invitee_family_id IS NOT NULL AND invitee_family_id != NEW.family_id THEN
        SELECT id INTO existing_member_id
        FROM family_members
        WHERE family_id = invitee_family_id
          AND (linked_user_id = NEW.from_user_id OR user_id = NEW.from_user_id)
        LIMIT 1;

        IF existing_member_id IS NULL THEN
          INSERT INTO family_members (
            family_id,
            user_id,
            linked_user_id,
            name,
            email,
            role,
            status,
            invited_by
          ) VALUES (
            invitee_family_id,
            NEW.from_user_id,
            NEW.from_user_id,
            COALESCE(inviter_profile.full_name, 'Usuário'),
            inviter_profile.email,
            'editor',
            'active',
            NEW.to_user_id
          );
        END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Corrigir políticas recursivas para evitar erro 500
-- FAMILY_MEMBERS
DROP POLICY IF EXISTS family_members_unified_select ON public.family_members;
CREATE POLICY "family_members_select_v2" ON public.family_members
FOR SELECT USING (
  user_id = auth.uid() 
  OR linked_user_id = auth.uid() 
  OR is_family_member(family_id, auth.uid())
);

-- ACCOUNTS
DROP POLICY IF EXISTS "Users can view own and family accounts" ON public.accounts;
CREATE POLICY "accounts_select_v2" ON public.accounts
FOR SELECT USING (
  user_id = auth.uid() 
  OR is_family_member((SELECT id FROM families WHERE owner_id = accounts.user_id LIMIT 1), auth.uid())
  OR EXISTS (
    SELECT 1 FROM family_members 
    WHERE user_id = accounts.user_id 
    AND is_family_member(family_id, auth.uid())
  )
);

-- TRANSACTIONS
DROP POLICY IF EXISTS "family_members_can_view_based_on_role" ON public.transactions;
CREATE POLICY "transactions_select_v2" ON public.transactions
FOR SELECT USING (
  user_id = auth.uid() 
  OR creator_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM family_members 
    WHERE user_id = transactions.user_id 
    AND is_family_member(family_id, auth.uid())
  )
);

-- 3. Garantir dados consistentes
UPDATE public.family_members 
SET user_id = linked_user_id 
WHERE user_id IS NULL AND linked_user_id IS NOT NULL;
