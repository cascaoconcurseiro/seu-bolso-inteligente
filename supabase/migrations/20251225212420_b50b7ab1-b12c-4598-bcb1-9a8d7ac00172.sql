-- Create shared_transaction_mirrors table to track mirror transactions
CREATE TABLE IF NOT EXISTS public.shared_transaction_mirrors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    mirror_transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    mirror_user_id UUID NOT NULL,
    sync_status TEXT DEFAULT 'SYNCED' CHECK (sync_status IN ('SYNCED', 'PENDING', 'ERROR')),
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(original_transaction_id, mirror_user_id)
);

-- Enable RLS
ALTER TABLE public.shared_transaction_mirrors ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own mirrors"
ON public.shared_transaction_mirrors FOR SELECT
USING (
    mirror_user_id = auth.uid() OR
    original_transaction_id IN (
        SELECT id FROM public.transactions WHERE user_id = auth.uid()
    )
);

-- Add linked_user_id to family_members if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'family_members' 
        AND column_name = 'linked_user_id'
    ) THEN
        ALTER TABLE public.family_members 
        ADD COLUMN linked_user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Function to sync shared transactions and create mirrors
CREATE OR REPLACE FUNCTION public.sync_shared_transaction(p_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_transaction RECORD;
    v_split JSONB;
    v_member_user_id UUID;
    v_mirror_id UUID;
    v_existing_mirror UUID;
    v_payer_name TEXT;
BEGIN
    -- 1. Buscar transação original
    SELECT * INTO v_transaction
    FROM public.transactions
    WHERE id = p_transaction_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- 2. Verificar se é compartilhada
    IF NOT v_transaction.is_shared THEN
        RETURN;
    END IF;
    
    -- Buscar nome do pagador
    SELECT COALESCE(full_name, email) INTO v_payer_name
    FROM public.profiles
    WHERE id = v_transaction.user_id;
    
    -- 3. Processar transaction_splits para criar espelhos
    FOR v_split IN 
        SELECT ts.*, fm.user_id as linked_user_id
        FROM public.transaction_splits ts
        LEFT JOIN public.family_members fm ON fm.id = ts.member_id
        WHERE ts.transaction_id = p_transaction_id
        AND fm.user_id IS NOT NULL
        AND fm.user_id != v_transaction.user_id
    LOOP
        v_member_user_id := v_split.linked_user_id;
        
        -- Verificar se já existe espelho
        SELECT mirror_transaction_id INTO v_existing_mirror
        FROM public.shared_transaction_mirrors
        WHERE original_transaction_id = p_transaction_id
        AND mirror_user_id = v_member_user_id;
        
        IF v_existing_mirror IS NOT NULL THEN
            -- Atualizar espelho existente
            UPDATE public.transactions SET
                amount = v_split.amount,
                description = v_transaction.description || ' (Compartilhado por ' || COALESCE(v_payer_name, 'outro') || ')',
                date = v_transaction.date,
                updated_at = NOW()
            WHERE id = v_existing_mirror;
            
            UPDATE public.shared_transaction_mirrors SET
                sync_status = 'SYNCED',
                last_sync_at = NOW(),
                updated_at = NOW()
            WHERE mirror_transaction_id = v_existing_mirror;
        ELSE
            -- Criar novo espelho
            v_mirror_id := gen_random_uuid();
            
            INSERT INTO public.transactions (
                id,
                user_id,
                amount,
                description,
                date,
                type,
                category_id,
                account_id,
                is_shared,
                payer_id,
                source_transaction_id,
                domain,
                trip_id,
                sync_status
            ) VALUES (
                v_mirror_id,
                v_member_user_id,
                v_split.amount,
                v_transaction.description || ' (Compartilhado por ' || COALESCE(v_payer_name, 'outro') || ')',
                v_transaction.date,
                v_transaction.type,
                v_transaction.category_id,
                NULL,
                true,
                v_transaction.user_id,
                p_transaction_id,
                COALESCE(v_transaction.domain, 'SHARED'),
                v_transaction.trip_id,
                'SYNCED'
            );
            
            -- Registrar espelho
            INSERT INTO public.shared_transaction_mirrors (
                original_transaction_id,
                mirror_transaction_id,
                mirror_user_id,
                sync_status
            ) VALUES (
                p_transaction_id,
                v_mirror_id,
                v_member_user_id,
                'SYNCED'
            );
        END IF;
    END LOOP;
END;
$$;

-- Trigger function for shared transaction sync
CREATE OR REPLACE FUNCTION public.handle_shared_transaction_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_shared = true THEN
        PERFORM public.sync_shared_transaction(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for insert (only if not exists)
DROP TRIGGER IF EXISTS trg_sync_shared_transaction_insert ON public.transactions;
CREATE TRIGGER trg_sync_shared_transaction_insert
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    WHEN (NEW.is_shared = true AND NEW.source_transaction_id IS NULL)
    EXECUTE FUNCTION public.handle_shared_transaction_sync();

-- Create trigger for update (only if not exists)  
DROP TRIGGER IF EXISTS trg_sync_shared_transaction_update ON public.transactions;
CREATE TRIGGER trg_sync_shared_transaction_update
    AFTER UPDATE ON public.transactions
    FOR EACH ROW
    WHEN (NEW.is_shared = true AND NEW.source_transaction_id IS NULL)
    EXECUTE FUNCTION public.handle_shared_transaction_sync();

-- Function to block mirror transaction deletion
CREATE OR REPLACE FUNCTION public.block_mirror_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.source_transaction_id IS NOT NULL THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Não é permitido excluir transações espelho diretamente';
        END IF;
        
        -- Allow only is_settled updates on mirrors
        IF TG_OP = 'UPDATE' THEN
            IF OLD.amount != NEW.amount OR 
               OLD.description != NEW.description OR
               OLD.date != NEW.date THEN
                RAISE EXCEPTION 'Não é permitido modificar transações espelho diretamente';
            END IF;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;