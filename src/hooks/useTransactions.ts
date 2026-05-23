import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMonth } from "@/contexts/MonthContext";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { getMonthDateRange } from "@/utils/dateUtils";
import { dateUtils } from "@/lib/dateUtils";
  invalidateFinancialQueries,
  invalidateSharedQueries,
  invalidateTripQueries
} from "@/utils/queryInvalidation";
import { transactionToasts } from "@/utils/toastMessages";
import { defaultQueryConfig } from "@/utils/queryConfig";
import { callRPCWithRetry } from "@/utils/supabaseHelpers";
import * as dateFns from "date-fns";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { generateAllNotifications, dismissRelatedNotifications } from "@/services/notificationGenerator";
import { createNotification } from "@/services/notificationService";
import { CategoryPredictionService } from "@/services/categoryPredictionService";

export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER" | "WITHDRAWAL" | "DEPOSIT";
export type TransactionDomain = "PERSONAL" | "SHARED" | "TRAVEL";

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  destination_account_id: string | null;
  category_id: string | null;
  trip_id: string | null;
  amount: number;
  description: string;
  date: string;
  competence_date: string; // Data de competência (YYYY-MM-01)
  type: TransactionType;
  currency: string | null;
  domain: TransactionDomain;
  is_shared: boolean;
  payer_id: string | null;
  is_installment: boolean;
  current_installment: number | null;
  total_installments: number | null;
  series_id: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  source_transaction_id: string | null;
  external_id: string | null;
  notes: string | null;
  exchange_rate: number | null;
  destination_amount: number | null;
  destination_currency: string | null;
  created_at: string;
  updated_at: string;
  creator_user_id?: string | null;
  transaction_splits?: DBTransactionSplit[];
  // Joined data
  account?: { id: string; name: string; currency?: string; bank_id?: string | null };
  category?: { id: string; name: string; icon: string | null };
  trip?: { id: string; name: string };
}

export interface DBTransactionSplit {
  id: string;
  transaction_id: string;
  member_id: string;
  user_id: string | null;
  percentage: number;
  amount: number;
  name: string;
  is_settled: boolean;
  settled_at: string | null;
  settled_by_debtor: boolean;
  settled_by_creditor: boolean;
  created_at: string;
}

export interface TransactionSplit {
  member_id: string;
  percentage: number;
  amount: number;
}

export interface CreateTransactionInput {
  account_id?: string;
  destination_account_id?: string;
  category_id?: string;
  trip_id?: string;
  amount: number;
  description: string;
  date: string;
  type: TransactionType;
  currency?: string;
  domain?: TransactionDomain;
  is_shared?: boolean;
  payer_id?: string;
  is_installment?: boolean;
  current_installment?: number;
  total_installments?: number;
  series_id?: string;
  notes?: string;
  exchange_rate?: number;
  destination_amount?: number;
  destination_currency?: string;
  related_member_id?: string;
  splits?: TransactionSplit[];
  competence_date?: string;
  is_refund?: boolean;
  is_recurring?: boolean;
  frequency?: string;
  recurrence_day?: number;
  enable_notification?: boolean;
  notification_date?: string;
  transaction_splits?: TransactionSplit[];
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  tripId?: string;
  domain?: TransactionDomain;
  limit?: number;
}

const TRANSACTION_FETCH_LIMIT = 1000;

/**
 * Valida que o payer_id existe na tabela family_members
 * 
 * **Validates: Requirements 1.3**
 * 
 * @param payerId - ID do pagador (membro da família)
 * @returns true se válido, lança erro se inválido
 * @throws Error com mensagem descritiva se payer_id não existe
 * 
 * @example
 * // Validar payer_id antes de criar transação
 * await validatePayerId('member-123');
 * // Retorna: true
 * 
 * // Se inválido, lança erro
 * await validatePayerId('invalid-id');
 * // Throws: Error('O pagador selecionado é inválido ou não foi encontrado.')
 */
