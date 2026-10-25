-- The legacy function is a no-op and has no application or cron caller.
-- Keep it available to trusted backend operations while removing the misleading
-- client Data API entry point. Function ownership remains unchanged.
REVOKE ALL ON FUNCTION public.process_credit_card_invoices()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_credit_card_invoices()
  TO service_role;
