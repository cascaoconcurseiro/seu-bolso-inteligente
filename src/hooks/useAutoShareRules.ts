import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AutoShareRule {
  id: string;
  user_id: string;
  name: string;
  trigger_type: "category" | "keyword";
  trigger_value: string;
  member_id: string;
  split_ratio: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateAutoShareRuleInput {
  name: string;
  trigger_type: "category" | "keyword";
  trigger_value: string;
  member_id: string;
  split_ratio: number;
}

export function useAutoShareRules() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["auto-share-rules", user?.id],
    queryFn: async (): Promise<AutoShareRule[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transaction_auto_share_rules")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AutoShareRule[];
    },
    enabled: !!user,
  });
}

export function useCreateAutoShareRule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAutoShareRuleInput) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("transaction_auto_share_rules")
        .insert({ ...input, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-share-rules"] });
      toast.success("Regra criada!");
    },
    onError: () => toast.error("Erro ao criar regra"),
  });
}

export function useUpdateAutoShareRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AutoShareRule> & { id: string }) => {
      const { error } = await supabase
        .from("transaction_auto_share_rules")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auto-share-rules"] }),
  });
}

export function useDeleteAutoShareRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transaction_auto_share_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-share-rules"] });
      toast.success("Regra removida");
    },
  });
}

/**
 * Verifica se uma transação deve ser automaticamente compartilhada com alguém,
 * retornando a primeira regra ativa que corresponde.
 */
export function matchAutoShareRule(
  rules: AutoShareRule[],
  categoryId: string | null | undefined,
  description: string
): AutoShareRule | null {
  const descLower = description.toLowerCase();
  for (const rule of rules) {
    if (!rule.is_active) continue;
    if (rule.trigger_type === "category" && categoryId && rule.trigger_value === categoryId) return rule;
    if (rule.trigger_type === "keyword" && descLower.includes(rule.trigger_value.toLowerCase())) return rule;
  }
  return null;
}