async function validatePayerId(payerId: string | null | undefined): Promise<boolean> {
  // Campo opcional - se não fornecido, validação passa
  if (!payerId) {
    return true;
  }

  try {
    // 1. Verificar na tabela family_members (por id ou por linked_user_id)
    const { data: payerExists, error: payerCheckError } = await supabase
      .from('family_members')
      .select('id')
      .or(`id.eq.${payerId},linked_user_id.eq.${payerId}`)
      .maybeSingle();
    
    if (payerCheckError) {
      logger.error('Erro ao validar payer_id em family_members:', { payer_id: payerId, error: payerCheckError });
      throw new Error('Erro ao validar pagador. Tente novamente.');
    }

    if (payerExists) {
      return true;
    }

    // 2. Se não estiver na família, verificar se existe na tabela profiles (caso seja id de viagem)
    const { data: profileExists, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', payerId)
      .maybeSingle();

    if (profileCheckError) {
      logger.error('Erro ao validar payer_id em profiles:', { payer_id: payerId, error: profileCheckError });
      throw new Error('Erro ao validar pagador. Tente novamente.');
    }

    if (profileExists) {
      return true;
    }

    logger.warn('Payer ID inválido:', { payer_id: payerId });
    throw new Error('O pagador selecionado é inválido ou não foi encontrado.');
  } catch (error) {
    if (error instanceof Error && (error.message.includes('O pagador selecionado') || error.message.includes('Erro ao validar'))) {
      throw error;
    }
    logger.error('Erro inesperado ao validar payer_id:', error);
    throw new Error('O pagador selecionado é inválido ou não foi encontrado.');
  }
}

/**
 * Valida que um member_id existe em family_members ou profiles
 * 
 * TASK 2.3: Validar Member_ID Antes de Criar Splits
 * Garante que member_id é válido ANTES de criar splits
 * 
 * @param memberId - ID do membro a validar
 * @returns true se válido
 * @throws Error se inválido
 */
async function validateMemberId(memberId: string | null | undefined): Promise<boolean> {
  // Campo opcional - se não fornecido, validação passa
  if (!memberId) {
    return true;
  }

  try {
    // 1. Verificar na tabela family_members (por id ou por linked_user_id)
    const { data: memberExists, error: memberCheckError } = await supabase
      .from('family_members')
      .select('id')
      .or(`id.eq.${memberId},linked_user_id.eq.${memberId}`)
      .maybeSingle();
    
    if (memberCheckError) {
      logger.error('Erro ao validar member_id em family_members:', { member_id: memberId, error: memberCheckError });
      throw new Error('Erro ao validar membro. Tente novamente.');
    }

    if (memberExists) {
      return true;
    }

    // 2. Se não estiver na família, verificar se existe na tabela profiles (caso seja id de viagem)
    const { data: profileExists, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', memberId)
      .maybeSingle();

    if (profileCheckError) {
      logger.error('Erro ao validar member_id em profiles:', { member_id: memberId, error: profileCheckError });
      throw new Error('Erro ao validar membro. Tente novamente.');
    }

    if (profileExists) {
      return true;
    }

    logger.warn('Member ID inválido:', { member_id: memberId });
    throw new Error('O membro selecionado é inválido ou não foi encontrado.');
  } catch (error) {
    if (error instanceof Error && (error.message.includes('O membro selecionado') || error.message.includes('Erro ao validar'))) {
      throw error;
    }
    logger.error('Erro inesperado ao validar member_id:', error);
    throw new Error('O membro selecionado é inválido ou não foi encontrado.');
  }
}

export function useTransactions(filters?: TransactionFilters) {
  const { user } = useAuth();
  const { currentDate } = useMonth();

  const effectiveFilters = filters ? { ...filters } : {};
  if (!effectiveFilters.startDate && !effectiveFilters.endDate) {
    const { startDate, endDate } = getMonthDateRange(currentDate);
    effectiveFilters.startDate = startDate;
    effectiveFilters.endDate = endDate;
  }

  return useQuery({
    queryKey: ["transactions", user?.id, effectiveFilters, currentDate],
    queryFn: async () => {
      if (!user) return [];

      // Buscar o ID de membro da família do usuário para o filtro de payer_id
      const { data: memberData } = await supabase
        .from('family_members')
        .select('id')
        .eq('linked_user_id', user.id)
        .maybeSingle();

      const memberId = memberData?.id;
      
      console.log('🔍 [DEBUG] useTransactions query:', {
        userId: user.id,
        memberId,
        filters: effectiveFilters
      });

      let query = supabase
        .from("transactions")
        .select(`
          *,
          account:accounts!account_id(id, name, currency, bank_id),
          category:categories(id, name, icon, parent_category_id),
          transaction_splits:transaction_splits!transaction_id(*)
        `);

      // Filtro OR: transações minhas OU transações onde sou o pagador
      if (memberId) {
        query = query.or(`user_id.eq."${user.id}",payer_id.eq."${memberId}"`);
      } else {
        query = query.eq("user_id", user.id);
      }

      if (effectiveFilters?.startDate) {
        query = query.gte("date", effectiveFilters.startDate);
      }
      if (effectiveFilters?.endDate) {
        query = query.lte("date", effectiveFilters.endDate);
      }
      if (effectiveFilters?.type) {
        query = query.eq("type", effectiveFilters.type);
      }
      if (effectiveFilters?.accountId) {
        query = query.or(`account_id.eq.${effectiveFilters.accountId},destination_account_id.eq.${effectiveFilters.accountId}`);
      }
      if (effectiveFilters?.categoryId) {
        query = query.eq("category_id", effectiveFilters.categoryId);
      }
      if (effectiveFilters?.tripId) {
        query = query.eq("trip_id", effectiveFilters.tripId);
      }
      if (effectiveFilters?.domain) {
        query = query.eq("domain", effectiveFilters.domain);
      }

      const fetchLimit = effectiveFilters?.limit || TRANSACTION_FETCH_LIMIT;
      const { data, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(fetchLimit);

      if (error) {
        logger.error("Erro ao buscar transações:", error);
        throw error;
      }
      
      if (data && data.length >= TRANSACTION_FETCH_LIMIT) {
        toast.warning(
          `Muitas transações no período (${TRANSACTION_FETCH_LIMIT}+). ` +
          'Use filtros de data para ver períodos menores.',
          { duration: 6000 }
        );
      }
      
      const filteredData = (data || []).filter((tx: any) => {
        const accountCurrency = tx.account?.currency || 'BRL';
        if (accountCurrency === 'BRL') return true;
        // Se for transação em moeda estrangeira mas for pessoal/viagem, mantemos
        if (tx.domain !== 'SHARED' || tx.is_shared) return true;
        return false;
      });
      
      return filteredData as Transaction[];
    },
    enabled: !!user,
    ...defaultQueryConfig,
  });
}

export function useCreateTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      if (!user) throw new Error("User not authenticated");
      
      let cardClosingDay: number | null = null;
      if (input.account_id) {
        const { data: accData } = await supabase
          .from("accounts")
          .select("type, closing_day")
          .eq("id", input.account_id)
          .maybeSingle();
        
        if (accData && accData.type === 'CREDIT_CARD') {
          cardClosingDay = accData.closing_day || 1;
        }
      }

      const calculateCompetence = (dateStr: string) => {
        const d = dateUtils.parseDate(dateStr);
        if (cardClosingDay !== null) {
          const day = d.getUTCDate();
          let compMonth = d.getUTCMonth();
          let compYear = d.getUTCFullYear();
          if (day > cardClosingDay) {
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
        logger.info("Buscando payer_id automaticamente para o usuário atual...");
        const { data: memberData } = await supabase
          .from('family_members')
          .select('id')
          .eq('linked_user_id', user.id)
          .maybeSingle();
          
        if (memberData) {
          resolvedPayerId = memberData.id;
          input.payer_id = resolvedPayerId; // Atualizar o input para as próximas etapas
        } else {
          // Fallback final: Tentar encontrar por e-mail ou admin se necessário
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
            throw new Error("Não foi possível identificar seu perfil de membro. Por favor, vincule seu usuário a um membro da família nas configurações.");
          }
        }
      }

      // Validar payer_id se fornecido (lança erro se inválido)
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
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("amount", input.amount)
        .eq("description", (input.description || "").trim())
        .eq("date", input.date)
        .eq("account_id", input.account_id!)
        .gt("created_at", new Date(Date.now() - 10000).toISOString())
        .maybeSingle();

      if (existingTx) {
        throw new Error("⚠️ Transação duplicada detectada! Aguarde alguns segundos ou verifique se já foi lançada.");
      }

      const { splits, transaction_splits, ...transactionData } = input;

      // Parcelamento
      if (input.is_installment && input.total_installments && input.total_installments > 1) {
        const seriesId = crypto.randomUUID();
        const installmentAmount = SafeFinancialCalculator.calculateInstallment(
          input.amount,
          input.total_installments
        );
        
        // CORREÇÃO CRÍTICA: Usar dateUtils com UTC para cálculos de parcelamento (Requisito 3)
        const baseDate = dateUtils.parseDate(input.date);
        
        const transactions = [];
        for (let i = 0; i < input.total_installments; i++) {
          const installmentDate = dateUtils.addMonthsToDate(baseDate, i);
          const formattedDate = dateUtils.formatDate(installmentDate);
          const competenceDate = calculateCompetence(formattedDate);
          
          transactions.push({
            user_id: user.id,
            creator_user_id: user.id,
            ...transactionData,
            amount: installmentAmount,
            date: formattedDate,
            competence_date: competenceDate,
            description: `${input.description} (${i + 1}/${input.total_installments})`,
            current_installment: i + 1,
            series_id: seriesId,
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

          // TASK 2.3: Validar member_id ANTES de criar splits
          for (const memberId of memberIds) {
            if (memberId !== user.id) {
              await validateMemberId(memberId);
            }
          }

          for (const transaction of data) {
            const splitsToInsert = finalSplits.map(split => {
              const isUserId = !memberNames[split.member_id] && userIdToName[split.member_id];
              const actualMemberId = isUserId ? userIdToMemberId[split.member_id] : split.member_id;
              const actualUserId = isUserId ? split.member_id : memberUserIds[split.member_id];
              const actualName = isUserId ? userIdToName[split.member_id] : memberNames[split.member_id];
              
              const splitAmount = SafeFinancialCalculator.percentage(
                transaction.amount,
                split.percentage
              );
              
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

            const { error: splitsError } = await supabase
              .from("transaction_splits")
              .insert(splitsToInsert);
            
            if (splitsError) {
              logger.error("Erro ao criar splits para parcela:", splitsError);
              throw new Error(`Erro ao criar splits: ${splitsError.message}`);
            }
            
            await supabase
              .from("transactions")
              .update({ 
                is_shared: true, 
                domain: input.trip_id ? "TRAVEL" : "SHARED",
                payer_id: input.payer_id
              })
              .eq("id", transaction.id);
          }
        }

        return data;
      }

      // Transação única
      // TASK 2.5: Habilitar e Testar Categorização Automática
      // Tentar categorizar automaticamente, mas não bloquear se falhar
      let categoryId = input.category_id;
      
      if (!categoryId && input.type === 'EXPENSE') {
        try {
          const prediction = await CategoryPredictionService.predictCategory(
            input.description,
            user.id,
            'expense'
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
          // Não bloquear transação se categorização falhar
          logger.warn('Categorização automática falhou, continuando sem categoria', { error });
        }
      }

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          creator_user_id: user.id,
          competence_date: input.competence_date || calculateCompetence(input.date),
          ...transactionData,
          category_id: categoryId,
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

        const splitsToInsert = finalSplits.map(split => {
          const isUserId = !memberNames[split.member_id] && userIdToName[split.member_id];
          const actualMemberId = isUserId ? userIdToMemberId[split.member_id] : split.member_id;
          const actualUserId = isUserId ? split.member_id : memberUserIds[split.member_id];
          const actualName = isUserId ? userIdToName[split.member_id] : memberNames[split.member_id];
          
          return {
            transaction_id: data.id,
            member_id: actualMemberId,
            user_id: actualUserId,
            percentage: split.percentage,
            amount: split.amount,
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
        } else {
          await supabase
            .from("transactions")
            .update({ 
              is_shared: true, 
              domain: input.trip_id ? "TRAVEL" : "SHARED",
              payer_id: input.payer_id
            })
            .eq("id", data.id);
        }
      }

      // Se for compartilhada e criada com sucesso, notificar os outros membros do split
      if (data && (data.is_shared || data.domain === 'SHARED' || input.domain === 'SHARED')) {
        try {
          const { data: splitsData } = await supabase
            .from("transaction_splits")
            .select("user_id")
            .eq("transaction_id", data.id);
          
          if (splitsData && splitsData.length > 0) {
            const otherUserIds = Array.from(new Set(splitsData.map(s => s.user_id).filter(uid => uid && uid !== user?.id)));
            for (const otherUserId of otherUserIds) {
              await createNotification({
                user_id: otherUserId,
                type: 'SHARED_EXPENSE',
                title: 'Nova Transação Compartilhada',
                message: `${user?.user_metadata?.name || user?.email || 'Alguém'} criou a transação compartilhada "${data.description}".`,
                icon: '🤝',
                priority: 'NORMAL'
              }).catch(e => console.error("Erro ao criar notificação de criação compartilhada:", e));
            }
          }
        } catch (notificationError) {
          console.error("Erro ao notificar criação de compartilhada:", notificationError);
        }
      }

      return data as Transaction;
    },
    onSuccess: async (_data, variables) => {
      await invalidateFinancialQueries(queryClient);
      await invalidateSharedQueries(queryClient);
      await invalidateTripQueries(queryClient);
      transactionToasts.created();
      
      // ✅ INTELIGÊNCIA FINANCEIRA: Verificar orçamentos e saldo em tempo real
      if (user?.id) {
        // Se for um pagamento de fatura (TRANSFER para conta de cartão)
        if (variables?.type === 'TRANSFER' && variables?.destination_account_id) {
          await dismissRelatedNotifications(user.id, variables.destination_account_id, 'credit_card');
        }
        
        // Disparar geração de notificações (async, não bloqueia o UI)
        generateAllNotifications(user.id).catch(e => logger.error('Erro ao gerar notificações pós-transação', e));
      }
    },
    onError: (error) => {
      transactionToasts.error('criar', error);
    },
  });
}

export function useDeleteTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Buscar a transação antes de deletar
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("is_shared, domain, description, user_id")
        .eq("id", id)
        .maybeSingle();

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

      // 3. Deletar a transação
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // 4. Notificar outros membros
      if (existingTx && otherUserIds.length > 0) {
        try {
          for (const otherUserId of otherUserIds) {
            await createNotification({
              user_id: otherUserId,
              type: 'SHARED_EXPENSE',
              title: 'Transação Excluída',
              message: `${user?.user_metadata?.name || user?.email || 'Alguém'} excluiu a transação compartilhada "${existingTx.description}".`,
              icon: '❌',
              priority: 'NORMAL'
            }).catch(e => console.error("Erro ao criar notificação de exclusão compartilhada:", e));
          }
        } catch (notificationError) {
          console.error("Erro ao tentar enviar notificação de exclusão compartilhada:", notificationError);
        }
      }
    },
    onSuccess: async () => {
      await invalidateFinancialQueries(queryClient);
      await invalidateSharedQueries(queryClient);
      await invalidateTripQueries(queryClient);
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
      await invalidateFinancialQueries(queryClient);
      await invalidateSharedQueries(queryClient);
      await invalidateTripQueries(queryClient);
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

export function useUpdateTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Transaction> & { id: string }) => {
      // 1. Buscar a transação existente antes de atualizar para saber se é compartilhada e obter detalhes
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("is_shared, domain, description, user_id, account_id, date")
        .eq("id", id)
        .maybeSingle();

      let cardClosingDay: number | null = null;
      const accountId = input.account_id !== undefined ? input.account_id : (existingTx ? (existingTx as any).account_id : null);
      const txDate = input.date !== undefined ? input.date : (existingTx ? (existingTx as any).date : null);
      
      if (accountId) {
        const { data: accData } = await supabase
          .from("accounts")
          .select("type, closing_day")
          .eq("id", accountId)
          .maybeSingle();
        
        if (accData && accData.type === 'CREDIT_CARD') {
          cardClosingDay = accData.closing_day || 1;
        }
      }
      
      if (txDate) {
        const d = dateUtils.parseDate(txDate);
        if (cardClosingDay !== null) {
          const day = d.getUTCDate();
          let compMonth = d.getUTCMonth();
          let compYear = d.getUTCFullYear();
          if (day > cardClosingDay) {
            compMonth++;
            if (compMonth > 11) {
              compMonth = 0;
              compYear++;
            }
          }
          input.competence_date = `${compYear}-${String(compMonth + 1).padStart(2, '0')}-01`;
        } else {
          input.competence_date = dateUtils.getCompetenceDate(d);
        }
      }

      const { data, error } = await supabase
        .from("transactions")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        logger.error("Erro ao atualizar transação:", error);
        throw error;
      }

      // 2. Se for uma transação compartilhada e foi editada com sucesso, notificar o outro membro
      if (data && (data.is_shared || data.domain === 'SHARED' || existingTx?.domain === 'SHARED')) {
        try {
          // Buscar splits desta transação para encontrar os outros membros
          const { data: splitsData } = await supabase
            .from("transaction_splits")
            .select("user_id, name")
            .eq("transaction_id", id);
          
          if (splitsData && splitsData.length > 0) {
            // Identificar outros usuários envolvidos
            const otherUserIds = Array.from(new Set(splitsData.map(s => s.user_id).filter(uid => uid && uid !== user?.id)));
            
            for (const otherUserId of otherUserIds) {
              await createNotification({
                user_id: otherUserId,
                type: 'SHARED_EXPENSE',
                title: 'Transação Editada',
                message: `${user?.user_metadata?.name || user?.email || 'Alguém'} editou a transação compartilhada "${data.description}".`,
                icon: '✏️',
                priority: 'NORMAL'
              }).catch(e => console.error("Erro ao criar notificação de edição compartilhada:", e));
            }
          }
        } catch (notificationError) {
          console.error("Erro ao tentar enviar notificação de edição compartilhada:", notificationError);
        }
      }

      return data as Transaction;
    },
    onSuccess: async () => {
      await invalidateFinancialQueries(queryClient);
      await invalidateSharedQueries(queryClient);
      await invalidateTripQueries(queryClient);
      transactionToasts.updated();
      
      // ✅ INTELIGÊNCIA FINANCEIRA: Atualizar orçamentos e saldos em tempo real
      if (user?.id) {
        generateAllNotifications(user.id).catch(e => logger.error('Erro ao gerar notificações pós-atualização', e));
      }
    },
    onError: (error) => {
      transactionToasts.error('atualizar', error);
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
      await invalidateFinancialQueries(queryClient);
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

export function useFinancialSummary(month: Date) {
  const { user } = useAuth();
  
  const startDate = dateFns.format(dateFns.startOfMonth(month), 'yyyy-MM-dd');
  const endDate = dateFns.format(dateFns.endOfMonth(month), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ["financial-summary", user?.id, startDate, endDate],
    queryFn: async () => {
      try {
        const data = await callRPCWithRetry('get_monthly_financial_summary', {
          p_user_id: user!.id,
          p_start_date: startDate,
          p_end_date: endDate
        });

        const summary = (Array.isArray(data) ? data[0] : data) as any;
        return {
          balance: summary?.total_balance || 0,
          income: summary?.total_income || 0,
          expenses: summary?.total_expenses || 0,
          savings: summary?.net_savings || 0
        };
      } catch (error) {
        logger.error("Erro ao buscar resumo financeiro:", error);
        return { balance: 0, income: 0, expenses: 0, savings: 0 };
      }
    },
    enabled: !!user,
    ...defaultQueryConfig,
  });
}
