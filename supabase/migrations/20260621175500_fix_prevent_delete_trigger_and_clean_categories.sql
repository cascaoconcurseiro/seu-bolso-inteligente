-- Migration: Fix prevent delete trigger and clean obsolete categories
-- Description: Fixes prosrc of prevent_delete_if_has_transactions to use deleted_at instead of deleted, and cleans up obsolete categories.

CREATE OR REPLACE FUNCTION public.prevent_delete_if_has_transactions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tx_count INTEGER;
BEGIN
  -- Se for um soft delete (marcando deleted_at) ou hard delete (DELETE físico)
  IF (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) OR (TG_OP = 'DELETE') THEN
    
    IF TG_TABLE_NAME = 'accounts' THEN
      SELECT COUNT(*) INTO tx_count FROM public.transactions WHERE account_id = OLD.id AND deleted_at IS NULL;
      IF tx_count > 0 THEN
        RAISE EXCEPTION 'Não é possível excluir a conta. Existem % transações vinculadas. Por favor, arquive.', tx_count;
      END IF;
    ELSIF TG_TABLE_NAME = 'categories' THEN
      SELECT COUNT(*) INTO tx_count FROM public.transactions WHERE category_id = OLD.id AND deleted_at IS NULL;
      IF tx_count > 0 THEN
        RAISE EXCEPTION 'Não é possível excluir a categoria. Existem % transações vinculadas. Por favor, arquive.', tx_count;
      END IF;
    END IF;

  END IF;
  
  -- Para UPDATE retorna NEW, para DELETE retorna OLD
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Agora deleta com segurança as categorias obsoletas (a deleção em cascata removerá os filhos)
DO $$
DECLARE
  v_user RECORD;
  v_obsolete_parent RECORD;
BEGIN
  FOR v_user IN SELECT id FROM public.profiles LOOP
    FOR v_obsolete_parent IN 
      SELECT id, name FROM public.categories 
      WHERE user_id = v_user.id 
        AND name IN ('Alimentação', 'Pets', 'Viagem', 'Cuidados Pessoais', 'Serviços', 'Impostos e Taxas', 'Trabalho', 'Renda Extra')
        AND parent_category_id IS NULL
    LOOP
      BEGIN
        DELETE FROM public.categories WHERE id = v_obsolete_parent.id;
        RAISE NOTICE 'Categoria obsoleta % removida para o usuário %', v_obsolete_parent.name, v_user.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Não foi possível remover a categoria obsoleta % para o usuário %: %', v_obsolete_parent.name, v_user.id, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END $$;
