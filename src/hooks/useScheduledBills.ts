import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

export function useConfirmScheduledBill() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      amount,
      paidDate,
    }: {
      id: string;
      amount?: number;
      paidDate?: string;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const date = paidDate ?? format(new Date(), "yyyy-MM-dd");
      const update: { status: "CONFIRMED"; date: string; amount?: number } = { status: "CONFIRMED", date };
      if (amount !== undefined) update.amount = amount;
      const { error } = await supabase
        .from("transactions")
        .update(update)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-bills"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Confirmado com sucesso");
    },
    onError: () => {
      toast.error("Erro ao confirmar");
    },
  });
}

// Desmarca uma transação como paga (CONFIRMED → PENDING)
export function useUnconfirmScheduledBill() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("transactions")
        .update({ status: "PENDING" })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-bills"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Pagamento desmarcado — voltou para pendente");
    },
    onError: () => {
      toast.error("Erro ao desmarcar pagamento");
    },
  });
}

// Confirma uma ocorrência de transação recorrente criando um registro avulso CONFIRMED
// sem alterar o template original (is_recurring permanece intacto)
export function useConfirmRecurringOccurrence() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      templateId,
      amount,
      date,
    }: {
      templateId: string;
      amount: number;
      date: string;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      // Busca o template para copiar os campos
      const { data: template, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", templateId)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !template) throw fetchError ?? new Error("Template não encontrado");

      const {
        id,
        created_at,
        updated_at,
        last_generated_date,
        is_recurring,
        recurrence_pattern,
        recurrence_day,
        status,
        ...fields
      } = template;
      
      void id; void created_at; void updated_at; void last_generated_date;
      void is_recurring; void recurrence_pattern; void recurrence_day; void status;

      const { error } = await supabase.from("transactions").insert({
        ...fields,
        amount,
        date,
        status: "CONFIRMED",
        is_recurring: false,
        recurrence_pattern: null,
        recurrence_day: null,
        series_id: templateId, // vincula ao template original
        user_id: user.id, // garante o dono da nova
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-for-month"] });
      toast.success("Ocorrência confirmada");
    },
    onError: () => {
      toast.error("Erro ao confirmar ocorrência");
    },
  });
}

export function useCancelScheduledBill() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("transactions")
        .update({ status: "CANCELLED", deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-bills"] });
      toast.success("Conta agendada removida");
    },
    onError: () => {
      toast.error("Erro ao remover conta agendada");
    },
  });
}
