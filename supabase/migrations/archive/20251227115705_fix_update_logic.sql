CREATE OR REPLACE FUNCTION handle_transaction_mirroring()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_split RECORD;
  v_mirror_id UUID;
  v_payer_name TEXT;
  v_target_user_id UUID;
BEGIN
  -- Anti-loop
  IF TG_OP <> 'DELETE' AND NEW.source_transaction_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- DELETE: Apagar espelhos
  IF TG_OP = 'DELETE' THEN
    DELETE FROM transactions
    WHERE source_transaction_id = OLD.id;
    
    DELETE FROM shared_transaction_mirrors
    WHERE original_transaction_id = OLD.id;
    
    RETURN OLD;
  END IF;

  -- Verificar se é compartilhada
  IF NEW.is_shared IS DISTINCT FROM TRUE THEN
    RETURN NEW;
  END IF;

  -- UPDATE: Sincronizar espelhos existentes (SIMPLIFICADO)
  IF TG_OP = 'UPDATE' THEN
    -- Apenas atualizar descrição e data, não o amount
    UPDATE transactions
    SET
      description = NEW.description,
      date = NEW.date,
      type = NEW.type,
      updated_at = NOW()
    WHERE source_transaction_id = NEW.id;
    
    -- Não retornar ainda, continuar para criar espelhos se necessário
  END IF;

  -- Buscar nome do pagador
  SELECT COALESCE(full_name, email, 'Outro') INTO v_payer_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Para cada split
  FOR v_split IN
    SELECT 
      ts.*,
      fm.user_id as member_user_id,
      fm.linked_user_id as member_linked_user_id,
      fm.name as member_name
    FROM transaction_splits ts
    INNER JOIN family_members fm ON fm.id = ts.member_id
    WHERE ts.transaction_id = NEW.id
  LOOP
    -- Escolher o user_id que NÃO é o criador
    IF NEW.user_id = v_split.member_user_id THEN
      v_target_user_id := v_split.member_linked_user_id;
    ELSIF NEW.user_id = v_split.member_linked_user_id THEN
      v_target_user_id := v_split.member_user_id;
    ELSE
      v_target_user_id := COALESCE(
        v_split.member_user_id,
        v_split.member_linked_user_id
      );
    END IF;
    
    -- Só criar espelho se temos um target válido e diferente do criador
    IF v_target_user_id IS NOT NULL 
       AND v_target_user_id != NEW.user_id THEN
      
      -- Verificar se já existe espelho
      SELECT id INTO v_mirror_id
      FROM transactions
      WHERE source_transaction_id = NEW.id
      AND user_id = v_target_user_id;
      
      IF v_mirror_id IS NULL THEN
        v_mirror_id := gen_random_uuid();
        
        INSERT INTO transactions (
          id,
          user_id,
          amount,
          description,
          date,
          type,
          account_id,
          category_id,
          trip_id,
          is_shared,
          payer_id,
          source_transaction_id,
          domain,
          sync_status,
          created_at,
          updated_at
        ) VALUES (
          v_mirror_id,
          v_target_user_id,
          v_split.amount,
          NEW.description || ' (Compartilhado por ' || v_payer_name || ')',
          NEW.date,
          NEW.type,
          NULL,
          NULL,
          NULL,
          TRUE,
          NULL,
          NEW.id,
          COALESCE(NEW.domain, 'SHARED'),
          'SYNCED',
          NOW(),
          NOW()
        );
        
        INSERT INTO shared_transaction_mirrors (
          original_transaction_id,
          mirror_transaction_id,
          mirror_user_id,
          sync_status,
          last_sync_at
        ) VALUES (
          NEW.id,
          v_mirror_id,
          v_target_user_id,
          'SYNCED',
          NOW()
        )
        ON CONFLICT (original_transaction_id, mirror_user_id) 
        DO UPDATE SET
          mirror_transaction_id = EXCLUDED.mirror_transaction_id,
          sync_status = 'SYNCED',
          last_sync_at = NOW(),
          updated_at = NOW();
      ELSE
        -- Atualizar espelho existente com o amount do split
        UPDATE transactions
        SET
          amount = v_split.amount,
          description = NEW.description || ' (Compartilhado por ' || v_payer_name || ')',
          date = NEW.date,
          type = NEW.type,
          updated_at = NOW()
        WHERE id = v_mirror_id;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;;
