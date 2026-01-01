-- =====================================================
-- MIGRATION: Adicionar Hierarquia de Categorias
-- Data: 01/01/2026
-- Descrição: Adiciona suporte para categorias pai/filho
-- =====================================================

-- 1. Adicionar coluna parent_category_id
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS parent_category_id UUID REFERENCES categories(id) ON DELETE CASCADE;

-- 2. Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_categories_parent 
ON categories(parent_category_id) 
WHERE parent_category_id IS NOT NULL;

-- 3. Adicionar constraint para evitar ciclos (categoria não pode ser pai de si mesma)
ALTER TABLE categories 
ADD CONSTRAINT chk_no_self_reference 
CHECK (id != parent_category_id);

-- 4. Comentários
COMMENT ON COLUMN categories.parent_category_id IS 'ID da categoria pai (para hierarquia)';
COMMENT ON INDEX idx_categories_parent IS 'Índice para buscar subcategorias rapidamente';
