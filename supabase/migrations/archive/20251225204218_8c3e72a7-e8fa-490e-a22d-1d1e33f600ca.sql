-- ========================================
-- TRIGGER PARA CRIAR ESPELHO EM TRANSFERÊNCIAS
-- ========================================

CREATE OR REPLACE FUNCTION public.create_transfer_mirror()
RETURNS TRIGGER AS $$
BEGIN
    -- Se é transferência E tem conta destino
    IF NEW.type = 'TRANSFER' AND NEW.destination_account_id IS NOT NULL THEN
        -- Cria transação espelho na conta destino
        INSERT INTO public.transactions (
            user_id,
            amount,
            description,
            date,
            type,
            account_id,
            source_transaction_id,
            domain,
            sync_status,
            is_shared,
            is_installment,
            is_recurring
        ) VALUES (
            NEW.user_id,
            NEW.amount,
            NEW.description,
            NEW.date,
            'TRANSFER',
            NEW.destination_account_id,
            NEW.id,
            NEW.domain,
            'SYNCED',
            false,
            false,
            false
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Cria trigger para espelho em transferências
DROP TRIGGER IF EXISTS create_mirror_on_transfer ON public.transactions;
CREATE TRIGGER create_mirror_on_transfer
AFTER INSERT ON public.transactions
FOR EACH ROW
WHEN (NEW.source_transaction_id IS NULL)
EXECUTE FUNCTION public.create_transfer_mirror();

-- ========================================
-- TRIGGER PARA SINCRONIZAR ESPELHO
-- ========================================

CREATE OR REPLACE FUNCTION public.sync_mirror_on_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a transação original foi atualizada, atualiza o espelho também
    UPDATE public.transactions
    SET
        amount = NEW.amount,
        description = NEW.description,
        date = NEW.date,
        updated_at = NOW()
    WHERE source_transaction_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Cria trigger para sincronizar espelho
DROP TRIGGER IF EXISTS sync_mirror_on_transaction_update ON public.transactions;
CREATE TRIGGER sync_mirror_on_transaction_update
AFTER UPDATE ON public.transactions
FOR EACH ROW
WHEN (OLD.source_transaction_id IS NULL)
EXECUTE FUNCTION public.sync_mirror_on_update();

-- ========================================
-- TRIGGER PARA EXCLUIR ESPELHO
-- ========================================

CREATE OR REPLACE FUNCTION public.delete_mirror_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando transação original é excluída, exclui o espelho também
    DELETE FROM public.transactions
    WHERE source_transaction_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Cria trigger para excluir espelho
DROP TRIGGER IF EXISTS delete_mirror_on_transaction_delete ON public.transactions;
CREATE TRIGGER delete_mirror_on_transaction_delete
BEFORE DELETE ON public.transactions
FOR EACH ROW
WHEN (OLD.source_transaction_id IS NULL)
EXECUTE FUNCTION public.delete_mirror_on_delete();

-- ========================================
-- ADICIONAR COLUNAS PARA SHARED EXPENSES
-- ========================================

-- Adicionar coluna is_settled e settled_at se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'is_settled') THEN
        ALTER TABLE public.transactions ADD COLUMN is_settled boolean NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'settled_at') THEN
        ALTER TABLE public.transactions ADD COLUMN settled_at timestamp with time zone;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'related_member_id') THEN
        ALTER TABLE public.transactions ADD COLUMN related_member_id uuid REFERENCES public.family_members(id);
    END IF;
END $$;