-- Historical bootstrap definition reconciled with the production schema.
-- Administrative RPCs are created and hardened by later migrations; no secret
-- or password-based authorization belongs in schema history.
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  error_type text not null default 'UNKNOWN',
  message text not null,
  stack text,
  url text,
  file text,
  line integer,
  col integer,
  user_agent text,
  app_version text,
  extra jsonb,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'RESOLVED', 'IGNORED'))
);

alter table public.error_logs enable row level security;
