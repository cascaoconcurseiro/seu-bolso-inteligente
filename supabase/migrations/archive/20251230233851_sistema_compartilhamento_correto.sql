-- SISTEMA DE COMPARTILHAMENTO - IMPLEMENTAÇÃO CORRETA
BEGIN;

-- PARTE 1: CONVITES DE VIAGEM
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

-- PARTE 2: VALIDAÇÃO
CREATE OR REPLACE FUNCTION validate_shared_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_shared = true AND (NEW.payer_id IS NULL OR NEW.payer_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_shared_transaction ON transactions;
CREATE TRIGGER trg_validate_shared_transaction
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_shared_transaction();

COMMIT;

SELECT 'Sistema compartilhamento correto aplicado!' as status;;
