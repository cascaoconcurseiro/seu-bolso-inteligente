import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useMemo } from "react";

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
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user,
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
      const childCategories: any[] = [];
      
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

      console.log(`✅ Criadas ${createdParents.length} categorias pai e ${childCategories.length} subcategorias`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
