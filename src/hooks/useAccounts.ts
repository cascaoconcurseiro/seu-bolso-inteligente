import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { invalidateAccountQueries } from "@/utils/queryInvalidation";
import { accountToasts } from "@/utils/toastMessages";
import { defaultQueryConfig } from "@/utils/queryConfig";
import { logger } from "@/utils/logger";
import { callRPCWithRetry } from "@/utils/supabaseHelpers";
import { Database } from "@/integrations/supabase/types";

export type AccountType =
  | "CHECKING"
  | "SAVINGS"
  | "CREDIT_CARD"
  | "INVESTMENT"
  | "CASH"
  | "EMERGENCY_FUND"
  | "GLOBAL_ACCOUNT";

/**
 * Retorna o nome de exibição da conta baseado no tipo e se é internacional.
 * NUNCA usar o type bruto para exibição — sempre usar esta função.
 */
export function getAccountDisplayName(type: AccountType, isInternational: boolean | null): string {
  if (isInternational) {
    switch (type) {
      case "CHECKING":
        return "Conta Internacional";
      case "GLOBAL_ACCOUNT":
        return "Conta Global";
      case "SAVINGS":
        return "Poupança Internacional";
      case "CREDIT_CARD":
        return "Cartão Internacional";
      case "INVESTMENT":
        return "Investimento Internacional";
      case "CASH":
        return "Dinheiro Estrangeiro";
      default:
        return "Conta Internacional";
    }
  }
  switch (type) {
    case "CHECKING":
      return "Conta Corrente";
    case "GLOBAL_ACCOUNT":
      return "Conta Global";
    case "SAVINGS":
      return "Poupança";
    case "CREDIT_CARD":
      return "Cartão de Crédito";
    case "INVESTMENT":
      return "Investimento";
    case "CASH":
      return "Dinheiro";
    case "EMERGENCY_FUND":
      return "Reserva de Emergência";
    default:
      return type;
  }
}

/**
 * Retorna o ícone da conta baseado no tipo e internacionalidade.
 */
export function getAccountIcon(type: AccountType, isInternational: boolean | null): string {
  if (isInternational) return "🌍";
  switch (type) {
    case "CHECKING":
      return "🏦";
    case "GLOBAL_ACCOUNT":
      return "🌍";
    case "SAVINGS":
      return "💰";
    case "CREDIT_CARD":
      return "💳";
    case "INVESTMENT":
      return "📈";
    case "CASH":
      return "💵";
    case "EMERGENCY_FUND":
      return "🛡️";
    default:
      return "🏦";
  }
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  bank_id: string | null;
  bank_color: string | null;
  currency: string;
  is_international: boolean | null;
  is_active: boolean;
  closing_day: number | null;
  due_day: number | null;
  credit_limit: number | null;
  yield_rate: number | null;
  yield_type: string | null;
  created_at: string;
  updated_at: string;
  hide_balance?: boolean;
  is_archived?: boolean | null;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  balance?: number;
  bank_id?: string | null;
  bank_color?: string | null;
  currency?: string;
  is_international?: boolean;
  closing_day?: number;
  due_day?: number;
  credit_limit?: number;
  yield_rate?: number | null;
  yield_type?: string | null;
  hide_balance?: boolean;
}

// Type for credit card invoice transactions
type InvoiceTransaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  category?: Database["public"]["Tables"]["categories"]["Row"] | null;
};

export interface CreditCardInvoiceResponse {
  total: number;
  tx_count: number;
  transactions: InvoiceTransaction[];
}

export interface AccountDependenciesResponse {
  can_delete: boolean;
  total_transactions: number;
  future_installments: number;
  open_shared_expenses: number;
  linked_goals: number;
}

