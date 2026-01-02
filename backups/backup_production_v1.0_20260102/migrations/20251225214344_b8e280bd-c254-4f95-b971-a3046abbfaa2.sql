
-- ============================================
-- COMPLEMENTOS CRÍTICOS DO SISTEMA DE COMPARTILHAMENTO
-- ============================================

-- ============================================
-- 1️⃣ REGRA DE PROPRIEDADE DA DESPESA
-- ============================================
-- Adicionar coluna para rastrear o criador original
-- (já existe payer_id, mas vamos criar uma coluna mais clara)

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS creator_user_id UUID REFERENCES auth.users(id);

-- Preencher creator_user_id para transações existentes
UPDATE public.transactions 
SET creator_user_id = CASE 
    WHEN source_transaction_id IS NULL THEN user_id  -- Original: criador é o próprio user
    ELSE payer_id  -- Espelho: criador é quem pagou (payer_id)
END
WHERE creator_user_id IS NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.transactions.creator_user_id IS 
'ID do usuário que criou/lançou a despesa original. Mantém autoria mesmo em espelhos.';

-- ============================================
-- 2️⃣ REGRA DE EDIÇÃO / EXCLUSÃO (MELHORADA)
-- ============================================

-- Melhorar sync_mirror_on_update para sincronizar mais campos
CREATE OR REPLACE FUNCTION public.sync_mirror_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_payer_name TEXT;
BEGIN
    -- Se não é transação compartilhada, ignora
    IF NOT NEW.is_shared THEN
        RETURN NEW;
    END IF;
    
    -- Buscar nome do criador
    SELECT COALESCE(full_name, email) INTO v_payer_name
    FROM public.profiles WHERE id = NEW.user_id;
    
    -- Atualizar espelhos diretos
    UPDATE public.transactions
    SET
        amount = NEW.amount,
        description = NEW.description || ' (Compartilhado por ' || COALESCE(v_payer_name, 'outro') || ')',
        date = NEW.date,
        type = NEW.type,
        category_id = NEW.category_id,
        trip_id = NEW.trip_id,
        notes = NEW.notes,
        updated_at = NOW()
    WHERE source_transaction_id = NEW.id;
    
    -- Se houve mudança em transaction_splits, re-sincronizar
    IF NEW.is_shared = true AND OLD.is_shared = true THEN
        PERFORM public.sync_shared_transaction(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Melhorar delete_mirror_on_delete para limpar tabela de controle
CREATE OR REPLACE FUNCTION public.delete_mirror_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Primeiro, remover registros de controle
    DELETE FROM public.shared_transaction_mirrors
    WHERE original_transaction_id = OLD.id;
    
    -- Depois, excluir os espelhos
    DELETE FROM public.transactions
    WHERE source_transaction_id = OLD.id;
    
    RETURN OLD;
END;
$function$;

-- Melhorar block_mirror_modification para permitir is_settled
CREATE OR REPLACE FUNCTION public.block_mirror_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Se é uma transação espelho (source_transaction_id IS NOT NULL)
    IF OLD.source_transaction_id IS NOT NULL THEN
        IF TG_OP = 'DELETE' THEN
            -- Verificar se está sendo chamado pelo trigger de cascata
            -- Se o contexto não é do trigger, bloqueia
            IF current_setting('app.cascade_delete', true) IS NULL THEN
                RAISE EXCEPTION 'Não é permitido excluir transações espelho diretamente. Exclua a transação original.';
            END IF;
        END IF;
        
        IF TG_OP = 'UPDATE' THEN
            -- Permitir apenas alterações em is_settled, is_recurring, notes
            IF OLD.amount != NEW.amount OR 
               OLD.date != NEW.date OR
               OLD.type != NEW.type OR
               OLD.trip_id IS DISTINCT FROM NEW.trip_id THEN
                -- Verificar se está sendo chamado pelo trigger de sync
                IF current_setting('app.sync_update', true) IS NULL THEN
                    RAISE EXCEPTION 'Não é permitido modificar transações espelho. Edite a transação original.';
                END IF;
            END IF;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$function$;

-- ============================================
-- 3️⃣ REGRA PARA PARCELAMENTOS
-- ============================================

-- Função para criar espelhos de parcelas
CREATE OR REPLACE FUNCTION public.sync_installment_mirrors()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Se é uma parcela de série compartilhada
    IF NEW.is_shared = true AND NEW.series_id IS NOT NULL AND NEW.is_installment = true THEN
        -- Sincronizar esta parcela específica
        PERFORM public.sync_shared_transaction(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Trigger para parcelas
DROP TRIGGER IF EXISTS trg_sync_installment_mirrors ON public.transactions;
CREATE TRIGGER trg_sync_installment_mirrors
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    WHEN (NEW.is_installment = true AND NEW.is_shared = true AND NEW.source_transaction_id IS NULL)
    EXECUTE FUNCTION sync_installment_mirrors();

-- ============================================
-- 4️⃣ REGRA DE VISIBILIDADE (VIEW PARA DASHBOARD)
-- ============================================

-- View para despesas compartilhadas sem duplicação
CREATE OR REPLACE VIEW public.v_shared_expenses AS
SELECT 
    t.id,
    t.user_id,
    t.amount,
    t.description,
    t.date,
    t.type,
    t.category_id,
    t.is_shared,
    t.is_installment,
    t.current_installment,
    t.total_installments,
    t.series_id,
    t.trip_id,
    t.is_settled,
    t.created_at,
    t.updated_at,
    -- Indicadores de origem
    CASE 
        WHEN t.source_transaction_id IS NULL THEN 'ORIGINAL'
        ELSE 'MIRROR'
    END as transaction_origin,
    -- Quem lançou originalmente
    COALESCE(t.creator_user_id, t.payer_id, t.user_id) as original_creator_id,
    -- Para espelhos: quem é o credor
    CASE 
        WHEN t.source_transaction_id IS NOT NULL THEN t.payer_id
        ELSE t.user_id
    END as creditor_user_id,
    -- Se eu sou devedor ou credor
    t.source_transaction_id
FROM public.transactions t
WHERE t.is_shared = true;

-- ============================================
-- 5️⃣ REGRA DE SEGURANÇA / RLS
-- ============================================

-- Função helper para verificar vínculo familiar
CREATE OR REPLACE FUNCTION public.has_family_link(p_user_id uuid, p_other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
SELECT EXISTS (
    -- Verificar se ambos estão na mesma família
    SELECT 1
    FROM public.families f
    JOIN public.family_members fm ON fm.family_id = f.id
    WHERE (
        -- p_user_id é dono e p_other_user_id é membro vinculado
        (f.owner_id = p_user_id AND fm.linked_user_id = p_other_user_id)
        OR
        -- p_other_user_id é dono e p_user_id é membro vinculado
        (f.owner_id = p_other_user_id AND fm.linked_user_id = p_user_id)
        OR
        -- Ambos são membros vinculados da mesma família
        (fm.linked_user_id = p_user_id AND EXISTS (
            SELECT 1 FROM public.family_members fm2 
            WHERE fm2.family_id = f.id AND fm2.linked_user_id = p_other_user_id
        ))
    )
);
$function$;

-- Atualizar política de SELECT para incluir transações compartilhadas via vínculo
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT
    USING (
        user_id = auth.uid()
    );

-- Política para visualizar espelhos (já deve funcionar via user_id)
-- Mas vamos garantir que não há acesso indevido
DROP POLICY IF EXISTS "Users cannot view others transactions" ON public.transactions;

-- ============================================
-- 6️⃣ FUNÇÃO DE CÁLCULO DE SALDO ATUALIZADA
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_balance_with_member(
    p_user_id uuid,
    p_member_id uuid
)
RETURNS TABLE(
    credits numeric,
    debits numeric,
    net numeric,
    pending_items bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_linked_user_id UUID;
    v_credits numeric := 0;
    v_debits numeric := 0;
    v_pending bigint := 0;
BEGIN
    -- Buscar linked_user_id do membro
    SELECT fm.linked_user_id INTO v_linked_user_id
    FROM public.family_members fm
    WHERE fm.id = p_member_id;
    
    -- CRÉDITOS: Transações onde EU paguei e o MEMBRO deve
    SELECT COALESCE(SUM(ts.amount), 0), COUNT(*)
    INTO v_credits, v_pending
    FROM public.transactions t
    JOIN public.transaction_splits ts ON ts.transaction_id = t.id
    WHERE t.user_id = p_user_id
    AND t.is_shared = true
    AND t.source_transaction_id IS NULL
    AND ts.member_id = p_member_id
    AND ts.is_settled = false;
    
    -- DÉBITOS: Se o membro tem linked_user_id, buscar espelhos
    IF v_linked_user_id IS NOT NULL THEN
        SELECT v_debits + COALESCE(SUM(t.amount), 0)
        INTO v_debits
        FROM public.transactions t
        WHERE t.user_id = p_user_id
        AND t.payer_id = v_linked_user_id
        AND t.is_shared = true
        AND t.source_transaction_id IS NOT NULL
        AND t.is_settled = false;
    END IF;
    
    RETURN QUERY SELECT v_credits, v_debits, (v_credits - v_debits), v_pending;
END;
$function$;

-- ============================================
-- 7️⃣ ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transactions_shared ON public.transactions(is_shared) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_transactions_source ON public.transactions(source_transaction_id) WHERE source_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_payer ON public.transactions(payer_id) WHERE payer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_series ON public.transactions(series_id) WHERE series_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_family_members_linked ON public.family_members(linked_user_id) WHERE linked_user_id IS NOT NULL;
