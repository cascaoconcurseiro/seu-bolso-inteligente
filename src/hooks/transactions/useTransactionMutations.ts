import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { dateUtils } from "@/lib/dateUtils";
import {
  invalidateFinancialQueries,
  invalidateSharedQueries,
  invalidateTripQueries
} from "@/utils/queryInvalidation";
import { transactionToasts } from "@/utils/toastMessages";
import { logger } from "@/utils/logger";
import { generateAllNotifications } from "@/services/notificationGenerator";
import { createNotification } from "@/services/notificationService";
import { CreateTransactionInput, Transaction } from "./types";
import { validatePayerId } from "./helpers";
import { toast } from "sonner";
import { callRPCWithRetry } from "@/utils/rpcWithRetry";

export function useBulkCreateTransactions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: CreateTransactionInput[]) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const transactionsToInsert = inputs.map(input => {
        const { splits, transaction_splits, ...transactionData } = input;
        
        return {
          user_id: user.id,
          creator_user_id: user.id,
          ...transactionData,
        };
      });

      const { data, error } = await supabase
        .from("transactions")
        .insert(transactionsToInsert)
        .select();

      if (error) {
        logger.error("Erro ao criar transações em lote:", error);
        throw new Error(`Erro ao criar transações em lote: ${error.message}`);
      }

      return data as Transaction[];
    },
    onSuccess: async () => {
      // Run invalidations
      invalidateFinancialQueries(queryClient);
      invalidateSharedQueries(queryClient);
      invalidateTripQueries(queryClient);
      transactionToasts.created();
    },
    onError: (error) => {
      transactionToasts.error('criar', error);
    },
  });
}

export function useUpdateTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Transaction> & { id: string }) => {
      if (!user) throw new Error("Usuário não autenticado");

      // Verificar se a transação já foi liquidada
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("is_settled")
        .eq("id", id)
        .single();
        
      if (existingTx?.is_settled) {
        throw new Error("Esta transação já foi liquidada/acertada. Desfaça o acerto antes de editá-la.");
      }

      // Validate payer_id and members if they are being updated
      if (updateData.payer_id !== undefined) {
        await validatePayerId(updateData.payer_id);
      }
      
      // We update splits separately since they are in another table.
      const { splits, transaction_splits, ...restUpdateData } = updateData as any;
      const actualSplits = transaction_splits || splits;

      const { data, error } = await supabase
        .from("transactions")
        .update({
          ...restUpdateData,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        logger.error("Erro ao atualizar transação:", error);
        throw new Error(`Erro ao atualizar transação: ${error.message}`);
      }

      if (actualSplits) {
        let finalSplits = [...actualSplits];
        
        // Auto-completar splits se a soma for menor que 100% (Critério #6: O próprio criador assume o restante)
        if (finalSplits.length > 0) {
          const totalPercentage = SafeFinancialCalculator.safeSum(finalSplits.map((s: any) => s.percentage));
          if (totalPercentage < 100) {
            const remainingPercentage = SafeFinancialCalculator.subtract(100, totalPercentage);
            const { data: currentUserMember } = await supabase
              .from("family_members")
              .select("id")
              .eq("linked_user_id", user.id)
              .maybeSingle();
              
            if (currentUserMember) {
              finalSplits.push({
                member_id: currentUserMember.id,
                percentage: remainingPercentage,
                amount: SafeFinancialCalculator.percentage(data.amount, remainingPercentage)
              });
            }
          }
        }

        // Excluir splits existentes
        await supabase.from("transaction_splits").delete().eq("transaction_id", id);
        
        // Inserir os novos
        if (finalSplits.length > 0) {
          const memberIds = finalSplits.map((s: any) => s.member_id);
          const { data: membersData } = await supabase
            .from("family_members")
            .select("id, name, linked_user_id")
            .or(`id.in.(${memberIds.join(',')}),linked_user_id.in.(${memberIds.join(',')})`);
          
          const memberNames: Record<string, string> = {};
          const memberUserIds: Record<string, string> = {};
          const userIdToMemberId: Record<string, string> = {};
          const userIdToName: Record<string, string> = {};
          
          membersData?.forEach(m => {
            memberNames[m.id] = m.name;
            if (m.linked_user_id) {
              memberUserIds[m.id] = m.linked_user_id;
              userIdToMemberId[m.linked_user_id] = m.id;
              userIdToName[m.linked_user_id] = m.name;
            }
          });

          let allocatedSum = 0;
          const splitsToInsert = finalSplits.map((split: any, index: number) => {
            const isUserId = !memberNames[split.member_id] && userIdToName[split.member_id];
            const actualMemberId = isUserId ? userIdToMemberId[split.member_id] : split.member_id;
            const actualUserId = isUserId ? split.member_id : memberUserIds[split.member_id];
            const actualName = isUserId ? userIdToName[split.member_id] : memberNames[split.member_id];
            
            let splitAmount = 0;
            if (index === finalSplits.length - 1) {
              splitAmount = SafeFinancialCalculator.subtract(data.amount, allocatedSum);
            } else {
              const baseAmount = split.amount !== undefined ? split.amount : SafeFinancialCalculator.percentage(data.amount, split.percentage);
              splitAmount = baseAmount;
              allocatedSum = SafeFinancialCalculator.add(allocatedSum, splitAmount);
            }

            return {
              transaction_id: id,
              member_id: actualMemberId,
              user_id: actualUserId,
              percentage: split.percentage,
              amount: splitAmount,
              name: actualName || "Membro",
              is_settled: false,
            };
          });

          const { error: splitsError } = await supabase
            .from("transaction_splits")
            .insert(splitsToInsert);

          if (splitsError) {
            logger.error("Erro ao atualizar splits:", splitsError);
            throw new Error(`Erro ao atualizar divisões: ${splitsError.message}`);
          }
        }
      }

      return data as Transaction;
    },
    onSuccess: async () => {
      invalidateFinancialQueries(queryClient);
      invalidateSharedQueries(queryClient);
      invalidateTripQueries(queryClient);
      transactionToasts.updated();
    },
    onError: (error) => {
      transactionToasts.error('atualizar', error);
    },
  });
}

