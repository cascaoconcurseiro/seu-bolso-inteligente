-- These legacy settlement endpoints have no production frontend or database
-- callers and allow mutations that are broader than the active settlement API.
revoke all on function public.mark_as_paid_by_debtor(uuid, uuid) from public, anon, authenticated;
revoke all on function public.mark_as_received_by_creditor(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reject_settlement_request(uuid, text) from public, anon, authenticated;
revoke all on function public.settle_partial_balance(uuid, uuid, numeric, text, uuid) from public, anon, authenticated;

grant execute on function public.mark_as_paid_by_debtor(uuid, uuid) to service_role;
grant execute on function public.mark_as_received_by_creditor(uuid, uuid) to service_role;
grant execute on function public.reject_settlement_request(uuid, text) to service_role;
grant execute on function public.settle_partial_balance(uuid, uuid, numeric, text, uuid) to service_role;
