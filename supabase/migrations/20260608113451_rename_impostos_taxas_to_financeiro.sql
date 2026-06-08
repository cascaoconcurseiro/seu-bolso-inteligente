-- Migration: Transfere 'Impostos e Taxas' para 'Financeiro' e cria 'Impostos'
-- Data: 08/06/2026
-- Descrição: 
-- 1. Transfere todas as despesas de "Impostos e Taxas" para "Financeiro" (ou renomeia se Financeiro não existir)
-- 2. Cria a categoria "Impostos"

DO $$
DECLARE
  v_user_id UUID;
  v_financeiro_id UUID;
  v_impostos_taxas_id UUID;
BEGIN
  FOR v_user_id IN SELECT id FROM auth.users LOOP
    
    -- Reset vars
    v_financeiro_id := NULL;
    v_impostos_taxas_id := NULL;

    -- Tenta encontrar o ID da categoria "Financeiro"
    SELECT id INTO v_financeiro_id FROM categories WHERE user_id = v_user_id AND name = 'Financeiro' AND type = 'expense' AND parent_category_id IS NULL;
    
    -- Tenta encontrar o ID da categoria "Impostos e Taxas"
    SELECT id INTO v_impostos_taxas_id FROM categories WHERE user_id = v_user_id AND name = 'Impostos e Taxas' AND type = 'expense' AND parent_category_id IS NULL;

    IF v_financeiro_id IS NOT NULL AND v_impostos_taxas_id IS NOT NULL THEN
      -- Transfere as transações, orçamentos, subcategorias e metas vinculadas
      UPDATE transactions SET category_id = v_financeiro_id WHERE category_id = v_impostos_taxas_id;
      UPDATE budgets SET category_id = v_financeiro_id WHERE category_id = v_impostos_taxas_id;
      UPDATE categories SET parent_category_id = v_financeiro_id WHERE parent_category_id = v_impostos_taxas_id;
      
      -- Deleta a categoria antiga
      DELETE FROM categories WHERE id = v_impostos_taxas_id;
    ELSIF v_financeiro_id IS NULL AND v_impostos_taxas_id IS NOT NULL THEN
      -- Se não tem Financeiro, apenas renomeia
      UPDATE categories SET name = 'Financeiro', icon = '💼' WHERE id = v_impostos_taxas_id;
    ELSIF v_financeiro_id IS NULL AND v_impostos_taxas_id IS NULL THEN
      -- Se o usuário não tem nenhum dos dois, cria o Financeiro
      INSERT INTO categories (user_id, name, icon, type, parent_category_id)
      VALUES (v_user_id, 'Financeiro', '💼', 'expense', NULL);
    END IF;

    -- Cria a categoria Impostos se não existir
    IF NOT EXISTS (SELECT 1 FROM categories WHERE user_id = v_user_id AND name = 'Impostos' AND type = 'expense' AND parent_category_id IS NULL) THEN
      INSERT INTO categories (user_id, name, icon, type, parent_category_id)
      VALUES (v_user_id, 'Impostos', '🏛️', 'expense', NULL);
    END IF;

  END LOOP;
END;
$$;