export function useDeleteTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, cascadeType = 'NONE' }: { id: string, cascadeType?: 'ALL' | 'NEXT' | 'NONE' }) => {
      // 1. Buscar a transação antes de deletar
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("is_shared, domain, description, user_id, is_settled, series_id, current_installment")
        .eq("id", id)
        .maybeSingle();

      if (existingTx && existingTx.is_settled) {
        throw new Error("Esta transação já foi liquidada/acertada. Desfaça o acerto antes de excluí-la.");
      }

      // 2. Se for compartilhada, buscar splits antes de deletar
      let otherUserIds: string[] = [];
      if (existingTx && (existingTx.is_shared || existingTx.domain === 'SHARED')) {
        const { data: splitsData } = await supabase
          .from("transaction_splits")
          .select("user_id")
          .eq("transaction_id", id);
        
        if (splitsData && splitsData.length > 0) {
          otherUserIds = Array.from(new Set(splitsData.map(s => s.user_id).filter(uid => uid && uid !== user?.id)));
        }
      }

      // 3. Deletar a transação (com lógica de cascata)
      let deleteQuery = supabase.from("transactions").delete();
      
      if (cascadeType === 'ALL' && existingTx?.series_id) {
        deleteQuery = deleteQuery.eq('series_id', existingTx.series_id);
      } else if (cascadeType === 'NEXT' && existingTx?.series_id) {
        // Para NEXT, precisamos deletar onde series_id bate E current_installment >= tx.current_installment
        // Como o Supabase delete() com múltiplos filtros funciona com AND, podemos fazer:
        deleteQuery = deleteQuery
          .eq('series_id', existingTx.series_id)
          .gte('current_installment', existingTx.current_installment || 1);
      } else {
        // Padrão (NONE) ou transação sem série
        deleteQuery = deleteQuery.eq("id", id);
      }

      const { error } = await deleteQuery;

      if (error) throw error;

      // 4. Notificar outros membros
      if (existingTx && otherUserIds.length > 0) {
        try {
          // Fire and forget notification
          Promise.all(otherUserIds.map(otherUserId => 
            createNotification({
              user_id: otherUserId,
              type: 'SHARED_EXPENSE',
              title: 'Transação Excluída',
              message: `${user?.user_metadata?.name || user?.email || 'Alguém'} excluiu a transação compartilhada "${existingTx.description}".`,
              icon: '❌',
              priority: 'NORMAL'
            }).catch(e => console.error("Erro ao criar notificação de exclusão compartilhada:", e))
          ));
        } catch (notificationError) {
          console.error("Erro ao tentar enviar notificação de exclusão compartilhada:", notificationError);
        }
      }
    },
    onSuccess: async () => {
      // Run invalidations without awaiting to unblock UI instantly
      invalidateFinancialQueries(queryClient);
      invalidateSharedQueries(queryClient);
      invalidateTripQueries(queryClient);
      transactionToasts.deleted();
      
      // ✅ INTELIGÊNCIA FINANCEIRA: Atualizar orçamentos e saldos em tempo real
      if (user?.id) {
        generateAllNotifications(user.id).catch(e => logger.error('Erro ao gerar notificações pós-exclusão', e));
      }
    },
    onError: (error) => {
      transactionToasts.error('remover', error);
    },
  });
}

