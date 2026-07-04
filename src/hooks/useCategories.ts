import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { invalidateCategoryQueries } from "@/utils/queryInvalidation";
import { categoryToasts } from "@/utils/toastMessages";
import { defaultQueryConfig } from "@/utils/queryConfig";
import { logger } from "@/utils/logger";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  type: "expense" | "income";
  color: string | null;
  parent_category_id: string | null; // Para hierarquia
  created_at: string;
  is_archived?: boolean | null;
}

export interface CreateCategoryInput {
  name: string;
  icon?: string;
  type: "expense" | "income";
  color?: string;
  parent_category_id?: string | null; // Para hierarquia
}

export function useCategories(includeArchived = false) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["categories", user?.id, includeArchived],
    queryFn: async () => {
      let query = supabase
        .from("categories")
        .select("*")
        .eq("user_id", user!.id)
        .is("deleted_at", null)
        .order("name");

      if (!includeArchived) {
        query = query.is("is_archived", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user,
    ...defaultQueryConfig,
  });
}

// Hook para buscar categorias organizadas hierarquicamente
export function useCategoriesHierarchical(includeArchived = false) {
  const { data: allCategories, ...rest } = useCategories(includeArchived);

  const hierarchical = useMemo(() => {
    if (!allCategories) return { parents: [], children: new Map() };

    // Separar pais e filhos
    const parents = allCategories.filter((cat) => !cat.parent_category_id);
    const children = new Map<string, Category[]>();

    // Agrupar filhos por pai
    allCategories
      .filter((cat) => cat.parent_category_id)
      .forEach((cat) => {
        const parentId = cat.parent_category_id!;
        if (!children.has(parentId)) {
          children.set(parentId, []);
        }
        children.get(parentId)!.push(cat);
      });

    return { parents, children };
  }, [allCategories]);

  return {
    ...rest,
    data: allCategories,
    hierarchical,
  };
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
    onSuccess: async () => {
      await invalidateCategoryQueries(queryClient);
      categoryToasts.created();
    },
    onError: (error) => {
      categoryToasts.error("criar", error);
    },
  });
}

export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
  color?: string;
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: async ({ id, ...input }: UpdateCategoryInput & { id: string }) => {
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      const previousData = queryClient.getQueriesData<Category[]>({ queryKey: ["categories"] });
      queryClient.setQueriesData<Category[]>(
        { queryKey: ["categories"] },
        (old) => old?.map((c) => (c.id === id ? { ...c, ...input } : c)) ?? []
      );
      return { previousData };
    },
    onError: (error, _vars, context) => {
      context?.previousData?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      categoryToasts.error("atualizar", error);
    },
    mutationFn: async ({ id, ...input }: UpdateCategoryInput & { id: string }) => {
      const { data, error } = await supabase
        .from("categories")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      categoryToasts.updated();
    },
    onSettled: async () => {
      await invalidateCategoryQueries(queryClient);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      const previousData = queryClient.getQueriesData<Category[]>({ queryKey: ["categories"] });
      queryClient.setQueriesData<Category[]>(
        { queryKey: ["categories"] },
        (old) => old?.filter((c) => c.id !== id) ?? []
      );
      return { previousData };
    },
    onError: (error, _id, context) => {
      context?.previousData?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      categoryToasts.error("remover", error);
    },
    mutationFn: async (id: string) => {
      // INTEGRIDADE DO BANCO: Verificar subcategorias filhas antes de excluir
      const { count: subCount } = await supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("parent_category_id", id);

      if (subCount && subCount > 0) {
        throw new Error(
          `Esta categoria possui ${subCount} subcategoria(s) vinculada(s). ` +
            `Exclua as subcategorias primeiro antes de remover a categoria principal.`
        );
      }

      // Removida a validação de transações e orçamentos vinculados, pois agora usamos Soft Delete.
      // O histórico financeiro será mantido intacto.

      const { error } = await supabase
        .from("categories")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      categoryToasts.deleted();
    },
    onSettled: async () => {
      await invalidateCategoryQueries(queryClient);
    },
  });
}

// Criar categorias padrão para um novo usuário
export function useCreateDefaultCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ force = false }: { force?: boolean } = {}) => {
      if (!user) throw new Error("User not authenticated");

      // Buscar as categorias existentes pelo nome para não duplicar
      const { data: existing, error: checkError } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", user.id);

      if (checkError) throw checkError;

      const existingNames = new Set((existing || []).map((c) => c.name.toLowerCase()));

      if (!force && existing && existing.length >= 20) {
        logger.info(
          "Usuário já possui estrutura completa de categorias. Ignorando criação padrão."
        );
        return;
      }

      // Importar categorias hierárquicas
      const { DEFAULT_CATEGORIES } = await import("@/lib/defaultCategories");

      // Filtrar as categorias pai que ainda NÃO existem
      const parentCategoriesToCreate = DEFAULT_CATEGORIES.filter(
        (cat) => !existingNames.has(cat.name.toLowerCase())
      ).map((cat) => ({
        user_id: user.id,
        name: cat.name,
        icon: cat.icon,
        type: cat.type,
        parent_category_id: null,
      }));

      let createdParents: any[] = [];
      if (parentCategoriesToCreate.length > 0) {
        const { data, error: parentError } = await supabase
          .from("categories")
          .insert(parentCategoriesToCreate)
          .select();
        if (parentError) throw parentError;
        createdParents = data || [];
      }

      // Buscar novamente todos os pais atualizados (os antigos + os novos criados)
      const { data: allParents } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", user.id)
        .is("parent_category_id", null);

      const parentMap = new Map((allParents || []).map((cat) => [cat.name.toLowerCase(), cat.id]));

      // Agora preparar as subcategorias
      const childCategories: unknown[] = [];

      DEFAULT_CATEGORIES.forEach((parent) => {
        const parentId = parentMap.get(parent.name.toLowerCase());
        if (parent.children && parentId) {
          parent.children.forEach((child) => {
            // Se a subcategoria já existe com este nome, não cria de novo
            if (!existingNames.has(child.name.toLowerCase())) {
              childCategories.push({
                user_id: user.id,
                name: child.name,
                icon: child.icon,
                type: child.type,
                parent_category_id: parentId,
              });
            }
          });
        }
      });

      if (childCategories.length > 0) {
        const { error: childError } = await supabase.from("categories").insert(childCategories);

        if (childError) throw childError;
      }

      logger.success(
        `Criadas ${createdParents.length} categorias pai e ${childCategories.length} subcategorias`
      );
    },
    onSuccess: async () => {
      await invalidateCategoryQueries(queryClient);
    },
  });
}
