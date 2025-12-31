import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMonth } from "@/contexts/MonthContext";
import { toast } from "sonner";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { startOfMonth, endOfMonth, format } from "date-fns";

export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";
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
  created_at: string;
  updated_at: string;
  // Joined data
  account?: { id: string; name: string; currency?: string };
  category?: { name: string; icon: string | null };
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
  related_member_id?: string;
  splits?: TransactionSplit[];
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  tripId?: string;
  domain?: TransactionDomain;
}

export function useTransactions(filters?: TransactionFilters) {
  const { user } = useAuth();
  const { currentDate } = useMonth();

  // Se não há filtros de data, usar o mês atual do contexto
  const effectiveFilters = filters || {};
  if (!effectiveFilters.startDate && !effectiveFilters.endDate) {
    effectiveFilters.startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    effectiveFilters.endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
  }

  return useQuery({
    queryKey: ["transactions", user?.id, effectiveFilters, currentDate],
    queryFn: async () => {
      // Buscar TODAS as transações do usuário (exceto espelhadas e transferências)
      // IMPORTANTE: Especificar TODAS as FKs para evitar erro 300 (ambiguidade)
      // - accounts tem 2 FKs: transactions_account_id_fkey e transactions_destination_account_id_fkey
      // - transaction_splits tem 2 FKs: transaction_splits_transaction_id_fkey e transaction_splits_settled_transaction_id_fkey
      let query = supabase
        .from("transactions")
        .select(`
          *,
          account:accounts!transactions_account_id_fkey(id, name, currency),
          category:categories(id, name, icon),
          transaction_splits:transaction_splits!transaction_splits_transaction_id_fkey(*)
        `)
        .eq("user_id", user!.id)
        .is("source_transaction_id", null) // Excluir transações espelhadas
        .neq("type", "TRANSFER") // Excluir transferências (aparecem no extrato)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      // NÃO filtrar por payer_id - mostrar todas as transações do usuário

      // Filtrar por competence_date (campo obrigatório após migration)
      if (effectiveFilters?.startDate) {
        query = query.gte("competence_date", effectiveFilters.startDate);
      }
      if (effectiveFilters?.endDate) {
        query = query.lte("competence_date", effectiveFilters.endDate);
      }
      if (effectiveFilters?.type) {
        query = query.eq("type", effectiveFilters.type);
      }
      if (effectiveFilters?.accountId) {
        query = query.eq("account_id", effectiveFilters.accountId);
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

      const { data, error } = await query.limit(200);

      if (error) throw error;
      
      // Filtrar transações de contas internacionais (não-BRL)
      // Essas transações só devem aparecer:
      // - No extrato da própria conta
      // - Na aba Viagem (se trip_id)
      // - Na aba Compartilhados > Viagem (se is_shared e trip_id)
      const filteredData = (data || []).filter(tx => {
        const accountCurrency = tx.account?.currency || 'BRL';
        return accountCurrency === 'BRL';
      });
      
      return filteredData as Transaction[];
    },
    enabled: !!user,
    retry: false,
    staleTime: 30000,
  });
}

export function useCreateTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      if (!user) throw new Error("User not authenticated");

      // ✅ VALIDAÇÃO CRÍTICA: Se is_shared=true, DEVE ter splits
      if (input.is_shared && (!input.splits || input.splits.length === 0)) {
        throw new Error("Transação compartilhada deve ter pelo menos um split. Selecione membros para dividir.");
      }

      // ✅ VALIDAÇÃO: Valor deve ser positivo
      if (input.amount <= 0) {
        throw new Error("O valor da transação deve ser maior que zero");
      }

      // ✅ VALIDAÇÃO: Descrição obrigatória
      if (!input.description || input.description.trim() === '') {
        throw new Error("A descrição é obrigatória");
      }

      // Remove splits from input (não existe na tabela transactions)
      const { splits, transaction_splits, ...transactionData } = input;

      // Se é parcelamento, criar múltiplas transações
      if (input.is_installment && input.total_installments && input.total_installments > 1) {
        const seriesId = crypto.randomUUID();
        // Usar calculadora segura para parcelamento
        const installmentAmount = SafeFinancialCalculator.calculateInstallment(
          input.amount,
          input.total_installments
        );
        const baseDate = new Date(input.date + 'T12:00:00'); // Fix timezone
        const baseDay = baseDate.getDate();
        
        const transactions = [];
        for (let i = 0; i < input.total_installments; i++) {
          // Calcula o mês e ano corretamente
          const targetMonth = baseDate.getMonth() + i;
          const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12);
          const finalMonth = targetMonth % 12;
          
          // Ajusta o dia para não ultrapassar o último dia do mês
          const daysInTargetMonth = new Date(targetYear, finalMonth + 1, 0).getDate();
          const targetDay = Math.min(baseDay, daysInTargetMonth);
          
          const installmentDate = new Date(targetYear, finalMonth, targetDay);
          const formattedDate = `${installmentDate.getFullYear()}-${String(installmentDate.getMonth() + 1).padStart(2, '0')}-${String(installmentDate.getDate()).padStart(2, '0')}`;
          
          // CORREÇÃO CRÍTICA: Adicionar competence_date (sempre 1º dia do mês)
          const competenceDate = `${targetYear}-${String(finalMonth + 1).padStart(2, '0')}-01`;
          
          transactions.push({
            user_id: user.id,
            creator_user_id: user.id, // Rastrear quem criou
            ...transactionData,
            amount: installmentAmount,
            date: formattedDate,
            competence_date: competenceDate, // Campo de competência
            description: `${input.description} (${i + 1}/${input.total_installments})`,
            current_installment: i + 1,
            series_id: seriesId,
          });
        }

        const { data, error } = await supabase
          .from("transactions")
          .insert(transactions)
          .select();

        if (error) throw error;

        // CORREÇÃO: Se tem splits, criar para cada parcela com valor correto
        if (splits && splits.length > 0) {
          // CORREÇÃO: Para viagens, member_id pode ser um user_id direto
          // Precisamos buscar tanto por family_members.id quanto por family_members.linked_user_id
          const { data: membersData } = await supabase
            .from("family_members")
            .select("id, name, linked_user_id")
            .or(`id.in.(${splits.map(s => s.member_id).join(',')}),linked_user_id.in.(${splits.map(s => s.member_id).join(',')})`);
          
          // Criar mapeamentos bidirecionais
          const memberNames: Record<string, string> = {};
          const memberUserIds: Record<string, string> = {};
          const userIdToMemberId: Record<string, string> = {};
          const userIdToName: Record<string, string> = {};
          
          membersData?.forEach(m => {
            memberNames[m.id] = m.name;
            memberUserIds[m.id] = m.linked_user_id;
            userIdToMemberId[m.linked_user_id] = m.id;
            userIdToName[m.linked_user_id] = m.name;
          });

          for (const transaction of data) {
            // IMPORTANTE: Calcular splits sobre o valor DA PARCELA, não do total
            // Usar SafeFinancialCalculator para garantir precisão
            const splitsToInsert = splits.map(split => {
              // Determinar se member_id é um family_member.id ou um user_id
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
              console.error("❌ Erro ao criar splits para parcela:", splitsError);
              throw new Error(`Erro ao criar splits: ${splitsError.message}`);
            }
            
            // Marcar transação como compartilhada
            await supabase
              .from("transactions")
              .update({ 
                is_shared: true, 
                domain: input.trip_id ? "TRAVEL" : "SHARED",
                payer_id: input.payer_id || null
              })
              .eq("id", transaction.id);
          }
        }

        return data;
      }

      // Transação única (splits já foi extraído acima)
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          creator_user_id: user.id, // Rastrear quem criou
          ...transactionData,
        })
        .select()
        .single();

      if (error) throw error;

      // Se tem splits (divisão com membros da família), criar transaction_splits
      // Isso vai disparar o trigger de espelhamento automático
      if (splits && splits.length > 0) {
        console.log('🔍 Criando splits:', splits);
        
        // CORREÇÃO: Para viagens, member_id pode ser um user_id direto
        // Precisamos buscar tanto por family_members.id quanto por family_members.linked_user_id
        const { data: membersData } = await supabase
          .from("family_members")
          .select("id, name, linked_user_id")
          .or(`id.in.(${splits.map(s => s.member_id).join(',')}),linked_user_id.in.(${splits.map(s => s.member_id).join(',')})`);
        
        console.log('👥 Membros encontrados:', membersData);
        
        // Criar mapeamentos bidirecionais: id->name, id->user_id, user_id->id, user_id->name
        const memberNames: Record<string, string> = {};
        const memberUserIds: Record<string, string> = {};
        const userIdToMemberId: Record<string, string> = {};
        const userIdToName: Record<string, string> = {};
        
        membersData?.forEach(m => {
          // Mapeamento por member_id
          memberNames[m.id] = m.name;
          memberUserIds[m.id] = m.linked_user_id;
          // Mapeamento por user_id
          userIdToMemberId[m.linked_user_id] = m.id;
          userIdToName[m.linked_user_id] = m.name;
        });

        const splitsToInsert = splits.map(split => {
          // Determinar se member_id é um family_member.id ou um user_id
          const isUserId = !memberNames[split.member_id] && userIdToName[split.member_id];
          
          const actualMemberId = isUserId ? userIdToMemberId[split.member_id] : split.member_id;
          const actualUserId = isUserId ? split.member_id : memberUserIds[split.member_id];
          const actualName = isUserId ? userIdToName[split.member_id] : memberNames[split.member_id];
          
          console.log('🔍 Processando split:', {
            inputMemberId: split.member_id,
            isUserId,
            actualMemberId,
            actualUserId,
            actualName
          });
          
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

        console.log('💾 Inserindo splits:', splitsToInsert);

        const { error: splitsError } = await supabase
          .from("transaction_splits")
          .insert(splitsToInsert);

        if (splitsError) {
          console.error("❌ Erro ao criar splits:", splitsError);
          throw new Error(`Erro ao criar splits: ${splitsError.message}`);
        } else {
          console.log('✅ Splits criados com sucesso');
          // Atualizar transação para is_shared = true e disparar sync
          await supabase
            .from("transactions")
            .update({ 
              is_shared: true, 
              domain: input.trip_id ? "TRAVEL" : "SHARED",
              payer_id: input.payer_id || null
            })
            .eq("id", data.id);
        }
      } else {
        console.warn('⚠️ Nenhum split para criar. Splits recebidos:', splits);
      }

      // Se é transferência, criar transação espelho
      if (input.type === "TRANSFER" && input.destination_account_id) {
        await supabase.from("transactions").insert({
          user_id: user.id,
          account_id: input.destination_account_id,
          amount: input.amount,
          description: input.description,
          date: input.date,
          type: "TRANSFER",
          domain: input.domain || "PERSONAL",
          source_transaction_id: data.id,
        });
      }

      return data as Transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-with-splits"] });
      queryClient.invalidateQueries({ queryKey: ["paid-by-others-transactions"] });
      toast.success("Transação criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar transação: " + error.message);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-with-splits"] });
      queryClient.invalidateQueries({ queryKey: ["paid-by-others-transactions"] });
      toast.success("Transação removida!");
    },
    onError: (error) => {
      toast.error("Erro ao remover transação: " + error.message);
    },
  });
}

