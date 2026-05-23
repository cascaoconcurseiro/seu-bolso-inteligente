-- Migration: Fix notifications constraints and missing columns
-- Descrição: Adiciona start_date/end_date em budgets, colunas em notification_preferences, e corrige check constraint de notifications

-- 1. Orçamentos
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- 2. Preferências de Notificações
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS low_balance_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS low_balance_threshold NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS credit_limit_warning_enabled BOOLEAN DEFAULT true;

-- 3. Tipos de Notificações
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'WELCOME', 
  'INVOICE_DUE', 
  'INVOICE_OVERDUE', 
  'BUDGET_WARNING', 
  'BUDGET_EXCEEDED', 
  'SHARED_PENDING', 
  'SHARED_SETTLED', 
  'SHARED_EXPENSE', 
  'RECURRING_PENDING', 
  'RECURRING_GENERATED', 
  'SAVINGS_GOAL', 
  'GOAL_MILESTONE', 
  'LOW_BALANCE', 
  'CREDIT_LIMIT_WARNING', 
  'SUBSCRIPTION_REMINDER', 
  'WEEKLY_SUMMARY', 
  'TRIP_INVITE', 
  'FAMILY_INVITE', 
  'SETTLEMENT_REQUEST', 
  'PAYMENT_CONFIRMED', 
  'SETTLEMENT_REJECTED', 
  'SECURITY_ALERT', 
  'GENERAL'
));
