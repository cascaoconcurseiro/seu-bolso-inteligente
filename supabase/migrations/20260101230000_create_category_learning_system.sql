-- =====================================================
-- MIGRATION: Sistema de Aprendizado de Categorias
-- Data: 01/01/2026
-- Descrição: Cria tabelas para categorização automática com IA
-- =====================================================

-- Tabela para armazenar palavras-chave padrão por categoria
CREATE TABLE IF NOT EXISTS category_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  weight INTEGER DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_category_keywords_category ON category_keywords(category_id);
CREATE INDEX IF NOT EXISTS idx_category_keywords_keyword ON category_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_category_keywords_weight ON category_keywords(weight DESC);

-- Tabela para aprendizado personalizado do usuário
CREATE TABLE IF NOT EXISTS user_category_learning (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description_pattern TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  confidence DECIMAL(3,2) DEFAULT 0.70 CHECK (confidence >= 0 AND confidence <= 1),
  times_used INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_learning_user ON user_category_learning(user_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_pattern ON user_category_learning(description_pattern);
CREATE INDEX IF NOT EXISTS idx_user_learning_category ON user_category_learning(category_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_confidence ON user_category_learning(confidence DESC);

-- RLS Policies
ALTER TABLE category_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_category_learning ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ler keywords (são públicas)
CREATE POLICY "Anyone can read category keywords"
  ON category_keywords FOR SELECT
  USING (true);

-- Policy: Usuários podem ler apenas seu próprio aprendizado
CREATE POLICY "Users can read own learning"
  ON user_category_learning FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Usuários podem inserir seu próprio aprendizado
CREATE POLICY "Users can insert own learning"
  ON user_category_learning FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem atualizar seu próprio aprendizado
CREATE POLICY "Users can update own learning"
  ON user_category_learning FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Usuários podem deletar seu próprio aprendizado
CREATE POLICY "Users can delete own learning"
  ON user_category_learning FOR DELETE
  USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_category_keywords_updated_at
  BEFORE UPDATE ON category_keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_category_learning_updated_at
  BEFORE UPDATE ON user_category_learning
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE category_keywords IS 'Palavras-chave padrão para categorização automática';
COMMENT ON TABLE user_category_learning IS 'Aprendizado personalizado de categorização por usuário';
COMMENT ON COLUMN category_keywords.weight IS 'Peso da palavra-chave (1-10), maior = mais relevante';
COMMENT ON COLUMN user_category_learning.confidence IS 'Confiança da associação (0.0-1.0)';
COMMENT ON COLUMN user_category_learning.times_used IS 'Quantas vezes o usuário usou esta associação';
