-- =====================================================
-- MIGRATION: Limpar Categorias Antigas (Sem Hierarquia)
-- Data: 01/01/2026
-- Descrição: Remove categorias antigas que não fazem parte da hierarquia
-- =====================================================

-- Esta migration remove categorias antigas que foram criadas antes
-- da implementação do sistema de hierarquia, mantendo apenas as novas

DO $$
DECLARE
  v_user_id UUID;
  v_old_categories_count INT;
BEGIN
  -- Para cada usuário
  FOR v_user_id IN SELECT id FROM auth.users LOOP
    
    -- Contar categorias antigas (pai sem filhos)
    SELECT COUNT(*) INTO v_old_categories_count
    FROM categories c1
    WHERE c1.user_id = v_user_id
      AND c1.parent_category_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM categories c2
        WHERE c2.parent_category_id = c1.id
      );
    
    -- Se encontrou categorias antigas, deletar
    IF v_old_categories_count > 0 THEN
      RAISE NOTICE 'Removendo % categorias antigas do usuário: %', v_old_categories_count, v_user_id;
      
      -- Deletar categorias pai que não têm filhos (antigas)
      DELETE FROM categories
      WHERE user_id = v_user_id
        AND parent_category_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM categories c2
          WHERE c2.parent_category_id = categories.id
        );
      
      RAISE NOTICE 'Categorias antigas removidas com sucesso para usuário: %', v_user_id;
    ELSE
      RAISE NOTICE 'Nenhuma categoria antiga encontrada para usuário: %', v_user_id;
    END IF;
    
  END LOOP;
END $$;;
