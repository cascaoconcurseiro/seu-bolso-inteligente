-- Migration: Add tables for Trip Journal (Journey) and Trip Bags Tracker

-- 1. Tabela de Diário da Viagem (Trip Journal)
CREATE TABLE IF NOT EXISTS public.trip_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  content text NOT NULL,
  mood text DEFAULT 'amazing',
  location text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT trip_journal_title_nonempty CHECK (btrim(title) <> ''),
  CONSTRAINT trip_journal_content_nonempty CHECK (btrim(content) <> '')
);

-- RLS para Diário
ALTER TABLE public.trip_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view journal entries"
ON public.trip_journal_entries FOR SELECT TO authenticated
USING (private.can_view_trip(trip_id));

CREATE POLICY "Trip editors can manage journal entries"
ON public.trip_journal_entries FOR ALL TO authenticated
USING (private.can_edit_trip_plan(trip_id))
WITH CHECK (private.can_edit_trip_plan(trip_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_journal_entries TO authenticated;


-- 2. Tabela de Bagagens / Malas da Viagem (Trip Bags Tracker)
CREATE TABLE IF NOT EXISTS public.trip_bags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  owner_name text DEFAULT 'Passageiro',
  max_weight_kg double precision NOT NULL DEFAULT 10.0,
  current_weight_kg double precision NOT NULL DEFAULT 0.0,
  type text NOT NULL DEFAULT 'hand',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT trip_bags_name_nonempty CHECK (btrim(name) <> ''),
  CONSTRAINT trip_bags_max_weight_positive CHECK (max_weight_kg > 0),
  CONSTRAINT trip_bags_current_weight_nonnegative CHECK (current_weight_kg >= 0),
  CONSTRAINT trip_bags_type_check CHECK (type IN ('hand', 'checked', 'backpack'))
);

-- RLS para Bagagens
ALTER TABLE public.trip_bags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view bags"
ON public.trip_bags FOR SELECT TO authenticated
USING (private.can_view_trip(trip_id));

CREATE POLICY "Trip editors can manage bags"
ON public.trip_bags FOR ALL TO authenticated
USING (private.can_edit_trip_plan(trip_id))
WITH CHECK (private.can_edit_trip_plan(trip_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_bags TO authenticated;
