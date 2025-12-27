import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  type: "expense" | "income";
  color: string | null;
  created_at: string;
}

export interface CreateCategoryInput {
  name: string;
  icon?: string;
  type: "expense" | "income";
  color?: string;
}

export function useCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["categories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user,
    retry: false, // Não tentar novamente se falhar
    staleTime: 300000, // Cache por 5 minutos (categorias mudam pouco)
  });
}

export function useCreateCategory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("categories")
        .insert({
          user_id: user.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria criada!");
    },
    onError: (error) => {
      toast.error("Erro ao criar categoria: " + error.message);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria removida!");
    },
    onError: (error) => {
      toast.error("Erro ao remover categoria: " + error.message);
    },
  });
}

// Criar categorias padrão para um novo usuário
export function useCreateDefaultCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const defaultCategories: CreateCategoryInput[] = [
        { name: "Alimentação", icon: "🍕", type: "expense" },
        { name: "Moradia", icon: "🏠", type: "expense" },
        { name: "Transporte", icon: "🚗", type: "expense" },
        { name: "Lazer", icon: "🎮", type: "expense" },
        { name: "Saúde", icon: "💊", type: "expense" },
        { name: "Educação", icon: "📚", type: "expense" },
        { name: "Compras", icon: "🛒", type: "expense" },
        { name: "Serviços", icon: "🔧", type: "expense" },
        { name: "Viagem", icon: "✈️", type: "expense" },
        { name: "Outros", icon: "📦", type: "expense" },
        { name: "Salário", icon: "💰", type: "income" },
        { name: "Freelance", icon: "💻", type: "income" },
        { name: "Investimentos", icon: "📈", type: "income" },
        { name: "Presente", icon: "🎁", type: "income" },
        { name: "Outros", icon: "💵", type: "income" },
      ];

      const { error } = await supabase.from("categories").insert(
        defaultCategories.map((cat) => ({
          user_id: user.id,
          ...cat,
        }))
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
