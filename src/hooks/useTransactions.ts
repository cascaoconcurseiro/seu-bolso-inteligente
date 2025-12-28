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
  account?: { name: string; bank_color: string | null };
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
      let query = supabase
        .from("transactions")
        .select(`
          *,
          account:accounts!account_id(name, bank_color),
          category:categories(name, icon),
          transaction_splits(*)
        `)
        .eq("user_id", user!.id)
        .is("source_transaction_id", null) // Excluir transações espelhadas da lista principal
        .or(`payer_id.is.null,payer_id.eq.${user!.id}`) // Excluir transações pagas por outros (aparecem em Compartilhados)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      // CORREÇÃO CRÍTICA: Filtrar por COMPETÊNCIA, não por data da transação
      // Isso evita acúmulo de parcelas ao navegar pelos meses
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

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
    retry: false, // Não tentar novamente se falhar
    staleTime: 30000, // Cache por 30 segundos
  });
}

export function useCreateTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      if (!user) throw new Error("User not authenticated");

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
          const { data: membersData } = await supabase
            .from("family_members")
            .select("id, name")
            .in("id", splits.map(s => s.member_id));
          
          const memberNames: Record<string, string> = {};
          membersData?.forEach(m => {
            memberNames[m.id] = m.name;
          });

          for (const transaction of data) {
            // IMPORTANTE: Calcular splits sobre o valor DA PARCELA, não do total
            // Usar SafeFinancialCalculator para garantir precisão
            const splitsToInsert = splits.map(split => {
              const splitAmount = SafeFinancialCalculator.percentage(
                transaction.amount,
                split.percentage
              );
              
              return {
                transaction_id: transaction.id,
                member_id: split.member_id,
                percentage: split.percentage,
                amount: splitAmount,
                name: memberNames[split.member_id] || "Membro",
                is_settled: false,
              };
            });

            await supabase.from("transaction_splits").insert(splitsToInsert);
            
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
        // Buscar nomes dos membros para popular o campo name
        const { data: membersData } = await supabase
          .from("family_members")
          .select("id, name")
          .in("id", splits.map(s => s.member_id));
        
        const memberNames: Record<string, string> = {};
        membersData?.forEach(m => {
          memberNames[m.id] = m.name;
        });

        const splitsToInsert = splits.map(split => ({
          transaction_id: data.id,
          member_id: split.member_id,
          percentage: split.percentage,
          amount: split.amount,
          name: memberNames[split.member_id] || "Membro",
          is_settled: false,
        }));

        const { error: splitsError } = await supabase
          .from("transaction_splits")
          .insert(splitsToInsert);

        if (splitsError) {
          console.error("Erro ao criar splits:", splitsError);
        } else {
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

// Hook para resumo financeiro
export function useFinancialSummary() {
  const { user } = useAuth();
  const { currentDate } = useMonth();
  const currentMonth = format(currentDate, 'yyyy-MM');

  return useQuery({
    queryKey: ["financial-summary", user?.id, currentMonth],
    queryFn: async () => {
      if (!user) return { balance: 0, income: 0, expenses: 0, savings: 0 };

      // Buscar contas para saldo total
      const { data: accounts } = await supabase
        .from("accounts")
        .select("balance, type")
        .eq("user_id", user.id)
        .eq("is_active", true);

      // Buscar transações do mês
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, type, source_transaction_id, payer_id")
        .eq("user_id", user.id)
        .is("source_transaction_id", null) // Excluir espelhos do cálculo
        .or(`payer_id.is.null,payer_id.eq.${user.id}`) // Excluir transações pagas por outros
        .gte("competence_date", startDate) // Filtrar por competência
        .lte("competence_date", endDate);

      const balance = accounts?.reduce((sum, acc) => {
        if (acc.type !== "CREDIT_CARD") {
          return sum + Number(acc.balance);
        }
        return sum;
      }, 0) || 0;

      const income = transactions?.reduce((sum, tx) => {
        if (tx.type === "INCOME") return sum + Number(tx.amount);
        return sum;
      }, 0) || 0;

      const expenses = transactions?.reduce((sum, tx) => {
        if (tx.type === "EXPENSE") return sum + Number(tx.amount);
        return sum;
      }, 0) || 0;

      return {
        balance,
        income,
        expenses,
        savings: income - expenses,
      };
    },
    enabled: !!user,
    retry: false, // Não tentar novamente se falhar
    staleTime: 30000, // Cache por 30 segundos
  });
}
