-- Adicionar tipo SHARED_EXPENSE à constraint de notificações
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'WELCOME'::text,
  'INVOICE_DUE'::text,
  'INVOICE_OVERDUE'::text,
  'BUDGET_WARNING'::text,
  'BUDGET_EXCEEDED'::text,
  'SHARED_PENDING'::text,
  'SHARED_SETTLED'::text,
  'SHARED_EXPENSE'::text,  -- NOVO TIPO
  'RECURRING_PENDING'::text,
  'RECURRING_GENERATED'::text,
  'SAVINGS_GOAL'::text,
  'WEEKLY_SUMMARY'::text,
  'TRIP_INVITE'::text,
  'FAMILY_INVITE'::text,
  'GENERAL'::text
]));;