export function useDeleteInstallmentSeries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seriesId: string) => {
      // CORREÇÃO: Usar RPC com retry para maior resiliência (Critério Alto #7)
      const data = await callRPCWithRetry('delete_installment_series', { p_series_id: seriesId });
      
      const deletedCount = (data as any)?.[0]?.deleted_count || 0;
      
      if (deletedCount === 0) {
        throw new Error("Nenhuma parcela foi excluída. Verifique se a série existe e pertence a você.");
      }

      return { deletedCount };
    },
    onSuccess: async () => {
      // Run invalidations without awaiting to unblock UI instantly
      invalidateFinancialQueries(queryClient);
      invalidateSharedQueries(queryClient);
      invalidateTripQueries(queryClient);
      toast.success("Série de parcelas excluída com sucesso!");
      
      // ✅ INTELIGÊNCIA FINANCEIRA: Atualizar orçamentos e saldos em tempo real
      if (user?.id) {
        generateAllNotifications(user.id).catch(e => logger.error('Erro ao gerar notificações pós-exclusão de série', e));
      }
    },
    onError: (error) => {
      transactionToasts.error('remover série', error);
    },
  });
}


export function useAnticipateInstallments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      seriesId, 
      fromInstallment, 
      newDate,
      updateFutureOnly = true
    }: { 
      seriesId: string; 
      fromInstallment: number; 
      newDate: string;
      updateFutureOnly?: boolean;
    }) => {
      let query = supabase
        .from("transactions")
        .select("id, date, competence_date, current_installment")
        .eq("series_id", seriesId);
      
      if (updateFutureOnly) {
        query = query.gte("current_installment", fromInstallment);
      }

      const { data, error } = await query.select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Nenhuma parcela encontrada");

      const updates = data.map((t, index) => {
        const installmentDate = dateUtils.addMonthsToDate(dateUtils.parseDate(newDate), index);
        const formattedDate = dateUtils.formatDate(installmentDate);
        const competenceDate = dateUtils.getCompetenceDate(installmentDate);
        
        return supabase
          .from("transactions")
          .update({
            date: formattedDate,
            competence_date: competenceDate,
          })
          .eq("id", t.id);
      });

      await Promise.all(updates);
      return { count: data.length };
    },
    onSuccess: async () => {
      // Run invalidations without awaiting to unblock UI instantly
      invalidateFinancialQueries(queryClient);
      toast.success("Parcelas antecipadas com sucesso!");
      
      // ✅ INTELIGÊNCIA FINANCEIRA: Atualizar orçamentos e saldos em tempo real
      if (user?.id) {
        generateAllNotifications(user.id).catch(e => logger.error('Erro ao gerar notificações pós-antecipação', e));
      }
    },
    onError: (error) => {
      transactionToasts.error('antecipar', error);
    },
  });
}
