-- ARC-04: Server-side search for transactions beyond local cache
-- Supports queries by description (ILIKE), scoped to the authenticated user

CREATE OR REPLACE FUNCTION search_transactions(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  description TEXT,
  amount NUMERIC,
  type TEXT,
  date DATE,
  currency TEXT,
  category_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.description,
    t.amount,
    t.type,
    t.date,
    t.currency,
    t.category_id
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.description ILIKE '%' || p_query || '%'
  ORDER BY t.date DESC
  LIMIT p_limit;
END;
$$;
