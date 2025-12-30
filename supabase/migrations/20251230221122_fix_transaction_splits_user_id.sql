-- 1. Criar função para preencher user_id automaticamente
CREATE OR REPLACE FUNCTION fill_transaction_split_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se user_id não foi preenchido mas member_id foi
  IF NEW.user_id IS NULL AND NEW.member_id IS NOT NULL THEN
    -- Buscar linked_user_id do membro
    SELECT linked_user_id INTO NEW.user_id
    FROM family_members
    WHERE id = NEW.member_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar trigger
DROP TRIGGER IF EXISTS trg_fill_split_user_id ON transaction_splits;
CREATE TRIGGER trg_fill_split_user_id
BEFORE INSERT OR UPDATE ON transaction_splits
FOR EACH ROW
EXECUTE FUNCTION fill_transaction_split_user_id();

-- 3. Corrigir dados existentes
UPDATE transaction_splits ts
SET user_id = fm.linked_user_id
FROM family_members fm
WHERE ts.member_id = fm.id
  AND ts.user_id IS NULL;

-- 4. Verificar resultado
SELECT 
  'Splits corrigidos' as status,
  COUNT(*) as total
FROM transaction_splits
WHERE user_id IS NOT NULL;;