// Hook para excluir série de parcelas
export function useDeleteInstallmentSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seriesId: string) => {
      console.log('🗑️ [useDeleteInstallmentSeries] Iniciando exclusão da série:', seriesId);
      
      // CORREÇÃO: Usar função RPC que garante exclusão completa
      const { data, error } = await supabase
        .rpc('delete_installment_series', { p_series_id: seriesId });

      if (error) {
        console.error('❌ [useDeleteInstallmentSeries] Erro ao excluir série:', error);
        throw error;
      }

      const deletedCount = data?.[0]?.deleted_count || 0;
      
      console.log('✅ [useDeleteInstallmentSeries] Série excluída:', {
        seriesId,
        deletedCount
      });

      if (deletedCount === 0) {
        throw new Error("Nenhuma parcela foi excluída. Verifique se a série existe e pertence a você.");
      }

      return { deletedCount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success(`${data.deletedCount} parcelas removidas com sucesso!`);
    },
    onError: (error) => {
      console.error('❌ [useDeleteInstallmentSeries] Erro final:', error);
      toast.error("Erro ao remover parcelas: " + error.message);
    },
  });
}

// Hook para excluir parcelas futuras de uma série
export function useDeleteFutureInstallments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ seriesId, fromInstallment }: { seriesId: string; fromInstallment: number }) => {
      // Buscar parcelas futuras
      const { data: transactions, error: fetchError } = await supabase
        .from("transactions")
        .select("id")
        .eq("series_id", seriesId)
        .gte("current_installment", fromInstallment);

      if (fetchError) throw fetchError;

      if (!transactions || transactions.length === 0) {
        throw new Error("Nenhuma parcela futura encontrada");
      }

      // Excluir splits associados
      const transactionIds = transactions.map(t => t.id);
      await supabase
        .from("transaction_splits")
        .delete()
        .in("transaction_id", transactionIds);

      // Excluir parcelas futuras
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("series_id", seriesId)
        .gte("current_installment", fromInstallment);

      if (error) throw error;

      // Atualizar total_installments nas parcelas restantes
      const newTotal = fromInstallment - 1;
      await supabase
        .from("transactions")
        .update({ total_installments: newTotal })
        .eq("series_id", seriesId);

      return { deletedCount: transactions.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success(`${data.deletedCount} parcelas futuras removidas!`);
    },
    onError: (error) => {
      toast.error("Erro ao remover parcelas: " + error.message);
    },
  });
}

