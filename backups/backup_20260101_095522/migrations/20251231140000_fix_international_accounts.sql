-- Migration: Corrigir contas internacionais não marcadas
-- Data: 2024-12-31
-- Descrição: Identifica e corrige contas de bancos internacionais que não foram marcadas como is_international=true

-- 1. Atualizar contas de bancos internacionais conhecidos
UPDATE public.accounts
SET 
  is_international = true,
  currency = COALESCE(NULLIF(currency, ''), 'USD') -- Se currency está vazio ou NULL, usar USD
WHERE 
  bank_id IN ('wise', 'nomad', 'remessa-online', 'avenue', 'c6-global')
  AND (is_international IS NULL OR is_international = false);

-- 2. Atualizar contas que têm currency diferente de BRL mas não estão marcadas como internacionais
UPDATE public.accounts
SET is_international = true
WHERE 
  currency IS NOT NULL 
  AND currency != 'BRL'
  AND (is_international IS NULL OR is_international = false);

-- 3. Garantir que contas nacionais têm currency = BRL
UPDATE public.accounts
SET currency = 'BRL'
WHERE 
  (is_international IS NULL OR is_international = false)
  AND (currency IS NULL OR currency = '');

-- 4. Adicionar comentário na tabela
COMMENT ON COLUMN public.accounts.is_international IS 'Indica se a conta é internacional (moeda diferente de BRL). Contas internacionais não entram no cálculo do saldo total em BRL.';
COMMENT ON COLUMN public.accounts.currency IS 'Moeda da conta (BRL para contas nacionais, USD/EUR/etc para internacionais)';