export function useAccounts(includeArchived = false) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["accounts", user?.id, includeArchived],
    queryFn: async () => {
      if (!user) return [];

      const query = supabase
        .from("accounts")
        .select(
          "id,name,type,currency,bank_id,bank_logo,bank_color,balance,initial_balance,is_active,is_archived,closing_day,due_day,credit_limit,is_international,hide_balance,created_at,updated_at,user_id,closing_day_mode,yield_rate,yield_type"
        )
        .eq("user_id", user.id)
        .eq("is_active", true);

      const { data: ownAccounts, error } = await query;

      if (error) {
        logger.error("Erro ao buscar contas", error);
        throw error;
      }

      // Buscar cartões compartilhados onde o usuário atual foi convidado e aceitou
      const { data: sharedData, error: sharedError } = await supabase
        .from("shared_credit_cards")
        .select("accounts(*)")
        .eq("user_id", user.id)
        .eq("status", "ACCEPTED");

      let allAccounts = [...(ownAccounts || [])];

      if (sharedData && !sharedError) {
        const sharedAccounts = sharedData
          .map((sc: any /* any */) => {
            const acc = Array.isArray(sc.accounts) ? sc.accounts[0] : sc.accounts;
            if (acc) {
              // Override do limite de crédito com o limite personalizado do convite, se existir
              if (sc.credit_limit !== null && sc.credit_limit !== undefined) {
                acc.credit_limit = sc.credit_limit;
              }
              // Marca como compartilhado (útil para a UI saber se o usuário não é o dono original)
              acc.is_shared_with_me = true;

              // Zera o balance global da conta para que os gastos do dono original
              // não apareçam como dívidas para o convidado (data leak).
              // O saldo do convidado deve ser calculado apenas pelos seus próprios lançamentos.
              acc.balance = 0;
            }
            return acc;
          })
          .filter(Boolean)
          // Assegurar que só adicione cartões que não estão deletados e estão ativos
          .filter((a: any /* any */) => a.is_active === true && a.deleted !== true);

        allAccounts = [...allAccounts, ...sharedAccounts];
      }

      if (!includeArchived) {
        allAccounts = allAccounts.filter(
          (a) => a.is_archived === false || a.is_archived === null || a.is_archived === undefined
        );
      }

      // Ordenar por nome
      allAccounts.sort((a, b) => a.name.localeCompare(b.name));

      return allAccounts as Account[];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useCreditCardInvoice(
  accountId: string | null,
  monthStart: string,
  monthEnd: string
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["credit-card-invoice", accountId, monthStart, monthEnd],
    queryFn: async () => {
      try {
        const data = await callRPCWithRetry("get_credit_card_invoice", {
          p_account_id: accountId,
          p_user_id: user?.id,
          p_month_start: monthStart,
          p_month_end: monthEnd,
        });

        return data as CreditCardInvoiceResponse;
      } catch (error) {
        logger.error("Erro ao buscar fatura do cartão", error);
        return { total: 0, tx_count: 0, transactions: [] };
      }
    },
    enabled: !!user && !!accountId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreditCardClosingOverride(accountId: string | null, referenceDate: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["credit-card-closing-override", accountId, referenceDate],
    queryFn: async () => {
      try {
        if (!accountId) return null;
        const { data, error } = await supabase
          .from("credit_card_closing_overrides")
          .select("closing_date")
          .eq("account_id", accountId)
          .eq("reference_date", referenceDate)
          .maybeSingle();

        if (error) throw error;
        return data?.closing_date || null;
      } catch (error) {
        logger.error("Erro ao buscar override de fechamento", error);
        return null;
      }
    },
    enabled: !!user && !!accountId && !!referenceDate,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      if (!user) throw new Error("User not authenticated");

      // Criar conta com saldo zero (o saldo será calculado pelo trigger após criar a transação)
      const { data, error } = await supabase
        .from("accounts")
        .insert({
          user_id: user.id,
          name: input.name,
          type: input.type,
          balance: 0, // Sempre começa com zero, trigger calcula
          initial_balance: 0, // Definido como 0 para evitar duplicação, já que criamos a transação histórica abaixo
          bank_id: input.bank_id || null,
          bank_color: input.bank_color || null,
          currency: input.currency || "BRL",
          is_international: input.is_international || false,
          closing_day: input.closing_day || null,
          due_day: input.due_day || null,
          credit_limit: input.credit_limit || null,
          yield_rate: input.yield_rate || null,
          yield_type: input.yield_type || null,
          hide_balance: input.hide_balance || false,
        })
        .select()
        .single();

      if (error) throw error;

      // Se tem saldo inicial e não é cartão de crédito, criar transação de saldo inicial
      // O trigger vai atualizar o saldo da conta automaticamente
      if (input.balance && input.balance > 0 && input.type !== "CREDIT_CARD") {
        // Buscar categoria "Saldo Inicial"
        const { data: categoryData } = await supabase
          .from("categories")
          .select("id")
          .eq("user_id", user.id)
          .eq("name", "Saldo Inicial")
          .eq("type", "income")
          .single();

        const today = new Date();
        const dateStr = today.toISOString().split("T")[0];
        const competenceStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

        const { error: txError } = await supabase.from("transactions").insert({
          user_id: user.id,
          creator_user_id: user.id,
          account_id: data.id,
          type: "INCOME",
          amount: input.balance,
          description: "Saldo inicial",
          category_id: categoryData?.id || null, // Usar categoria se encontrada
          date: dateStr,
          competence_date: competenceStr,
          domain: "PERSONAL",
          is_shared: false,
          is_installment: false,
          is_recurring: false,
          currency: input.currency || "BRL", // Usar a moeda da conta
        });

        if (txError) {
          logger.error("Erro ao criar transação de saldo inicial", txError);
          throw new Error("Erro ao criar saldo inicial: " + txError.message);
        }
      }

      // Buscar conta atualizada (com saldo calculado pelo trigger)
      const { data: updatedAccount, error: fetchError } = await supabase
        .from("accounts")
        .select(
          "id,name,type,currency,bank_id,bank_logo,bank_color,balance,initial_balance,is_active,is_archived,closing_day,due_day,credit_limit,is_international,hide_balance,created_at,updated_at,user_id"
        )
        .eq("id", data.id)
        .single();

      if (fetchError) throw fetchError;
      return updatedAccount;
    },
    onSuccess: async () => {
      await invalidateAccountQueries(queryClient);
      accountToasts.created();
    },
    onError: (error) => {
      accountToasts.error("criar", error);
    },
  });
}