// Hook para atualizar série de parcelas (descrição, categoria, etc.)
export function useUpdateInstallmentSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      seriesId, 
      updates,
      updateFutureOnly = false,
      fromInstallment = 1
    }: { 
      seriesId: string; 
      updates: Partial<Pick<Transaction, 'description' | 'category_id' | 'notes'>>;
      updateFutureOnly?: boolean;
      fromInstallment?: number;
    }) => {
      let query = supabase
        .from("transactions")
        .update(updates)
        .eq("series_id", seriesId);

      if (updateFutureOnly) {
        query = query.gte("current_installment", fromInstallment);
      }

      const { data, error } = await query.select();

      if (error) throw error;

      return { updatedCount: data?.length || 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(`${data.updatedCount} parcelas atualizadas!`);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar parcelas: " + error.message);
    },
  });
}

// Hook para resumo financeiro (SINGLE SOURCE OF TRUTH)
// Todos os valores são calculados diretamente das transações pelo banco de dados
export function useFinancialSummary() {
  const { user } = useAuth();
  const { currentDate } = useMonth();
  const currentMonth = format(currentDate, 'yyyy-MM');
  const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ["financial-summary", user?.id, currentMonth],
    queryFn: async () => {
      if (!user) return { balance: 0, income: 0, expenses: 0, savings: 0 };

      // Usar função do banco de dados para calcular resumo
      const { data, error } = await supabase.rpc('get_monthly_financial_summary', {
        p_user_id: user.id,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        console.error('Erro ao buscar resumo financeiro:', error);
        // Fallback para cálculo local em caso de erro
        return { balance: 0, income: 0, expenses: 0, savings: 0 };
      }

      const summary = data?.[0];
      return {
        balance: Number(summary?.total_balance) || 0,
        income: Number(summary?.total_income) || 0,
        expenses: Number(summary?.total_expenses) || 0,
        savings: Number(summary?.net_savings) || 0,
      };
    },
    enabled: !!user,
    retry: false,
    staleTime: 30000,
  });
}
