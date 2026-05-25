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
}

export interface CreateCategoryInput {
  name: string;
  icon?: string;
  type: "expense" | "income";
  color?: string;
  parent_category_id?: string | null; // Para hierarquia
}

export function useCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["categories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user!.id)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user,
    ...defaultQueryConfig,
  });
}

// Hook para buscar categorias organizadas hierarquicamente
export function useCategoriesHierarchical() {
  const { data: allCategories, ...rest } = useCategories();

  const hierarchical = useMemo(() => {
    if (!allCategories) return { parents: [], children: new Map() };

    // Separar pais e filhos
    const parents = allCategories.filter(cat => !cat.parent_category_id);
    const children = new Map<string, Category[]>();

    // Agrupar filhos por pai
    allCategories
      .filter(cat => cat.parent_category_id)
      .forEach(cat => {
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
      categoryToasts.error('criar', error);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
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
    onSuccess: async () => {
      await invalidateCategoryQueries(queryClient);
      categoryToasts.deleted();
    },
    onError: (error) => {
      categoryToasts.error('remover', error);
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

      // Verificar se o usuário já possui categorias cadastradas
      const { data: existing, error: checkError } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        logger.info("Usuário já possui categorias cadastradas. Ignorando criação padrão.");
        return;
      }

      // Importar categorias hierárquicas
      const { DEFAULT_CATEGORIES } = await import("@/lib/defaultCategories");

      // Primeiro, criar todas as categorias pai
      const parentCategories = DEFAULT_CATEGORIES.map(cat => ({
        user_id: user.id,
        name: cat.name,
        icon: cat.icon,
        type: cat.type,
        parent_category_id: null, // Categoria pai não tem parent
      }));

      const { data: createdParents, error: parentError } = await supabase
        .from("categories")
        .insert(parentCategories)
        .select();

      if (parentError) throw parentError;

      // Criar mapa de nome → id das categorias pai
      const parentMap = new Map(
        createdParents.map(cat => [cat.name, cat.id])
      );

      // Agora criar todas as subcategorias
      const childCategories: unknown[] = [];
      
      DEFAULT_CATEGORIES.forEach(parent => {
        const parentId = parentMap.get(parent.name);
        if (parent.children && parentId) {
          parent.children.forEach(child => {
            childCategories.push({
              user_id: user.id,
              name: child.name,
              icon: child.icon,
              type: child.type,
              parent_category_id: parentId, // Link para categoria pai
            });
          });
        }
      });

      if (childCategories.length > 0) {
        const { error: childError } = await supabase
          .from("categories")
          .insert(childCategories);

        if (childError) throw childError;
      }

      logger.success(`Criadas ${createdParents.length} categorias pai e ${childCategories.length} subcategorias`);
    },
    onSuccess: async () => {
      await invalidateCategoryQueries(queryClient);
    },
  });
}
