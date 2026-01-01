-- =====================================================
-- MIGRATION: Adicionar Categorias Hierárquicas para Usuários Existentes
-- Data: 01/01/2026
-- Descrição: Adiciona as novas categorias hierárquicas para todos os usuários existentes
-- =====================================================

-- Esta migration adiciona as categorias hierárquicas para usuários que já existiam
-- antes da implementação do sistema de hierarquia

DO $$
DECLARE
  v_user_id UUID;
  v_parent_id UUID;
BEGIN
  -- Para cada usuário existente
  FOR v_user_id IN SELECT id FROM auth.users LOOP
    
    -- Verificar se usuário já tem muitas categorias (mais de 50)
    -- Se sim, provavelmente já tem as novas categorias
    IF (SELECT COUNT(*) FROM categories WHERE user_id = v_user_id) > 50 THEN
      CONTINUE;
    END IF;
    
    RAISE NOTICE 'Adicionando categorias para usuário: %', v_user_id;
    
    -- ========== DESPESAS ==========
    
    -- Alimentação (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Alimentação', '🍽️', 'expense', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Alimentação (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Supermercado', '🛒', 'expense', v_parent_id),
      (v_user_id, 'Restaurante', '🍽️', 'expense', v_parent_id),
      (v_user_id, 'Lanche', '🍔', 'expense', v_parent_id),
      (v_user_id, 'Delivery', '🍕', 'expense', v_parent_id),
      (v_user_id, 'Padaria', '🥖', 'expense', v_parent_id),
      (v_user_id, 'Café', '☕', 'expense', v_parent_id),
      (v_user_id, 'Bar', '🍺', 'expense', v_parent_id),
      (v_user_id, 'Fast Food', '🍟', 'expense', v_parent_id),
      (v_user_id, 'Açougue', '🥩', 'expense', v_parent_id),
      (v_user_id, 'Feira', '🥬', 'expense', v_parent_id);
    
    -- Moradia (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Moradia', '🏠', 'expense', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Moradia (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Aluguel', '🏠', 'expense', v_parent_id),
      (v_user_id, 'Condomínio', '🏢', 'expense', v_parent_id),
      (v_user_id, 'Água', '💧', 'expense', v_parent_id),
      (v_user_id, 'Luz', '💡', 'expense', v_parent_id),
      (v_user_id, 'Gás', '🔥', 'expense', v_parent_id),
      (v_user_id, 'Internet', '🌐', 'expense', v_parent_id),
      (v_user_id, 'Telefone', '📱', 'expense', v_parent_id),
      (v_user_id, 'TV a Cabo', '📺', 'expense', v_parent_id),
      (v_user_id, 'IPTU', '🏘️', 'expense', v_parent_id),
      (v_user_id, 'Manutenção', '🔧', 'expense', v_parent_id),
      (v_user_id, 'Móveis', '🛋️', 'expense', v_parent_id),
      (v_user_id, 'Decoração', '🖼️', 'expense', v_parent_id),
      (v_user_id, 'Eletrodomésticos', '🔌', 'expense', v_parent_id),
      (v_user_id, 'Limpeza', '🧹', 'expense', v_parent_id);
    
    -- Transporte (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Transporte', '🚗', 'expense', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Transporte (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Combustível', '⛽', 'expense', v_parent_id),
      (v_user_id, 'Uber/Taxi', '🚕', 'expense', v_parent_id),
      (v_user_id, 'Ônibus', '🚌', 'expense', v_parent_id),
      (v_user_id, 'Metrô', '🚇', 'expense', v_parent_id),
      (v_user_id, 'Trem', '🚆', 'expense', v_parent_id),
      (v_user_id, 'Estacionamento', '🅿️', 'expense', v_parent_id),
      (v_user_id, 'Pedágio', '🛣️', 'expense', v_parent_id),
      (v_user_id, 'Manutenção Veículo', '🔧', 'expense', v_parent_id),
      (v_user_id, 'Lavagem', '🚿', 'expense', v_parent_id),
      (v_user_id, 'IPVA', '🚗', 'expense', v_parent_id),
      (v_user_id, 'Seguro Veículo', '🛡️', 'expense', v_parent_id),
      (v_user_id, 'Licenciamento', '📋', 'expense', v_parent_id),
      (v_user_id, 'Multas', '🚨', 'expense', v_parent_id),
      (v_user_id, 'Financiamento Veículo', '💳', 'expense', v_parent_id);
    
    -- Saúde (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Saúde', '💊', 'expense', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Saúde (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Plano de Saúde', '🏥', 'expense', v_parent_id),
      (v_user_id, 'Médico', '👨‍⚕️', 'expense', v_parent_id),
      (v_user_id, 'Dentista', '🦷', 'expense', v_parent_id),
      (v_user_id, 'Farmácia', '💊', 'expense', v_parent_id),
      (v_user_id, 'Exames', '🔬', 'expense', v_parent_id),
      (v_user_id, 'Cirurgia', '🏥', 'expense', v_parent_id),
      (v_user_id, 'Fisioterapia', '🧘', 'expense', v_parent_id),
      (v_user_id, 'Terapia', '🧠', 'expense', v_parent_id),
      (v_user_id, 'Psicólogo', '💭', 'expense', v_parent_id),
      (v_user_id, 'Óculos/Lentes', '👓', 'expense', v_parent_id),
      (v_user_id, 'Aparelho Ortodôntico', '😁', 'expense', v_parent_id);
    
    -- Educação (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Educação', '📚', 'expense', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Educação (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Mensalidade Escolar', '🎓', 'expense', v_parent_id),
      (v_user_id, 'Mensalidade Faculdade', '🏫', 'expense', v_parent_id),
      (v_user_id, 'Curso Online', '💻', 'expense', v_parent_id),
      (v_user_id, 'Curso Presencial', '📚', 'expense', v_parent_id),
      (v_user_id, 'Livros', '📖', 'expense', v_parent_id),
      (v_user_id, 'Material Escolar', '✏️', 'expense', v_parent_id),
      (v_user_id, 'Idiomas', '🗣️', 'expense', v_parent_id),
      (v_user_id, 'Certificações', '📜', 'expense', v_parent_id),
      (v_user_id, 'Uniforme', '👔', 'expense', v_parent_id);
    
    -- Lazer (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Lazer', '🎮', 'expense', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Lazer (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Cinema', '🎬', 'expense', v_parent_id),
      (v_user_id, 'Teatro', '🎭', 'expense', v_parent_id),
      (v_user_id, 'Shows', '🎵', 'expense', v_parent_id),
      (v_user_id, 'Eventos', '🎪', 'expense', v_parent_id),
      (v_user_id, 'Parque', '🎡', 'expense', v_parent_id),
      (v_user_id, 'Viagem Lazer', '🏖️', 'expense', v_parent_id),
      (v_user_id, 'Hobbies', '🎨', 'expense', v_parent_id),
      (v_user_id, 'Jogos', '🎮', 'expense', v_parent_id),
      (v_user_id, 'Esportes', '⚽', 'expense', v_parent_id),
      (v_user_id, 'Academia', '💪', 'expense', v_parent_id),
      (v_user_id, 'Clube', '🏊', 'expense', v_parent_id);
    
    -- Streaming e Assinaturas (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Streaming e Assinaturas', '📺', 'expense', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Streaming (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Netflix', '🎬', 'expense', v_parent_id),
      (v_user_id, 'Spotify', '🎵', 'expense', v_parent_id),
      (v_user_id, 'Amazon Prime', '📦', 'expense', v_parent_id),
      (v_user_id, 'Disney+', '🏰', 'expense', v_parent_id),
      (v_user_id, 'HBO Max', '🎭', 'expense', v_parent_id),
      (v_user_id, 'YouTube Premium', '▶️', 'expense', v_parent_id),
      (v_user_id, 'Apple Music', '🍎', 'expense', v_parent_id),
      (v_user_id, 'Revistas/Jornais', '📰', 'expense', v_parent_id),
      (v_user_id, 'Aplicativos', '📱', 'expense', v_parent_id),
      (v_user_id, 'Cloud Storage', '☁️', 'expense', v_parent_id);
    
    -- Compras (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Compras', '🛍️', 'expense', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Compras (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Roupas', '👕', 'expense', v_parent_id),
      (v_user_id, 'Calçados', '👟', 'expense', v_parent_id),
      (v_user_id, 'Acessórios', '👜', 'expense', v_parent_id),
      (v_user_id, 'Joias', '💍', 'expense', v_parent_id),
      (v_user_id, 'Relógios', '⌚', 'expense', v_parent_id),
      (v_user_id, 'Eletrônicos', '📱', 'expense', v_parent_id),
      (v_user_id, 'Informática', '💻', 'expense', v_parent_id),
      (v_user_id, 'Cosméticos', '💄', 'expense', v_parent_id),
      (v_user_id, 'Perfumes', '🌸', 'expense', v_parent_id),
      (v_user_id, 'Presentes', '🎁', 'expense', v_parent_id);
    
    -- Pets (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Pets', '🐾', 'expense', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Pets (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Veterinário', '🐕', 'expense', v_parent_id),
      (v_user_id, 'Ração', '🦴', 'expense', v_parent_id),
      (v_user_id, 'Pet Shop', '🐾', 'expense', v_parent_id),
      (v_user_id, 'Banho e Tosa', '🛁', 'expense', v_parent_id),
      (v_user_id, 'Medicamentos Pet', '💊', 'expense', v_parent_id),
      (v_user_id, 'Brinquedos Pet', '🎾', 'expense', v_parent_id),
      (v_user_id, 'Hotel Pet', '🏨', 'expense', v_parent_id);
    
    -- Cuidados Pessoais (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Cuidados Pessoais', '💇', 'expense', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Cuidados Pessoais (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Cabeleireiro', '💇', 'expense', v_parent_id),
      (v_user_id, 'Barbeiro', '✂️', 'expense', v_parent_id),
      (v_user_id, 'Manicure', '💅', 'expense', v_parent_id),
      (v_user_id, 'Pedicure', '🦶', 'expense', v_parent_id),
      (v_user_id, 'Depilação', '🪒', 'expense', v_parent_id),
      (v_user_id, 'Estética', '✨', 'expense', v_parent_id),
      (v_user_id, 'Spa', '🧖', 'expense', v_parent_id),
      (v_user_id, 'Massagem', '💆', 'expense', v_parent_id);
    
    -- Serviços (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Serviços', '🔧', 'expense', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Serviços (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Lavanderia', '🧺', 'expense', v_parent_id),
      (v_user_id, 'Costureira', '🧵', 'expense', v_parent_id),
      (v_user_id, 'Encanador', '🚰', 'expense', v_parent_id),
      (v_user_id, 'Eletricista', '⚡', 'expense', v_parent_id),
      (v_user_id, 'Pintor', '🎨', 'expense', v_parent_id),
      (v_user_id, 'Marceneiro', '🪚', 'expense', v_parent_id),
      (v_user_id, 'Diarista', '🧹', 'expense', v_parent_id),
      (v_user_id, 'Jardineiro', '🌱', 'expense', v_parent_id),
      (v_user_id, 'Segurança', '🛡️', 'expense', v_parent_id);
    
    -- Financeiro (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Financeiro', '💰', 'expense', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Financeiro (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Investimentos', '📈', 'expense', v_parent_id),
      (v_user_id, 'Previdência Privada', '🏦', 'expense', v_parent_id),
      (v_user_id, 'Seguros', '🛡️', 'expense', v_parent_id),
      (v_user_id, 'Taxas Bancárias', '🏦', 'expense', v_parent_id),
      (v_user_id, 'Empréstimo', '💳', 'expense', v_parent_id),
      (v_user_id, 'Financiamento', '🏠', 'expense', v_parent_id),
      (v_user_id, 'Cartão de Crédito', '💳', 'expense', v_parent_id),
      (v_user_id, 'Doações', '❤️', 'expense', v_parent_id);
    
    -- Viagem (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Viagem', '✈️', 'expense', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Viagem (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Passagem Aérea', '✈️', 'expense', v_parent_id),
      (v_user_id, 'Passagem Rodoviária', '🚌', 'expense', v_parent_id),
      (v_user_id, 'Hotel', '🏨', 'expense', v_parent_id),
      (v_user_id, 'Hospedagem', '🛏️', 'expense', v_parent_id),
      (v_user_id, 'Aluguel de Carro', '🚗', 'expense', v_parent_id),
      (v_user_id, 'Turismo', '🗺️', 'expense', v_parent_id),
      (v_user_id, 'Passeios', '🎢', 'expense', v_parent_id),
      (v_user_id, 'Seguro Viagem', '🛡️', 'expense', v_parent_id),
      (v_user_id, 'Visto', '📋', 'expense', v_parent_id);
    
    -- Impostos e Taxas (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Impostos e Taxas', '📋', 'expense', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Impostos (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'IPTU', '🏘️', 'expense', v_parent_id),
      (v_user_id, 'IPVA', '🚗', 'expense', v_parent_id),
      (v_user_id, 'IR', '💼', 'expense', v_parent_id),
      (v_user_id, 'Taxas Governamentais', '🏛️', 'expense', v_parent_id),
      (v_user_id, 'Multas', '🚨', 'expense', v_parent_id);
    
    -- ========== RECEITAS ==========
    
    -- Trabalho (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Trabalho', '💼', 'income', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Trabalho (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Salário', '💰', 'income', v_parent_id),
      (v_user_id, 'Freelance', '💻', 'income', v_parent_id),
      (v_user_id, 'Bônus', '🎯', 'income', v_parent_id),
      (v_user_id, 'Comissão', '💼', 'income', v_parent_id),
      (v_user_id, '13º Salário', '💵', 'income', v_parent_id),
      (v_user_id, 'Férias', '🏖️', 'income', v_parent_id),
      (v_user_id, 'Hora Extra', '⏰', 'income', v_parent_id),
      (v_user_id, 'PLR', '📊', 'income', v_parent_id),
      (v_user_id, 'Rescisão', '📄', 'income', v_parent_id);
    
    -- Investimentos (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Investimentos', '📈', 'income', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Investimentos (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Dividendos', '📈', 'income', v_parent_id),
      (v_user_id, 'Juros', '💹', 'income', v_parent_id),
      (v_user_id, 'Rendimento Poupança', '🏦', 'income', v_parent_id),
      (v_user_id, 'Rendimento CDB', '📊', 'income', v_parent_id),
      (v_user_id, 'Venda de Ações', '📊', 'income', v_parent_id),
      (v_user_id, 'Criptomoedas', '₿', 'income', v_parent_id),
      (v_user_id, 'Fundos Imobiliários', '🏢', 'income', v_parent_id);
    
    -- Renda Extra (pai)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id)
    VALUES (v_user_id, 'Renda Extra', '💵', 'income', NULL)
    RETURNING id INTO v_parent_id;
    
    -- Renda Extra (filhos)
    INSERT INTO categories (user_id, name, icon, type, parent_category_id) VALUES
      (v_user_id, 'Aluguel Recebido', '🏠', 'income', v_parent_id),
      (v_user_id, 'Venda', '🏷️', 'income', v_parent_id),
      (v_user_id, 'Presente Recebido', '🎁', 'income', v_parent_id),
      (v_user_id, 'Reembolso', '💳', 'income', v_parent_id),
      (v_user_id, 'Prêmio', '🏆', 'income', v_parent_id),
      (v_user_id, 'Cashback', '💰', 'income', v_parent_id),
      (v_user_id, 'Pensão', '👨‍👩‍👧', 'income', v_parent_id),
      (v_user_id, 'Aposentadoria', '👴', 'income', v_parent_id);
    
    RAISE NOTICE 'Categorias adicionadas com sucesso para usuário: %', v_user_id;
    
  END LOOP;
END $$;
