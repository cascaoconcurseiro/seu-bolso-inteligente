-- =====================================================
-- 🚀 SUPER FIX COMPLETO - TRANSAÇÕES COMPARTILHADAS
-- =====================================================

-- PARTE 1: CORRIGIR TRIGGER DE NOVOS USUÁRIOS
-- =====================================================

-- Remover trigger antigo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recriar função
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  extracted_name text;
BEGIN
  -- Tentar extrair nome do metadata
  extracted_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name'
  );
  
  -- Se não encontrou, usar parte do email
  IF extracted_name IS NULL OR extracted_name = '' THEN
    extracted_name := INITCAP(SPLIT_PART(NEW.email, '@', 1));
  END IF;
  
  -- Criar profile
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    extracted_name,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name, extracted_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- PARTE 2: CONFIGURAR SISTEMA DE ESPELHAMENTO
-- =====================================================

-- Remover triggers antigos
DROP TRIGGER IF EXISTS trigger_create_mirrors_on_insert ON transaction_splits;
DROP TRIGGER IF EXISTS trigger_create_mirrors_on_update ON transaction_splits;
DROP TRIGGER IF EXISTS on_transaction_split_created ON transaction_splits;
DROP TRIGGER IF EXISTS on_transaction_split_updated ON transaction_splits;

-- Remover funções antigas
DROP FUNCTION IF EXISTS create_transaction_mirrors() CASCADE;
DROP FUNCTION IF EXISTS handle_transaction_split() CASCADE;

-- Criar função de espelhamento SIMPLIFICADA
CREATE OR REPLACE FUNCTION create_transaction_mirrors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  original_transaction transactions%ROWTYPE;
  member_record family_members%ROWTYPE;
  member_user_id uuid;
BEGIN
  -- Buscar transação original
  SELECT * INTO original_transaction
  FROM transactions
  WHERE id = NEW.transaction_id;
  
  -- Se não é compartilhada, não fazer nada
  IF NOT original_transaction.is_shared THEN
    RETURN NEW;
  END IF;
  
  -- Buscar membro da família
  SELECT * INTO member_record
  FROM family_members
  WHERE id = NEW.member_id;
  
  -- Determinar user_id do membro
  member_user_id := COALESCE(member_record.user_id, member_record.linked_user_id);
  
  -- Se membro não tem user_id, não criar espelho
  IF member_user_id IS NULL THEN
    RAISE NOTICE 'Membro % não tem user_id vinculado', NEW.member_id;
    RETURN NEW;
  END IF;
  
  -- Se o membro é o próprio criador, não criar espelho
  IF member_user_id = original_transaction.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se espelho já existe
  IF EXISTS (
    SELECT 1 FROM transactions
    WHERE source_transaction_id = NEW.transaction_id
    AND user_id = member_user_id
  ) THEN
    RAISE NOTICE 'Espelho já existe para transação % e usuário %', NEW.transaction_id, member_user_id;
    RETURN NEW;
  END IF;
  
  -- Criar transação espelhada
  INSERT INTO transactions (
    user_id,
    account_id,
    category_id,
    trip_id,
    amount,
    description,
    date,
    type,
    domain,
    is_shared,
    payer_id,
    source_transaction_id,
    is_installment,
    current_installment,
    total_installments,
    series_id,
    notes,
    created_at,
    updated_at
  ) VALUES (
    member_user_id,                           -- user_id do membro
    NULL,                                      -- account_id (espelho não tem conta)
    original_transaction.category_id,
    original_transaction.trip_id,
    NEW.amount,                                -- valor do split
    original_transaction.description,
    original_transaction.date,
    original_transaction.type,
    original_transaction.domain,
    true,                                      -- is_shared
    original_transaction.user_id,              -- payer_id (quem pagou)
    NEW.transaction_id,                        -- source_transaction_id
    original_transaction.is_installment,
    original_transaction.current_installment,
    original_transaction.total_installments,
    original_transaction.series_id,
    'Espelho de transação compartilhada',
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Espelho criado: transação % para usuário %', NEW.transaction_id, member_user_id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para INSERT
CREATE TRIGGER trigger_create_mirrors_on_insert
  AFTER INSERT ON transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION create_transaction_mirrors();

-- Criar trigger para UPDATE
CREATE TRIGGER trigger_create_mirrors_on_update
  AFTER UPDATE ON transaction_splits
  FOR EACH ROW
  WHEN (OLD.amount IS DISTINCT FROM NEW.amount OR OLD.member_id IS DISTINCT FROM NEW.member_id)
  EXECUTE FUNCTION create_transaction_mirrors();;
