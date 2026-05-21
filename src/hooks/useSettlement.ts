import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as dateFns from "date-fns";
import { logger } from "@/utils/logger";
import { rpcWithRetry } from "@/utils/rpcWithRetry";

interface SettleParams {
  splitId: string;
  transactionId: string;
  amount: number;
  accountId: string;
  memberName: string;
  description: string;
}
interface SettleMultipleParams {
  items: Array<{
    splitId: string;
    transactionId: string;
    amount: number;
    memberName: string;
    description: string;
  }>;
  accountId: string;
}

interface SettleResponse {
  transaction_id: string;
  success: boolean;
}

interface SettleMultipleResponse {
  transaction_id: string;
  settled_count: number;
}

interface UnsettleMultipleResponse {
  reverted_count: number;
}

interface UnsettleWithReversalParams {
  splitId: string;
  reversalReason: string;
}

interface UnsettleWithReversalResponse {
  success: boolean;
  split_id: string;
  original_transaction_id: string;
  payment_transaction_id: string;
  reverted_amount: number;
  reversal_reason: string;
  reversal_record_id: string;
  reverted_at: string;
  account_id: string;
}

/**
 * Hook para confirmar ressarcimento de despesa compartilhada
 * - Verifica se o split já foi pago (previne duplicidade)
 * - Marca o split como pago (is_settled = true)
 * - Cria transação de INCOME na conta selecionada
 */
export function useSettleWithPayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ splitId, transactionId: _, amount, accountId, memberName, description }: SettleParams) => {
      if (!user) throw new Error("Não autenticado");

      try {
        const data = await rpcWithRetry('settle_split', {
          p_split_id: splitId,
          p_amount: amount,
          p_account_id: accountId
        }, {
          maxRetries: 3,
          baseDelayMs: 1000,
          onRetry: (attempt, error) => {
            logger.warn(`Tentativa ${attempt} de ressarcimento falhou, retentando...`, { error: error.message });
          }
        }) as SettleResponse;

        return { paymentTxId: data.transaction_id, splitId };
      } catch (error: any) {
        logger.error('Erro ao ressarcir via RPC após retries:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-with-splits"] });
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-consolidated"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["account-statement"] });
      toast.success("Ressarcimento confirmado!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao confirmar ressarcimento");
    },
  });
}

/**
 * Hook para confirmar múltiplos ressarcimentos de uma vez
 */
export function useSettleMultipleWithPayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ items, accountId }: SettleMultipleParams) => {
      if (!user) throw new Error("Não autenticado");

      const splitIds = items.map(i => i.splitId);
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const memberNames = [...new Set(items.map(i => i.memberName))].join(", ");

      try {
        const data = await rpcWithRetry('settle_multiple_splits', {
          p_split_ids: splitIds,
          p_account_id: accountId,
          p_user_id: user.id
        }, {
          maxRetries: 3,
          baseDelayMs: 1000,
          onRetry: (attempt, error) => {
            logger.warn(`Tentativa ${attempt} de ressarcimento múltiplo falhou, retentando...`, { error: error.message });
          }
        }) as SettleMultipleResponse;

        return { 
          paymentTxId: data.transaction_id, 
          settledCount: data.settled_count, 
          totalAmount 
        };
      } catch (error: any) {
        logger.error('Erro ao ressarcir múltiplos via RPC após retries:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-with-splits"] });
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-consolidated"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["account-statement"] });
      toast.success(`${data.settledCount} ressarcimento(s) confirmado(s)!`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao confirmar ressarcimentos");
    },
  });
}

/**
 * Hook para reverter ressarcimento
 */
