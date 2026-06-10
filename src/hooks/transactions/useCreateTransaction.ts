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
import { generateAllNotifications, dismissRelatedNotifications } from "@/services/notificationGenerator";
import { createNotification } from "@/services/notificationService";
import { CategoryPredictionService } from "@/services/categoryPredictionService";
import { CreateTransactionInput, Transaction } from "./types";
import { validatePayerId } from "./helpers";

export function useCreateTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: async (newTx) => {
      // Cancelar refetches de transações para não sobrescrever nossa atualização otimista
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      await queryClient.cancelQueries({ queryKey: ["dashboard_data"] });

      const previousTransactions = queryClient.getQueryData(["transactions"]);

      // Injetar transação temporária na UI
      if (user) {
        queryClient.setQueryData(["transactions"], (old: any[]) => {
          const optimisticTx = {
            id: `temp-${Date.now()}`,
            user_id: user.id,
            creator_user_id: user.id,
            amount: newTx.amount,
            description: newTx.description,
            date: newTx.date,
            type: newTx.type,
            account_id: newTx.account_id,
            category_id: newTx.category_id,
            is_shared: newTx.is_shared,
            domain: newTx.domain || "PERSONAL",
            created_at: new Date().toISOString(),
            is_optimistic: true, // Útil caso queiramos mostrar um ícone de carregando
            category: { id: newTx.category_id, name: '...', icon: '⏳' },
            account: { id: newTx.account_id, name: '...' }
          };
          
          if (!old) return [optimisticTx];
          return [optimisticTx, ...old];
        });
      }

      return { previousTransactions };
    },
    mutationFn: async (input: CreateTransactionInput) => {
      if (!user) throw new Error("User not authenticated");
      
      // ✅ PARALELIZAR CONSULTAS INICIAIS
      const accDataPromise = input.account_id 
        ? supabase.from("accounts").select("type, closing_day").eq("id", input.account_id).maybeSingle()
        : Promise.resolve({ data: null });

      const memberDataPromise = (input.is_shared && !input.payer_id)
        ? supabase.from('family_members').select('id').eq('linked_user_id', user.id).maybeSingle()
        : Promise.resolve({ data: null });

      const existingTxPromise = supabase
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("amount", input.amount)
        .eq("description", (input.description || "").trim())
        .eq("date", input.date)
        .eq("account_id", input.account_id || "")
        .gt("created_at", new Date(Date.now() - 10000).toISOString())
        .maybeSingle();

      const [accResult, memberResult, existingTxResult] = await Promise.all([
        accDataPromise,
        memberDataPromise,
        existingTxPromise
      ]);

      let cardClosingDay: number | null = null;
      if (accResult.data && accResult.data.type === 'CREDIT_CARD') {
        cardClosingDay = accResult.data.closing_day || 1;
      }

      const calculateCompetence = (dateStr: string) => {
        const d = dateUtils.parseDate(dateStr);
        if (cardClosingDay !== null) {
          const day = d.getUTCDate();
          let compMonth = d.getUTCMonth();
          let compYear = d.getUTCFullYear();
          if (day >= cardClosingDay) {
            compMonth++;
            if (compMonth > 11) {
              compMonth = 0;
              compYear++;
            }
          }
          return `${compYear}-${String(compMonth + 1).padStart(2, '0')}-01`;
        }
        return dateUtils.getCompetenceDate(d);
      };
      
      // ✅ VALIDAÇÃO: Payer ID (Quem pagou)
      let resolvedPayerId = input.payer_id;
      
      if (input.is_shared && !resolvedPayerId) {
        if (memberResult.data) {
          resolvedPayerId = memberResult.data.id;
          input.payer_id = resolvedPayerId;
        } else {
          // Fallback final: Tentar encontrar admin se necessário
          const { data: adminMember } = await supabase
            .from('family_members')
            .select('id')
            .eq('role', 'admin')
            .limit(1)
            .maybeSingle();
            
          if (adminMember) {
            resolvedPayerId = adminMember.id;
            input.payer_id = resolvedPayerId;
          } else {
            throw new Error("Não foi possível identificar seu perfil de membro.");
          }
        }
      }

      // Validar payer_id se fornecido
      if (input.payer_id) {
        await validatePayerId(input.payer_id);
      }

      // ✅ VALIDAÇÃO E AUTO-COMPLETAGEM DE SPLITS
      let finalSplits = [...(input.splits || [])];
      
      if (input.is_shared) {
        const totalPercentage = finalSplits.reduce((sum, s) => sum + Number(s.percentage || 0), 0);
        
        if (totalPercentage > 100) {
          throw new Error(`A soma das porcentagens não pode exceder 100% (atualmente: ${totalPercentage.toFixed(1)}%)`);
        }

        if (finalSplits.length === 0) {
          throw new Error("Transação compartilhada deve ter pelo menos um membro selecionado.");
        }

        if (totalPercentage < 100) {
          const remainingPercentage = 100 - totalPercentage;
          const mySplitIndex = finalSplits.findIndex(s => s.member_id === user!.id);
          
          if (mySplitIndex >= 0) {
            const currentPct = finalSplits[mySplitIndex].percentage || 0;
            const newPct = currentPct + remainingPercentage;
            
            finalSplits[mySplitIndex] = {
              ...finalSplits[mySplitIndex],
              percentage: newPct,
              amount: (input.amount * newPct) / 100
            };
          } else {
            finalSplits.push({
              member_id: user!.id,
              percentage: remainingPercentage,
              amount: (input.amount * remainingPercentage) / 100
            });
          }
        }
      }

      if (input.amount <= 0) {
        throw new Error("O valor da transação deve ser maior que zero");
      }

      if (!input.description || input.description.trim() === '') {
        throw new Error("A descrição é obrigatória");
      }

      // ✅ TRAVA DE DUPLICIDADE
      if (existingTxResult.data) {
        throw new Error("⚠️ Transação duplicada detectada! Aguarde alguns segundos ou verifique se já foi lançada.");
      }

      const { splits, transaction_splits, ...transactionData } = input;

      // Parcelamento
      if (input.is_installment && input.total_installments && input.total_installments > 1) {
        const seriesId = input.series_id || crypto.randomUUID();
        const startingInstallment = input.current_installment || 1;
        const installmentsToCreate = input.total_installments - startingInstallment + 1;

        const installmentAmount = SafeFinancialCalculator.calculateInstallment(
          input.amount,
          installmentsToCreate
        );
        
        const baseDate = dateUtils.parseDate(input.date);
        
        const transactions = [];
        let allocatedAmount = 0;
        
        for (let i = 0; i < installmentsToCreate; i++) {
          const currentInstNum = startingInstallment + i;
          const installmentDate = dateUtils.addMonthsToDate(baseDate, i);
          const formattedDate = dateUtils.formatDate(installmentDate);
          const competenceDate = calculateCompetence(formattedDate);
          
          const isSharedNow = (finalSplits && finalSplits.length > 0) || input.domain === 'SHARED';
          
          let currentAmount = installmentAmount;
          if (i === installmentsToCreate - 1) {
            currentAmount = SafeFinancialCalculator.subtract(input.amount, allocatedAmount);
          } else {
            allocatedAmount = SafeFinancialCalculator.add(allocatedAmount, currentAmount);
          }
          
          transactions.push({
            user_id: user.id,
            creator_user_id: user.id,
            ...transactionData,
            amount: currentAmount,
            date: formattedDate,
            competence_date: competenceDate,
            description: `${input.description} (${currentInstNum}/${input.total_installments})`,
            current_installment: currentInstNum,
            series_id: seriesId,
            is_shared: isSharedNow,
            domain: input.trip_id ? "TRAVEL" : (isSharedNow ? "SHARED" : (input.domain || "PERSONAL")),
            payer_id: input.payer_id
          });
        }

        const { data, error } = await supabase
          .from("transactions")
          .insert(transactions)
          .select();

        if (error) {
          logger.error("Erro ao criar parcelas:", error);
          throw error;
        }

        // Criar splits para cada parcela
        if (finalSplits && finalSplits.length > 0) {
          const memberIds = finalSplits.map(s => s.member_id);
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

          // Validação de segurança: garantir que todos os membros de splits são válidos (Critério Alto #11)
          const invalidMembers = memberIds.filter(id => id !== user.id && !memberNames[id] && !userIdToName[id]);
          if (invalidMembers.length > 0) {
            logger.error("Membros de split inválidos detectados:", invalidMembers);
            throw new Error("Um ou mais membros selecionados para divisão não são válidos.");
          }

          let allSplitsToInsert: Record<string, unknown>[] = [];
          
          for (const transaction of data) {
            let allocatedSum = 0;
            const splitsToInsert = finalSplits.map((split, index) => {
              const isUserId = !memberNames[split.member_id] && userIdToName[split.member_id];
              const actualMemberId = isUserId ? userIdToMemberId[split.member_id] : split.member_id;
              const actualUserId = isUserId ? split.member_id : memberUserIds[split.member_id];
              const actualName = isUserId ? userIdToName[split.member_id] : memberNames[split.member_id];
              
              let splitAmount = 0;
              if (index === finalSplits.length - 1) {
                // Último membro recebe o resíduo exato para fechar perfeitamente com o valor da parcela
                splitAmount = SafeFinancialCalculator.subtract(transaction.amount, allocatedSum);
              } else {
                splitAmount = SafeFinancialCalculator.percentage(
                  transaction.amount,
                  split.percentage
                );
                allocatedSum = SafeFinancialCalculator.add(allocatedSum, splitAmount);
              }
              
              return {
                transaction_id: transaction.id,
                member_id: actualMemberId,
                user_id: actualUserId,
                percentage: split.percentage,
                amount: splitAmount,
                name: actualName || "Membro",
                is_settled: false,
              };
            });
            allSplitsToInsert.push(...splitsToInsert);
          }

          if (allSplitsToInsert.length > 0) {
            const { error: splitsError } = await supabase
              .from("transaction_splits")
              .insert(allSplitsToInsert);
            
            if (splitsError) {
              logger.error("Erro ao criar splits para parcela:", splitsError);
              throw new Error(`Erro ao criar splits: ${splitsError.message}`);
            }
          }
        }
        if (finalSplits && finalSplits.length > 0) {
          try {
            // Extracts unique user_ids from actual splits inserted
            const otherUserIds = Array.from(new Set(finalSplits.map(s => {
              const isUserId = !memberNames[s.member_id] && userIdToName[s.member_id];
              return isUserId ? s.member_id : memberUserIds[s.member_id];
            }).filter(uid => uid && uid !== user?.id)));

            // Fire and forget notification
            Promise.all(otherUserIds.map(otherUserId => 
              createNotification({
                user_id: otherUserId,
                type: 'SHARED_EXPENSE',
                title: 'Novas Transações Compartilhadas',
                message: `${user?.user_metadata?.name || user?.email || 'Alguém'} criou uma transação parcelada compartilhada "${input.description}".`,
                icon: '🤝',
                priority: 'NORMAL'
              }).catch(e => console.error("Erro ao criar notificação de parcelamento compartilhado:", e))
            ));
          } catch (notificationError) {
            console.error("Erro ao notificar criação de parcelamento compartilhado:", notificationError);
          }
        }

        return data;
      }

      // Transação única
      let categoryId = input.category_id;
      
      if (!categoryId && (input.type === 'EXPENSE' || input.type === 'INCOME')) {
        try {
          const prediction = await CategoryPredictionService.predictCategory(
            input.description,
            user.id,
            input.type.toLowerCase() as 'expense' | 'income'
          );
          
          if (prediction && prediction.confidence > 0.5) {
            categoryId = prediction.categoryId;
            logger.debug('Categorização automática aplicada', {
              description: input.description,
              categoryId,
              confidence: prediction.confidence,
              reason: prediction.reason,
            });
          }
        } catch (error) {
          logger.warn('Categorização automática falhou, continuando sem categoria', { error });
        }
      }

      const isSharedNow = (finalSplits && finalSplits.length > 0) || input.domain === 'SHARED';
      
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          creator_user_id: user.id,
          competence_date: input.competence_date || calculateCompetence(input.date),
          ...transactionData,
          category_id: categoryId,
          is_shared: isSharedNow,
          domain: input.trip_id ? "TRAVEL" : (isSharedNow ? "SHARED" : (input.domain || "PERSONAL")),
          payer_id: input.payer_id
        })
        .select()
        .single();

      if (error) {
        logger.error("Erro ao criar transação:", error);
        throw error;
      }

      if (finalSplits && finalSplits.length > 0) {
        const memberIds = finalSplits.map(s => s.member_id);
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
        const splitsToInsert = finalSplits.map((split, index) => {
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
            transaction_id: data.id,
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
          logger.error("Erro ao criar splits:", splitsError);
          throw new Error(`Erro ao criar splits: ${splitsError.message}`);
        }
      }

      const isTransactionShared = (finalSplits && finalSplits.length > 0) || data?.domain === 'SHARED' || input.domain === 'SHARED';
      if (data && isTransactionShared) {
        try {
          const { data: splitsData } = await supabase
            .from("transaction_splits")
            .select("user_id")
            .eq("transaction_id", data.id);
          
          if (splitsData && splitsData.length > 0) {
            const otherUserIds = Array.from(new Set(splitsData.map(s => s.user_id).filter(uid => uid && uid !== user?.id)));
            Promise.all(otherUserIds.map(otherUserId => 
              createNotification({
                user_id: otherUserId,
                type: 'SHARED_EXPENSE',
                title: 'Nova Transação Compartilhada',
                message: `${user?.user_metadata?.name || user?.email || 'Alguém'} criou a transação compartilhada "${data.description}".`,
                icon: '🤝',
                priority: 'NORMAL'
              }).catch(e => console.error("Erro ao criar notificação de criação compartilhada:", e))
            ));
          }
        } catch (notificationError) {
          console.error("Erro ao notificar criação de compartilhada:", notificationError);
        }
      }

      return data as Transaction;
    },
    onSuccess: async (_data, variables) => {
      // Sucesso não precisa mais invalidar *imediatamente*, pois o onSettled fará isso,
      // mas mantemos as notificações de sucesso aqui.
      transactionToasts.created();
      
      if (user?.id) {
        if (variables?.type === 'TRANSFER' && variables?.destination_account_id) {
          // Fire and forget
          dismissRelatedNotifications(user.id, variables.destination_account_id, 'credit_card').catch(e => logger.error('Erro dismiss', e));
        }
        // Fire and forget
        generateAllNotifications(user.id).catch(e => logger.error('Erro ao gerar notificações pós-transação', e));
      }
    },
    onError: (error, _newTx, context: any) => {
      // Rollback da cache em caso de erro
      if (context?.previousTransactions) {
        queryClient.setQueryData(["transactions"], context.previousTransactions);
      }
      transactionToasts.error('criar', error);
    },
    onSettled: () => {
      // Ao finalizar (sucesso ou erro), revalidamos os dados finais
      invalidateFinancialQueries(queryClient);
      invalidateSharedQueries(queryClient);
      invalidateTripQueries(queryClient);
    }
  });
}
