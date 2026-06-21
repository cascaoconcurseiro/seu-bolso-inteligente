-- Migration: Align default categories with frontend
-- Description: Redefines seed_default_categories to use categories from defaultCategories.ts and cleans up obsolete ones.

CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  -- ==========================================
  -- 1. CATEGORIAS DE SISTEMA
  -- ==========================================
  
  -- Saldo Inicial
  INSERT INTO public.categories (user_id, name, icon, type, color)
  VALUES (p_user_id, 'Saldo Inicial', '💰', 'income', NULL)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;
  
  -- Acerto Financeiro (Income e Expense)
  INSERT INTO public.categories (user_id, name, icon, type, color)
  VALUES (p_user_id, 'Acerto Financeiro', '🤝', 'income', NULL)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;
         
  INSERT INTO public.categories (user_id, name, icon, type, color)
  VALUES (p_user_id, 'Acerto Financeiro', '🤝', 'expense', NULL)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- ==========================================
  -- 2. DESPESAS HIERÁRQUICAS (defaultCategories.ts)
  -- ==========================================
  
  -- 1. Supermercado
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Supermercado' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Supermercado', '🛒', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Feira', '🥬', 'expense', v_parent_id),
    (p_user_id, 'Açougue', '🥩', 'expense', v_parent_id),
    (p_user_id, 'Padaria', '🥖', 'expense', v_parent_id),
    (p_user_id, 'Bebidas', '🥤', 'expense', v_parent_id),
    (p_user_id, 'Higiene e Limpeza', '🧼', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 2. Restaurantes e Lanches
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Restaurantes e Lanches' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Restaurantes e Lanches', '🍽️', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Restaurante', '🍽️', 'expense', v_parent_id),
    (p_user_id, 'Lanche', '🍔', 'expense', v_parent_id),
    (p_user_id, 'Café', '☕', 'expense', v_parent_id),
    (p_user_id, 'Bar', '🍺', 'expense', v_parent_id),
    (p_user_id, 'Fast Food', '🍟', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 3. Delivery
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Delivery' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Delivery', '🍕', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Marmita', '🍱', 'expense', v_parent_id),
    (p_user_id, 'Pizza', '🍕', 'expense', v_parent_id),
    (p_user_id, 'Hamburguer', '🍔', 'expense', v_parent_id),
    (p_user_id, 'Comida Japonesa', '🍣', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 4. Gasolina
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Gasolina' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Gasolina', '⛽', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Combustível', '⛽', 'expense', v_parent_id),
    (p_user_id, 'Etanol', '🌿', 'expense', v_parent_id),
    (p_user_id, 'Diesel', '🚚', 'expense', v_parent_id),
    (p_user_id, 'GNV', '🎈', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 5. Transporte
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Transporte' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Transporte', '🚗', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Uber/Taxi', '🚕', 'expense', v_parent_id),
    (p_user_id, 'Ônibus', '🚌', 'expense', v_parent_id),
    (p_user_id, 'Metrô', '🚇', 'expense', v_parent_id),
    (p_user_id, 'Trem', '🚆', 'expense', v_parent_id),
    (p_user_id, 'Estacionamento', '🅿️', 'expense', v_parent_id),
    (p_user_id, 'Pedágio', '🛣️', 'expense', v_parent_id),
    (p_user_id, 'Manutenção Veículo', '🔧', 'expense', v_parent_id),
    (p_user_id, 'Lavagem', '🚿', 'expense', v_parent_id),
    (p_user_id, 'IPVA', '🚗', 'expense', v_parent_id),
    (p_user_id, 'Seguro Veículo', '🛡️', 'expense', v_parent_id),
    (p_user_id, 'Licenciamento', '📋', 'expense', v_parent_id),
    (p_user_id, 'Multas', '🚨', 'expense', v_parent_id),
    (p_user_id, 'Financiamento Veículo', '💳', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 6. Moradia
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Moradia' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Moradia', '🏠', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Aluguel', '🏠', 'expense', v_parent_id),
    (p_user_id, 'Condomínio', '🏢', 'expense', v_parent_id),
    (p_user_id, 'Água', '💧', 'expense', v_parent_id),
    (p_user_id, 'Luz', '💡', 'expense', v_parent_id),
    (p_user_id, 'Gás', '🔥', 'expense', v_parent_id),
    (p_user_id, 'Internet', '🌐', 'expense', v_parent_id),
    (p_user_id, 'Telefone', '📱', 'expense', v_parent_id),
    (p_user_id, 'TV a Cabo', '📺', 'expense', v_parent_id),
    (p_user_id, 'IPTU', '🏘️', 'expense', v_parent_id),
    (p_user_id, 'Manutenção', '🔧', 'expense', v_parent_id),
    (p_user_id, 'Móveis', '🛋️', 'expense', v_parent_id),
    (p_user_id, 'Decoração', '🖼️', 'expense', v_parent_id),
    (p_user_id, 'Eletrodomésticos', '🔌', 'expense', v_parent_id),
    (p_user_id, 'Limpeza', '🧹', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 7. Contas e Assinaturas
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Contas e Assinaturas' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Contas e Assinaturas', '📺', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Netflix', '🎬', 'expense', v_parent_id),
    (p_user_id, 'Spotify', '🎵', 'expense', v_parent_id),
    (p_user_id, 'Amazon Prime', '📦', 'expense', v_parent_id),
    (p_user_id, 'Disney+', '🏰', 'expense', v_parent_id),
    (p_user_id, 'HBO Max', '🎭', 'expense', v_parent_id),
    (p_user_id, 'YouTube Premium', '▶️', 'expense', v_parent_id),
    (p_user_id, 'Cloud Storage', '☁️', 'expense', v_parent_id),
    (p_user_id, 'Lavanderia', '🧺', 'expense', v_parent_id),
    (p_user_id, 'Costureira', '🧵', 'expense', v_parent_id),
    (p_user_id, 'Encanador', '🚰', 'expense', v_parent_id),
    (p_user_id, 'Eletricista', '⚡', 'expense', v_parent_id),
    (p_user_id, 'Diarista', '🧹', 'expense', v_parent_id),
    (p_user_id, 'Jardineiro', '🌱', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 8. Saúde
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Saúde' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Saúde', '💊', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Plano de Saúde', '🏥', 'expense', v_parent_id),
    (p_user_id, 'Médico', '👨‍⚕️', 'expense', v_parent_id),
    (p_user_id, 'Dentista', '🦷', 'expense', v_parent_id),
    (p_user_id, 'Farmácia', '💊', 'expense', v_parent_id),
    (p_user_id, 'Exames', '🔬', 'expense', v_parent_id),
    (p_user_id, 'Cirurgia', '🏥', 'expense', v_parent_id),
    (p_user_id, 'Fisioterapia', '🧘', 'expense', v_parent_id),
    (p_user_id, 'Terapia', '🧠', 'expense', v_parent_id),
    (p_user_id, 'Psicólogo', '💭', 'expense', v_parent_id),
    (p_user_id, 'Óculos/Lentes', '👓', 'expense', v_parent_id),
    (p_user_id, 'Aparelho Ortodôntico', '😁', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 9. Educação
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Educação' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Educação', '📚', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Mensalidade Escolar', '🎓', 'expense', v_parent_id),
    (p_user_id, 'Mensalidade Faculdade', '🏫', 'expense', v_parent_id),
    (p_user_id, 'Curso Online', '💻', 'expense', v_parent_id),
    (p_user_id, 'Curso Presencial', '📚', 'expense', v_parent_id),
    (p_user_id, 'Livros', '📖', 'expense', v_parent_id),
    (p_user_id, 'Material Escolar', '✏️', 'expense', v_parent_id),
    (p_user_id, 'Idiomas', '🗣️', 'expense', v_parent_id),
    (p_user_id, 'Certificações', '📜', 'expense', v_parent_id),
    (p_user_id, 'Uniforme', '👔', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 10. Compras
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Compras' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Compras', '🛍️', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Roupas', '👕', 'expense', v_parent_id),
    (p_user_id, 'Calçados', '👟', 'expense', v_parent_id),
    (p_user_id, 'Acessórios', '👜', 'expense', v_parent_id),
    (p_user_id, 'Joias', '💍', 'expense', v_parent_id),
    (p_user_id, 'Relógios', '⌚', 'expense', v_parent_id),
    (p_user_id, 'Eletrônicos', '📱', 'expense', v_parent_id),
    (p_user_id, 'Informática', '💻', 'expense', v_parent_id),
    (p_user_id, 'Cosméticos', '💄', 'expense', v_parent_id),
    (p_user_id, 'Perfumes', '🌸', 'expense', v_parent_id),
    (p_user_id, 'Presentes', '🎁', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 11. Lazer
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Lazer' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Lazer', '🎮', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Cinema', '🎬', 'expense', v_parent_id),
    (p_user_id, 'Teatro', '🎭', 'expense', v_parent_id),
    (p_user_id, 'Shows', '🎵', 'expense', v_parent_id),
    (p_user_id, 'Eventos', '🎪', 'expense', v_parent_id),
    (p_user_id, 'Parque', '🎡', 'expense', v_parent_id),
    (p_user_id, 'Viagem Lazer', '🏖️', 'expense', v_parent_id),
    (p_user_id, 'Hobbies', '🎨', 'expense', v_parent_id),
    (p_user_id, 'Jogos', '🎮', 'expense', v_parent_id),
    (p_user_id, 'Esportes', '⚽', 'expense', v_parent_id),
    (p_user_id, 'Academia', '💪', 'expense', v_parent_id),
    (p_user_id, 'Clube', '🏊', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 12. Viagens
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Viagens' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Viagens', '✈️', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Passagem Aérea', '✈️', 'expense', v_parent_id),
    (p_user_id, 'Passagem Rodoviária', '🚌', 'expense', v_parent_id),
    (p_user_id, 'Hotel', '🏨', 'expense', v_parent_id),
    (p_user_id, 'Hospedagem', '🛏️', 'expense', v_parent_id),
    (p_user_id, 'Aluguel de Carro', '🚗', 'expense', v_parent_id),
    (p_user_id, 'Turismo', '🗺️', 'expense', v_parent_id),
    (p_user_id, 'Passeios', '🎢', 'expense', v_parent_id),
    (p_user_id, 'Seguro Viagem', '🛡️', 'expense', v_parent_id),
    (p_user_id, 'Visto', '📋', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 13. Família e Pets
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Família e Pets' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Família e Pets', '🐾', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Veterinário', '🐕', 'expense', v_parent_id),
    (p_user_id, 'Ração', '🦴', 'expense', v_parent_id),
    (p_user_id, 'Pet Shop', '🐾', 'expense', v_parent_id),
    (p_user_id, 'Banho e Tosa', '🛁', 'expense', v_parent_id),
    (p_user_id, 'Medicamentos Pet', '💊', 'expense', v_parent_id),
    (p_user_id, 'Hotel Pet', '🏨', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 14. Financeiro
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Financeiro' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Financeiro', '🏦', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Taxas', '📋', 'expense', v_parent_id),
    (p_user_id, 'Juros', '💸', 'expense', v_parent_id),
    (p_user_id, 'Tarifas Bancárias', '🏦', 'expense', v_parent_id),
    (p_user_id, 'Impostos', '🏛️', 'expense', v_parent_id),
    (p_user_id, 'IPTU', '🏘️', 'expense', v_parent_id),
    (p_user_id, 'IPVA', '🚗', 'expense', v_parent_id),
    (p_user_id, 'IR', '💼', 'expense', v_parent_id),
    (p_user_id, 'Multas', '🚨', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 15. Outros
  SELECT id INTO v_parent_id FROM public.categories 
  WHERE user_id = p_user_id AND name = 'Outros' AND type = 'expense' AND parent_category_id IS NULL;
  
  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Outros', '📦', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;
  
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Diversos', '📦', 'expense', v_parent_id),
    (p_user_id, 'Emergência', '🚨', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- ==========================================
  -- 3. RECEITAS (defaultCategories.ts)
  -- ==========================================
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Salário', '💰', 'income', NULL),
    (p_user_id, 'Freelance', '💻', 'income', NULL),
    (p_user_id, 'Vendas', '🏷️', 'income', NULL),
    (p_user_id, 'Investimentos', '📈', 'income', NULL),
    (p_user_id, 'Reembolso', '💳', 'income', NULL),
    (p_user_id, 'Cashback', '💸', 'income', NULL),
    (p_user_id, 'Benefícios', '🎁', 'income', NULL),
    (p_user_id, 'Presente', '🎉', 'income', NULL),
    (p_user_id, 'Transferência Recebida', '📥', 'income', NULL),
    (p_user_id, 'Outros', '💵', 'income', NULL)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  RETURN;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro ao criar categorias padrão corretas: %', SQLERRM;
  RETURN;
END;
$$;

-- Executa a função retroativa para todos os usuários
DO $$
DECLARE
  v_profile RECORD;
BEGIN
  FOR v_profile IN SELECT id FROM public.profiles LOOP
    RAISE NOTICE 'Sincronizando categorias oficiais para %', v_profile.id;
    PERFORM public.seed_default_categories(v_profile.id);
  END LOOP;
END $$;

-- Bloco de Limpeza: Remove com segurança as categorias obsoletas da migração anterior
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
        -- Tenta deletar (a deleção em cascata cuidará das subcategorias)
        -- Graças ao ON DELETE CASCADE da chave estrangeira, isso limpa os filhos
        DELETE FROM public.categories WHERE id = v_obsolete_parent.id;
        RAISE NOTICE 'Categoria obsoleta % removida com sucesso para o usuário %', v_obsolete_parent.name, v_user.id;
      EXCEPTION WHEN OTHERS THEN
        -- Se falhar (ex: por chave estrangeira em transações), apenas pula silenciosamente
        RAISE WARNING 'Não foi possível remover categoria obsoleta % para o usuário %: %', v_obsolete_parent.name, v_user.id, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END $$;