export function useUpdateAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: async ({ id, ...input }: Partial<Account> & { id: string }) => {
      await queryClient.cancelQueries({ queryKey: ["accounts"] });
      const previousData = queryClient.getQueriesData<Account[]>({ queryKey: ["accounts"] });
      queryClient.setQueriesData<Account[]>(
        { queryKey: ["accounts"] },
        (old) => old?.map((a) => (a.id === id ? { ...a, ...input } : a)) ?? []
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      context?.previousData?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      accountToasts.error("atualizar", _err as Error);
    },
    mutationFn: async ({ id, ...input }: Partial<Account> & { id: string }) => {
      // Se está atualizando o saldo, criar transação de ajuste
      if (input.balance !== undefined && user) {
        // Buscar saldo atual
        const { data: currentAccount, error: fetchError } = await supabase
          .from("accounts")
          .select("balance, name")
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;

        const currentBalance = Number(currentAccount.balance);
        const newBalance = Number(input.balance);
        const difference = newBalance - currentBalance;

        // Se há diferença, criar transação de ajuste
        if (Math.abs(difference) > 0.001) {
          const txType = difference > 0 ? "INCOME" : "EXPENSE";
          const catType = difference > 0 ? "income" : "expense";

          // Buscar categoria "Ajuste de Saldo" correspondente ao tipo de transação e usuário
          const { data: categoryData } = await supabase
            .from("categories")
            .select("id")
            .eq("user_id", user.id)
            .eq("name", "Ajuste de Saldo")
            .eq("type", catType)
            .maybeSingle();

          const { error: txError } = await supabase.from("transactions").insert({
            user_id: user.id,
            account_id: id,
            type: txType,
            amount: Math.abs(difference),
            description: `Ajuste de saldo - ${currentAccount.name}`,
            category_id: categoryData?.id || null,
            date: new Date().toISOString().split("T")[0],
            competence_date: new Date().toISOString().split("T")[0],
            domain: "PERSONAL",
            is_shared: false,
            is_installment: false,
            is_recurring: false,
            sync_status: "SYNCED",
            is_settled: true,
          });

          if (txError) throw txError;

          // Remover balance do input pois o trigger vai calcular
          delete input.balance;
        }
      }

      // Atualizar outros campos da conta (exceto balance que é calculado pelo trigger)
      const updateData = { ...input };
      delete updateData.balance; // Nunca atualizar balance diretamente

      if (Object.keys(updateData).length > 0) {
        const { data, error } = await supabase
          .from("accounts")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return data as Account;
      }

      // Se só atualizou o saldo (via transação), buscar conta atualizada
      const { data, error } = await supabase
        .from("accounts")
        .select(
          "id,name,type,currency,bank_id,bank_logo,bank_color,balance,initial_balance,is_active,is_archived,closing_day,due_day,credit_limit,is_international,hide_balance,created_at,updated_at,user_id"
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Account;
    },
    onSuccess: async () => {
      await invalidateAccountQueries(queryClient);
      accountToasts.updated();
    },
    onSettled: async () => {
      await invalidateAccountQueries(queryClient);
    },
  });
}

