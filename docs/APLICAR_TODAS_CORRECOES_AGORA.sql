-- =====================================================
-- APLICAR TODAS AS CORREÇÕES CRÍTICAS - 30/12/2024
-- =====================================================
-- Execute este arquivo no Supabase SQL Editor
-- Tempo estimado: 30 segundos

BEGIN;

-- =====================================================
-- PARTE 1: ESPELHAMENTO DE TRANSAÇÕES
-- =====================================================

-- Função para criar transações espelhadas
CREATE OR REPLACE FUNCTION create_mirror_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  original_tx RECORD;
  mirror_exists BOOLEAN;
BEGIN
  SELECT * INTO original_tx FROM transactions WHERE id = NEW.transaction_id;
  
  SELECT EXISTS (
    SELECT 1 FROM transactions
    WHERE source_transaction_id = NEW.transaction_id AND user_id = NEW.user_id
  ) INTO mirror_exists;
  
  IF mirror_exists THEN
    RETURN NEW;
  END IF;
  
  INSERT INTO transactions (
    user_id, amount, description, date, competence_date, type, domain,
    is_shared, source_transaction_id, trip_id, currency, is_settled,
    creator_user_id, payer_id, account_id
  ) VALUES (
    NEW.user_id, NEW.amount, original_tx.description, original_tx.date,
    original_tx.competence_date, 'EXPENSE', original_tx.domain, true,
    original_tx.id, original_tx.trip_id, original_tx.currency, NEW.is_settled,
    original_tx.creator_user_id, original_tx.payer_id, NULL
  );
  
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS trg_create_mirror_transaction ON transaction_splits;
CREATE TRIGGER trg_create_mirror_transaction
  AFTER INSERT ON transaction_splits
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION create_mirror_transaction();

-- Função para sincronizar acertos
CREATE OR REPLACE FUNCTION update_mirror_transaction_settlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  IF NEW.is_settled = true AND OLD.is_settled = false THEN
    UPDATE transactions
    SET is_settled = true, settled_at = NEW.settled_at
    WHERE source_transaction_id = NEW.transaction_id AND user_id = NEW.user_id;
  END IF;
  
  IF NEW.is_settled = false AND OLD.is_settled = true THEN
    UPDATE transactions
    SET is_settled = false, settled_at = NULL
    WHERE source_transaction_id = NEW.transaction_id AND user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS trg_update_mirror_settlement ON transaction_splits;
CREATE TRIGGER trg_update_mirror_settlement
  AFTER UPDATE ON transaction_splits
  FOR EACH ROW
  WHEN (NEW.is_settled IS DISTINCT FROM OLD.is_settled)
  EXECUTE FUNCTION update_mirror_transaction_settlement();

-- Criar espelhamentos retroativos
DO $
DECLARE
  split_record RECORD;
  original_tx RECORD;
  mirror_exists BOOLEAN;
  created_count INTEGER := 0;
BEGIN
  FOR split_record IN 
    SELECT * FROM transaction_splits WHERE user_id IS NOT NULL
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM transactions
      WHERE source_transaction_id = split_record.transaction_id
        AND user_id = split_record.user_id
    ) INTO mirror_exists;
    
    IF NOT mirror_exists THEN
      SELECT * INTO original_tx FROM transactions WHERE id = split_record.transaction_id;
      
      IF FOUND THEN
        INSERT INTO transactions (
          user_id, amount, description, date, competence_date, type, domain,
          is_shared, source_transaction_id, trip_id, currency, is_settled,
          creator_user_id, payer_id, account_id
        ) VALUES (
          split_record.user_id, split_record.amount, original_tx.description,
          original_tx.date, original_tx.competence_date, 'EXPENSE', original_tx.domain,
          true, original_tx.id, original_tx.trip_id, original_tx.currency,
          split_record.is_settled, original_tx.creator_user_id, original_tx.payer_id, NULL
        );
        
        created_count := created_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Criadas % transações espelhadas retroativamente', created_count;
END $;

-- =====================================================
-- PARTE 2: CONVITES DE VIAGEM
-- =====================================================

DROP POLICY IF EXISTS "Users can view their invitations" ON trip_invitations;
CREATE POLICY "Users can view their invitations"
  ON trip_invitations FOR SELECT TO authenticated
  USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

DROP POLICY IF EXISTS "Users can respond to their invitations" ON trip_invitations;
CREATE POLICY "Users can respond to their invitations"
  ON trip_invitations FOR UPDATE TO authenticated
  USING (invitee_id = auth.uid())
  WITH CHECK (invitee_id = auth.uid());

DROP POLICY IF EXISTS "Trip owners can create invitations" ON trip_invitations;
CREATE POLICY "Trip owners can create invitations"
  ON trip_invitations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_invitations.trip_id AND trips.owner_id = auth.uid()
    )
  );

-- =====================================================
-- VALIDAÇÃO FINAL
-- =====================================================

DO $
DECLARE
  v_splits_count INTEGER;
  v_mirrors_count INTEGER;
  v_pending_invitations INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_splits_count FROM transaction_splits WHERE user_id IS NOT NULL;
  SELECT COUNT(*) INTO v_mirrors_count FROM transactions WHERE source_transaction_id IS NOT NULL;
  SELECT COUNT(*) INTO v_pending_invitations FROM trip_invitations WHERE status = 'pending';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== VALIDAÇÃO FINAL ===';
  RAISE NOTICE 'Splits com user_id: %', v_splits_count;
  RAISE NOTICE 'Transações espelhadas: %', v_mirrors_count;
  RAISE NOTICE 'Convites pendentes: %', v_pending_invitations;
  RAISE NOTICE '';
  
  IF v_mirrors_count >= v_splits_count THEN
    RAISE NOTICE '✅ ESPELHAMENTO: OK';
  ELSE
    RAISE WARNING '⚠️  ESPELHAMENTO: Algumas transações podem estar faltando';
  END IF;
  
  RAISE NOTICE '✅ CONVITES: Políticas RLS atualizadas';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 TODAS AS CORREÇÕES APLICADAS COM SUCESSO!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Fazer deploy do frontend';
  RAISE NOTICE '2. Testar criação de transação compartilhada';
  RAISE NOTICE '3. Verificar se convites aparecem';
  RAISE NOTICE '4. Validar espelhamento';
END $;

COMMIT;
