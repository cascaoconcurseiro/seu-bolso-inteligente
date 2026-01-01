-- Migration: Adicionar categorias de sistema para todos os usuários
-- Data: 31/12/2024
-- Descrição: Adiciona categorias "Saldo Inicial" e "Acerto Financeiro" para todos os usuários existentes

-- Adicionar categoria "Saldo Inicial" (INCOME) para todos os usuários que não têm
INSERT INTO categories (user_id, name, icon, type, color)
SELECT 
  u.id,
  'Saldo Inicial',
  '💰',
  'income',
  NULL
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.user_id = u.id 
  AND c.name = 'Saldo Inicial' 
  AND c.type = 'income'
);

-- Adicionar categoria "Acerto Financeiro" (INCOME) para todos os usuários que não têm
INSERT INTO categories (user_id, name, icon, type, color)
SELECT 
  u.id,
  'Acerto Financeiro',
  '🤝',
  'income',
  NULL
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.user_id = u.id 
  AND c.name = 'Acerto Financeiro' 
  AND c.type = 'income'
);

-- Adicionar categoria "Acerto Financeiro" (EXPENSE) para todos os usuários que não têm
INSERT INTO categories (user_id, name, icon, type, color)
SELECT 
  u.id,
  'Acerto Financeiro',
  '🤝',
  'expense',
  NULL
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.user_id = u.id 
  AND c.name = 'Acerto Financeiro' 
  AND c.type = 'expense'
);

-- Atualizar transações existentes de "Saldo inicial" para usar a categoria correta
UPDATE transactions t
SET category_id = (
  SELECT c.id 
  FROM categories c 
  WHERE c.user_id = t.user_id 
  AND c.name = 'Saldo Inicial' 
  AND c.type = 'income'
  LIMIT 1
)
WHERE t.description = 'Saldo inicial'
  AND t.type = 'INCOME'
  AND t.category_id IS NULL;

-- Atualizar transações existentes de "Pagamento Acerto" para usar a categoria correta
UPDATE transactions t
SET category_id = (
  SELECT c.id 
  FROM categories c 
  WHERE c.user_id = t.user_id 
  AND c.name = 'Acerto Financeiro' 
  AND c.type = 'expense'
  LIMIT 1
)
WHERE t.description LIKE 'Pagamento%Acerto%'
  AND t.type = 'EXPENSE'
  AND t.category_id IS NULL;

-- Atualizar transações existentes de "Recebimento Acerto" para usar a categoria correta
UPDATE transactions t
SET category_id = (
  SELECT c.id 
  FROM categories c 
  WHERE c.user_id = t.user_id 
  AND c.name = 'Acerto Financeiro' 
  AND c.type = 'income'
  LIMIT 1
)
WHERE t.description LIKE 'Recebimento%Acerto%'
  AND t.type = 'INCOME'
  AND t.category_id IS NULL;

-- Comentários
COMMENT ON TABLE categories IS 'Categorias de transações. Inclui categorias de sistema como "Saldo Inicial" e "Acerto Financeiro".';
