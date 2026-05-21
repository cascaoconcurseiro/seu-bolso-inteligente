-- =============================================================================
-- Migration: add_international_categories
-- Data: 2026-05-20
-- Descrição: Adiciona categorias de sistema para transações internacionais:
--   - Transferência Internacional (expense/income)
--   - Remessa Internacional (expense/income)
--   - Conversão Cambial (expense/income)
-- =============================================================================

-- Transferência Internacional
INSERT INTO categories (user_id, name, icon, type, color)
SELECT u.id, 'Transferência Internacional', '🌍', 'expense', NULL
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Transferência Internacional' AND c.type = 'expense'
);

INSERT INTO categories (user_id, name, icon, type, color)
SELECT u.id, 'Transferência Internacional', '🌍', 'income', NULL
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Transferência Internacional' AND c.type = 'income'
);

-- Remessa Internacional
INSERT INTO categories (user_id, name, icon, type, color)
SELECT u.id, 'Remessa Internacional', '📤', 'expense', NULL
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Remessa Internacional' AND c.type = 'expense'
);

INSERT INTO categories (user_id, name, icon, type, color)
SELECT u.id, 'Remessa Internacional', '📤', 'income', NULL
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Remessa Internacional' AND c.type = 'income'
);

-- Conversão Cambial
INSERT INTO categories (user_id, name, icon, type, color)
SELECT u.id, 'Conversão Cambial', '💱', 'expense', NULL
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Conversão Cambial' AND c.type = 'expense'
);

INSERT INTO categories (user_id, name, icon, type, color)
SELECT u.id, 'Conversão Cambial', '💱', 'income', NULL
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Conversão Cambial' AND c.type = 'income'
);
