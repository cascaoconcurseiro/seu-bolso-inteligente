CREATE OR REPLACE FUNCTION public.sync_shared_transaction(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_transaction RECORD;
    v_split RECORD;
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
        RAISE NOTICE 'sync_shared_transaction: Transação % não encontrada', p_transaction_id;
        RETURN;
    END IF;
    
    -- 2. Verificar se é compartilhada
    IF NOT v_transaction.is_shared THEN
        RAISE NOTICE 'sync_shared_transaction: Transação % não é compartilhada', p_transaction_id;
        RETURN;
    END IF;
    
    -- 3. Buscar nome do pagador
    SELECT COALESCE(full_name, email) INTO v_payer_name
    FROM public.profiles
    WHERE id = v_transaction.user_id;
    
    RAISE NOTICE 'sync_shared_transaction: Processando transação % do usuário % (%)', 
        p_transaction_id, v_transaction.user_id, v_payer_name;
    
    -- 4. Processar transaction_splits para criar espelhos
    FOR v_split IN 
        SELECT 
            ts.id as split_id,
            ts.amount as split_amount,
            ts.member_id,
            ts.name as member_name,
            fm.linked_user_id
        FROM public.transaction_splits ts
        LEFT JOIN public.family_members fm ON fm.id = ts.member_id
        WHERE ts.transaction_id = p_transaction_id
        AND fm.linked_user_id IS NOT NULL
        AND fm.linked_user_id != v_transaction.user_id
    LOOP
        v_member_user_id := v_split.linked_user_id;
        
        RAISE NOTICE 'sync_shared_transaction: Processando split para membro % (linked_user_id: %)', 
            v_split.member_name, v_member_user_id;
        
        -- Verificar se já existe espelho para este usuário
        SELECT mirror_transaction_id INTO v_existing_mirror
        FROM public.shared_transaction_mirrors
        WHERE original_transaction_id = p_transaction_id
        AND mirror_user_id = v_member_user_id;
        
        IF v_existing_mirror IS NOT NULL THEN
            -- Atualizar espelho existente
            RAISE NOTICE 'sync_shared_transaction: Atualizando espelho existente %', v_existing_mirror;
            
            UPDATE public.transactions SET
                amount = v_split.split_amount,
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
            
            RAISE NOTICE 'sync_shared_transaction: Criando novo espelho % para usuário %', 
                v_mirror_id, v_member_user_id;
            
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
                sync_status,
                related_member_id
            ) VALUES (
                v_mirror_id,
                v_member_user_id,
                v_split.split_amount,
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
                'SYNCED',
                v_split.member_id
            );
            
            -- Registrar espelho na tabela de controle
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
            
            RAISE NOTICE 'sync_shared_transaction: Espelho % criado com sucesso', v_mirror_id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'sync_shared_transaction: Sincronização completa para transação %', p_transaction_id;
END;
$function$;;
