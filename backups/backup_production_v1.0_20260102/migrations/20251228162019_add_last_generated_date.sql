ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS last_generated_date DATE;

COMMENT ON COLUMN public.transactions.last_generated_date IS 'Data da ultima transacao gerada a partir desta transacao recorrente';

CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON public.transactions (user_id, is_recurring, last_generated_date) WHERE is_recurring = true;;
