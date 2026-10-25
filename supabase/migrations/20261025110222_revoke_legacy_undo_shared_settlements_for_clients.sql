-- The active client flow uses undo_settlement_v2, which binds the caller to
-- auth.uid() and checks debtor/creditor ownership. This legacy batch RPC has
-- no application caller and can reset splits outside the caller's settlement
-- side, so it must not be exposed through the authenticated Data API.
REVOKE ALL ON FUNCTION public.undo_shared_settlements(uuid[])
  FROM PUBLIC, anon, authenticated;

-- Preserve access for trusted backend jobs while removing client execution.
GRANT EXECUTE ON FUNCTION public.undo_shared_settlements(uuid[])
  TO service_role;
