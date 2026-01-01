
-- Corrigir a view removendo SECURITY DEFINER implícito
-- Views não devem usar SECURITY DEFINER para evitar bypass de RLS

DROP VIEW IF EXISTS public.v_shared_expenses;

CREATE VIEW public.v_shared_expenses 
WITH (security_invoker = true)
AS
SELECT 
    t.id,
    t.user_id,
    t.amount,
    t.description,
    t.date,
    t.type,
    t.category_id,
    t.is_shared,
    t.is_installment,
    t.current_installment,
    t.total_installments,
    t.series_id,
    t.trip_id,
    t.is_settled,
    t.created_at,
    t.updated_at,
    CASE 
        WHEN t.source_transaction_id IS NULL THEN 'ORIGINAL'
        ELSE 'MIRROR'
    END as transaction_origin,
    COALESCE(t.creator_user_id, t.payer_id, t.user_id) as original_creator_id,
    CASE 
        WHEN t.source_transaction_id IS NOT NULL THEN t.payer_id
        ELSE t.user_id
    END as creditor_user_id,
    t.source_transaction_id
FROM public.transactions t
WHERE t.is_shared = true;

COMMENT ON VIEW public.v_shared_expenses IS 
'View de despesas compartilhadas com indicadores de origem. Usa security_invoker para respeitar RLS.';