export function useUnsettleWithReversal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (splitId: string) => {
      try {
        await rpcWithRetry('unsettle_split', {
          p_split_id: splitId
        }, {
          maxRetries: 3,
          baseDelayMs: 1000,
          onRetry: (attempt, error) => {
            logger.warn(`Tentativa ${attempt} de reversão falhou, retentando...`, { error: error.message });
          }
        });
      } catch (error: any) {
        logger.error('Erro ao reverter ressarcimento via RPC após retries:', error);
        throw error;
      }

      return { splitId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-with-splits"] });
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-consolidated"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["account-statement"] });
      toast.success("Ressarcimento revertido!");
    },
    onError: (error) => {
      toast.error("Erro ao reverter ressarcimento: " + error.message);
    },
  });
}

/**
 * Hook para reverter múltiplos ressarcimentos de uma vez de forma atômica via RPC
 */
export function useUnsettleMultiple() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (splitIds: string[]) => {
      logger.debug('Revertendo múltiplos ressarcimentos via RPC', { count: splitIds.length });

      try {
        const data = await rpcWithRetry('unsettle_multiple_splits', {
          p_split_ids: splitIds
        }, {
          maxRetries: 3,
          baseDelayMs: 1000,
          onRetry: (attempt, error) => {
            logger.warn(`Tentativa ${attempt} de reversão múltipla falhou, retentando...`, { error: error.message });
          }
        }) as UnsettleMultipleResponse;

        const revertedCount = data.reverted_count || 0;
        logger.debug('Reversão múltipla concluída com sucesso', { revertedCount });

        return { count: revertedCount };
      } catch (error: any) {
        logger.error('Erro ao reverter múltiplos via RPC após retries:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-with-splits"] });
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-consolidated"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["account-statement"] });
      toast.success(`${data.count} itens revertidos com sucesso!`);
    },
    onError: (error) => {
      logger.error('Erro ao reverter múltiplos ressarcimentos:', error);
      toast.error("Erro ao reverter ressarcimentos: " + error.message);
    },
  });
}

/**
 * Hook para reverter ressarcimento com motivo e trilha de auditoria
 * - Reverte a liquidação de um split
 * - Registra o motivo da reversão para auditoria
 * - Cria registro imutável em settlement_reversals
 * - Reverte saldo da conta
 */
export function useUnsettleWithReversalAndReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ splitId, reversalReason }: UnsettleWithReversalParams) => {
      if (!splitId) {
        throw new Error("ID do split é obrigatório");
      }

      if (!reversalReason || reversalReason.trim() === "") {
        throw new Error("Motivo da reversão é obrigatório");
      }

      try {
        const data = await rpcWithRetry('unsettle_with_reversal', {
          p_split_id: splitId,
          p_reversal_reason: reversalReason.trim()
        }, {
          maxRetries: 3,
          baseDelayMs: 1000,
          onRetry: (attempt, error) => {
            logger.warn(`Tentativa ${attempt} de reversão com motivo falhou, retentando...`, { 
              error: error.message,
              splitId,
              reason: reversalReason
            });
          }
        }) as UnsettleWithReversalResponse;

        if (!data.success) {
          throw new Error(data.error || "Erro ao reverter liquidação");
        }

        logger.debug('Reversão com motivo concluída com sucesso', {
          splitId,
          reversalReason,
          reversalRecordId: data.reversal_record_id,
          revertedAmount: data.reverted_amount
        });

        return {
          splitId: data.split_id,
          reversalRecordId: data.reversal_record_id,
          revertedAmount: data.reverted_amount,
          reversalReason: data.reversal_reason,
          revertedAt: data.reverted_at
        };
      } catch (error: any) {
        logger.error('Erro ao reverter com motivo via RPC após retries:', {
          error: error.message,
          splitId,
          reason: reversalReason
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-with-splits"] });
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-consolidated"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["account-statement"] });
      queryClient.invalidateQueries({ queryKey: ["settlement-reversals"] });
      
      toast.success(`Ressarcimento revertido! Motivo registrado: "${data.reversalReason}"`);
    },
    onError: (error) => {
      logger.error('Erro ao reverter ressarcimento com motivo:', error);
      toast.error("Erro ao reverter ressarcimento: " + error.message);
    },
  });
}
