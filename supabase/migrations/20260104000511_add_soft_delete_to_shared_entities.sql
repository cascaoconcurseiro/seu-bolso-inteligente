-- =====================================================
-- SOFT DELETE PARA ENTIDADES COMPARTILHADAS
-- Implementa soft delete em família, viagens e membros
-- Preserva histórico e evita órfãos no banco de dados
-- =====================================================

-- 1. FAMILY_MEMBERS: Adicionar status e removed_at
alter table public.family_members
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive', 'pending')),
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid references public.profiles(id),
  add column if not exists removal_reason text;

comment on column public.family_members.status is 'Status do membro: active (ativo), inactive (removido/saiu), pending (convite pendente)';
comment on column public.family_members.removed_at is 'Data/hora em que o membro foi removido ou saiu';
comment on column public.family_members.removed_by is 'Usuário que removeu o membro (null se o próprio membro saiu)';
comment on column public.family_members.removal_reason is 'Motivo da remoção (opcional)';

-- Atualizar membros existentes com status 'pending' para manter compatibilidade
update public.family_members
set status = 'active'
where status = 'pending' and user_id is not null;

-- 2. TRIP_MEMBERS: Adicionar status e removed_at
alter table public.trip_members
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive', 'pending')),
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid references auth.users(id),
  add column if not exists removal_reason text;

comment on column public.trip_members.status is 'Status do membro: active (ativo), inactive (removido/saiu), pending (convite pendente)';
comment on column public.trip_members.removed_at is 'Data/hora em que o membro foi removido ou saiu';
comment on column public.trip_members.removed_by is 'Usuário que removeu o membro (null se o próprio membro saiu)';
comment on column public.trip_members.removal_reason is 'Motivo da remoção (opcional)';

-- 3. TRIPS: Adicionar soft delete
alter table public.trips
  add column if not exists deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id);

comment on column public.trips.deleted is 'Soft delete - viagem foi deletada mas mantida para histórico';
comment on column public.trips.deleted_at is 'Data/hora em que a viagem foi deletada';
comment on column public.trips.deleted_by is 'Usuário que deletou a viagem';

-- 4. FAMILIES: Adicionar soft delete
alter table public.families
  add column if not exists deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id);

comment on column public.families.deleted is 'Soft delete - família foi deletada mas mantida para histórico';
comment on column public.families.deleted_at is 'Data/hora em que a família foi deletada';
comment on column public.families.deleted_by is 'Usuário que deletou a família';

-- 5. TRIP_INVITATIONS: Adicionar soft delete para convites expirados
alter table public.trip_invitations
  add column if not exists deleted boolean not null default false,
  add column if not exists deleted_at timestamptz;

comment on column public.trip_invitations.deleted is 'Soft delete - convite foi deletado mas mantido para histórico';
comment on column public.trip_invitations.deleted_at is 'Data/hora em que o convite foi deletado';

-- 6. FAMILY_INVITATIONS: Adicionar soft delete para convites expirados
alter table public.family_invitations
  add column if not exists deleted boolean not null default false,
  add column if not exists deleted_at timestamptz;

comment on column public.family_invitations.deleted is 'Soft delete - convite foi deletado mas mantido para histórico';
comment on column public.family_invitations.deleted_at is 'Data/hora em que o convite foi deletado';

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para filtrar por status ativo
create index if not exists idx_family_members_status_active
  on public.family_members(family_id, status)
  where status = 'active';

create index if not exists idx_trip_members_status_active
  on public.trip_members(trip_id, status)
  where status = 'active';

-- Índices para viagens e famílias não deletadas
create index if not exists idx_trips_not_deleted
  on public.trips(owner_id, deleted)
  where deleted = false;

create index if not exists idx_families_not_deleted
  on public.families(owner_id, deleted)
  where deleted = false;

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para remover membro da família (soft delete)
create or replace function public.remove_family_member(
  p_member_id uuid,
  p_removed_by uuid default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
as $$
begin
  update public.family_members
  set
    status = 'inactive',
    removed_at = now(),
    removed_by = p_removed_by,
    removal_reason = p_reason,
    updated_at = now()
  where id = p_member_id;
end;
$$;

comment on function public.remove_family_member is 'Remove membro da família (soft delete) preservando histórico';

-- Função para remover membro da viagem (soft delete)
create or replace function public.remove_trip_member(
  p_member_id uuid,
  p_removed_by uuid default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
as $$
begin
  update public.trip_members
  set
    status = 'inactive',
    removed_at = now(),
    removed_by = p_removed_by,
    removal_reason = p_reason,
    updated_at = now()
  where id = p_member_id;
end;
$$;

comment on function public.remove_trip_member is 'Remove membro da viagem (soft delete) preservando histórico';

-- Função para reativar membro da família
create or replace function public.reactivate_family_member(
  p_member_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update public.family_members
  set
    status = 'active',
    removed_at = null,
    removed_by = null,
    removal_reason = null,
    updated_at = now()
  where id = p_member_id;
end;
$$;

comment on function public.reactivate_family_member is 'Reativa membro da família que foi removido';

-- Função para reativar membro da viagem
create or replace function public.reactivate_trip_member(
  p_member_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update public.trip_members
  set
    status = 'active',
    removed_at = null,
    removed_by = null,
    removal_reason = null,
    updated_at = now()
  where id = p_member_id;
end;
$$;

comment on function public.reactivate_trip_member is 'Reativa membro da viagem que foi removido';

-- =====================================================
-- VIEWS PARA FACILITAR QUERIES
-- =====================================================

-- View de membros ativos da família
create or replace view public.active_family_members as
select *
from public.family_members
where status = 'active';

comment on view public.active_family_members is 'Membros ativos da família (não removidos)';

-- View de membros ativos de viagens
create or replace view public.active_trip_members as
select *
from public.trip_members
where status = 'active';

comment on view public.active_trip_members is 'Membros ativos de viagens (não removidos)';

-- View de viagens ativas
create or replace view public.active_trips as
select *
from public.trips
where deleted = false;

comment on view public.active_trips is 'Viagens ativas (não deletadas)';

-- View de famílias ativas
create or replace view public.active_families as
select *
from public.families
where deleted = false;

comment on view public.active_families is 'Famílias ativas (não deletadas)';

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Garantir que views herdam as políticas RLS das tabelas base
alter view public.active_family_members set (security_invoker = on);
alter view public.active_trip_members set (security_invoker = on);
alter view public.active_trips set (security_invoker = on);
alter view public.active_families set (security_invoker = on);;
