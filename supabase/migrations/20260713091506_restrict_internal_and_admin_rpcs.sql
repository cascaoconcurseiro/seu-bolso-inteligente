-- Admin UI endpoint: keep it callable by authenticated users, but enforce the
-- authorization decision inside the privileged function before deleting data.
create or replace function public.clear_error_logs()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'Acesso negado: requer privilegios de administrador.'
      using errcode = '42501';
  end if;

  delete from public.error_logs;
end;
$$;

revoke all on function public.clear_error_logs() from public, anon;
grant execute on function public.clear_error_logs() to authenticated, service_role;

-- These functions are invoked by triggers, pg_cron or trusted backend code.
-- Exposing them through PostgREST lets any signed-in user perform global jobs
-- or create notifications for arbitrary users.
revoke execute on function public.expire_pending_settlements() from authenticated;
revoke execute on function public.fn_create_notification(uuid, text, text, text, text) from authenticated;
revoke execute on function public.fn_create_notification(uuid, text, text, text, text, jsonb, text) from authenticated;
revoke execute on function public.generate_pending_recurring_transactions() from authenticated;
revoke execute on function public.permanent_delete_old_records() from authenticated;
revoke execute on function public.process_daily_yields() from authenticated;
revoke execute on function public.seed_default_categories(uuid) from authenticated;

-- Preserve trusted execution paths explicitly.
grant execute on function public.expire_pending_settlements() to service_role;
grant execute on function public.fn_create_notification(uuid, text, text, text, text) to service_role;
grant execute on function public.fn_create_notification(uuid, text, text, text, text, jsonb, text) to service_role;
grant execute on function public.generate_pending_recurring_transactions() to service_role;
grant execute on function public.permanent_delete_old_records() to service_role;
grant execute on function public.process_daily_yields() to service_role;
grant execute on function public.seed_default_categories(uuid) to service_role;