export function useAccountDependencies(accountId: string | undefined) {
  return useQuery({
    queryKey: ["account_dependencies", accountId],
    queryFn: async () => {
      if (!accountId) return null;
      try {
        const deps = (await callRPCWithRetry("check_account_dependencies", {
          p_account_id: accountId,
        })) as AccountDependenciesResponse;
        return deps;
      } catch (e) {
        logger.warn("Failed to fetch account dependencies:", e);
        return null;
      }
    },
    enabled: !!accountId,
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["accounts"] });
      const previousData = queryClient.getQueriesData<Account[]>({ queryKey: ["accounts"] });
      queryClient.setQueriesData<Account[]>(
        { queryKey: ["accounts"] },
        (old) => old?.filter((a) => a.id !== id) ?? []
      );
      return { previousData };
    },
    onError: (_err, _id, context) => {
      context?.previousData?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    mutationFn: async (id: string) => {
      // AUDITORIA 2026-05-10: Verificar dependências antes de excluir
      try {
        const deps = (await callRPCWithRetry("check_account_dependencies", {
          p_account_id: id,
        })) as AccountDependenciesResponse;

        if (deps && !deps.can_delete) {
          const msgs: string[] = [];
          if (deps.total_transactions > 0)
            msgs.push(`${deps.total_transactions} transação(ões) vinculada(s)`);
          if (deps.future_installments > 0)
            msgs.push(`${deps.future_installments} parcela(s) futura(s)`);
          if (deps.open_shared_expenses > 0)
            msgs.push(`${deps.open_shared_expenses} despesa(s) compartilhada(s) em aberto`);
          if (deps.linked_goals > 0) msgs.push(`${deps.linked_goals} meta(s) vinculada(s)`);
          throw new Error(
            `Não é possível excluir esta conta. Ela possui: ${msgs.join(", ")}. ` +
              "Por favor, utilize a opção de Arquivar para preservar o histórico."
          );
        }
      } catch (error: unknown) {
        // Se o erro for o que acabamos de lançar (com as dependências), re-lançar
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage?.includes("Não é possível excluir")) throw error;

        logger.warn("check_account_dependencies falhou ou não existe", { message: errorMessage });
      }

      // Soft delete — histórico é preservado
      const { error } = await supabase
        .from("accounts")
        .update({ is_active: false, deleted: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      accountToasts.deleted();
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useArchiveAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["accounts"] });
      const previousData = queryClient.getQueriesData<Account[]>({ queryKey: ["accounts"] });
      queryClient.setQueriesData<Account[]>(
        { queryKey: ["accounts"] },
        (old) => old?.filter((a) => a.id !== id) ?? []
      );
      return { previousData };
    },
    onError: (_err, _id, context) => {
      context?.previousData?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      accountToasts.error("arquivar", _err as Error);
    },
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").update({ is_archived: true }).eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      accountToasts.archived();
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["archived-accounts"] });
    },
  });
}

export function useUnarchiveAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["archived-accounts"] });
      const previousData = queryClient.getQueriesData<Account[]>({
        queryKey: ["archived-accounts"],
      });
      queryClient.setQueriesData<Account[]>(
        { queryKey: ["archived-accounts"] },
        (old) => old?.filter((a) => a.id !== id) ?? []
      );
      return { previousData };
    },
    onError: (_err, _id, context) => {
      context?.previousData?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      accountToasts.error("desarquivar", _err as Error);
    },
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").update({ is_archived: false }).eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      accountToasts.unarchived();
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["archived-accounts"] });
    },
  });
}

export function useArchivedAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["archived-accounts", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("accounts")
        .select(
          "id,name,type,currency,bank_id,bank_logo,bank_color,balance,is_archived,created_at,user_id"
        )
        .eq("user_id", user.id)
        .eq("is_archived", true)
        .order("name");

      if (error) {
        logger.error("Erro ao buscar contas arquivadas", error);
        throw error;
      }
      return data as Account[];
    },
    enabled: !!user,
    ...defaultQueryConfig,
  });
}
