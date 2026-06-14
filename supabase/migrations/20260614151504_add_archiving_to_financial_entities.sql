-- =====================================================
-- MIGRATION: Adicionar Arquivamento
-- =====================================================

-- 1. CONTAS (ACCOUNTS)
ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_accounts_is_archived 
  ON public.accounts(is_archived);

-- 3. CATEGORIAS (CATEGORIES)
ALTER TABLE public.categories 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_categories_is_archived 
  ON public.categories(is_archived);

-- 4. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON COLUMN public.accounts.is_archived IS 'Indica se a conta/cartão foi arquivada (escondida de novos lançamentos)';
COMMENT ON COLUMN public.categories.is_archived IS 'Indica se a categoria foi arquivada (escondida de novos lançamentos)';
