-- Migration: 20260608111500_drop_old_monthly_projection_function.sql
-- Drop the old signature of get_monthly_projection to resolve PGRST203 ambiguity.

DROP FUNCTION IF EXISTS public.get_monthly_projection(UUID, DATE);

-- The remaining function will be:
-- get_monthly_projection(p_user_id UUID, p_end_date DATE, p_currency VARCHAR)
