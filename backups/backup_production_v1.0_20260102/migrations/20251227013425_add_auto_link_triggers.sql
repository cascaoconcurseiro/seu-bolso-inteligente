-- TRIGGER PARA AUTO-VINCULAR NOVOS MEMBROS
CREATE OR REPLACE FUNCTION auto_link_family_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NEW.email IS NOT NULL AND NEW.linked_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM profiles
    WHERE email = NEW.email
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
      NEW.linked_user_id := v_user_id;
      RAISE NOTICE 'Auto-vinculado membro % (%) ao usuário %', 
        NEW.name, NEW.email, v_user_id;
    ELSE
      RAISE NOTICE 'Membro % (%) não tem conta no sistema ainda', 
        NEW.name, NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_family_member ON family_members;
CREATE TRIGGER trg_auto_link_family_member
  BEFORE INSERT OR UPDATE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_family_member();

-- TRIGGER PARA SINCRONIZAR QUANDO MEMBRO É VINCULADO
CREATE OR REPLACE FUNCTION sync_transactions_on_member_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx_id UUID;
  v_count INTEGER := 0;
BEGIN
  IF OLD.linked_user_id IS NULL AND NEW.linked_user_id IS NOT NULL THEN
    RAISE NOTICE 'Membro % foi vinculado ao usuário %. Sincronizando transações...', 
      NEW.name, NEW.linked_user_id;
    
    FOR v_tx_id IN
      SELECT DISTINCT ts.transaction_id
      FROM transaction_splits ts
      JOIN transactions t ON t.id = ts.transaction_id
      WHERE ts.member_id = NEW.id
      AND t.is_shared = true
      AND t.source_transaction_id IS NULL
    LOOP
      PERFORM sync_shared_transaction(v_tx_id);
      v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Sincronizadas % transações para membro %', v_count, NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_on_member_link ON family_members;
CREATE TRIGGER trg_sync_on_member_link
  AFTER UPDATE ON family_members
  FOR EACH ROW
  WHEN (OLD.linked_user_id IS NULL AND NEW.linked_user_id IS NOT NULL)
  EXECUTE FUNCTION sync_transactions_on_member_link();;
