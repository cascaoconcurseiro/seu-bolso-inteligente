import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { SettlementValidator, SettlementErrorCode, ERROR_MESSAGES } from "@/services/settlementValidation";

interface AnticipateInstallmentsParams {
  seriesId: string;
  installmentIds: string[];
  newCompetenceDate: string; // Format: YYYY-MM-DD (always day 1)
}

interface InstallmentData {
  id: string;
  transaction_date: string;
  competence_date: string;
  is_settled: boolean;
  settled_by_debtor: boolean;
  settled_by_creditor: boolean;
}

/**
 * Hook para antecipar parcelas de uma série
 * 
 * Valida que:
 * - Parcelas não estão acertadas
 * - Atualiza apenas competence_date (mantém transaction_date)
 * - Invalida queries relacionadas
 * 
 * @example
 * ```tsx
 * const { mutate: anticipate, isLoading } = useAnticipateInstallments();
 * 
 * anticipate({
 *   seriesId: "series-123",
 *   installmentIds: ["inst-1", "inst-2"],
 *   newCompetenceDate: "2024-01-01"
 * });
 * ```
 */
export function useAnticipateInstallments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AnticipateInstallmentsParams) => {
      const { seriesId, installmentIds, newCompetenceDate } = params;

      logger.debug('🔄 [useAnticipateInstallments] Iniciando antecipação:', {
        seriesId,
        installmentIds,
        newCompetenceDate
      });

      // 1. Buscar dados das parcelas para validação
      const { data: installments, error: fetchError } = await supabase
        .from('transactions')
        .select('id, transaction_date:date, competence_date, is_settled')
        .in('id', installmentIds);

      if (fetchError) {
        logger.error('❌ [useAnticipateInstallments] Erro ao buscar parcelas:', fetchError);
        throw new Error('Erro ao buscar parcelas: ' + fetchError.message);
      }

      if (!installments || installments.length === 0) {
        throw new Error('Nenhuma parcela encontrada');
      }

      logger.debug('📊 [useAnticipateInstallments] Parcelas encontradas:', installments);

      // 2. Buscar splits das transações para validação completa
      const { data: splits, error: splitsError } = await supabase
        .from('transaction_splits')
        .select('id, transaction_id, is_settled, settled_by_debtor, settled_by_creditor')
        .in('transaction_id', installmentIds);

      if (splitsError) {
        logger.error('❌ [useAnticipateInstallments] Erro ao buscar splits:', splitsError);
        throw new Error('Erro ao buscar splits: ' + splitsError.message);
      }

      logger.debug('📊 [useAnticipateInstallments] Splits encontrados:', splits);

      // 3. Validar que nenhuma parcela está acertada
      const settledInstallments: string[] = [];
      
      for (const installment of installments) {
        // Buscar splits desta transação
        const installmentSplits = splits?.filter(s => s.transaction_id === installment.id) || [];
        
        // Verificar se algum split está settled
        const hasSettledSplit = installmentSplits.some(split => 
          split.is_settled || split.settled_by_debtor || split.settled_by_creditor
        );

        if (installment.is_settled || hasSettledSplit) {
          settledInstallments.push(installment.id);
        }
      }

      if (settledInstallments.length > 0) {
        logger.error('❌ [useAnticipateInstallments] Parcelas acertadas encontradas:', settledInstallments);
        const errorMsg = ERROR_MESSAGES[SettlementErrorCode.INSTALLMENT_SETTLED];
        throw new Error(errorMsg.message + ` (${settledInstallments.length} parcela(s))`);
      }

      // 4. TASK 15: Validar que newCompetenceDate não cria duplicatas
      const { data: existingInstallments, error: duplicateError } = await supabase
        .from('transactions')
        .select('id')
        .eq('series_id', seriesId)
        .eq('competence_date', newCompetenceDate)
        .not('id', 'in', `(${installmentIds.join(',')})`); // Excluir as próprias parcelas sendo antecipadas

      if (duplicateError) {
        logger.error('❌ [useAnticipateInstallments] Erro ao verificar duplicatas:', duplicateError);
        throw new Error('Erro ao verificar duplicatas: ' + duplicateError.message);
      }

      if (existingInstallments && existingInstallments.length > 0) {
        logger.error('❌ [useAnticipateInstallments] DUPLICAÇÃO DETECTADA - Já existe parcela com esta competence_date:', {
          seriesId,
          newCompetenceDate,
          existingInstallments
        });
        throw new Error(`Já existe uma parcela com a data de competência ${newCompetenceDate}. Escolha outra data para evitar duplicação.`);
      }

      logger.debug('✅ [useAnticipateInstallments] Validação de duplicação passou - nenhuma duplicata encontrada');

      // 5. Atualizar competence_date das parcelas (mantém transaction_date)
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ competence_date: newCompetenceDate })
        .in('id', installmentIds);

      if (updateError) {
        logger.error('❌ [useAnticipateInstallments] Erro ao atualizar parcelas:', updateError);
        throw new Error('Erro ao antecipar parcelas: ' + updateError.message);
      }

      logger.debug('✅ [useAnticipateInstallments] Parcelas antecipadas com sucesso');

      return {
        success: true,
        anticipatedCount: installmentIds.length,
        newCompetenceDate
      };
    },
    onSuccess: (data) => {
      logger.debug('✅ [useAnticipateInstallments] Sucesso:', data);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['shared-finances'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      toast.success(`${data.anticipatedCount} parcela(s) antecipada(s) com sucesso!`);
    },
    onError: (error: Error) => {
      logger.error('❌ [useAnticipateInstallments] Erro:', error);
      toast.error(error.message || 'Erro ao antecipar parcelas');
    }
  });
}
