-- Function to securely delete a user account and all associated data
-- Needs SECURITY DEFINER so it can run with elevated privileges and delete from auth.users

CREATE OR REPLACE FUNCTION public.delete_user_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid;
BEGIN
    -- Obter o ID do usuário autenticado
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    -- A maior parte dos dados deve ser apagada via ON DELETE CASCADE se configurada corretamente.
    -- No entanto, como medida de segurança, limpamos explicitamente para não deixar órfãos
    -- caso a constraint FK não tenha cascade em algumas tabelas.
    
    -- 1. Notificações do usuário
    DELETE FROM public.notifications WHERE user_id = v_user_id;

    -- 2. Convites de família enviados ou recebidos pelo usuário
    DELETE FROM public.family_invitations WHERE invited_by = v_user_id OR user_id = v_user_id;

    -- 3. Splits de transações do usuário (via user_id no split)
    DELETE FROM public.transaction_splits WHERE user_id = v_user_id;

    -- 4. Splits vinculados a transações criadas pelo usuário
    DELETE FROM public.transaction_splits WHERE transaction_id IN (
        SELECT id FROM public.transactions WHERE user_id = v_user_id
    );

    -- 5. Transações do usuário
    DELETE FROM public.transactions WHERE user_id = v_user_id;

    -- 6. Orçamentos do usuário
    DELETE FROM public.budgets WHERE user_id = v_user_id;

    -- 7. Metas do usuário
    DELETE FROM public.goals WHERE user_id = v_user_id;

    -- 8. Ativos/Investimentos do usuário
    DELETE FROM public.assets WHERE user_id = v_user_id;

    -- 9. Membros de família vinculados ao usuário
    DELETE FROM public.family_members WHERE linked_user_id = v_user_id;

    -- 10. Contas do usuário
    DELETE FROM public.accounts WHERE user_id = v_user_id;

    -- 11. Famílias onde o usuário é dono
    DELETE FROM public.families WHERE owner_id = v_user_id;

    -- 12. Perfil do usuário
    DELETE FROM public.profiles WHERE id = v_user_id;
    
    -- 13. Excluir logs de erro associados
    DELETE FROM public.error_logs WHERE user_id = v_user_id;

    -- 14. Excluir o usuário do auth.users (isso disparará outras cascatas caso existam)
    DELETE FROM auth.users WHERE id = v_user_id;
    
END;
$function$;
