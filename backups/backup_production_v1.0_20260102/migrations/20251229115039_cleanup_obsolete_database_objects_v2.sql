-- =====================================================
-- LIMPEZA DE OBJETOS OBSOLETOS DO BANCO DE DADOS
-- Remove funções, triggers e tabelas não mais usadas
-- =====================================================

-- 1. REMOVER FUNÇÕES OBSOLETAS (COM CASCADE)

-- Função obsoleta: create_account_with_initial_deposit (substituída por lógica no frontend)
DROP FUNCTION IF EXISTS public.create_account_with_initial_deposit CASCADE;

-- Funções obsoletas de atualização de saldo (substituídas por trigger sync_account_balance)
DROP FUNCTION IF EXISTS public.update_account_balance_on_insert CASCADE;
DROP FUNCTION IF EXISTS public.update_account_balance_on_delete CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_account_balance CASCADE;

-- Funções obsoletas de espelhamento (substituídas por handle_transaction_mirroring)
DROP FUNCTION IF EXISTS public.mirror_shared_transaction CASCADE;

-- Funções obsoletas de normalização (substituídas por validate_competence_date)
DROP FUNCTION IF EXISTS public.normalize_competence_date CASCADE;

-- Funções duplicadas de trip owner (manter apenas add_trip_owner)
DROP FUNCTION IF EXISTS public.add_trip_creator_as_member CASCADE;

-- Funções obsoletas de trip participants (substituída por trip_members)
DROP FUNCTION IF EXISTS public.is_trip_participant CASCADE;

-- Funções duplicadas de get_user_trip_ids (manter apenas a com parâmetro)
DROP FUNCTION IF EXISTS public.get_user_trip_ids() CASCADE;

-- Função obsoleta de resync (não mais necessária)
DROP FUNCTION IF EXISTS public.resync_all_shared_transactions CASCADE;

-- Função obsoleta de sync manual (substituída por trigger automático)
DROP FUNCTION IF EXISTS public.sync_transactions_on_member_link CASCADE;

-- Funções obsoletas de transfer (substituídas por lógica no frontend)
DROP FUNCTION IF EXISTS public.withdraw_from_account CASCADE;

-- 2. VERIFICAR E LIMPAR TABELA trip_participants (se vazia, pode ser removida)
-- NOTA: NÃO vamos remover ainda pois pode ter dados históricos
-- Apenas adicionar comentário indicando que é obsoleta
COMMENT ON TABLE public.trip_participants IS 'OBSOLETA: Substituída por trip_members. Manter apenas para histórico.';

-- 3. ADICIONAR COMENTÁRIOS NAS FUNÇÕES ATIVAS
COMMENT ON FUNCTION public.calculate_account_balance IS 'ATIVA: Calcula saldo da conta baseado em transações';
COMMENT ON FUNCTION public.sync_account_balance IS 'ATIVA: Trigger para sincronizar saldo automaticamente';
COMMENT ON FUNCTION public.handle_transaction_mirroring IS 'ATIVA: Trigger para espelhar transações compartilhadas';
COMMENT ON FUNCTION public.validate_competence_date IS 'ATIVA: Trigger para normalizar data de competência';
COMMENT ON FUNCTION public.add_trip_owner IS 'ATIVA: Trigger para adicionar owner como membro da viagem';
COMMENT ON FUNCTION public.handle_trip_invitation_accepted IS 'ATIVA: Trigger para adicionar membro quando convite aceito';
COMMENT ON FUNCTION public.handle_invitation_accepted IS 'ATIVA: Trigger para adicionar membro familiar quando convite aceito';
COMMENT ON FUNCTION public.auto_link_family_member IS 'ATIVA: Trigger para vincular membro automaticamente por email';
COMMENT ON FUNCTION public.handle_auto_connection IS 'ATIVA: Trigger para sincronizar quando membro é vinculado';

-- 4. ADICIONAR ÍNDICES FALTANTES PARA PERFORMANCE

-- Índice para buscar transações por competence_date (usado em relatórios)
CREATE INDEX IF NOT EXISTS idx_transactions_competence_date 
ON public.transactions(competence_date) 
WHERE source_transaction_id IS NULL;

-- Índice para buscar transações compartilhadas
CREATE INDEX IF NOT EXISTS idx_transactions_shared 
ON public.transactions(user_id, is_shared) 
WHERE is_shared = true AND source_transaction_id IS NULL;

-- Índice para buscar transações de viagem
CREATE INDEX IF NOT EXISTS idx_transactions_trip 
ON public.transactions(trip_id, user_id) 
WHERE trip_id IS NOT NULL;

-- Índice para buscar splits não quitados
CREATE INDEX IF NOT EXISTS idx_transaction_splits_unsettled 
ON public.transaction_splits(member_id, is_settled) 
WHERE is_settled = false;

-- Índice para buscar orçamentos ativos
CREATE INDEX IF NOT EXISTS idx_budgets_active 
ON public.budgets(user_id, is_active) 
WHERE is_active = true AND (deleted = false OR deleted IS NULL);

COMMENT ON INDEX public.idx_transactions_competence_date IS 'Performance: Busca de transações por mês';
COMMENT ON INDEX public.idx_transactions_shared IS 'Performance: Busca de transações compartilhadas';
COMMENT ON INDEX public.idx_transactions_trip IS 'Performance: Busca de transações de viagem';
COMMENT ON INDEX public.idx_transaction_splits_unsettled IS 'Performance: Busca de splits pendentes';
COMMENT ON INDEX public.idx_budgets_active IS 'Performance: Busca de orçamentos ativos';;
