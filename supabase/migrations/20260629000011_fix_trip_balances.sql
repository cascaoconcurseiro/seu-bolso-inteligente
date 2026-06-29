-- Fix A-3: get_trip_participant_balances counted original tx AND mirror txs
CREATE OR REPLACE FUNCTION get_trip_participant_balances(p_trip_id UUID)
RETURNS TABLE(
  participant_id UUID,
  user_id UUID,
  name TEXT,
  paid NUMERIC,
  owes NUMERIC,
  balance NUMERIC,
  currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH trip_tx AS (
    SELECT t.id, t.amount, t.currency, t.user_id AS payer_id, t.domain
    FROM transactions t
    WHERE t.trip_id = p_trip_id
      AND t.deleted_at IS NULL
      AND t.source_transaction_id IS NULL -- FIX A-3: prevent double counting mirror txs
  ),
  splits_data AS (
    SELECT
      ts.member_id,
      ts.user_id,
      ts.amount AS split_amount,
      tt.amount AS tx_amount,
      tt.currency,
      tt.payer_id,
      tt.id AS tx_id
    FROM transaction_splits ts
    JOIN trip_tx tt ON ts.transaction_id = tt.id
  ),
  participant_paid AS (
    SELECT
      tt.payer_id AS user_id,
      tt.currency,
      COALESCE(SUM(tt.amount), 0) AS paid
    FROM trip_tx tt
    GROUP BY tt.payer_id, tt.currency
  ),
  participant_owes AS (
    SELECT
      sd.user_id,
      sd.currency,
      COALESCE(SUM(sd.split_amount), 0) AS owes
    FROM splits_data sd
    GROUP BY sd.user_id, sd.currency
  ),
  all_participants AS (
    SELECT DISTINCT pp.user_id FROM participant_paid pp
    UNION
    SELECT DISTINCT po.user_id FROM participant_owes po
  )
  SELECT
    tm.id AS participant_id,
    ap.user_id,
    COALESCE(p.full_name, tm.guest_name, 'Participante') AS name,
    COALESCE(pp.paid, 0) AS paid,
    COALESCE(po.owes, 0) AS owes,
    COALESCE(pp.paid, 0) - COALESCE(po.owes, 0) AS balance,
    COALESCE(pp.currency, po.currency, 'BRL') AS currency
  FROM all_participants ap
  LEFT JOIN trip_members tm ON tm.user_id = ap.user_id AND tm.trip_id = p_trip_id
  LEFT JOIN profiles p ON p.id = ap.user_id
  LEFT JOIN participant_paid pp ON pp.user_id = ap.user_id
  LEFT JOIN participant_owes po ON po.user_id = ap.user_id;
END;
$$;
