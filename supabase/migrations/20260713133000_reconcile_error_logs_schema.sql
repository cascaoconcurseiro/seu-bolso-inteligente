alter table public.error_logs
  add column if not exists updated_at timestamptz not null default now();

alter table public.error_logs
  alter column message set not null,
  alter column status set default 'PENDING',
  alter column status set not null;

drop trigger if exists trg_error_logs_updated_at on public.error_logs;
create trigger trg_error_logs_updated_at
before update on public.error_logs
for each row execute function public.update_updated_at_column();

create or replace function public.get_admin_error_logs()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: requer privilegios de administrador.' using errcode = '42501';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'user_id', e.user_id,
      'user_email', p.email,
      'error_message', e.message,
      'stack_trace', e.stack,
      'context', coalesce(e.url, e.extra::text),
      'status', e.status,
      'created_at', e.created_at,
      'updated_at', e.updated_at
    ) order by e.created_at desc
  )
  into v_result
  from public.error_logs e
  left join public.profiles p on p.id = e.user_id;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

create or replace function public.resolve_error_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: requer privilegios de administrador.' using errcode = '42501';
  end if;

  update public.error_logs
  set status = 'RESOLVED'
  where id = p_report_id;

  if not found then
    raise exception 'Relatorio de erro nao encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.get_admin_error_logs() from public, anon;
revoke all on function public.resolve_error_report(uuid) from public, anon;
grant execute on function public.get_admin_error_logs() to authenticated, service_role;
grant execute on function public.resolve_error_report(uuid) to authenticated, service_role;
