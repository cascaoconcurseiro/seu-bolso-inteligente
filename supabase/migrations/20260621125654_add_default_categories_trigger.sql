-- Migration: Add default categories trigger for new users
-- Description: Automatically populates the category hierarchy and system categories when a new user signs up

CREATE OR REPLACE FUNCTION public.create_default_categories_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  -- Verificar se já tem categorias para evitar duplicação
  IF EXISTS (SELECT 1 FROM public.categories WHERE user_id = NEW.id LIMIT 1) THEN
    RETURN NEW;
  END IF;

  -- ==========================================
  -- 1. CATEGORIAS DE SISTEMA
  -- ==========================================
  
  -- Saldo Inicial
  INSERT INTO public.categories (user_id, name, icon, type, color)
  VALUES (NEW.id, 'Saldo Inicial', '💰', 'income', NULL);
  
  -- Acerto Financeiro (Income e Expense)
  INSERT INTO public.categories (user_id, name, icon, type, color)
  VALUES (NEW.id, 'Acerto Financeiro', '🤝', 'income', NULL),
         (NEW.id, 'Acerto Financeiro', '🤝', 'expense', NULL);

  -- ==========================================
  -- 2. DESPESAS HIERÁRQUICAS
  -- ==========================================
  
  -- Alimentação (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Alimentação', '🍽️', 'expense', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Alimentação (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Supermercado', '🛒', 'expense', v_parent_id),
    (NEW.id, 'Restaurante', '🍽️', 'expense', v_parent_id),
    (NEW.id, 'Lanche', '🍔', 'expense', v_parent_id),
    (NEW.id, 'Delivery', '🍕', 'expense', v_parent_id),
    (NEW.id, 'Padaria', '🥖', 'expense', v_parent_id),
    (NEW.id, 'Café', '☕', 'expense', v_parent_id),
    (NEW.id, 'Bar', '🍺', 'expense', v_parent_id),
    (NEW.id, 'Fast Food', '🍟', 'expense', v_parent_id),
    (NEW.id, 'Açougue', '🥩', 'expense', v_parent_id),
    (NEW.id, 'Feira', '🥬', 'expense', v_parent_id);
  
  -- Moradia (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Moradia', '🏠', 'expense', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Moradia (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Aluguel', '🏠', 'expense', v_parent_id),
    (NEW.id, 'Condomínio', '🏢', 'expense', v_parent_id),
    (NEW.id, 'Água', '💧', 'expense', v_parent_id),
    (NEW.id, 'Luz', '💡', 'expense', v_parent_id),
    (NEW.id, 'Gás', '🔥', 'expense', v_parent_id),
    (NEW.id, 'Internet', '🌐', 'expense', v_parent_id),
    (NEW.id, 'Telefone', '📱', 'expense', v_parent_id),
    (NEW.id, 'TV a Cabo', '📺', 'expense', v_parent_id),
    (NEW.id, 'IPTU', '🏘️', 'expense', v_parent_id),
    (NEW.id, 'Manutenção', '🔧', 'expense', v_parent_id),
    (NEW.id, 'Móveis', '🛋️', 'expense', v_parent_id),
    (NEW.id, 'Decoração', '🖼️', 'expense', v_parent_id),
    (NEW.id, 'Eletrodomésticos', '🔌', 'expense', v_parent_id),
    (NEW.id, 'Limpeza', '🧹', 'expense', v_parent_id);
  
  -- Transporte (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Transporte', '🚗', 'expense', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Transporte (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Combustível', '⛽', 'expense', v_parent_id),
    (NEW.id, 'Uber/Taxi', '🚕', 'expense', v_parent_id),
    (NEW.id, 'Ônibus', '🚌', 'expense', v_parent_id),
    (NEW.id, 'Metrô', '🚇', 'expense', v_parent_id),
    (NEW.id, 'Trem', '🚆', 'expense', v_parent_id),
    (NEW.id, 'Estacionamento', '🅿️', 'expense', v_parent_id),
    (NEW.id, 'Pedágio', '🛣️', 'expense', v_parent_id),
    (NEW.id, 'Manutenção Veículo', '🔧', 'expense', v_parent_id),
    (NEW.id, 'Lavagem', '🚿', 'expense', v_parent_id),
    (NEW.id, 'IPVA', '🚗', 'expense', v_parent_id),
    (NEW.id, 'Seguro Veículo', '🛡️', 'expense', v_parent_id),
    (NEW.id, 'Licenciamento', '📋', 'expense', v_parent_id),
    (NEW.id, 'Multas', '🚨', 'expense', v_parent_id),
    (NEW.id, 'Financiamento Veículo', '💳', 'expense', v_parent_id);
  
  -- Saúde (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Saúde', '💊', 'expense', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Saúde (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Plano de Saúde', '🏥', 'expense', v_parent_id),
    (NEW.id, 'Médico', '👨‍⚕️', 'expense', v_parent_id),
    (NEW.id, 'Dentista', '🦷', 'expense', v_parent_id),
    (NEW.id, 'Farmácia', '💊', 'expense', v_parent_id),
    (NEW.id, 'Exames', '🔬', 'expense', v_parent_id),
    (NEW.id, 'Cirurgia', '🏥', 'expense', v_parent_id),
    (NEW.id, 'Fisioterapia', '🧘', 'expense', v_parent_id),
    (NEW.id, 'Terapia', '🧠', 'expense', v_parent_id),
    (NEW.id, 'Psicólogo', '💭', 'expense', v_parent_id),
    (NEW.id, 'Óculos/Lentes', '👓', 'expense', v_parent_id),
    (NEW.id, 'Aparelho Ortodôntico', '😁', 'expense', v_parent_id);
  
  -- Educação (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Educação', '📚', 'expense', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Educação (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Mensalidade Escolar', '🎓', 'expense', v_parent_id),
    (NEW.id, 'Mensalidade Faculdade', '🏫', 'expense', v_parent_id),
    (NEW.id, 'Curso Online', '💻', 'expense', v_parent_id),
    (NEW.id, 'Curso Presencial', '📚', 'expense', v_parent_id),
    (NEW.id, 'Livros', '📖', 'expense', v_parent_id),
    (NEW.id, 'Material Escolar', '✏️', 'expense', v_parent_id),
    (NEW.id, 'Idiomas', '🗣️', 'expense', v_parent_id),
    (NEW.id, 'Certificações', '📜', 'expense', v_parent_id),
    (NEW.id, 'Uniforme', '👔', 'expense', v_parent_id);
  
  -- Lazer (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Lazer', '🎮', 'expense', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Lazer (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Cinema', '🎬', 'expense', v_parent_id),
    (NEW.id, 'Teatro', '🎭', 'expense', v_parent_id),
    (NEW.id, 'Shows', '🎵', 'expense', v_parent_id),
    (NEW.id, 'Eventos', '🎪', 'expense', v_parent_id),
    (NEW.id, 'Parque', '🎡', 'expense', v_parent_id),
    (NEW.id, 'Viagem Lazer', '🏖️', 'expense', v_parent_id),
    (NEW.id, 'Hobbies', '🎨', 'expense', v_parent_id),
    (NEW.id, 'Jogos', '🎮', 'expense', v_parent_id),
    (NEW.id, 'Esportes', '⚽', 'expense', v_parent_id),
    (NEW.id, 'Academia', '💪', 'expense', v_parent_id),
    (NEW.id, 'Clube', '🏊', 'expense', v_parent_id);
  
  -- Streaming e Assinaturas (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Streaming e Assinaturas', '📺', 'expense', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Streaming (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Netflix', '🎬', 'expense', v_parent_id),
    (NEW.id, 'Spotify', '🎵', 'expense', v_parent_id),
    (NEW.id, 'Amazon Prime', '📦', 'expense', v_parent_id),
    (NEW.id, 'Disney+', '🏰', 'expense', v_parent_id),
    (NEW.id, 'HBO Max', '🎭', 'expense', v_parent_id),
    (NEW.id, 'YouTube Premium', '▶️', 'expense', v_parent_id),
    (NEW.id, 'Apple Music', '🍎', 'expense', v_parent_id),
    (NEW.id, 'Revistas/Jornais', '📰', 'expense', v_parent_id),
    (NEW.id, 'Aplicativos', '📱', 'expense', v_parent_id),
    (NEW.id, 'Cloud Storage', '☁️', 'expense', v_parent_id);
  
  -- Compras (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Compras', '🛍️', 'expense', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Compras (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Roupas', '👕', 'expense', v_parent_id),
    (NEW.id, 'Calçados', '👟', 'expense', v_parent_id),
    (NEW.id, 'Acessórios', '👜', 'expense', v_parent_id),
    (NEW.id, 'Joias', '💍', 'expense', v_parent_id),
    (NEW.id, 'Relógios', '⌚', 'expense', v_parent_id),
    (NEW.id, 'Eletrônicos', '📱', 'expense', v_parent_id),
    (NEW.id, 'Informática', '💻', 'expense', v_parent_id),
    (NEW.id, 'Cosméticos', '💄', 'expense', v_parent_id),
    (NEW.id, 'Perfumes', '🌸', 'expense', v_parent_id),
    (NEW.id, 'Presentes', '🎁', 'expense', v_parent_id);
  
  -- Pets (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Pets', '🐾', 'expense', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Pets (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Veterinário', '🐕', 'expense', v_parent_id),
    (NEW.id, 'Ração', '🦴', 'expense', v_parent_id),
    (NEW.id, 'Pet Shop', '🐾', 'expense', v_parent_id),
    (NEW.id, 'Banho e Tosa', '🛁', 'expense', v_parent_id),
    (NEW.id, 'Medicamentos Pet', '💊', 'expense', v_parent_id),
    (NEW.id, 'Brinquedos Pet', '🎾', 'expense', v_parent_id),
    (NEW.id, 'Hotel Pet', '🏨', 'expense', v_parent_id);
  
  -- Cuidados Pessoais (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Cuidados Pessoais', '💇', 'expense', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Cuidados Pessoais (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Cabeleireiro', '💇', 'expense', v_parent_id),
    (NEW.id, 'Barbeiro', '✂️', 'expense', v_parent_id),
    (NEW.id, 'Manicure', '💅', 'expense', v_parent_id),
    (NEW.id, 'Pedicure', '🦶', 'expense', v_parent_id),
    (NEW.id, 'Depilação', '🪒', 'expense', v_parent_id),
    (NEW.id, 'Estética', '✨', 'expense', v_parent_id),
    (NEW.id, 'Spa', '🧖', 'expense', v_parent_id),
    (NEW.id, 'Massagem', '💆', 'expense', v_parent_id);
  
  -- Serviços (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Serviços', '🔧', 'expense', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Serviços (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Lavanderia', '🧺', 'expense', v_parent_id),
    (NEW.id, 'Costureira', '🧵', 'expense', v_parent_id),
    (NEW.id, 'Encanador', '🚰', 'expense', v_parent_id),
    (NEW.id, 'Eletricista', '⚡', 'expense', v_parent_id),
    (NEW.id, 'Pintor', '🎨', 'expense', v_parent_id),
    (NEW.id, 'Marceneiro', '🪚', 'expense', v_parent_id),
    (NEW.id, 'Diarista', '🧹', 'expense', v_parent_id),
    (NEW.id, 'Jardineiro', '🌱', 'expense', v_parent_id),
    (NEW.id, 'Segurança', '🛡️', 'expense', v_parent_id);
  
  -- Financeiro (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Financeiro', '💰', 'expense', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Financeiro (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Investimentos', '📈', 'expense', v_parent_id),
    (NEW.id, 'Previdência Privada', '🏦', 'expense', v_parent_id),
    (NEW.id, 'Seguros', '🛡️', 'expense', v_parent_id),
    (NEW.id, 'Taxas Bancárias', '🏦', 'expense', v_parent_id),
    (NEW.id, 'Empréstimo', '💳', 'expense', v_parent_id),
    (NEW.id, 'Financiamento', '🏠', 'expense', v_parent_id),
    (NEW.id, 'Cartão de Crédito', '💳', 'expense', v_parent_id),
    (NEW.id, 'Doações', '❤️', 'expense', v_parent_id);
  
  -- Viagem (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Viagem', '✈️', 'expense', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Viagem (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Passagem Aérea', '✈️', 'expense', v_parent_id),
    (NEW.id, 'Passagem Rodoviária', '🚌', 'expense', v_parent_id),
    (NEW.id, 'Hotel', '🏨', 'expense', v_parent_id),
    (NEW.id, 'Hospedagem', '🛏️', 'expense', v_parent_id),
    (NEW.id, 'Aluguel de Carro', '🚗', 'expense', v_parent_id),
    (NEW.id, 'Turismo', '🗺️', 'expense', v_parent_id),
    (NEW.id, 'Passeios', '🎢', 'expense', v_parent_id),
    (NEW.id, 'Seguro Viagem', '🛡️', 'expense', v_parent_id),
    (NEW.id, 'Visto', '📋', 'expense', v_parent_id);
  
  -- Impostos e Taxas (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Impostos e Taxas', '📋', 'expense', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Impostos (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'IPTU', '🏘️', 'expense', v_parent_id),
    (NEW.id, 'IPVA', '🚗', 'expense', v_parent_id),
    (NEW.id, 'IR', '💼', 'expense', v_parent_id),
    (NEW.id, 'Taxas Governamentais', '🏛️', 'expense', v_parent_id),
    (NEW.id, 'Multas', '🚨', 'expense', v_parent_id);

  -- ==========================================
  -- 3. RECEITAS HIERÁRQUICAS
  -- ==========================================
  
  -- Trabalho (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Trabalho', '💼', 'income', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Trabalho (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Salário', '💰', 'income', v_parent_id),
    (NEW.id, 'Freelance', '💻', 'income', v_parent_id),
    (NEW.id, 'Bônus', '🎯', 'income', v_parent_id),
    (NEW.id, 'Comissão', '💼', 'income', v_parent_id),
    (NEW.id, '13º Salário', '💵', 'income', v_parent_id),
    (NEW.id, 'Férias', '🏖️', 'income', v_parent_id),
    (NEW.id, 'Hora Extra', '⏰', 'income', v_parent_id),
    (NEW.id, 'PLR', '📊', 'income', v_parent_id),
    (NEW.id, 'Rescisão', '📄', 'income', v_parent_id);
  
  -- Investimentos (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Investimentos', '📈', 'income', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Investimentos (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Dividendos', '📈', 'income', v_parent_id),
    (NEW.id, 'Juros', '💹', 'income', v_parent_id),
    (NEW.id, 'Rendimento Poupança', '🏦', 'income', v_parent_id),
    (NEW.id, 'Rendimento CDB', '📊', 'income', v_parent_id),
    (NEW.id, 'Venda de Ações', '📊', 'income', v_parent_id),
    (NEW.id, 'Criptomoedas', '₿', 'income', v_parent_id),
    (NEW.id, 'Fundos Imobiliários', '🏢', 'income', v_parent_id);
  
  -- Renda Extra (pai)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
  VALUES (NEW.id, 'Renda Extra', '💵', 'income', NULL)
  RETURNING id INTO v_parent_id;
  
  -- Renda Extra (filhos)
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (NEW.id, 'Aluguel Recebido', '🏠', 'income', v_parent_id),
    (NEW.id, 'Venda', '🏷️', 'income', v_parent_id),
    (NEW.id, 'Presente Recebido', '🎁', 'income', v_parent_id),
    (NEW.id, 'Reembolso', '💳', 'income', v_parent_id),
    (NEW.id, 'Prêmio', '🏆', 'income', v_parent_id),
    (NEW.id, 'Cashback', '💰', 'income', v_parent_id),
    (NEW.id, 'Pensão', '👨‍👩‍👧', 'income', v_parent_id),
    (NEW.id, 'Aposentadoria', '👴', 'income', v_parent_id);
    
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro, apenas reporta mas não impede a criação do usuário
  RAISE WARNING 'Erro ao criar categorias padrão: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Criar o trigger na tabela auth.users para executar a função sempre que um usuário for criado
DROP TRIGGER IF EXISTS trigger_create_default_categories ON auth.users;

CREATE TRIGGER trigger_create_default_categories
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_default_categories_for_new_user();

-- =====================================================================
-- BLOCO DE RETROATIVIDADE PARA USUÁRIOS QUE FORAM CRIADOS E NÃO TÊM CATEGORIAS
-- Isso garante que usuários como a 'Fran' recebam todas as categorias.
-- =====================================================================
DO $$
DECLARE
  v_user_record RECORD;
  v_fake_record auth.users%ROWTYPE;
BEGIN
  -- Buscar usuários que têm menos de 5 categorias (provavelmente estão sem o pacote completo)
  FOR v_user_record IN 
    SELECT u.id 
    FROM auth.users u
    LEFT JOIN public.categories c ON u.id = c.user_id
    GROUP BY u.id
    HAVING COUNT(c.id) < 5
  LOOP
    RAISE NOTICE 'Restaurando categorias para o usuário: %', v_user_record.id;
    
    -- Simulamos a trigger manualmente para esse usuário
    v_fake_record.id := v_user_record.id;
    PERFORM public.create_default_categories_for_new_user() 
      FROM (SELECT v_fake_record AS NEW) fake_trigger;
      
  END LOOP;
END $$;
